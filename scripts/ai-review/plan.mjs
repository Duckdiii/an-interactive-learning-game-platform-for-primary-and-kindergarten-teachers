// Lập kế hoạch đăng từ kết quả review đã được kiểm tra schema. Hàm thuần: không gọi mạng.
import { createHash } from "node:crypto";
import { cleanGuidance, sanitizeText } from "./sanitize.mjs";
import { MARKER_SUMMARY, MAX_AUTO_RUNS, STATE_RE, renderStateMarkers, toRecord } from "./state.mjs";

export { MARKER_SUMMARY, STATE_RE };
export const MAX_INLINE = 8;
const MAX_SUMMARY_CHARS = 60000;
const MAX_TODO = 10;
const SEVERITY_ORDER = { blocker: 0, major: 1, minor: 2 };
const INLINE_SEVERITIES = new Set(["blocker", "major"]);

export const normalizeCode = (s) => s.replace(/\s+/g, " ").trim();

/**
 * Dấu vân tay ổn định giữa các lần chạy: không dùng số dòng, không dùng lời giải thích của agent.
 * `occurrence` là thứ tự (từ 0) của dòng đó trong số các dòng cùng nội dung trong diff của file, để hai dòng giống hệt
 * nhau (ví dụ hai chỗ `return null;`) không bị coi là một nhận xét. Bằng 0 thì không đổi chuỗi băm.
 */
export function fingerprint(file, category, code, occurrence = 0) {
  const extra = occurrence > 0 ? `\0${occurrence}` : "";
  return createHash("sha256").update(`${file}\0${category}\0${normalizeCode(code)}${extra}`).digest("hex").slice(0, 16);
}

/** Số dòng cùng nội dung xuất hiện trước `line` trong diff của file (Map giữ thứ tự dòng tăng dần). */
export function occurrenceOf(fileLines, line) {
  const want = normalizeCode(fileLines.get(line) ?? "");
  let count = 0;
  for (const [n, text] of fileLines) {
    if (n >= line) break;
    if (normalizeCode(text) === want) count++;
  }
  return count;
}

export const fpMarker = (fp) => `<!-- ai-review:fp=${fp} -->`;
export const FP_RE = /<!-- ai-review:fp=([0-9a-f]{16}) -->/;

/** Tìm dòng thật trong diff khớp với `code`; ưu tiên đúng số dòng agent nêu, nếu lệch thì chọn dòng gần nhất. */
function locate(fileLines, line, code) {
  if (!fileLines || line === null || normalizeCode(code) === "") return null;
  const want = normalizeCode(code);
  if (fileLines.has(line) && normalizeCode(fileLines.get(line)) === want) return line;
  let best = null;
  for (const [n, text] of fileLines) {
    if (normalizeCode(text) === want && (best === null || Math.abs(n - line) < Math.abs(best - line))) best = n;
  }
  return best;
}

const SRS_CATEGORIES = new Set(["gap", "suggestion"]);

/**
 * Áp bằng code các quy tắc mà prompt chỉ "nhờ" agent tuân thủ, để không phụ thuộc vào việc agent nghe lời:
 * - Không có UC (uc_source = none, hoặc thiếu trường) thì không có gap/suggestion: loại bỏ.
 * - UC do agent suy luận (inferred): gap/suggestion tối đa mức minor.
 * - UC khai báo (declared): gap/suggestion không bao giờ là blocker (hạ xuống major).
 */
export function normalizeFindings(result) {
  const source = result.uc_source ?? "none";
  let downgraded = 0;
  let dropped = 0;
  const findings = [];
  for (const f of result.findings) {
    if (!SRS_CATEGORIES.has(f.category)) { findings.push(f); continue; }
    if (source === "none") { dropped++; continue; }
    const cap = source === "inferred" ? "minor" : "major";
    if (SEVERITY_ORDER[f.severity] < SEVERITY_ORDER[cap]) { downgraded++; findings.push({ ...f, severity: cap }); } else findings.push(f);
  }
  return { findings, downgraded, dropped, source };
}

const sevLabel = { blocker: "blocker", major: "major", minor: "minor" };

const NO_GUIDANCE = "(AI chưa đưa ra hướng giải quyết)";
const REQUIRES_GUIDANCE = new Set(["blocker", "major"]);

/**
 * Hướng giải quyết bằng lời, đã làm sạch (không có khối code). blocker/major mà thiếu thì có chữ báo thiếu
 * thay vì để trống; minor/gợi ý thiếu thì không hiện gì.
 */
export function guidanceOf(rec, repo) {
  const g = cleanGuidance(rec.fix, { repo, max: 400 });
  if (g) return g;
  return REQUIRES_GUIDANCE.has(rec.severity) ? NO_GUIDANCE : "";
}

