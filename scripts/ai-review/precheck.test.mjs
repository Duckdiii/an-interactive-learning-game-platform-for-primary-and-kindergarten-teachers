import { test } from "node:test";
import assert from "node:assert/strict";
import { decide, DEFAULT_MAX_RUNS, MAX_INCREMENTAL_CHARS, previousFileContent } from "./precheck.mjs";
import { GithubError } from "./github.mjs";
import { renderStateMarkers, toRecord } from "./state.mjs";

const BASE = "b".repeat(40);
const HEAD = "c".repeat(40);
const rec = () => toRecord({ fp: "0123456789abcdef", file: "A.java", category: "bug", severity: "major", code: "return null;", message: "Trả về null." });
const summaryBody = (over = {}) => renderStateMarkers({ sha: BASE, prompt: "2.0.0", mode: "C", runs: 1, open: [rec()], ...over }).join("\n");
const comment = (body, login = "github-actions[bot]") => ({ id: 1, user: { login }, body });

function fakeGithub({ comments = [], compare = { status: "ahead" }, diff = "diff --git a/A.java b/A.java\n+x\n" } = {}) {
  const calls = { compare: 0, diff: 0 };
  return {
    calls,
    listIssueComments: async () => comments,
    compare: async () => { calls.compare++; if (compare instanceof Error) throw compare; return compare; },
    getCompareDiff: async () => { calls.diff++; return diff; },
  };
}
const go = (gh, over = {}) => decide({ github: gh, pr: 7, headSha: HEAD, mode: "C", trigger: "auto", promptVersion: "2.0.0", ...over });

test("lần đầu (chưa có comment tổng kết của bot): review toàn bộ", async () => {
  const d = await go(fakeGithub());
  assert.deepEqual([d.run, d.round], [true, 1]);
  assert.match(d.reason, /đầu tiên/);
});

test("chỉ comment giả của người khác thì vẫn coi là lần đầu", async () => {
  const d = await go(fakeGithub({ comments: [comment(summaryBody(), "attacker")] }));
  assert.deepEqual([d.run, d.round], [true, 1]);
});

test("cùng commit, prompt, chế độ: bỏ qua TRƯỚC khi tốn token", async () => {
  const gh = fakeGithub({ comments: [comment(summaryBody({ sha: HEAD }))] });
  const d = await go(gh);
  assert.equal(d.run, false);
  assert.match(d.reason, /force/);
  assert.equal(gh.calls.compare, 0);
});

test("force chạy lại dù cùng commit, và là review toàn bộ", async () => {
  const d = await go(fakeGithub({ comments: [comment(summaryBody({ sha: HEAD }))] }), { force: true, trigger: "dispatch" });
  assert.deepEqual([d.run, d.round], [true, 1]);
});

test("commit mới bình thường: vòng 2, kèm vấn đề cũ và diff phần mới", async () => {
  const gh = fakeGithub({ comments: [comment(summaryBody())] });
  const d = await go(gh);
  assert.deepEqual([d.run, d.round, d.baseSha, d.runs], [true, 2, BASE, 1]);
  assert.equal(d.previous.length, 1);
  assert.match(d.incrementalDiff, /A\.java/);
});

test("đã đủ số lần tự động thì bỏ qua; label hoặc chạy tay thì bỏ qua giới hạn", async () => {
  const comments = [comment(summaryBody({ runs: DEFAULT_MAX_RUNS }))];
  assert.equal((await go(fakeGithub({ comments }))).run, false);
  assert.match((await go(fakeGithub({ comments }))).reason, /label ai-review/);
  assert.equal((await go(fakeGithub({ comments }), { trigger: "label" })).round, 2);
  assert.equal((await go(fakeGithub({ comments }), { trigger: "dispatch" })).run, true);
});

test("giới hạn có thể cấu hình", async () => {
  const comments = [comment(summaryBody({ runs: 2 }))];
  assert.equal((await go(fakeGithub({ comments }), { maxRuns: 2 })).run, false);
  assert.equal((await go(fakeGithub({ comments }), { maxRuns: 3 })).run, true);
});

test("force-push/rebase: commit cũ không còn (404/422) hoặc lịch sử không còn 'ahead' thì review toàn bộ", async () => {
  const comments = [comment(summaryBody())];
  for (const compare of [new GithubError(404, "not found"), new GithubError(422, "no common ancestor"), { status: "diverged" }, { status: "behind" }]) {
    const d = await go(fakeGithub({ comments, compare }));
    assert.deepEqual([d.run, d.round], [true, 1], JSON.stringify(compare));
    assert.match(d.reason, /force-push|còn trên nhánh/);
  }
});

test("lỗi khác của GitHub khi so sánh được ném ra, không đoán", async () => {
  await assert.rejects(go(fakeGithub({ comments: [comment(summaryBody())], compare: new GithubError(500, "boom") })), /boom/);
});

test("không đọc được danh sách vấn đề cũ (dữ liệu hỏng/thiếu): review toàn bộ", async () => {
  const body = `<!-- ai-review:summary -->\n<!-- ai-review:sha=${BASE} prompt=2.0.0 mode=C runs=1 -->`;
  const d = await go(fakeGithub({ comments: [comment(body)] }));
  assert.deepEqual([d.run, d.round], [true, 1]);
});

test("danh sách vấn đề cũ rỗng vẫn là vòng 2 (cần xem phần mới)", async () => {
  const d = await go(fakeGithub({ comments: [comment(summaryBody({ open: [] }))] }));
  assert.deepEqual([d.run, d.round], [true, 2]);
  assert.deepEqual(d.previous, []);
});

test("chế độ A, đổi chế độ, đổi prompt phiên bản lớn, cùng commit nhưng đổi prompt: đều review toàn bộ", async () => {
  const comments = [comment(summaryBody())];
  assert.equal((await go(fakeGithub({ comments }), { mode: "A" })).round, 1);
  assert.equal((await go(fakeGithub({ comments }), { mode: "B" })).round, 1);
  assert.equal((await go(fakeGithub({ comments }), { promptVersion: "3.0.0" })).round, 1);
  const same = [comment(summaryBody({ sha: HEAD, prompt: "2.0.0" }))];
  const d = await go(fakeGithub({ comments: same }), { promptVersion: "2.1.0" });
  assert.deepEqual([d.run, d.round], [true, 1]);
});

test("commit mới không đổi code thì bỏ qua; diff quá lớn thì review toàn bộ", async () => {
  const comments = [comment(summaryBody())];
  assert.equal((await go(fakeGithub({ comments, diff: "  \n" }))).run, false);
  const big = await go(fakeGithub({ comments, diff: "x".repeat(MAX_INCREMENTAL_CHARS + 1) }));
  assert.deepEqual([big.run, big.round], [true, 1]);
});

test("previousFileContent chỉ gồm các trường cần thiết và dùng ref làm khóa", () => {
  const j = JSON.parse(previousFileContent(BASE, [rec()]));
  assert.equal(j.round, 2);
  assert.equal(j.base_sha, BASE);
  assert.deepEqual(Object.keys(j.findings[0]).sort(), ["category", "code", "file", "message", "ref", "severity"]);
  assert.equal(j.findings[0].ref, "0123456789abcdef");
});
