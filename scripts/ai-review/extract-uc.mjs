// Trích mã UC mà tác giả PR khai báo trong mục "Liên quan UC/FR" của mô tả PR.
// Mô tả PR là dữ liệu không tin cậy: chỉ các mã dạng UC-nn / FR-nn đã được kiểm tra mới đi tiếp vào prompt.
// Quan hệ trong SRS là 1-1 (FR-nn ↔ UC-nn); test đối chiếu quy tắc này với docs/srs/FR-summary.md.
// Dùng: node extract-uc.mjs --body-file body.txt --srs-dir trusted/docs/srs   (ghi $GITHUB_OUTPUT: uc, uc_declared, uc_unknown)
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Cho phép chữ đi kèm sau tên mục, ví dụ "Liên quan UC/FR (tùy chọn)" trong PR template.
const SECTION_HEADING = /^#{1,6}[ \t]*Liên quan UC\/FR[^\n]*$/im;
const ANY_HEADING = /^#{1,6}[ \t]/m;

/** Lấy nội dung mục "Liên quan UC/FR", bỏ bình luận HTML (ví dụ mẫu trong template không được tính). */
export function declaredSection(body) {
  const text = String(body ?? "").normalize("NFC").replace(/\r\n/g, "\n").replace(/<!--[\s\S]*?-->/g, "");
  const m = SECTION_HEADING.exec(text);
  if (!m) return null;
  const rest = text.slice(m.index + m[0].length);
  const next = ANY_HEADING.exec(rest);
  return next ? rest.slice(0, next.index) : rest;
}

/**
 * @param {string} body mô tả PR
 * @param {Set<string>} [known] các UC có thật (ví dụ từ tên file docs/srs/UC-nn.md); bỏ trống = không lọc
 * @returns {{uc: string[], unknown: string[], declared: boolean}}
 */
export function extractUc(body, known) {
  const section = declaredSection(body);
  if (section === null) return { uc: [], unknown: [], declared: false };
  const ids = new Set();
  for (const m of section.matchAll(/\b(?:UC|FR)-(\d{2})\b/gi)) ids.add(`UC-${m[1]}`);
  const all = [...ids].sort();
  const uc = known ? all.filter((id) => known.has(id)) : all;
  const unknown = known ? all.filter((id) => !known.has(id)) : [];
  return { uc, unknown, declared: uc.length > 0 };
}

function arg(argv, name) {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const a = process.argv.slice(2);
    const bodyFile = arg(a, "body-file");
    const body = bodyFile && existsSync(bodyFile) ? readFileSync(bodyFile, "utf8") : "";
    const srsDir = arg(a, "srs-dir");
    const known = srsDir ? new Set([...Array(99).keys()].map((n) => `UC-${String(n + 1).padStart(2, "0")}`).filter((id) => existsSync(join(srsDir, `${id}.md`)))) : undefined;
    const r = extractUc(body, known);
    const out = `uc=${r.uc.join(",")}\nuc_declared=${r.declared}\nuc_unknown=${r.unknown.join(",")}\n`;
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, out);
    console.log(`UC khai báo: ${r.uc.join(", ") || "(không có)"}${r.unknown.length ? `; mã không có trong SRS: ${r.unknown.join(", ")}` : ""}`);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
