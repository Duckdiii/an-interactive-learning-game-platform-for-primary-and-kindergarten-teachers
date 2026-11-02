// Tóm tắt số turn, token, thời gian của một lần chạy agent từ file execution của claude-code-action,
// và cảnh báo "lẫn chế độ" (chế độ A/B nhưng agent đã đọc SRS). Không bao giờ làm job thất bại.
// Dùng: node usage-summary.mjs --file execution.json --mode B --prompt-version 1.0.0 >> $GITHUB_STEP_SUMMARY
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

/** File có thể là một mảng JSON hoặc mỗi dòng một đối tượng JSON. */
export function parseExecution(text) {
  const t = text.trim();
  if (!t) return [];
  try {
    const v = JSON.parse(t);
    return Array.isArray(v) ? v : [v];
  } catch {
    return t.split("\n").flatMap((line) => {
      try { return [JSON.parse(line)]; } catch { return []; }
    });
  }
}

const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);

export function summarize(entries) {
  const result = [...entries].reverse().find((e) => e?.type === "result") ?? null;
  const u = result?.usage ?? {};
  const toolUses = [];
  for (const e of entries) {
    const content = e?.message?.content;
    if (Array.isArray(content)) for (const c of content) if (c?.type === "tool_use") toolUses.push(c);
  }
  return {
    found: Boolean(result),
    turns: num(result?.num_turns),
    durationMs: num(result?.duration_ms),
    input: num(u.input_tokens),
    output: num(u.output_tokens),
    cacheRead: num(u.cache_read_input_tokens),
    cacheCreate: num(u.cache_creation_input_tokens),
    costUsd: num(result?.total_cost_usd),
    toolUses,
  };
}

/** Chế độ A/B không được đọc SRS (docs/srs) hay thư mục trusted/docs; phát hiện qua tham số của lệnh gọi công cụ. */
export function findContamination(toolUses, mode) {
  if (mode === "C") return [];
  return toolUses
    .filter((t) => /docs\/srs|trusted\/docs|SRS\.docx/i.test(JSON.stringify(t.input ?? {})))
    .map((t) => `${t.name}: ${JSON.stringify(t.input).slice(0, 120)}`);
}

const fmt = (v) => (v === null ? "n/a" : v.toLocaleString("en-US"));

export function renderUsage({ entries, mode, promptVersion }) {
  const s = summarize(entries);
  const contamination = findContamination(s.toolUses, mode);
  const L = ["### AI review: chi phí lần chạy", ""];
  if (!s.found) {
    L.push("Không đọc được thông tin sử dụng từ file execution (định dạng có thể đã thay đổi).");
  } else {
    L.push("| Chế độ | Prompt | Turn | Thời gian (s) | Input | Output | Cache đọc | Cache tạo |", "|---|---|---|---|---|---|---|---|");
    L.push(`| ${mode} | ${promptVersion} | ${fmt(s.turns)} | ${s.durationMs === null ? "n/a" : (s.durationMs / 1000).toFixed(1)} | ${fmt(s.input)} | ${fmt(s.output)} | ${fmt(s.cacheRead)} | ${fmt(s.cacheCreate)} |`);
    L.push("", `Số lần gọi công cụ: ${s.toolUses.length}. Chi phí ước tính do CLI báo: ${s.costUsd === null ? "n/a" : `$${s.costUsd.toFixed(4)}`} (không đáng tin khi dùng OAuth token của gói đăng ký; chỉ số token mới là số liệu chính).`);
  }
  if (contamination.length) {
    L.push("", `**Cảnh báo lẫn chế độ:** chế độ ${mode} nhưng agent đã truy cập SRS (${contamination.length} lần). Kết quả lần này không dùng để so sánh A/B/C.`, ...contamination.map((c) => `- \`${c.replace(/`/g, "'")}\``));
  }
  return L.join("\n") + "\n";
}

function arg(argv, name) {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const a = process.argv.slice(2);
    const file = arg(a, "file");
    const entries = file ? parseExecution(readFileSync(file, "utf8")) : [];
    process.stdout.write(renderUsage({ entries, mode: arg(a, "mode") ?? "?", promptVersion: arg(a, "prompt-version") ?? "?" }));
  } catch (e) {
    process.stdout.write(`### AI review: chi phí lần chạy\n\nKhông tóm tắt được: ${String(e.message).slice(0, 200)}\n`);
  }
}
