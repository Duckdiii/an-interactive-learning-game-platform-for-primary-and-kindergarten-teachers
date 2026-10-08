import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { run, PostError } from "./post.mjs";
import { GithubError, Github } from "./github.mjs";

const schema = JSON.parse(readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", ".github", "ai-review", "review-result.schema.json"), "utf8"));
const SHA = "c".repeat(40);
const DIFF = [
  "diff --git a/Svc.java b/Svc.java", "--- a/Svc.java", "+++ b/Svc.java",
  "@@ -1,2 +1,3 @@", " class Svc {", "+  repo.save(x);", " }",
].join("\n") + "\n";

/** GitHub giả lưu trong bộ nhớ: đủ để kiểm tra luồng đăng, đăng lại và lỗi. */
class FakeGithub {
  constructor({ head = SHA, rejectReview = false, dropSummary = false } = {}) {
    this.repo = "acme/app";
    this.head = head;
    this.rejectReview = rejectReview;
    this.dropSummary = dropSummary;
    this.reviews = [];
    this.reviewComments = [];
    this.issueComments = [];
    this.nextId = 1;
    this.writes = 0;
  }
  async getPull() { return { head: { sha: this.head } }; }
  async getDiff() { return DIFF; }
  async listReviewComments() { return this.reviewComments; }
  async listIssueComments() { return this.issueComments; }
  async createReview(_n, payload) {
    this.writes++;
    if (this.rejectReview) throw new GithubError(422, "Unprocessable");
    this.reviews.push(payload);
    for (const c of payload.comments) this.reviewComments.push({ id: this.nextId++, user: { login: "github-actions[bot]" }, body: c.body });
  }
  async createIssueComment(_n, body) {
    this.writes++;
    if (!this.dropSummary) this.issueComments.push({ id: this.nextId++, user: { login: "github-actions[bot]" }, body });
  }
  async updateIssueComment(id, body) {
    this.writes++;
    this.issueComments.find((c) => c.id === id).body = body;
  }
}

const finding = (over = {}) => ({
  id: "F1", file: "Svc.java", line: 2, code: "repo.save(x);", severity: "major", category: "transaction", message: "Thiếu transaction.", ...over,
});
const result = (over = {}) => ({
  schema_version: "1.0.0", prompt_version: "1.0.0", mode: "C", status: "complete",
  files_reviewed: ["Svc.java"], summary: "Có 1 vấn đề.", conclusion: "pass", uc_source: "none", findings: [finding()], ...over,
});
const go = (gh, over = {}) => run({ result: result(), schema, github: gh, pr: 7, analyzedSha: SHA, ...over });

test("đăng một review inline và một comment tổng kết", async () => {
  const gh = new FakeGithub();
  const out = await go(gh);
  assert.equal(out.reviewPosted, true);
  assert.equal(gh.reviews.length, 1);
  assert.equal(gh.reviews[0].event, "COMMENT");
  assert.equal(gh.reviews[0].commit_id, SHA);
  assert.equal(gh.reviews[0].comments.length, 1);
  assert.equal(gh.issueComments.length, 1);
});

test("chạy lại cùng commit/prompt/chế độ thì bỏ qua, không ghi gì", async () => {
  const gh = new FakeGithub();
  await go(gh);
  const writes = gh.writes;
  const out = await go(gh);
  assert.equal(out.skipped, true);
  assert.equal(gh.writes, writes);
});

test("--force chạy lại nhưng không đăng trùng inline; cập nhật comment cũ thay vì tạo mới", async () => {
  const gh = new FakeGithub();
  await go(gh);
  const out = await go(gh, { force: true });
  assert.equal(out.skipped, false);
  assert.equal(gh.reviews.length, 1, "không tạo review thứ hai");
  assert.equal(gh.reviewComments.length, 1);
  assert.equal(gh.issueComments.length, 1, "cập nhật comment tổng kết cũ");
  assert.match(gh.issueComments[0].body, /trùng với lần trước/);
});

test("commit mới sau lần review trước: tổng kết được cập nhật, inline cũ không đăng lại", async () => {
  const gh = new FakeGithub();
  await go(gh);
  const out = await run({ result: result(), schema, github: gh, pr: 7, analyzedSha: "d".repeat(40) });
  assert.equal(out.skipped, false);
  assert.equal(gh.reviews.length, 1);
  assert.equal(gh.issueComments.length, 1);
});

test("PR có commit mới giữa hai job: không inline, chỉ tổng kết", async () => {
  const gh = new FakeGithub({ head: "e".repeat(40) });
  const out = await go(gh);
  assert.equal(out.reviewPosted, false);
  assert.equal(gh.reviews.length, 0);
  assert.match(gh.issueComments[0].body, /commit cũ/);
});

test("Review API trả 422: chuyển mọi nhận xét sang comment tổng kết, không thất bại", async () => {
  const gh = new FakeGithub({ rejectReview: true });
  const out = await go(gh);
  assert.equal(out.reviewPosted, false);
  assert.match(gh.issueComments[0].body, /GitHub từ chối vị trí inline/);
  assert.match(gh.issueComments[0].body, /Thiếu transaction/);
});

test("lỗi khác 422 của Review API được ném ra", async () => {
  const gh = new FakeGithub();
  gh.createReview = async () => { throw new GithubError(500, "boom"); };
  await assert.rejects(go(gh), /boom/);
});

test("dry-run không ghi gì lên GitHub", async () => {
  const gh = new FakeGithub();
  const out = await go(gh, { dryRun: true });
  assert.equal(out.dryRun, true);
  assert.equal(gh.writes, 0);
  assert.equal(out.plan.inline.length, 1);
});

test("kết quả sai schema bị từ chối trước khi ghi", async () => {
  const gh = new FakeGithub();
  const bad = result();
  delete bad.summary;
  await assert.rejects(go(gh, { result: bad }), (e) => e instanceof PostError && /summary/.test(e.message));
  assert.equal(gh.writes, 0);
});

test("status incomplete bị từ chối", async () => {
  await assert.rejects(go(new FakeGithub(), { result: result({ status: "incomplete" }) }), /incomplete/);
});

test("files_reviewed rỗng dù PR có diff bị từ chối (thành công giả)", async () => {
  const gh = new FakeGithub();
  await assert.rejects(go(gh, { result: result({ files_reviewed: [], findings: [] }) }), /files_reviewed rỗng/);
  assert.equal(gh.writes, 0);
});

test("đăng xong mà không xác nhận được comment tổng kết thì lỗi (kiểm tra cuối)", async () => {
  await assert.rejects(go(new FakeGithub({ dropSummary: true })), /Không xác nhận được/);
});

test("chỉ tin comment do bot đăng khi tìm marker; người khác giả marker không làm mất nhận xét", async () => {
  const gh = new FakeGithub();
  gh.reviewComments.push({ id: 99, user: { login: "attacker" }, body: "<!-- ai-review:fp=0123456789abcdef -->" });
  gh.issueComments.push({ id: 98, user: { login: "attacker" }, body: `<!-- ai-review:summary -->\n<!-- ai-review:sha=${SHA} prompt=1.0.0 mode=C -->` });
  const out = await go(gh);
  assert.equal(out.skipped, false);
  assert.equal(gh.reviews.length, 1);
  assert.equal(gh.issueComments.length, 2, "tạo comment tổng kết riêng của bot");
});

test("không có finding vẫn đăng tổng kết", async () => {
  const gh = new FakeGithub();
  const out = await go(gh, { result: result({ findings: [], summary: "Không phát hiện vấn đề đáng kể." }) });
  assert.equal(out.reviewPosted, false);
  assert.equal(gh.reviews.length, 0);
  assert.equal(gh.issueComments.length, 1);
});

test("Github client: từ chối thiếu token/repo sai, và không lộ token trong lỗi", async () => {
  assert.throws(() => new Github({ token: "", repo: "a/b" }), /GITHUB_TOKEN/);
  assert.throws(() => new Github({ token: "t", repo: "sai" }), /owner\/name/);
  const fakeToken = "z".repeat(30); // giá trị giả đơn giản, không giống secret thật
  const gh = new Github({
    token: fakeToken, repo: "a/b",
    fetchImpl: async () => ({ ok: false, status: 403, json: async () => ({ message: "forbidden" }) }),
  });
  await assert.rejects(gh.getPull(1), (e) => e.status === 403 && !e.message.includes(fakeToken));
});

test("Github client: phân trang đến khi hết", async () => {
  const pages = [Array(100).fill({ id: 1 }), Array(3).fill({ id: 2 })];
  let calls = 0;
  const gh = new Github({
    token: "t", repo: "a/b",
    fetchImpl: async () => ({ ok: true, status: 200, json: async () => pages[calls++] }),
  });
  assert.equal((await gh.listIssueComments(1)).length, 103);
  assert.equal(calls, 2);
});

// ---- Vòng 2 qua toàn bộ luồng đăng ----
import { parseOpenFindings, parseState } from "./state.mjs";

const SHA2 = "d".repeat(40);
const round2 = (gh, prevFp, status, evidence, extra = {}) =>
  run({
    result: result({ findings: [], previous_findings: [{ ref: prevFp, status, evidence }], round: 2, ...extra }),
    schema, github: gh, pr: 7, analyzedSha: SHA2, round: 2, baseSha: SHA,
  });

test("vòng 2: commit mới đánh dấu vấn đề cũ đã xử lý, cập nhật đúng một comment tổng kết và không đăng thêm inline", async () => {
  const gh = new FakeGithub();
  await go(gh);
  const [first] = parseOpenFindings(gh.issueComments[0].body);
  assert.equal(parseState(gh.issueComments[0].body).runs, 1);

  gh.head = SHA2;
  const out = await round2(gh, first.fp, "resolved", "Đã thêm @Transactional.");
  assert.equal(out.skipped, false);
  assert.equal(gh.reviews.length, 1, "không tạo review mới");
  assert.equal(gh.issueComments.length, 1, "sửa comment cũ, không tạo cái mới");
  const body = gh.issueComments[0].body;
  assert.match(body, /Vòng 2: kiểm tra vấn đề cũ/);
  assert.match(body, /\*\*Đã xử lý \(1\)\*\*/);
  assert.equal(parseState(body).runs, 2);
  assert.equal(parseState(body).sha, SHA2);
  assert.deepEqual(parseOpenFindings(body), []);
});

test("vòng 2: vấn đề vẫn còn thì được giữ trong danh sách còn mở cho lần sau", async () => {
  const gh = new FakeGithub();
  await go(gh);
  const [first] = parseOpenFindings(gh.issueComments[0].body);
  gh.head = SHA2;
  await round2(gh, first.fp, "still_present", "Vẫn thiếu.");
  assert.deepEqual(parseOpenFindings(gh.issueComments[0].body).map((o) => o.fp), [first.fp]);
  assert.match(gh.issueComments[0].body, /\*\*Vẫn còn \(1\)\*\*/);
});

test("vòng 2 nhưng không đọc được dữ liệu lần trước: chạy như vòng 1, không bịa trạng thái", async () => {
  const gh = new FakeGithub();
  gh.issueComments.push({ id: 50, user: { login: "github-actions[bot]" }, body: `<!-- ai-review:summary -->\n<!-- ai-review:sha=${SHA} prompt=1.0.0 mode=C runs=1 -->` });
  gh.head = SHA2;
  await round2(gh, "0123456789abcdef", "resolved", "x");
  assert.doesNotMatch(gh.issueComments[0].body, /Vòng 2/);
  assert.equal(parseState(gh.issueComments[0].body).runs, 2);
});

test("vòng 2: dữ liệu trong comment của người khác (giả mạo) không được dùng", async () => {
  const gh = new FakeGithub();
  const forged = { id: 60, user: { login: "attacker" }, body: `<!-- ai-review:summary -->\n<!-- ai-review:sha=${SHA} prompt=1.0.0 mode=C runs=1 -->` };
  gh.issueComments.push(forged);
  // Vòng 2 mà bot không có trạng thái hợp lệ nào (chỉ có comment giả): không đăng, không sửa comment giả.
  gh.head = SHA2;
  await assert.rejects(round2(gh, "0123456789abcdef", "resolved", "x"), /Vòng 2 so với commit/);
  assert.equal(gh.writes, 0);
  assert.equal(gh.issueComments[0].body, forged.body);
  // Vòng 1 bình thường: bot tạo comment riêng của mình, comment giả bị bỏ qua.
  const gh1 = new FakeGithub();
  gh1.issueComments.push(forged);
  await go(gh1);
  assert.equal(gh1.issueComments.length, 2, "bot tạo comment riêng, không sửa comment giả");
  assert.equal(gh1.issueComments[0].body, forged.body);
});

test("dry-run vòng 2 không ghi gì và không tăng bộ đếm", async () => {
  const gh = new FakeGithub();
  await go(gh);
  const before = gh.issueComments[0].body;
  const [first] = parseOpenFindings(before);
  gh.head = SHA2;
  const out = await run({
    result: result({ findings: [], previous_findings: [{ ref: first.fp, status: "resolved", evidence: "ok" }], round: 2 }),
    schema, github: gh, pr: 7, analyzedSha: SHA2, round: 2, baseSha: SHA, dryRun: true,
  });
  assert.equal(out.dryRun, true);
  assert.equal(gh.issueComments[0].body, before);
  assert.equal(parseState(out.plan.summary).runs, 2, "kế hoạch ghi runs mới nhưng chưa đăng");
});

// ---- Ràng buộc đầu vào từ job analyze và chống ghi đè trạng thái ----
test("kết quả có mode hoặc prompt_version khác đầu vào của job analyze bị từ chối, không ghi gì", async () => {
  const gh = new FakeGithub();
  await assert.rejects(go(gh, { expectMode: "B" }), /mode trong kết quả \(C\) khác chế độ đã chọn cho lần chạy \(B\)/);
  await assert.rejects(go(gh, { expectPromptVersion: "9.9.9" }), /prompt_version trong kết quả \(1\.0\.0\) khác/);
  assert.equal(gh.writes, 0);
  const ok = await go(gh, { expectMode: "C", expectPromptVersion: "1.0.0" });
  assert.equal(ok.skipped, false);
});

test("trạng thái trong comment đã đổi từ lúc phân tích (lần chạy khác ghi cùng lúc) thì không đăng", async () => {
  const gh = new FakeGithub();
  await go(gh); // lần 1 ghi runs=1
  gh.head = SHA2;
  const writes = gh.writes;
  // precheck đã đọc runs=0 (trước lần 1) nhưng hiện trạng thái là runs=1
  await assert.rejects(
    run({ result: result(), schema, github: gh, pr: 7, analyzedSha: SHA2, expectRuns: 0 }),
    /Trạng thái trong comment tổng kết đã thay đổi/,
  );
  assert.equal(gh.writes, writes);
  // khớp thì đăng bình thường
  const out = await run({ result: result(), schema, github: gh, pr: 7, analyzedSha: SHA2, expectRuns: 1 });
  assert.equal(out.skipped, false);
});

test("lần đầu (chưa có comment) khớp expectRuns = 0", async () => {
  const gh = new FakeGithub();
  const out = await go(gh, { expectRuns: 0 });
  assert.equal(out.skipped, false);
});

test("vòng 2: mốc commit trong trạng thái khác mốc mà precheck đã dùng thì không đăng", async () => {
  const gh = new FakeGithub();
  await go(gh);
  const [first] = parseOpenFindings(gh.issueComments[0].body);
  gh.head = SHA2;
  const writes = gh.writes;
  await assert.rejects(
    run({
      result: result({ findings: [], previous_findings: [{ ref: first.fp, status: "resolved", evidence: "ok" }], round: 2 }),
      schema, github: gh, pr: 7, analyzedSha: SHA2, round: 2, baseSha: "9".repeat(40),
    }),
    /Vòng 2 so với commit/,
  );
  assert.equal(gh.writes, writes);
});

test("bỏ qua vì đã review commit này được xét trước kiểm tra số lần chạy (không báo lỗi oan)", async () => {
  const gh = new FakeGithub();
  await go(gh);
  const out = await go(gh, { expectRuns: 0 });
  assert.equal(out.skipped, true);
});