function renderInlineBody(f, fp, repo) {
  const lines = [`**[${sevLabel[f.severity]} · ${f.category}]** ${sanitizeText(f.message, { repo })}`];
  const guidance = guidanceOf(f, repo);
  if (guidance) lines.push("", `**Hướng giải quyết:** ${guidance}`);
  const impact = cleanGuidance(f.impact, { repo, max: 300 });
  if (impact) lines.push("", `**Tác động:** ${impact}`);
  if (f.uc?.length) lines.push("", `Liên quan: ${f.uc.join(", ")}`);
  lines.push("", fpMarker(fp));
  return lines.join("\n");
}

function shortMessage(f, repo) {
  const t = sanitizeText(f.message, { repo, max: 400 }).replace(/\s+/g, " ");
  return t;
}

/**
 * @param {object} p
 * @param {object} p.result        kết quả review đã qua schema
 * @param {Map} p.diff             kết quả parseDiff
 * @param {Set<string>} p.postedFps  fingerprint đã đăng ở các lần trước
 * @param {string} p.headSha       SHA đầu PR hiện tại
 * @param {string} p.analyzedSha   SHA mà agent đã phân tích
 * @param {string} [p.repo]
 * @param {number} [p.maxInline]
 * @param {boolean} [p.disableInline] đưa mọi nhận xét vào comment tổng kết (ví dụ khi Review API từ chối)
 * @param {string} [p.disableReason]
 * @param {Array|null} [p.previous] vấn đề còn mở của lần trước (đã kiểm tra schema); chỉ dùng ở vòng 2
 * @param {number} [p.round] 1: review toàn bộ; 2: vòng 2 (cần `previous`)
 * @param {number} [p.runs] số lần đã chạy trước lần này
 * @param {string} [p.baseSha] commit đã review lần trước (chỉ để hiển thị ở vòng 2)
 */
export function buildPlan({ result, diff, postedFps, headSha, analyzedSha, repo, maxInline = MAX_INLINE, disableInline = false, disableReason = "", previous = null, round = 1, runs = 0, baseSha = "" }) {
  const stale = headSha !== analyzedSha;
  const inlineOff = disableInline || stale;
  const seen = new Set();
  const inline = [];
  const others = []; // {finding, reason}
  let duplicates = 0;

  // Vòng 2 chỉ có nghĩa khi có danh sách vấn đề cũ để đối chiếu.
  const round2 = round === 2 && Array.isArray(previous);
  const priorByFp = new Map((round2 ? previous : []).map((p) => [p.fp, p]));
  const recs = new Map(); // mọi vấn đề của lần chạy này, theo fingerprint (để lưu làm "vấn đề còn mở")

  const norm = normalizeFindings(result);
  const findings = norm.findings;
  const ordered = [...findings].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || a.id.localeCompare(b.id, "en", { numeric: true }),
  );
  for (const f of ordered) {
    // Định vị dòng thật trước rồi mới tính fingerprint, vì fingerprint cần biết đây là lần xuất hiện thứ mấy của dòng.
    const line = f.line === null ? null : locate(diff.get(f.file), f.line, f.code);
    // Nhận xét không gắn dòng không có nội dung code để băm: dùng chính lời nhận xét để các nhận xét khác nhau không bị gộp.
    const fp = f.line === null
      ? fingerprint(f.file, f.category, `[không gắn dòng] ${f.message}`)
      : fingerprint(f.file, f.category, f.code, line === null ? 0 : occurrenceOf(diff.get(f.file), line));
    if (!recs.has(fp)) recs.set(fp, toRecord({ fp, file: f.file, category: f.category, severity: f.severity, code: f.code, message: f.message, fix: f.fix }));
    if (priorByFp.has(fp)) { duplicates++; continue; } // agent báo lại vấn đề cũ: đã được tính ở danh sách vấn đề cũ
    if (seen.has(fp) && f.line !== null) { duplicates++; continue; }
    if (f.line !== null) seen.add(fp);
    if (postedFps.has(fp)) { duplicates++; continue; }
    if (!INLINE_SEVERITIES.has(f.severity)) { others.push({ f, reason: "mức độ nhỏ hoặc gợi ý" }); continue; }
    if (f.line === null) { others.push({ f, reason: "không gắn dòng cụ thể" }); continue; }
    if (line === null) { others.push({ f, reason: "dòng không khớp với diff" }); continue; }
    if (inlineOff) { others.push({ f, reason: stale ? "PR đã có commit mới" : disableReason || "không đăng inline" }); continue; }
    if (inline.length >= maxInline) { others.push({ f, reason: `vượt giới hạn ${maxInline} nhận xét inline` }); continue; }
    inline.push({ path: f.file, line, side: "RIGHT", body: renderInlineBody(f, fp, repo), fp, id: f.id, severity: f.severity, category: f.category, message: shortMessage(f, repo) });
  }

  // Vòng 2: trạng thái từng vấn đề cũ. Chỉ nhận "đã xử lý" khi agent nêu được căn cứ; agent bỏ sót thì là "chưa rõ".
  const agentPrev = new Map((result.previous_findings ?? []).map((e) => [e.ref, e]));
  let demoted = 0;
  const prevStatus = round2
    ? previous.map((rec) => {
        const e = agentPrev.get(rec.fp);
        let status = e?.status ?? "unclear";
        let evidence = e?.evidence ?? "";
        if (status === "resolved" && evidence.trim() === "") { status = "unclear"; evidence = ""; demoted++; }
        return { rec, status, evidence };
      })
    : [];
  const newRecs = [...recs.values()].filter((r) => !priorByFp.has(r.fp));
  // Danh sách vấn đề còn mở sau lần này: vòng 2 giữ vấn đề cũ chưa xử lý và thêm vấn đề mới; vòng 1 thay bằng kết quả mới.
  const open = round2 ? [...prevStatus.filter((s) => s.status !== "resolved").map((s) => s.rec), ...newRecs] : [...recs.values()];

  // Kết luận do code tính lại từ các vấn đề còn mở, không tin trường agent tự điền.
  const conclusion = open.some((r) => r.severity === "blocker") ? "fail" : "pass";

  const diffFiles = new Set(diff.keys());
  const unreviewed = round2 ? [] : [...diffFiles].filter((f) => !result.files_reviewed.includes(f));
  const summary = renderSummary({ result, findings, open, norm, conclusion, inline, others, duplicates, unreviewed, analyzedSha, stale, repo, disableReason: disableInline ? disableReason : "", round2, baseSha, prevStatus, newCount: newRecs.length, demoted, runs: runs + 1 });
  const count = (s) => prevStatus.filter((x) => x.status === s).length;
  return {
    inline: inline.map(({ path, line, side, body }) => ({ path, line, side, body })),
    inlineMeta: inline.map(({ fp, id, severity, category }) => ({ fp, id, severity, category })),
    summary,
    conclusion,
    state: { runs: runs + 1, open },
    stats: {
      round: round2 ? 2 : 1,
      resolved: count("resolved"),
      stillPresent: count("still_present"),
      unclear: count("unclear"),
      newFindings: round2 ? newRecs.length : findings.length,
      missingGuidance: findings.filter((f) => REQUIRES_GUIDANCE.has(f.severity) && !cleanGuidance(f.fix, { repo, max: 400 })).length,
      open: open.length,
      findings: findings.length,
      downgradedSrs: norm.downgraded,
      droppedSrs: norm.dropped,
      inline: inline.length,
      inSummaryOnly: others.length,
      duplicates,
      unreviewedFiles: unreviewed.length,
      stale,
    },
  };
}

