// Kiểm định dạng ai-usage-log.md + docs/ai-usage-log-archive/ (thay phần tất định của agent log-auditor).
// Dùng: node scripts/ai-log/check-ai-usage-log.mjs   (exit 1 nếu có LỖI; NGHI NGỜ chỉ in ra)
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const COLUMNS = 11;
export const CONTRIBUTIONS = ["Sinh mới", "Sửa - refactor", "Gợi ý"];
export const NO_ERROR = "Không có lỗi của AI được ghi nhận ở phần này.";
export const PROMPT_PARTS = ["Bối cảnh", "Mục tiêu", "Kiểm chứng"];
// Dòng ghi trước khi quy ước cấu trúc prompt được áp dụng (STT <= 50) và vài dòng merge từ nhánh khác viết theo mẫu cũ:
// chỉ kiểm các cột cứng. Không thêm STT mới vào đây để "chữa" dòng mới.
export const LEGACY_MAX_STT = 50;
export const LEGACY_ROWS = new Set([159, 160, 172]);
// Dòng có lỗi thật đang chờ người sửa tay: checker chỉ cảnh báo thay vì chặn; sửa xong thì xoá STT khỏi đây.
// (169 và 186 đã sửa tay ngày 2026-11-14.)
export const KNOWN_BAD_ROWS = new Set();
const ROW = /^\| (\d+) \|/;
// Một hoặc nhiều SHA (có thể trong backtick, cách nhau dấu phẩy), có thể kèm một chú thích trong ngoặc ở cuối.
const SHA_CELL = /^`?[0-9a-f]{7,40}`?(\s*,\s*`?[0-9a-f]{7,40}`?)*(\s*\(.*\))?$/;

/** Tách ô theo `|`, bỏ qua `|` nằm trong backtick hoặc được escape `\|`. */
export function splitCells(line) {
  const cells = [];
  let cur = "";
  let inCode = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === "\\" && line[i + 1] === "|") { cur += "\\|"; i++; continue; }
    if (ch === "`") inCode = !inCode;
    if (ch === "|" && !inCode) { cells.push(cur); cur = ""; continue; }
    cur += ch;
  }
  cells.push(cur);
  return cells.slice(1, -1).map((c) => c.trim()); // bỏ phần trước `|` đầu và sau `|` cuối
}

/** rows: [{source, line}] theo thứ tự đọc. Trả về {errors, warnings} (mảng chuỗi). */
export function checkRows(rows, { legacyMaxStt = LEGACY_MAX_STT, legacyRows = LEGACY_ROWS, knownBad = KNOWN_BAD_ROWS } = {}) {
  const errors = [];
  const warnings = [];
  const seen = new Map();
  let prev = null;
  let prevDate = null;
  for (const { source, line } of rows) {
    const cells = splitCells(line);
    const stt = Number(cells[0]);
    const at = `STT ${stt} (${source})`;
    if (seen.has(stt)) errors.push(`${at} — STT trùng với ${seen.get(stt)}`);
    else if (prev !== null && stt !== prev + 1) errors.push(`${at} — STT không liên tục (trước đó ${prev})`);
    seen.set(stt, source);
    prev = stt;
    if (cells.length !== COLUMNS) {
      errors.push(`${at} — có ${cells.length} cột, cần ${COLUMNS} (có \`|\` lạc hoặc xuống dòng thật?)`);
      continue;
    }
    const [, date, person, tool, contribution, , prompt, sha, , , aiErrors] = cells;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) errors.push(`${at} — ngày "${date}" không đúng YYYY-MM-DD`);
    else {
      if (prevDate && date < prevDate) warnings.push(`${at} — ngày ${date} lùi so với dòng trước (${prevDate})`);
      prevDate = date;
    }
    if (!person || person === "TODO") errors.push(`${at} — thiếu Người thực hiện`);
    if (!/\d/.test(tool)) errors.push(`${at} — Công cụ AI "${tool}" thiếu phiên bản model`);
    if (!CONTRIBUTIONS.includes(contribution)) errors.push(`${at} — Mức độ "${contribution}" không thuộc ${CONTRIBUTIONS.join(" / ")}`);
    if (sha !== "TODO" && !SHA_CELL.test(sha)) errors.push(`${at} — SHA "${sha}" phải là TODO hoặc danh sách SHA hex`);
    if (knownBad.has(stt)) warnings.push(`${at} — lỗi đã biết, chờ sửa tay (xem KNOWN_BAD_ROWS)`);
    else if (stt > legacyMaxStt && !legacyRows.has(stt)) {
      const missing = PROMPT_PARTS.filter((p) => !prompt.includes(`**${p}`));
      if (missing.length) errors.push(`${at} — Câu lệnh chính thiếu mục: ${missing.join(", ")}`);
      if (!aiErrors || aiErrors === "TODO") errors.push(`${at} — cột Lỗi AI trống hoặc TODO (ghi lỗi hoặc đúng câu "${NO_ERROR}")`);
      // Mọi câu mở đầu bằng "Không" (không có lỗi, không ghi nhận...) đều là ý "không lỗi" nên phải đúng câu chuẩn.
      else if (/^Không\b/.test(aiErrors) && aiErrors !== NO_ERROR) errors.push(`${at} — câu "không có lỗi" phải đúng nguyên văn "${NO_ERROR}"`);
    }
  }
  return { errors, warnings };
}

/** Đọc archive (theo STT tăng dần) rồi file gốc. */
export function collectRows(root) {
  const rows = [];
  const dir = join(root, "docs", "ai-usage-log-archive");
  const files = existsSync(dir) ? readdirSync(dir).filter((f) => /^STT-\d{4}-\d{4}\.md$/.test(f)).sort() : [];
  for (const f of files) {
    const [lo, hi] = f.match(/\d{4}/g).map(Number);
    for (const line of readFileSync(join(dir, f), "utf8").split("\n")) {
      if (!ROW.test(line)) continue;
      const stt = Number(ROW.exec(line)[1]);
      if (stt < lo || stt > hi) throw new Error(`${f}: STT ${stt} nằm ngoài khoảng của file`);
      rows.push({ source: `archive/${f}`, line });
    }
  }
  for (const line of readFileSync(join(root, "ai-usage-log.md"), "utf8").split("\n")) {
    if (ROW.test(line)) rows.push({ source: "ai-usage-log.md", line });
  }
  return rows;
}

function main() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
  const { errors, warnings } = checkRows(collectRows(root));
  for (const w of warnings) console.log(`[NGHI NGỜ] ${w}`);
  for (const e of errors) console.error(`[LỖI] ${e}`);
  if (errors.length) process.exit(1);
  console.log(`ai-usage-log: hợp lệ (${warnings.length} nghi ngờ).`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
