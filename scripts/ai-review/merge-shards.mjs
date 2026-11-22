// Gộp kết quả review của các phần (mỗi phần một agent) thành một kết quả theo đúng schema review-result.
// Dùng: node merge-shards.mjs --dir shards --out result/review.json
// --dir chứa các thư mục con (mỗi artifact một thư mục), mỗi thư mục có review.json. Một phần duy nhất thì chép nguyên.
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SEVERITY_RANK = { blocker: 0, major: 1, minor: 2 };
const UC_SOURCE_RANK = { declared: 0, inferred: 1, none: 2 };
export const MAX_FINDINGS = 40;
export const MAX_FILES = 300;
export const MAX_UC = 15;
const MAX_SUMMARY = 2000;

/** @param {object[]} results kết quả của từng phần (đã parse JSON), theo thứ tự phần */
export function mergeResults(results) {
  if (!Array.isArray(results) || results.length === 0) throw new Error("Không có kết quả phần nào để gộp.");
  if (results.length === 1) return results[0];

  const first = results[0];
  for (const r of results) {
    for (const k of ["schema_version", "prompt_version", "mode"]) {
      if (r[k] !== first[k]) throw new Error(`Các phần có ${k} khác nhau (${first[k]} và ${r[k]}); không gộp được.`);
    }
    // Chỉ vòng 1 mới chia phần; vòng 2 có previous_findings gắn với từng vấn đề cũ nên không được trộn.
    if (r.previous_findings !== undefined || r.round === 2) throw new Error("Kết quả vòng 2 không được chia phần.");
  }

  // Cùng một lỗi không bị báo hai lần nếu hai phần cùng nêu (cùng file, dòng và nội dung đầu).
  const seen = new Set();
  const all = [];
  for (const r of results) {
    for (const f of r.findings) {
      const key = `${f.file}|${f.line}|${f.message.slice(0, 80)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      all.push(f);
    }
  }
  // Giữ nặng trước khi cắt về trần của schema; sort ổn định nên thứ tự trong cùng mức độ không đổi.
  all.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
  const kept = all.slice(0, MAX_FINDINGS).map((f, i) => ({ ...f, id: `F${i + 1}` }));
  const dropped = all.length - kept.length;

  const incomplete = results.filter((r) => r.status !== "complete").length;
  const summaries = results.map((r, i) => `[Phần ${i + 1}/${results.length}] ${r.summary}`);
  if (dropped > 0) summaries.push(`(${dropped} nhận xét mức nhẹ hơn bị lược vì vượt giới hạn ${MAX_FINDINGS}.)`);
  let summary = summaries.join(" ");
  if (summary.length > MAX_SUMMARY) summary = `${summary.slice(0, MAX_SUMMARY - 1)}…`;

  const ucSource = results.map((r) => r.uc_source).sort((a, b) => UC_SOURCE_RANK[a] - UC_SOURCE_RANK[b])[0];
  const ucDetected = ucSource === "none" ? [] : [...new Set(results.flatMap((r) => r.uc_detected ?? []))].slice(0, MAX_UC);

  return {
    schema_version: first.schema_version,
    prompt_version: first.prompt_version,
    mode: first.mode,
    status: incomplete === 0 ? "complete" : "incomplete",
    files_reviewed: [...new Set(results.flatMap((r) => r.files_reviewed))].slice(0, MAX_FILES),
    summary,
    conclusion: kept.some((f) => f.severity === "blocker") ? "fail" : "pass",
    uc_source: ucSource,
    uc_detected: ucDetected,
    round: 1,
    findings: kept,
  };
}

/** Đọc review.json trong mọi thư mục con của dir, theo thứ tự tên thư mục (ổn định giữa các lần chạy). */
export function readShardResults(dir) {
  const names = readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();
  const results = [];
  for (const name of names) {
    const file = join(dir, name, "review.json");
    if (!existsSync(file)) throw new Error(`Thiếu review.json trong ${name}`);
    results.push(JSON.parse(readFileSync(file, "utf8")));
  }
  return results;
}

function arg(argv, name) {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const a = process.argv.slice(2);
    const dir = arg(a, "dir");
    const out = arg(a, "out");
    if (!dir || !out) throw new Error("Thiếu --dir hoặc --out");
    const merged = mergeResults(readShardResults(dir));
    mkdirSync(dirname(resolve(out)), { recursive: true });
    writeFileSync(out, JSON.stringify(merged));
    console.log(`Đã gộp ${readShardResults(dir).length} phần: ${merged.findings.length} nhận xét, status=${merged.status}`);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
