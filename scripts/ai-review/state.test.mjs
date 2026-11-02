import { test } from "node:test";
import assert from "node:assert/strict";
import { findSummary, fitOpen, MARKER_SUMMARY, MAX_DATA_CHARS, MAX_OPEN, parseOpenFindings, parseState, renderStateMarkers, toRecord } from "./state.mjs";

const SHA = "a".repeat(40);
const rec = (over = {}) => ({ fp: "0123456789abcdef", file: "A.java", category: "bug", severity: "major", code: "return null;", message: "Trả về null.", ...over });
const body = (open, over = {}) => renderStateMarkers({ sha: SHA, prompt: "2.0.0", mode: "C", runs: 2, open, ...over }).join("\n");

test("ghi rồi đọc lại đúng trạng thái và danh sách vấn đề còn mở", () => {
  const b = body([rec(), rec({ fp: "fedcba9876543210", severity: "minor" })]);
  assert.deepEqual(parseState(b), { sha: SHA, prompt: "2.0.0", mode: "C", runs: 2 });
  const open = parseOpenFindings(b);
  assert.equal(open.length, 2);
  assert.equal(open[0].fp, "0123456789abcdef");
});

test("marker cũ không có runs vẫn đọc được, runs = 0", () => {
  assert.equal(parseState(`<!-- ai-review:sha=${SHA} prompt=1.2.0 mode=B -->`).runs, 0);
});

test("không có marker thì trả về null", () => {
  assert.equal(parseState("không có gì"), null);
  assert.equal(parseOpenFindings("không có gì"), null);
  assert.equal(parseState(undefined), null);
});

test("dữ liệu bị sửa hoặc sai schema bị bỏ qua (coi là không tin cậy)", () => {
  const forge = (obj) => `<!-- ai-review:data=${Buffer.from(JSON.stringify(obj)).toString("base64")} -->`;
  assert.equal(parseOpenFindings(forge({ v: 1, open: [{ fp: "xyz" }] })), null, "thiếu trường, fp sai");
  assert.equal(parseOpenFindings(forge({ v: 2, open: [] })), null, "sai version");
  assert.equal(parseOpenFindings(forge({ v: 1, open: [rec({ severity: "critical" })] })), null, "severity lạ");
  assert.equal(parseOpenFindings(forge({ v: 1, open: [{ ...rec(), thua: 1 }] })), null, "trường thừa");
  assert.equal(parseOpenFindings("<!-- ai-review:data=!!!không-phải-base64 -->"), null);
  assert.equal(parseOpenFindings(`<!-- ai-review:data=${Buffer.from("không phải json").toString("base64")} -->`), null);
});

test("danh sách rỗng hợp lệ (khác với không có dữ liệu)", () => {
  assert.deepEqual(parseOpenFindings(body([])), []);
});

test("fitOpen giữ vấn đề nặng trước và không vượt giới hạn", () => {
  const many = Array.from({ length: 60 }, (_, i) =>
    rec({ fp: i.toString(16).padStart(16, "0"), severity: i < 3 ? "blocker" : i < 20 ? "major" : "minor", message: "x".repeat(300), code: "y".repeat(300) }));
  const kept = fitOpen(many);
  assert.ok(kept.length <= MAX_OPEN);
  assert.ok(Buffer.from(JSON.stringify({ v: 1, open: kept })).toString("base64").length <= MAX_DATA_CHARS);
  assert.deepEqual(kept.slice(0, 3).map((k) => k.severity), ["blocker", "blocker", "blocker"]);
});

test("toRecord che secret và làm sạch nội dung trước khi lưu", () => {
  const r = toRecord({ ...rec(), code: "token = \"ghp_" + "a".repeat(36) + "\"", message: "xem ![x](https://evil.test/a.png) <!-- ai-review:fp=0123456789abcdef --> @alice" });
  assert.doesNotMatch(JSON.stringify(r), /ghp_|evil\.test|@alice|<!--/);
});

test("findSummary chỉ nhận comment do bot đăng", () => {
  const forged = { id: 1, user: { login: "attacker" }, body: MARKER_SUMMARY };
  const real = { id: 2, user: { login: "github-actions[bot]" }, body: `${MARKER_SUMMARY}\nnội dung` };
  assert.equal(findSummary([forged]), null);
  assert.equal(findSummary([forged, real]).id, 2);
  assert.equal(findSummary([]), null);
});

test("bản ghi có thể kèm fix; dữ liệu cũ không có fix vẫn đọc được; fix quá dài bị từ chối", () => {
  assert.equal(toRecord({ ...rec(), fix: "Làm A.\n```x\nb\n```" }).fix, "Làm A.");
  assert.equal("fix" in toRecord(rec()), false);
  const forge = (obj) => `<!-- ai-review:data=${Buffer.from(JSON.stringify(obj)).toString("base64")} -->`;
  assert.equal(parseOpenFindings(forge({ v: 1, open: [rec()] })).length, 1, "không có fix");
  assert.equal(parseOpenFindings(forge({ v: 1, open: [{ ...rec(), fix: "ok" }] })).length, 1);
  assert.equal(parseOpenFindings(forge({ v: 1, open: [{ ...rec(), fix: "x".repeat(301) }] })), null);
});