function renderSummary({ result, findings, open, norm, conclusion, inline, others, duplicates, unreviewed, analyzedSha, stale, repo, disableReason, round2, baseSha, prevStatus, newCount, demoted, runs }) {
  const L = [];
  L.push(...renderStateMarkers({ sha: analyzedSha, prompt: result.prompt_version, mode: result.mode, runs, open }));
  L.push("## Kết quả AI review");
  L.push("");
  L.push(
    `**Kết luận:** ${conclusion === "pass" ? "Đạt" : "Chưa đạt"} (chỉ mang tính thông tin) · chế độ ${result.mode} · prompt ${result.prompt_version} · commit \`${analyzedSha.slice(0, 7)}\`${round2 ? ` · vòng 2 (so với commit \`${baseSha.slice(0, 7)}\`)` : ""} · lần chạy thứ ${runs}`,
  );
  if (stale) L.push("", "> Kết quả này tính cho commit cũ; PR đã có commit mới nên không đăng nhận xét inline. Gắn lại label `ai-review` để review lại.");
  if (disableReason) L.push("", `> Không đăng được nhận xét inline (${sanitizeText(disableReason, { repo, max: 200 })}); mọi nhận xét nằm trong comment này.`);
  L.push("", sanitizeText(result.summary, { repo, max: 2000 }));
  if (result.uc_detected?.length) {
    const how = norm.source === "inferred" ? " _(suy luận tự động, có thể sai)_" : norm.source === "declared" ? " _(khai báo trong PR)_" : "";
    L.push("", `UC liên quan: ${result.uc_detected.join(", ")}${how}`);
  }

  // Bảng đếm tính trên các vấn đề CÒN MỞ (ở vòng 1 chính là các nhận xét của lần này).
  const count = { blocker: 0, major: 0, minor: 0 };
  for (const r of open) count[r.severity]++;
  L.push("", `Vấn đề còn mở: ${open.length}`, "", "| Blocker | Major | Minor |", "|---|---|---|", `| ${count.blocker} | ${count.major} | ${count.minor} |`);

  // Bước tiếp theo do code sinh từ danh sách còn mở (không tốn token), đặt sớm để người đọc, kể cả không phải dev, thấy ngay.
  L.push("", "### Bước tiếp theo");
  if (open.length === 0) {
    L.push("Không còn vấn đề nào cần xử lý.");
  } else {
    const todo = [...open].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || a.file.localeCompare(b.file));
    todo.slice(0, MAX_TODO).forEach((r, i) => {
      const g = guidanceOf(r, repo);
      const srs = r.category === "gap" || r.category === "suggestion" ? "(đối chiếu SRS) " : "";
      L.push(`${i + 1}. **[${r.severity}]** ${srs}\`${r.file}\` — ${r.message}${g ? ` → ${g}` : ""}`);
    });
    if (todo.length > MAX_TODO) L.push(`... và ${todo.length - MAX_TODO} vấn đề khác (xem các mục bên dưới).`);
    L.push("", `Sửa xong, push commit mới: hệ thống tự kiểm tra lại (tối đa ${MAX_AUTO_RUNS} lần tự động mỗi PR; sau đó gắn label \`ai-review\` để chạy tiếp).`);
  }

  if (round2) {
    const by = (s) => prevStatus.filter((x) => x.status === s);
    L.push("", "### Vòng 2: kiểm tra vấn đề cũ", "", "| Đã xử lý | Vẫn còn | Chưa rõ | Mới |", "|---|---|---|---|", `| ${by("resolved").length} | ${by("still_present").length} | ${by("unclear").length} | ${newCount} |`);
    const listPrev = (title, items, withGuidance) => {
      if (!items.length) return;
      L.push("", `**${title} (${items.length})**`);
      for (const { rec, evidence } of items) {
        const ev = evidence ? ` _(căn cứ: ${sanitizeText(evidence, { repo, max: 300 }).replace(/\s+/g, " ")})_` : "";
        const g = withGuidance ? guidanceOf(rec, repo) : "";
        L.push(`- **${rec.severity} · ${rec.category}** \`${rec.file}\` — ${rec.message}${g ? ` → ${g}` : ""}${ev}`);
      }
    };
    listPrev("Đã xử lý", by("resolved"), false);
    listPrev("Vẫn còn", by("still_present"), true);
    listPrev("Chưa rõ", by("unclear"), true);
    L.push("", "_\"Đã xử lý\" là ý kiến của AI dựa trên code hiện tại, có thể nhầm; \"Chưa rõ\" nghĩa là không đủ căn cứ để kết luận._");
  }

  if (inline.length) {
    L.push("", `### Đã đăng inline (${inline.length})`);
    for (const i of inline) L.push(`- \`${i.path}:${i.line}\` [${i.severity} · ${i.category}] ${i.message}`);
  }
  const isSrs = ({ f }) => f.category === "gap" || f.category === "suggestion";
  const section = (title, items) => {
    if (!items.length) return;
    L.push("", `### ${title} (${items.length})`);
    for (const { f, reason } of items) {
      const where = f.line === null ? `\`${f.file}\`` : `\`${f.file}:${f.line}\``;
      const g = guidanceOf(f, repo);
      L.push(`- **${f.severity} · ${f.category}** ${where} — ${shortMessage(f, repo)}${g ? ` → ${g}` : ""} _(${reason})_`);
    }
  };
  section("Nhận xét khác", others.filter((o) => !isSrs(o)));
  section("Đối chiếu SRS (chỉ để tham khảo)", others.filter(isSrs));
  const notes = [];
  if (norm.downgraded) notes.push(`${norm.downgraded} nhận xét đối chiếu SRS được hạ mức độ (UC suy luận tự động chỉ tối đa minor; gap/suggestion không bao giờ là blocker).`);
  if (norm.dropped) notes.push(`${norm.dropped} nhận xét đối chiếu SRS bị bỏ vì không xác định được UC.`);
  if (demoted) notes.push(`${demoted} vấn đề được AI báo "đã xử lý" nhưng thiếu căn cứ nên ghi là "chưa rõ".`);
  if (duplicates) notes.push(`${duplicates} nhận xét trùng với lần trước nên không đăng lại.`);
  if (unreviewed.length) notes.push(`${unreviewed.length} file trong diff chưa được agent xem: ${unreviewed.slice(0, 10).map((f) => `\`${f}\``).join(", ")}${unreviewed.length > 10 ? ", ..." : ""}.`);
  if (notes.length) L.push("", "### Ghi chú", ...notes.map((n) => `- ${n}`));
  let text = L.join("\n");
  if (text.length > MAX_SUMMARY_CHARS) text = `${text.slice(0, MAX_SUMMARY_CHARS)}\n\n_(đã cắt bớt)_`;
  return text;
}
