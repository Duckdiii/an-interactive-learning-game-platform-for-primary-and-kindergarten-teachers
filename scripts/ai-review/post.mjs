// Đăng kết quả review lên PR. Chạy trong job `post` (không có agent, chỉ có GITHUB_TOKEN).
// Dùng: node post.mjs --result review.json --pr 12 --repo owner/name --analyzed-sha <sha> [--round 1|2 --base-sha <sha>] [--dry-run] [--force] [--out plan.json]
// Mã thoát: 0 = ổn (kể cả bỏ qua vì đã đăng), 1 = lỗi (kết quả không hợp lệ, hoặc đăng xong mà không xác nhận được).
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validate } from "./schema-validate.mjs";
import { parseDiff } from "./diff.mjs";
import { buildPlan, FP_RE } from "./plan.mjs";
import { findSummary, parseOpenFindings, parseState } from "./state.mjs";
import { Github, GithubError } from "./github.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const DEFAULT_SCHEMA = resolve(here, "..", "..", ".github", "ai-review", "review-result.schema.json");
const BOT = "github-actions[bot]";

export class PostError extends Error {}

/** Kiểm tra kết quả của agent; ném PostError nếu không đủ tin cậy để đăng. */
export function checkResult(result, schema, diff, expect = {}) {
  const errors = validate(result, schema);
  if (errors.length) throw new PostError(`Kết quả review không hợp lệ:\n- ${errors.slice(0, 10).join("\n- ")}`);
  // Schema chỉ kiểm tra định dạng của mode/prompt_version; hai giá trị này đi vào trạng thái lưu trong comment và quyết định
  // việc bỏ qua ở các lần sau, nên phải khớp với đầu vào mà job analyze đã chọn (agent không được tự đổi).
  if (expect.mode !== undefined && result.mode !== expect.mode) {
    throw new PostError(`mode trong kết quả (${result.mode}) khác chế độ đã chọn cho lần chạy (${expect.mode}).`);
  }
  if (expect.promptVersion !== undefined && result.prompt_version !== expect.promptVersion) {
    throw new PostError(`prompt_version trong kết quả (${result.prompt_version}) khác phiên bản prompt đã dùng (${expect.promptVersion}).`);
  }
  if (result.status !== "complete") throw new PostError("Agent báo status=incomplete (chưa review xong), không đăng.");
  if (diff.size > 0 && result.files_reviewed.length === 0) {
    throw new PostError("files_reviewed rỗng dù PR có thay đổi: coi là agent chưa làm việc, không đăng.");
  }
}

const ownBy = (c, bot) => c.user?.login === bot;

/**
 * @param {object} o
 * @param {object} o.result kết quả review (đã parse JSON)
 * @param {object} o.schema
 * @param {Github} o.github
 * @param {number} o.pr
 * @param {string} o.analyzedSha
 * @param {boolean} [o.dryRun]
 * @param {boolean} [o.force]
 * @param {string} [o.bot]
 * @param {number} [o.round] 1: review toàn bộ; 2: vòng 2 (do bước kiểm tra đầu job 1 quyết định, không lấy từ agent)
 * @param {string} [o.baseSha] commit đã review lần trước (chỉ vòng 2)
 * @param {string} [o.expectMode] chế độ job analyze đã chọn; kết quả không khớp thì bị từ chối
 * @param {string} [o.expectPromptVersion] version prompt job analyze đã dùng; kết quả không khớp thì bị từ chối
 * @param {number} [o.expectRuns] số lần đã chạy mà precheck đọc được; nếu trạng thái trong comment đã khác thì không đăng
 */
