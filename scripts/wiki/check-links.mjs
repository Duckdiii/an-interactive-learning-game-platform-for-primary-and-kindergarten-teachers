// Kiểm liên kết của kho tài liệu: [[...]] trỏ tới file có thật trong docs/, đường dẫn `docs/...` tồn tại, mọi trang wiki có trong mục lục.
// Dùng: node scripts/wiki/check-links.mjs [gốc-repo]
import { readFileSync, readdirSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const INDEX = "index.md";
const WIKI_PREFIX = "wiki/";
// Mẫu chung như `docs/srs/UC-xx.md` không phải đường dẫn thật.
const isPattern = (path) => /-xx\b|[<*]/.test(path);
const stripCode = (text) => text.replace(/`[^`\n]*`/g, "");

/** Tên đích của mọi [[đích|nhãn]] ngoài backtick; `\|` là cách viết trong ô bảng. */
export function wikiLinks(text) {
  return [...stripCode(text).matchAll(/\[\[([^\]]+?)\]\]/g)].map((m) => m[1].replace(/\\?\|.*$/, "").replace(/#.*$/, "").trim());
}

/** Các đường dẫn `docs/...` trong backtick, đã bỏ hậu tố `#mục`, `:dòng` và dấu `/` cuối. */
export function docPaths(text) {
  return [...text.matchAll(/`(docs\/[^`\n]+)`/g)]
    .map((m) => m[1].replace(/#.*$/, "").replace(/:[\d-]+(:\d+)?$/, "").replace(/\/$/, ""))
    .filter((p) => !isPattern(p));
}

/**
 * @param {Map<string, string>} pages tên file trong docs/wiki → nội dung
 * @param {string[]} entries mọi file và thư mục trong docs/, tương đối so với docs/
 * @returns {string[]} danh sách lỗi, rỗng là đạt.
 */
export function checkWiki(pages, entries) {
  // So bằng danh sách chứ không hỏi ổ đĩa: Windows bỏ qua hoa thường nên sai tên vẫn đạt ở máy này mà hỏng trên Linux.
  const known = new Set(entries.map((e) => e.normalize("NFC")));
  const stems = new Set([...known].filter((f) => f.endsWith(".md")).map((f) => f.slice(0, -3)));
  const names = new Set([...stems].map((f) => basename(f)));
  const index = pages.get(INDEX);

  if (index === undefined) return [`thiếu ${INDEX}`];

  const listed = new Set(
    wikiLinks(index.normalize("NFC"))
      .filter((link) => !link.includes("/") || link.startsWith(WIKI_PREFIX))
      .map((link) => (link.startsWith(WIKI_PREFIX) ? link.slice(WIKI_PREFIX.length) : link)),
  );
  const errors = [];

  for (const [name, raw] of pages) {
    const text = raw.normalize("NFC");

    for (const link of wikiLinks(text)) {
      if (!(link.includes("/") ? stems.has(link) : names.has(link))) errors.push(`${name}: liên kết hỏng [[${link}]]`);
    }
    for (const path of docPaths(text)) {
      if (!known.has(path.slice("docs/".length))) errors.push(`${name}: không có ${path}`);
    }
    if (name !== INDEX && !listed.has(basename(name.normalize("NFC"), ".md"))) errors.push(`${name}: chưa có trong ${INDEX}`);
  }

  return errors;
}

function listEntries(dir, prefix = "") {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name.startsWith(".")) return [];

    const path = `${prefix}${entry.name}`;

    return entry.isDirectory() ? [path, ...listEntries(join(dir, entry.name), `${path}/`)] : [path];
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), "..", ".."));
  const wikiDir = join(root, "docs", "wiki");
  const pages = new Map(readdirSync(wikiDir).filter((n) => n.endsWith(".md")).map((n) => [n, readFileSync(join(wikiDir, n), "utf8")]));
  const errors = checkWiki(pages, listEntries(join(root, "docs")));

  if (errors.length > 0) {
    console.error(errors.join("\n"));
    process.exit(1);
  }
  console.log(`Đạt: ${pages.size} trang, không có liên kết hỏng.`);
}
