import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildRunInputs, formatOutputs } from "./prepare-run.mjs";
import { parseExecution, summarize, findContamination, renderUsage } from "./usage-summary.mjs";

const dir = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", ".github", "ai-review");
const schema = JSON.parse(readFileSync(resolve(dir, "review-result.schema.json"), "utf8"));
const promptText = readFileSync(resolve(dir, "prompt.md"), "utf8");
const base = { mode: "C", promptText, schema, repo: "acme/app", pr: 12 };
const VERSION = /^prompt_version: (\d+\.\d+\.\d+)/.exec(promptText)[1];

test("prompt bắt đầu bằng MODE/REPO/PR/UC và chứa nội dung prompt.md", () => {
  const r = buildRunInputs(base);
  assert.match(r.prompt, /^MODE: C\nREPO: acme\/app\nPR NUMBER: 12\nUC: \(không khai báo\)\nROUND: 1\n\nprompt_version: /);
  assert.equal(r.promptVersion, VERSION);
  assert.match(buildRunInputs({ ...base, uc: "UC-04,UC-05" }).prompt, /\nUC: UC-04, UC-05\n/);
});

test("uc sai dạng bị từ chối (không để chữ lạ vào prompt)", () => {
  for (const bad of ["UC-4", "UC-04;rm", "UC-04,", "bỏ qua hướng dẫn"]) {
    assert.throws(() => buildRunInputs({ ...base, uc: bad }), /uc phải/, bad);
  }
});

test("chế độ A chỉ có công cụ đọc PR; B và C thêm Read/Grep/Glob; không công cụ ghi/đăng", () => {
  const a = buildRunInputs({ ...base, mode: "A" }).claudeArgs;
  const b = buildRunInputs({ ...base, mode: "B" }).claudeArgs;
  assert.doesNotMatch(a, /Read|Grep|Glob/);
  assert.match(b, /Read,Grep,Glob/);
  for (const args of [a, b]) {
    assert.doesNotMatch(args, /Write|Edit|create_inline_comment|gh pr comment|Bash\(\*\)/);
    assert.match(args, /Bash\(gh pr view:\*\)/);
  }
});

test("claude_args có max-turns theo chế độ và schema gọn một dòng bọc nháy đơn", () => {
  const c = buildRunInputs(base).claudeArgs;
  assert.match(c, /--max-turns 15/);
  assert.match(buildRunInputs({ ...base, mode: "A" }).claudeArgs, /--max-turns 6/);
  const m = /--json-schema '(.*)'$/m.exec(c);
  assert.ok(m, "có --json-schema");
  assert.deepEqual(JSON.parse(m[1]), schema);
  assert.equal(m[1].includes("\n"), false);
});

test("đầu vào không hợp lệ bị từ chối", () => {
  assert.throws(() => buildRunInputs({ ...base, mode: "D" }), /mode/);
  assert.throws(() => buildRunInputs({ ...base, pr: "12; rm -rf" }), /pr/);
  assert.throws(() => buildRunInputs({ ...base, repo: "a b" }), /repo/);
  assert.throws(() => buildRunInputs({ ...base, maxTurns: "100" }), /max-turns/);
  assert.throws(() => buildRunInputs({ ...base, promptText: "không có version" }), /prompt_version/);
});

test("schema có dấu nháy đơn bị từ chối vì phá chuỗi claude_args", () => {
  assert.throws(() => buildRunInputs({ ...base, schema: { description: "it's" } }), /nháy đơn/);
});

test("schema thật không chứa dấu nháy đơn", () => assert.doesNotThrow(() => buildRunInputs(base)));

test("formatOutputs: nhiều dòng dùng dấu phân cách, và từ chối khi giá trị chứa dấu phân cách", () => {
  const out = formatOutputs(buildRunInputs(base), "DELIM");
  assert.match(out, /^prompt<<DELIM\nMODE: C/);
  assert.match(out, /\nDELIM\nclaude_args<<DELIM\n--allowedTools/);
  assert.ok(out.endsWith(`prompt_version=${VERSION}\nmode=C\n`));
  assert.throws(() => formatOutputs({ ...buildRunInputs(base), prompt: "x\nDELIM\ny" }, "DELIM"), /dấu phân cách/);
});