export async function run({ result, schema, github, pr, analyzedSha, dryRun = false, force = false, bot = BOT, round = 1, baseSha = "", expectMode, expectPromptVersion, expectRuns, log = () => {} }) {
  const [pull, diffText, reviewComments, issueComments] = await Promise.all([
    github.getPull(pr), github.getDiff(pr), github.listReviewComments(pr), github.listIssueComments(pr),
  ]);
  const diff = parseDiff(diffText);
  checkResult(result, schema, diff, { mode: expectMode, promptVersion: expectPromptVersion });

  const headSha = pull.head.sha;
  const existingSummary = findSummary(issueComments, bot);
  const state = existingSummary ? parseState(existingSummary.body) : null;
  if (!force && state && state.sha === analyzedSha && state.prompt === result.prompt_version && state.mode === result.mode) {
    log("Đã có kết quả cho cùng commit, prompt và chế độ; bỏ qua (dùng --force để chạy lại).");
    return { skipped: true };
  }

  // Chống hai lần chạy ghi đè trạng thái của nhau: kết quả này được tạo từ danh sách vấn đề mà precheck đã đọc, nên
  // nếu trạng thái trong comment đã đổi từ lúc đó (số lần chạy khác, hoặc mốc commit khác ở vòng 2) thì không đăng.
  if (expectRuns !== undefined && (state?.runs ?? 0) !== expectRuns) {
    throw new PostError(`Trạng thái trong comment tổng kết đã thay đổi từ lúc phân tích (số lần chạy ${state?.runs ?? 0}, dự kiến ${expectRuns}); có thể một lần chạy khác đang ghi cùng lúc. Không đăng để tránh ghi đè; hãy chạy lại.`);
  }
  if (round === 2 && state?.sha !== baseSha) {
    throw new PostError(`Vòng 2 so với commit ${baseSha.slice(0, 7)} nhưng trạng thái hiện tại ghi commit ${state?.sha?.slice(0, 7) ?? "(không có)"}; không đăng. Hãy chạy lại.`);
  }

  const postedFps = new Set();
  for (const c of reviewComments) {
    const m = ownBy(c, bot) && FP_RE.exec(c.body);
    if (m) postedFps.add(m[1]);
  }

  // Danh sách vấn đề còn mở của lần trước chỉ dùng ở vòng 2; dữ liệu đọc ra đã được kiểm tra schema.
  const previous = round === 2 && existingSummary ? parseOpenFindings(existingSummary.body) : null;
  const common = { result, diff, postedFps, headSha, analyzedSha, repo: github.repo, previous, round, baseSha, runs: state?.runs ?? 0 };
  let plan = buildPlan(common);
  if (dryRun) return { dryRun: true, plan };

  let reviewPosted = false;
  if (plan.inline.length > 0) {
    try {
      await github.createReview(pr, { commit_id: headSha, event: "COMMENT", body: "", comments: plan.inline });
      reviewPosted = true;
    } catch (e) {
      // Một vị trí sai làm cả request lỗi 422: chuyển mọi nhận xét sang comment tổng kết.
      if (!(e instanceof GithubError) || e.status !== 422) throw e;
      log("Review API từ chối (422); chuyển sang comment tổng kết.");
      plan = buildPlan({ ...common, disableInline: true, disableReason: "GitHub từ chối vị trí inline" });
    }
  }

  if (existingSummary) await github.updateIssueComment(existingSummary.id, plan.summary);
  else await github.createIssueComment(pr, plan.summary);

  // Kiểm tra cuối: comment tổng kết phải thật sự tồn tại với đúng commit (chống "thành công giả").
  const after = await github.listIssueComments(pr);
  const mine = findSummary(after, bot);
  const check = mine ? parseState(mine.body) : null;
  if (!check || check.sha !== analyzedSha) throw new PostError("Không xác nhận được comment tổng kết sau khi đăng.");
  return { skipped: false, reviewPosted, plan };
}

function parseArgs(argv) {
  const out = { flags: new Set() };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run" || a === "--force") out.flags.add(a.slice(2));
    else if (a.startsWith("--")) out[a.slice(2)] = argv[++i];
    else throw new Error(`Đối số lạ: ${a}`);
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  for (const k of ["result", "pr", "repo", "analyzed-sha"]) if (!args[k]) throw new Error(`Thiếu --${k}`);
  const result = JSON.parse(readFileSync(args.result, "utf8"));
  const schema = JSON.parse(readFileSync(args.schema ?? DEFAULT_SCHEMA, "utf8"));
  const github = new Github({ token: process.env.GITHUB_TOKEN, repo: args.repo });
  const out = await run({
    result, schema, github, pr: Number(args.pr), analyzedSha: args["analyzed-sha"],
    dryRun: args.flags.has("dry-run"), force: args.flags.has("force"), round: args.round === "2" ? 2 : 1, baseSha: args["base-sha"] ?? "",
    expectMode: args["expect-mode"], expectPromptVersion: args["expect-prompt"],
    expectRuns: args["expect-runs"] === undefined ? undefined : Number(args["expect-runs"]),
    log: (m) => console.log(m),
  });
  if (args.out && out.plan) writeFileSync(args.out, JSON.stringify(out.plan, null, 2));
  console.log(JSON.stringify(out.skipped ? { skipped: true, reason: "đã có kết quả cho cùng commit, prompt và chế độ; dùng force để chạy lại" } : { ...out.plan.stats, dryRun: Boolean(out.dryRun), reviewPosted: out.reviewPosted ?? false, conclusion: out.plan.conclusion }));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(e instanceof PostError || e instanceof GithubError || e instanceof Error ? e.message : String(e));
    process.exit(1);
  });
}
