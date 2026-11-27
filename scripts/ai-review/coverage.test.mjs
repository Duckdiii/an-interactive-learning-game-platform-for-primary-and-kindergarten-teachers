import { test } from "node:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { checkCoverage, collect, recover, retryScope } from "./coverage.mjs";

const expected = { mode: "C", prompt: "2.3.0", round: 1 };
const result = (files, fields = {}) => ({
  schema_version: "1.0.0", mode: "C", prompt_version: "2.3.0",
  status: "complete", files_reviewed: files, summary: "Kết quả thử.",
  conclusion: "pass", uc_source: "none", findings: [], ...fields,
});

test("agent tự báo complete nhưng thiếu file thì chỉ chạy lại file còn thiếu", () => {
  const files = ["A.java", "B.java"];
  const first = result([files[0]]);
  const check = checkCoverage(first, files, [], expected);
  assert.equal(check.reason, "Thiếu file");
  assert.deepEqual(retryScope(files, check, 1), ["B.java"]);
  const recovered = recover(first, result([files[1]]), files, [], expected);
  assert.deepEqual(recovered.result.files_reviewed, files);
  assert.equal(recovered.result.status, "complete");
});

test("lỗi Claude được thử lại một lần và không thể thành công khi vẫn thiếu file", () => {
  const files = ["A.java"];
  assert.deepEqual(recover(undefined, result(files), files, [], expected).result.files_reviewed, files);
  assert.deepEqual(recover(undefined, result([]), files, [], expected).missing, files);
});

test("file ngoài phạm vi, file trùng và finding ngoài file đã xem bị loại", () => {
  const files = ["A.java", "B.java"];
  const finding = { id: "F1", file: "B.java", line: null, code: "", severity: "minor", category: "bug", message: "Thiếu kiểm tra." };
  for (const bad of [result(["C.java"]), result(["A.java", "A.java"]), result(["A.java"], { findings: [finding] })]) {
    assert.equal(checkCoverage(bad, files, [], expected).usable, false);
  }
});

test("post cần đủ artifact và đủ file từng phần, kể cả khi phần khác hợp lệ", () => {
  const manifest = { parts: [{ id: 1, files: ["A.java"] }, { id: 2, files: ["B.java"] }], manual: [], previous: [] };
  for (const second of [null, { result: result([]) }]) {
    const report = collect(manifest, (id) => id === 1 ? { result: result(["A.java"]) } : second, expected);
    assert.equal(report.merged, null);
    assert.equal(report.reviewed, 1);
    assert.deepEqual(report.problems[0].files, ["B.java"]);
  }
  const load = (id) => ({ result: result([id === 1 ? "A.java" : "B.java"]) });
  assert.equal(collect(manifest, load, expected).merged.status, "complete");
  assert.equal(collect({ ...manifest, manual: ["large.java"] }, load, expected).merged, null);
});

test("vòng 2 kiểm đủ cả file mới lẫn vấn đề cũ và retry giữ phạm vi vòng 2", () => {
  const round2 = { ...expected, round: 2 };
  const files = ["A.java"];
  const previous = ["0123456789abcdef"];
  const missing = result(files, { round: 2 });
  const checked = checkCoverage(missing, files, previous, round2);
  assert.match(checked.reason, /vấn đề cũ/);
  assert.deepEqual(retryScope(files, checked, 2), files);
  const complete = result(files, {
    round: 2, previous_findings: [{ ref: previous[0], status: "still_present", evidence: "" }],
  });
  assert.equal(recover(missing, complete, files, previous, round2).result, complete);
});

test("gộp artifact tải phẳng với một hoặc nhiều phần", () => {
  for (const count of [1, 2]) {
    const cwd = mkdtempSync(join(tmpdir(), "review-coverage-"));
    mkdirSync(join(cwd, "input"));
    mkdirSync(join(cwd, "shards"));
    const parts = Array.from({ length: count }, (_, i) => ({ id: i + 1, files: [`F${i}.java`] }));
    const sha = "a".repeat(40);
    writeFileSync(join(cwd, "input", "manifest.json"), JSON.stringify({
      head: sha, round: 1, parts, manual: [], skipped: [], previous: [],
    }));
    for (const { id, files } of parts) {
      writeFileSync(join(cwd, "shards", `coverage-${id}.json`), JSON.stringify({ result: result(files) }));
    }
    const run = spawnSync(process.execPath, [
      fileURLToPath(new URL("./coverage.mjs", import.meta.url)), "collect", "input", "shards",
    ], {
      cwd, encoding: "utf8", env: {
        ...process.env, EXPECT_MODE: expected.mode, EXPECT_PROMPT: expected.prompt, ANALYZED_SHA: sha,
        GITHUB_OUTPUT: join(cwd, "outputs"), GITHUB_STEP_SUMMARY: join(cwd, "summary"),
      },
    });
    assert.equal(run.status, 0, run.stderr);
    assert.match(readFileSync(join(cwd, "outputs"), "utf8"), /ready=true/);
    assert.deepEqual(JSON.parse(readFileSync(join(cwd, "result", "review.json"), "utf8")).files_reviewed,
      parts.flatMap(({ files }) => files));
  }
});
