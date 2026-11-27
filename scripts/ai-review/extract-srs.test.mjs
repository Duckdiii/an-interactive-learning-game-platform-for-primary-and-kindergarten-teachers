import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";
import { splitSrs, sectionOf, wholeDocument, assertExportTarget } from "./extract-srs.mjs";
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
  assert.match(files.get("FLD.md"), /FLD-30/);
  assert.match(files.get("KPI.md"), /KPI-05/);
});

function docx() {
  return resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "docs", "SRS.docx");
}

test("Markdown hiện hành có đủ 18 UC, tách biệt bản Word lịch sử 15 UC", () => {
  const dir = resolve(dirname(docx()), "srs");
  const expected = Array.from({ length: 18 }, (_, i) => `UC-${String(i + 1).padStart(2, '0')}.md`);
  assert.deepEqual(readdirSync(dir).filter(n => /^UC-\d{2}\.md$/.test(n)).sort(), expected);
  for (const name of expected) {
    assert.match(readFileSync(resolve(dir, name), 'utf8').split('\n')[0], new RegExp(name.slice(0, -3)));
  }
});

test("trích Word bỏ trang bìa; Markdown toàn văn nằm ở đường dẫn hiện hành", { skip: !existsSync(docx()) }, () => {
  assert.match(wholeDocument(docxToBlocks(readFileSync(docx()))), /^# CHƯƠNG 1\./);
  assert.ok(/^# CHƯƠNG 1\./m.test(readFileSync(resolve(dirname(docx()), 'srs/SRS-full.md'), 'utf8')));
});

test('legacy exporter requires an explicit scratch target and refuses canonical docs', () => {
  const root = resolve(dirname(docx()), '..');
  assert.throws(() => assertExportTarget(root, undefined), /explicit/);
  assert.throws(() => assertExportTarget(root, resolve(root, 'docs/srs')), /canonical/);
  assert.doesNotThrow(() => assertExportTarget(root, resolve(root, 'backend/target/srs-export')));
});

test("wholeDocument bỏ phần trước heading đầu tiên", () => {
  assert.equal(wholeDocument([p("bìa"), h(1, "Mở đầu"), p("thân")]).includes("bìa"), false);
  assert.equal(wholeDocument([p("bìa"), p("tên, mã số")]), "");
});

// ---- escCell: ký tự | trong ô bảng ----
import { escCell } from "./docx-to-markdown.mjs";

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

test("bảng sinh từ SRS thật có số cột đều nhau ở mọi dòng (không dòng nào bị lệch do ký tự |)", { skip: !existsSync(docx()) }, () => {
  const countCells = (row) => row.replace(/\\\|/g, "").split("|").length - 2;
  for (const b of docxToBlocks(readFileSync(docx()))) {
    if (b.type !== "table") continue;
    const widths = new Set(b.text.split("\n").map(countCells));
    assert.equal(widths.size, 1, `bảng có số cột không đều: ${[...widths].join(",")}\n${b.text.slice(0, 120)}`);
  }
});
