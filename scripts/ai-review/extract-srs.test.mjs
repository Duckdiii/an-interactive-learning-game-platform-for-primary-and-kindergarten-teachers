import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";
import { splitSrs, sectionOf } from "./extract-srs.mjs";
import { docxToBlocks } from "./docx-to-markdown.mjs";

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

test("SRS.docx thật: đủ 15 UC, có NFR, UC-01 có luồng ngoại lệ", { skip: !existsSync(docx()) }, () => {
  const files = splitSrs(docxToBlocks(readFileSync(docx())));
  const ucs = [...files.keys()].filter((n) => n.startsWith("UC-")).sort();
  assert.equal(ucs.length, 15);
  assert.equal(ucs[0], "UC-01.md");
  assert.equal(ucs[14], "UC-15.md");
  assert.ok(files.has("NFR.md"));
  assert.match(files.get("UC-01.md"), /Exception Flows/);
});

function docx() {
  return resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "docs", "SRS.docx");
}

test("docs/srs/ khớp với kết quả trích từ docs/SRS.docx (nhắc chạy lại extract-srs.mjs khi sửa SRS)", { skip: !existsSync(docx()) }, () => {
  const dir = resolve(dirname(docx()), "srs");
  const expected = splitSrs(docxToBlocks(readFileSync(docx())));
  const onDisk = readdirSync(dir).filter((n) => n.endsWith(".md") && n !== "README.md").sort();
  assert.deepEqual(onDisk, [...expected.keys()].sort(), "tập file trong docs/srs/ lệch so với SRS.docx");
  const norm = (s) => s.replace(/\r\n/g, "\n");
  for (const [name, content] of expected) {
    assert.equal(norm(readFileSync(resolve(dir, name), "utf8")), norm(content), `${name} lệch; chạy: node scripts/ai-review/extract-srs.mjs`);
  }
});
