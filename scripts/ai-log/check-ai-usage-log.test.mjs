import assert from "node:assert/strict";
import test from "node:test";
import { checkRows, NO_ERROR, splitCells } from "./check-ai-usage-log.mjs";

const PROMPT = "**Bối cảnh:** a.<br>**Mục tiêu:** b.<br>**Kiểm chứng:** c.";
const row = (o = {}) => {
  const v = { stt: 201, date: "2026-11-14", person: "A", tool: "Claude Opus 5.5", level: "Sinh mới", scope: "`x` — y",
    prompt: PROMPT, sha: "TODO", tune: "TODO", review: "build", err: NO_ERROR, ...o };
  return `| ${v.stt} | ${v.date} | ${v.person} | ${v.tool} | ${v.level} | ${v.scope} | ${v.prompt} | ${v.sha} | ${v.tune} | ${v.review} | ${v.err} |`;
};
const check = (...lines) => checkRows(lines.map((line) => ({ source: "t", line })), { legacyMaxStt: 0, legacyRows: new Set() });
const only = (r, re) => assert.ok(r.errors.length === 1 && re.test(r.errors[0]), JSON.stringify(r.errors));

test("dòng đúng chuẩn không có lỗi", () => {
  assert.deepEqual(check(row(), row({ stt: 202, sha: "`abc1234`, `def5678` (điền sau)" })), { errors: [], warnings: [] });
});

test("splitCells bỏ qua | trong backtick và \\|", () => {
  assert.equal(splitCells("| 1 | `a|b` | c\\|d |").length, 3);
});

test("STT trùng và nhảy", () => {
  only(check(row(), row()), /trùng/);
  only(check(row(), row({ stt: 203 })), /không liên tục/);
});

test("thiếu hoặc thừa cột", () => {
  only(check(row({ scope: "a | b" })), /12 cột/);
});

test("ngày sai định dạng là lỗi, ngày lùi chỉ là nghi ngờ", () => {
  only(check(row({ date: "14/11/2026" })), /YYYY-MM-DD/);
  const r = check(row(), row({ stt: 202, date: "2026-11-01" }));
  assert.equal(r.errors.length, 0);
  assert.match(r.warnings[0], /lùi/);
});

test("người thực hiện, phiên bản model, mức độ đóng góp", () => {
  only(check(row({ person: "TODO" })), /Người thực hiện/);
  only(check(row({ tool: "Claude" })), /phiên bản/);
  only(check(row({ level: "Viết mới" })), /Mức độ/);
});

test("SHA", () => {
  only(check(row({ sha: "chưa có" })), /SHA/);
});

test("cấu trúc câu lệnh chính và câu không có lỗi", () => {
  only(check(row({ prompt: "**Bối cảnh:** a.<br>**Mục tiêu:** b." })), /thiếu mục: Kiểm chứng/);
  only(check(row({ err: "Không có lỗi." })), /nguyên văn/);
  only(check(row({ err: "" })), /trống hoặc TODO/);
  only(check(row({ err: "TODO" })), /trống hoặc TODO/);
  only(check(row({ err: "Không ghi nhận hallucination của AI." })), /nguyên văn/);
});

test("dòng legacy chỉ kiểm cột cứng", () => {
  const r = checkRows([{ source: "t", line: row({ stt: 10, prompt: "mô tả tự do", err: "" }) }]);
  assert.deepEqual(r.errors, []);
});
