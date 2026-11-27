import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";
import { splitSrs, sectionOf, wholeDocument } from "./extract-srs.mjs";
import { escCell } from "./docx-to-markdown.mjs";

const h = (level, text) => ({ type: "heading", level, text });
const p = (text) => ({ type: "para", text });

test("splitSrs tách từng UC đến heading cùng cấp kế tiếp", () => {
  const blocks = [
    h(2, "4.2. Use Case Specification"),
    h(3, "4.2.1. Đặc tả Ca sử dụng UC-01: Đăng ký"), p("nội dung 1"),
    h(3, "4.2.2. Đặc tả Ca sử dụng UC-02: Gửi mô tả"), p("nội dung 2"),
    h(2, "4.3. Sơ đồ lớp"), p("không thuộc UC"),
  ];
  const files = splitSrs(blocks);
  assert.deepEqual([...files.keys()], ["UC-01.md", "UC-02.md"]);
  assert.match(files.get("UC-01.md"), /^# 4\.2\.1\./);
  assert.match(files.get("UC-01.md"), /nội dung 1/);
  assert.doesNotMatch(files.get("UC-01.md"), /nội dung 2/);
  assert.doesNotMatch(files.get("UC-02.md"), /không thuộc UC/);
});

test("heading Sequence Diagram (4.4.x) không bị nhận nhầm là UC", () => {
  const files = splitSrs([h(3, "4.4.1. Sơ đồ Tuần tự UC-01: Đăng ký"), p("ảnh")]);
  assert.equal(files.size, 0);
});

test("sectionOf trả null khi không có heading", () => {
  assert.equal(sectionOf([p("x")], () => true), null);
});

test("SRS v3 trong project là bản Markdown có đủ chương, use case và hình", () => {
  const docs = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "docs");
  const text = readFileSync(resolve(docs, "SRS-full.md"), "utf8");
  assert.match(text, /^# CHƯƠNG 1\./);
  assert.equal(text.match(/^# CHƯƠNG \d+\./gm)?.length, 5);
  const ids = [...text.matchAll(/^### 4\.2\.\d+\..*?\b(UC-\d{2})\b/gm)].map((match) => match[1]);
  assert.deepEqual(ids, Array.from({ length: 18 }, (_, i) => `UC-${String(i + 1).padStart(2, "0")}`).filter((id) => id !== "UC-10"));
  assert.match(text, /FR-10 \/ UC-10.*đã được loại bỏ/);
  const figures = new Set(text.match(/srs-v3-assets\/media\/[^")\s]+/g));
  assert.equal(figures.size, 19);
  for (const figure of figures) assert.ok(existsSync(resolve(docs, figure)), figure);
});

test("wholeDocument bỏ phần trước heading đầu tiên", () => {
  assert.equal(wholeDocument([p("bìa"), h(1, "Mở đầu"), p("thân")]).includes("bìa"), false);
  assert.equal(wholeDocument([p("bìa"), p("tên, mã số")]), "");
});

test("escCell escape ký tự | thành \\| để không tạo thêm cột", () => {
  assert.equal(escCell("a|b"), "a\\|b");
  assert.equal(escCell("a|b|c"), "a\\|b\\|c");
  assert.equal(escCell("không có"), "không có");
  assert.equal(escCell("a|b").length, 4, "thêm đúng một ký tự backslash");
});

test("escCell escape cả backslash, ô có sẵn \\| không thành ranh giới cột", () => {
  assert.equal(escCell("a\\|b"), "a\\\\\\|b");
  assert.equal(escCell("C:\\temp"), "C:\\\\temp");
});
