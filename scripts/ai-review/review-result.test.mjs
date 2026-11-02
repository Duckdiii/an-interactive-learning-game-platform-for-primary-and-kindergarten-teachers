import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validate } from "./schema-validate.mjs";

const dir = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", ".github", "ai-review");
const schema = JSON.parse(readFileSync(resolve(dir, "review-result.schema.json"), "utf8"));
const prompt = readFileSync(resolve(dir, "prompt.md"), "utf8");

const finding = (over = {}) => ({
  id: "F1", file: "backend/src/Foo.java", line: 12, code: "repo.save(x);",
  severity: "major", category: "transaction", message: "Thiếu @Transactional.", ...over,
});
const result = (over = {}) => ({
  schema_version: "1.0.0", prompt_version: "1.0.0", mode: "B", status: "complete",
  files_reviewed: ["backend/src/Foo.java"], summary: "Có 1 vấn đề.", conclusion: "pass",
  uc_source: "none", findings: [finding()], ...over,
});
const errs = (v) => validate(v, schema);

test("kết quả hợp lệ", () => assert.deepEqual(errs(result()), []));
test("không có finding vẫn hợp lệ", () => assert.deepEqual(errs(result({ findings: [] })), []));
test("finding không gắn dòng (line null, code rỗng) hợp lệ", () =>
  assert.deepEqual(errs(result({ findings: [finding({ line: null, code: "", category: "gap", severity: "minor", uc: ["UC-04"] })] })), []));

test("thiếu trường bắt buộc cấp cao nhất bị từ chối (chống thành công giả)", () => {
  for (const k of ["status", "files_reviewed", "summary", "conclusion", "findings", "mode", "uc_source"]) {
    const r = result();
    delete r[k];
    assert.ok(errs(r).some((e) => e.includes(`"${k}"`)), `thiếu ${k} phải báo lỗi`);
  }
});
test("output rỗng bị từ chối", () => assert.ok(errs({}).length >= 6));
test("trường lạ bị từ chối", () => assert.ok(errs(result({ extra: 1 })).length > 0));
test("severity/category/mode ngoài danh sách bị từ chối", () => {
  assert.ok(errs(result({ findings: [finding({ severity: "critical" })] })).length > 0);
  assert.ok(errs(result({ findings: [finding({ category: "style" })] })).length > 0);
  assert.ok(errs(result({ mode: "D" })).length > 0);
});
test("line phải là số nguyên >= 1 hoặc null", () => {
  assert.ok(errs(result({ findings: [finding({ line: 0 })] })).length > 0);
  assert.ok(errs(result({ findings: [finding({ line: 1.5 })] })).length > 0);
  assert.ok(errs(result({ findings: [finding({ line: "12" })] })).length > 0);
});
test("giới hạn độ dài và số lượng", () => {
  assert.ok(errs(result({ summary: "x".repeat(2001) })).length > 0);
  assert.ok(errs(result({ findings: [finding({ message: "x".repeat(1501) })] })).length > 0);
  assert.ok(errs(result({ findings: Array.from({ length: 41 }, (_, i) => finding({ id: `F${i + 1}` })) })).length > 0);
});
test("mã UC/id sai định dạng bị từ chối", () => {
  assert.ok(errs(result({ uc_detected: ["UC-1"] })).length > 0);
  assert.ok(errs(result({ findings: [finding({ id: "x1" })] })).length > 0);
});
test("uc_source chỉ nhận declared, inferred hoặc none", () => {
  for (const ok of ["declared", "inferred", "none"]) assert.deepEqual(errs(result({ uc_source: ok })), []);
  assert.ok(errs(result({ uc_source: "guess" })).length > 0);
});
test("schema_version phải là 1.0.0", () => assert.ok(errs(result({ schema_version: "2.0.0" })).length > 0));

test("validator từ chối từ khóa schema chưa hỗ trợ", () =>
  assert.throws(() => validate({}, { type: "object", oneOf: [] }), /chưa hỗ trợ/));

test("prompt.md có dòng prompt_version dạng semver ở đầu file", () =>
  assert.match(prompt, /^prompt_version: \d+\.\d+\.\d+\r?\n/));
test("prompt.md nhắc mọi category, severity và mode có trong schema", () => {
  const item = schema.properties.findings.items.properties;
  for (const c of item.category.enum) assert.ok(prompt.includes(`\`${c}\``), `prompt thiếu category ${c}`);
  for (const s of item.severity.enum) assert.ok(prompt.includes(`\`${s}\``), `prompt thiếu severity ${s}`);
  for (const u of schema.properties.uc_source.enum) assert.ok(prompt.includes(`\`${u}\``), `prompt thiếu uc_source ${u}`);
  for (const m of schema.properties.mode.enum) assert.ok(prompt.includes(`| ${m} |`), `prompt thiếu mode ${m}`);
});

test("round chỉ nhận 1 hoặc 2", () => {
  for (const ok of [1, 2]) assert.deepEqual(errs(result({ round: ok })), []);
  assert.ok(errs(result({ round: 3 })).length > 0);
  assert.ok(errs(result({ round: "2" })).length > 0);
});

test("previous_findings: ref, trạng thái và căn cứ được kiểm tra", () => {
  const ok = { ref: "0123456789abcdef", status: "resolved", evidence: "Dòng mới đã có @Transactional." };
  assert.deepEqual(errs(result({ round: 2, previous_findings: [ok] })), []);
  assert.ok(errs(result({ previous_findings: [{ ...ok, status: "fixed" }] })).length > 0, "trạng thái lạ");
  assert.ok(errs(result({ previous_findings: [{ ...ok, ref: "xyz" }] })).length > 0, "ref sai định dạng");
  assert.ok(errs(result({ previous_findings: [{ ref: ok.ref, status: "resolved" }] })).length > 0, "thiếu evidence");
  assert.ok(errs(result({ previous_findings: [{ ...ok, evidence: "x".repeat(501) }] })).length > 0, "căn cứ quá dài");
});

test("prompt.md nhắc các trạng thái của vòng 2 và các dòng đầu vào", () => {
  const statuses = schema.properties.previous_findings.items.properties.status.enum;
  for (const s of statuses) assert.ok(prompt.includes(`\`${s}\``), `prompt thiếu trạng thái ${s}`);
  for (const k of ["ROUND: 2", "PREVIOUS_FINDINGS_FILE", "INCREMENTAL_DIFF_FILE", "BASE_SHA"]) assert.ok(prompt.includes(k), `prompt thiếu ${k}`);
});

test("fix tối đa 400 ký tự và impact tối đa 300 ký tự (hướng giải quyết ngắn, không phải bài văn)", () => {
  assert.deepEqual(errs(result({ findings: [finding({ fix: "x".repeat(400), impact: "y".repeat(300) })] })), []);
  assert.ok(errs(result({ findings: [finding({ fix: "x".repeat(401) })] })).length > 0);
  assert.ok(errs(result({ findings: [finding({ impact: "y".repeat(301) })] })).length > 0);
});

test("prompt.md yêu cầu hướng giải quyết bằng lời, không code, và nhắc trường impact", () => {
  assert.ok(prompt.includes("`impact`"));
  assert.ok(prompt.includes("hướng giải quyết bằng lời"));
  assert.ok(prompt.includes("Không viết code"));
});
