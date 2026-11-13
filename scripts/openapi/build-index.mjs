// Sinh docs/openapi/INDEX.md: bảng "operation / schema nằm ở dòng nào" của openapi.yaml,
// để agent đọc đúng đoạn cần (Read offset/limit) thay vì nạp cả file.
// Dùng: node scripts/openapi/build-index.mjs          (ghi INDEX.md)
//       node scripts/openapi/build-index.mjs --check  (exit 1 nếu INDEX.md cũ)
// Không dùng thư viện YAML: openapi.yaml có bố cục cố định (path 2 dấu cách, method 4, thuộc tính 6).
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const METHOD = /^    (get|post|put|patch|delete):\s*$/;

/** Gom các khối con liên tiếp: mỗi khối kéo dài đến dòng ngay trước khối kế tiếp (bỏ dòng trống cuối). */
function withRanges(starts, endLimit, lines) {
  return starts.map((s, i) => {
    let end = (i + 1 < starts.length ? starts[i + 1].line : endLimit) - 1;
    while (end > s.line && !lines[end - 1].trim()) end--;
    return { ...s, from: s.line, to: end };
  });
}

export function buildIndex(text) {
  const lines = text.split("\n");
  const top = [];
  lines.forEach((l, i) => /^[A-Za-z-]/.test(l) && top.push({ key: l.split(":")[0], line: i + 1 }));
  const sec = (k) => top.find((t) => t.key === k);
  const secEnd = (k) => (top[top.indexOf(sec(k)) + 1]?.line ?? lines.length + 1);

  const ops = [];
  const pathStarts = [];
  for (let i = sec("paths").line; i < secEnd("paths") - 1; i++) {
    const m = /^  (\/\S*):\s*$/.exec(lines[i]);
    if (m) pathStarts.push({ path: m[1], line: i + 1 });
  }
  const methodStarts = [];
  pathStarts.forEach((p, pi) => {
    const stop = (pathStarts[pi + 1]?.line ?? secEnd("paths")) - 1;
    for (let i = p.line; i < stop; i++) {
      const m = METHOD.exec(lines[i]);
      if (m) methodStarts.push({ path: p.path, method: m[1].toUpperCase(), line: i + 1 });
    }
  });
  // Dòng khai báo path cũng là ranh giới, để operation cuối của path không "nuốt" dòng path kế tiếp.
  const bounded = [...methodStarts, ...pathStarts.map((p) => ({ ...p, boundary: true }))].sort((a, b) => a.line - b.line);
  for (const o of withRanges(bounded, secEnd("paths"), lines).filter((r) => !r.boundary)) {
    const body = lines.slice(o.from, o.to);
    const pick = (k) => body.find((l) => l.startsWith(`      ${k}:`))?.split(":").slice(1).join(":").trim() ?? "";
    ops.push({ ...o, id: pick("operationId"), status: pick("x-status").replace(/\s+#.*$/, ""), summary: pick("summary") });
  }

  const comps = [];
  const compFrom = sec("components").line;
  const subs = [];
  for (let i = compFrom; i < secEnd("components") - 1; i++) {
    const m = /^  (\w+):\s*$/.exec(lines[i]);
    if (m) subs.push({ kind: m[1], line: i + 1 });
  }
  subs.forEach((s, si) => {
    const stop = (subs[si + 1]?.line ?? secEnd("components")) - 1;
    const items = [];
    for (let i = s.line; i < stop; i++) {
      const m = /^    ([\w.-]+):/.exec(lines[i]);
      if (m) items.push({ kind: s.kind, name: m[1], line: i + 1 });
    }
    comps.push(...withRanges(items, stop + 1, lines));
  });

  const range = (o) => `${o.from}–${o.to}`;
  return [
    "# Chỉ mục `openapi.yaml`",
    "",
    "> Sinh tự động bởi `node scripts/openapi/build-index.mjs`. Không sửa tay; sửa `openapi.yaml` xong thì chạy lại lệnh này (có test kiểm INDEX còn mới).",
    "> Dùng để đọc đúng đoạn cần (`Read` với `offset`/`limit`) thay vì nạp cả file. Nguồn sự thật vẫn là `openapi.yaml`.",
    "",
    "## Phần đầu file",
    "",
    ...top.filter((t) => ["info", "servers", "tags", "paths", "components"].includes(t.key)).map((t) => `- \`${t.key}\`: dòng ${t.line}–${secEnd(t.key) - 1}`),
    "",
    "## Operation",
    "",
    "| Method | Path | operationId | x-status | Dòng |",
    "|---|---|---|---|---|",
    ...ops.map((o) => `| ${o.method} | \`${o.path}\` | ${o.id} | ${o.status} | ${range(o)} |`),
    "",
    "## Components",
    "",
    "| Loại | Tên | Dòng |",
    "|---|---|---|",
    ...comps.map((c) => `| ${c.kind} | \`${c.name}\` | ${range(c)} |`),
    "",
  ].join("\n");
}

function main() {
  const dir = resolve(dirname(fileURLToPath(import.meta.url)), "../../docs/openapi");
  const next = buildIndex(readFileSync(join(dir, "openapi.yaml"), "utf8"));
  const target = join(dir, "INDEX.md");
  if (process.argv.includes("--check")) {
    const cur = (() => { try { return readFileSync(target, "utf8"); } catch { return ""; } })();
    if (cur.replace(/\r\n/g, "\n") !== next) { console.error("docs/openapi/INDEX.md đã cũ: chạy node scripts/openapi/build-index.mjs"); process.exit(1); }
    return;
  }
  writeFileSync(target, next);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
