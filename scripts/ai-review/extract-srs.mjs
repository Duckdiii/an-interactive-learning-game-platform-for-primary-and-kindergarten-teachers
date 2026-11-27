// Trích một bản SRS Word bên ngoài repo thành các file Markdown theo mục.
// Dùng: node scripts/ai-review/extract-srs.mjs <đường-dẫn-docx> <thư-mục-ra>
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { docxToBlocks, blocksToMarkdown } from "./docx-to-markdown.mjs";

const UC_HEADING = /^4\.2\.\d+\.\s.*\b(UC-\d{2})\b/;

/** Cắt các khối thuộc một heading (đến heading cùng cấp hoặc cao hơn kế tiếp). */
export function sectionOf(blocks, headingPredicate) {
  const start = blocks.findIndex((b) => b.type === "heading" && headingPredicate(b));
  if (start < 0) return null;
  const level = blocks[start].level;
  let end = blocks.length;
  for (let i = start + 1; i < blocks.length; i++) {
    if (blocks[i].type === "heading" && blocks[i].level <= level) { end = i; break; }
  }
  return blocks.slice(start, end);
}

/** Đưa heading của phần cắt về cấp 1 để mỗi file tự đứng được. */
function rebase(section) {
  const delta = section[0].level - 1;
  return section.map((b) => (b.type === "heading" ? { ...b, level: Math.max(1, b.level - delta) } : b));
}

/** Trả về Map tên-file → nội dung Markdown. */
export function splitSrs(blocks) {
  const files = new Map();
  const ucIds = [];
  for (const b of blocks) {
    if (b.type === "heading" && b.level === 3) {
      const m = UC_HEADING.exec(b.text);
      if (m) ucIds.push(m[1]);
    }
  }
  for (const id of ucIds) {
    const sec = sectionOf(blocks, (h) => h.level === 3 && UC_HEADING.exec(h.text)?.[1] === id);
    files.set(`${id}.md`, blocksToMarkdown(rebase(sec)));
  }
  const extras = [
    ["NFR.md", (h) => h.level === 2 && /^3\.3\./.test(h.text)],
    ["FR-summary.md", (h) => h.level === 3 && /^3\.1\.3\./.test(h.text)],
    ["FLD.md", (h) => h.level === 3 && /^3\.1\.4\./.test(h.text)],
    ["KPI.md", (h) => h.level === 3 && /^1\.2\.3\./.test(h.text)],
  ];
  for (const [name, pred] of extras) {
    const sec = sectionOf(blocks, pred);
    if (sec) files.set(name, blocksToMarkdown(rebase(sec)));
  }
  return files;
}

/** Toàn bộ tài liệu thành Markdown, bỏ phần trước heading đầu tiên (trang bìa có họ tên, mã số sinh viên). */
export function wholeDocument(blocks) {
  const start = blocks.findIndex((b) => b.type === "heading");

  // Không có heading thì không biết đâu là hết trang bìa: thà rỗng còn hơn lộ.
  return start < 0 ? "" : blocksToMarkdown(blocks.slice(start));
}

function indexMarkdown(files) {
  const ucs = [...files.keys()].filter((n) => n.startsWith("UC-")).sort();
  return [
    "# SRS đã trích (dùng cho AI review)",
    "",
    "> Bản trích tự động từ tài liệu SRS Word được cung cấp cho script.",
    "> Sơ đồ và ảnh trong SRS không chuyển sang chữ được, chỉ còn dòng `[hình ảnh]`; xem bản Word đầu vào khi cần.",
    "",
    "## Use Case",
    ...ucs.map((n) => `- [${n.replace(".md", "")}](${n})`),
    "",
    "## Khác",
    ...["NFR.md", "FR-summary.md", "FLD.md", "KPI.md"].filter((n) => files.has(n)).map((n) => `- [${n}](${n})`),
    "",
  ].join("\n");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [, , inputPath, outputPath] = process.argv;
  if (!inputPath || !outputPath) {
    console.error("Dùng: node scripts/ai-review/extract-srs.mjs <đường-dẫn-docx> <thư-mục-ra>");
    process.exit(1);
  }
  const input = resolve(inputPath);
  const outDir = resolve(outputPath);
  const files = splitSrs(docxToBlocks(readFileSync(input)));
  mkdirSync(outDir, { recursive: true });
  for (const [name, content] of files) writeFileSync(join(outDir, name), content);
  writeFileSync(join(outDir, "README.md"), indexMarkdown(files));
  console.log(`Đã ghi ${files.size + 1} file vào ${outDir}`);
}