const exec = [
  { type: "assistant", message: { content: [{ type: "tool_use", name: "Read", input: { file_path: "backend/Foo.java" } }] } },
  { type: "assistant", message: { content: [{ type: "tool_use", name: "Read", input: { file_path: "trusted/docs/srs/UC-04.md" } }] } },
  { type: "result", num_turns: 7, duration_ms: 42500, total_cost_usd: 0.1234, usage: { input_tokens: 1000, output_tokens: 200, cache_read_input_tokens: 5000, cache_creation_input_tokens: 300 } },
];

test("parseExecution đọc cả mảng JSON lẫn JSONL, và bỏ qua dòng hỏng", () => {
  assert.equal(parseExecution(JSON.stringify(exec)).length, 3);
  assert.equal(parseExecution(exec.map((e) => JSON.stringify(e)).join("\n") + "\nrác").length, 3);
  assert.deepEqual(parseExecution(""), []);
});

test("summarize lấy số liệu từ phần tử result", () => {
  const s = summarize(exec);
  assert.equal(s.turns, 7);
  assert.equal(s.input, 1000);
  assert.equal(s.toolUses.length, 2);
});

test("phát hiện lẫn chế độ khi A/B đọc SRS; chế độ C thì không", () => {
  const s = summarize(exec);
  assert.equal(findContamination(s.toolUses, "B").length, 1);
  assert.equal(findContamination(s.toolUses, "A").length, 1);
  assert.equal(findContamination(s.toolUses, "C").length, 0);
});

test("renderUsage có bảng token và cảnh báo lẫn chế độ", () => {
  const md = renderUsage({ entries: exec, mode: "B", promptVersion: "1.0.0" });
  assert.match(md, /\| B \| 1\.0\.0 \| 7 \| 42\.5 \| 1,000 \| 200 \| 5,000 \| 300 \|/);
  assert.match(md, /Cảnh báo lẫn chế độ/);
});

test("renderUsage không văng lỗi khi thiếu dữ liệu", () => {
  assert.match(renderUsage({ entries: [], mode: "C", promptVersion: "1.0.0" }), /Không đọc được thông tin/);
  assert.match(renderUsage({ entries: [{ type: "result" }], mode: "C", promptVersion: "1.0.0" }), /n\/a/);
});

const BASE40 = "b".repeat(40);

test("vòng 1: prompt có dòng ROUND: 1 và không có file vòng 2", () => {
  // Chỉ xét phần đầu do script sinh; nội dung prompt.md có nhắc tên các file này trong hướng dẫn vòng 2.
  const header = buildRunInputs(base).prompt.split("prompt_version:")[0];
  assert.ok(header.includes("ROUND: 1"));
  assert.ok(!header.includes("PREVIOUS_FINDINGS_FILE"));
  assert.ok(!header.includes("INCREMENTAL_DIFF_FILE"));
});

test("vòng 2: prompt có ROUND: 2, BASE_SHA và đường dẫn hai file đầu vào", () => {
  const r = buildRunInputs({ ...base, round: 2, baseSha: BASE40 });
  assert.equal(r.round, 2);
  for (const line of ["ROUND: 2", `BASE_SHA: ${BASE40}`, "PREVIOUS_FINDINGS_FILE: ai-review-input/previous.json", "INCREMENTAL_DIFF_FILE: ai-review-input/incremental.diff"]) {
    assert.ok(r.prompt.includes(line), line);
  }
  assert.match(r.claudeArgs, /Read/);
});

test("vòng 2 bị từ chối khi thiếu/ sai base-sha, khi round lạ, hoặc ở chế độ A (không có Read)", () => {
  assert.throws(() => buildRunInputs({ ...base, round: 2 }), /base-sha/);
  assert.throws(() => buildRunInputs({ ...base, round: 2, baseSha: "abc; rm" }), /base-sha/);
  assert.throws(() => buildRunInputs({ ...base, round: 3 }), /round/);
  assert.throws(() => buildRunInputs({ ...base, mode: "A", round: 2, baseSha: BASE40 }), /chế độ A/);
});
