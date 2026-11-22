import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { mergeResults, readShardResults, MAX_FINDINGS } from "./merge-shards.mjs";
import { validate } from "./schema-validate.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const schema = JSON.parse(readFileSync(resolve(here, "..", "..", ".github", "ai-review", "review-result.schema.json"), "utf8"));
const finding = (id, file, severity = "minor", line = 3) => ({ id, file, line, code: "x", severity, category: "bug", message: `lỗi ${id} ở ${file}` });
const result = (over = {}) => ({
  schema_version: "1.0.0", prompt_version: "2.2.0", mode: "C", status: "complete", files_reviewed: ["a.java"],
  summary: "ổn", conclusion: "pass", uc_source: "none", uc_detected: [], findings: [], ...over,
});

test("một phần duy nhất: trả nguyên kết quả (kể cả vòng 2)", () => {
  const r = result({ round: 2, previous_findings: [] });
  assert.equal(mergeResults([r]), r);
});

test("gộp nhiều phần ra kết quả hợp lệ theo schema: file, UC, nhận xét đánh lại số", () => {
  const merged = mergeResults([
    result({ files_reviewed: ["a.java", "b.java"], findings: [finding("F1", "a.java")], uc_source: "inferred", uc_detected: ["UC-18"] }),
    result({ files_reviewed: ["c.java"], findings: [finding("F1", "c.java", "major")], uc_source: "declared", uc_detected: ["UC-18", "UC-16"] }),
  ]);
  assert.deepEqual(validate(merged, schema), []);
  assert.deepEqual(merged.files_reviewed, ["a.java", "b.java", "c.java"]);
  assert.deepEqual(merged.findings.map((f) => [f.id, f.severity]), [["F1", "major"], ["F2", "minor"]]);
  assert.equal(merged.uc_source, "declared");
  assert.deepEqual(merged.uc_detected, ["UC-18", "UC-16"]);
  assert.equal(merged.status, "complete");
  assert.match(merged.summary, /\[Phần 1\/2\].*\[Phần 2\/2\]/);
});

test("một phần chưa xong thì kết quả gộp là incomplete (post sẽ từ chối)", () => {
  assert.equal(mergeResults([result(), result({ status: "incomplete" })]).status, "incomplete");
});

test("có blocker ở bất kỳ phần nào thì kết luận fail", () => {
  assert.equal(mergeResults([result(), result({ conclusion: "fail", findings: [finding("F1", "x.java", "blocker")] })]).conclusion, "fail");
});

test("cùng một lỗi do hai phần cùng nêu chỉ giữ một", () => {
  const f = finding("F1", "a.java", "major");
  assert.equal(mergeResults([result({ findings: [f] }), result({ findings: [{ ...f, id: "F7" }] })]).findings.length, 1);
});

test("vượt trần số nhận xét thì giữ mức nặng trước và ghi vào summary", () => {
  const many = (prefix, sev) => Array.from({ length: 30 }, (_, i) => finding(`F${i + 1}`, `${prefix}${i}.java`, sev));
  const merged = mergeResults([result({ findings: many("m", "minor") }), result({ findings: many("j", "major") })]);
  assert.equal(merged.findings.length, MAX_FINDINGS);
  assert.equal(merged.findings.filter((f) => f.severity === "major").length, 30);
  assert.match(merged.summary, /20 nhận xét/);
  assert.deepEqual(validate(merged, schema), []);
});

test("không gộp khi prompt_version hoặc mode khác nhau, hay kết quả vòng 2", () => {
  assert.throws(() => mergeResults([result(), result({ prompt_version: "2.1.1" })]), /prompt_version/);
  assert.throws(() => mergeResults([result(), result({ mode: "B" })]), /mode/);
  assert.throws(() => mergeResults([result(), result({ round: 2, previous_findings: [] })]), /vòng 2/);
  assert.throws(() => mergeResults([]), /Không có kết quả/);
});

test("chạy thật: đọc các thư mục con theo thứ tự, ghi review.json hợp lệ", () => {
  const dir = mkdtempSync(join(tmpdir(), "shards-"));
  for (const [name, r] of [["ai-review-1-2", result({ files_reviewed: ["b.java"] })], ["ai-review-1-1", result({ files_reviewed: ["a.java"] })]]) {
    mkdirSync(join(dir, name));
    writeFileSync(join(dir, name, "review.json"), JSON.stringify(r));
  }
  assert.equal(readShardResults(dir).length, 2);
  const out = join(dir, "result", "review.json");
  const run = spawnSync(process.execPath, [resolve(here, "merge-shards.mjs"), "--dir", dir, "--out", out], { encoding: "utf8" });
  assert.equal(run.status, 0, run.stderr);
  assert.deepEqual(JSON.parse(readFileSync(out, "utf8")).files_reviewed, ["a.java", "b.java"]);
});

test("thiếu review.json trong một thư mục thì báo lỗi rõ", () => {
  const dir = mkdtempSync(join(tmpdir(), "shards-"));
  mkdirSync(join(dir, "ai-review-1-1"));
  assert.throws(() => readShardResults(dir), /Thiếu review\.json/);
});
