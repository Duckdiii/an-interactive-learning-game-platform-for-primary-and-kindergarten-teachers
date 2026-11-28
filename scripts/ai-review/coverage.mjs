import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { filePatches, writePackage } from "./shard.mjs";
import { mergeResults } from "./merge-shards.mjs";
import { validate } from "./schema-validate.mjs";
import { Github } from "./github.mjs";

const schema = JSON.parse(readFileSync(new URL("../../.github/ai-review/review-result.schema.json", import.meta.url), "utf8"));
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

export function checkCoverage(result, files, previous, { mode, prompt, round }) {
  if (!result || validate(result, schema).length || result.mode !== mode ||
      result.prompt_version !== prompt || (result.round ?? 1) !== round ||
      (round === 1 && result.previous_findings !== undefined)) {
    return { missing: files, reason: "JSON/schema, chế độ, prompt hoặc vòng không hợp lệ", usable: false };
  }
  const scope = new Set(files);
  const reviewed = new Set(result.files_reviewed);
  const missing = files.filter((file) => !reviewed.has(file));
  if (reviewed.size !== result.files_reviewed.length || [...reviewed].some((file) => !scope.has(file)) ||
      result.findings.some(({ file }) => !reviewed.has(file))) {
    return { missing: files, reason: "Đường dẫn trùng hoặc ngoài phạm vi đã xem", usable: false };
  }
  const refs = (result.previous_findings ?? []).map(({ ref }) => ref);
  if (refs.length !== previous.length || new Set(refs).size !== refs.length || previous.some((ref) => !refs.includes(ref))) {
    return { missing, reason: "Chưa đánh giá đủ danh sách vấn đề cũ", usable: true };
  }
  const reason = missing.length ? "Thiếu file" : result.status !== "complete" ? "Agent báo incomplete" : "";
  return { missing, reason, usable: true };
}

export function retryScope(files, verdict, round) {
  return round === 1 && verdict.usable && verdict.missing.length ? verdict.missing : files;
}

export function recover(first, retry, files, previous, expected) {
  const initial = checkCoverage(first, files, previous, expected);
  if (!initial.reason) return { result: first };
  const retryFiles = retryScope(files, initial, expected.round);
  const second = checkCoverage(retry, retryFiles, previous, expected);
  if (second.reason) return { reason: second.reason, missing: second.missing };
  if (retryFiles.length === files.length) return { result: retry };
  const result = { ...mergeResults([first, retry]), status: "complete" };
  return { result };
}

export function findManualApproval(comments, manifest) {
  const { base, head, manual } = manifest;
  const sha = /^[a-f0-9]{40}$/;
  if (!sha.test(base) || !sha.test(head) || !manual.length) return null;
  const prefix = `/ai-review-manual ${base} ${head}\n`;
  const paths = new Set(manual);
  for (const comment of comments.toReversed()) {
    if (comment.author_association !== "OWNER" || comment.user?.type !== "User" ||
        !Number.isSafeInteger(comment.id) || typeof comment.body !== "string") continue;
    const body = comment.body.replaceAll("\r\n", "\n").trim();
    if (!body.startsWith(prefix)) continue;
    let files;
    try { files = JSON.parse(body.slice(prefix.length)); } catch { continue; }
    if (Array.isArray(files) && files.length === paths.size && new Set(files).size === paths.size &&
        files.every((file) => paths.has(file))) {
      return { commentId: comment.id, files: manual };
    }
  }
  return null;
}

export async function readManualApproval(github, pr, manifest) {
  if (!manifest.manual.length) return null;
  const pull = await github.getPull(pr);
  if (pull.base.sha !== manifest.base || pull.head.sha !== manifest.head || pull.state !== "open") return null;
  return findManualApproval(await github.listIssueComments(pr), manifest);
}

export function collect(manifest, load, expected, manualApproval = null) {
  const problems = manifest.manual.length && !manualApproval
    ? [{ reason: "Cần review thủ công", files: manifest.manual }]
    : [];
  const results = [];
  for (const { id, files } of manifest.parts) {
    const entry = load(id);
    if (entry?.result) {
      const checked = checkCoverage(entry.result, files, manifest.previous, expected);
      if (!checked.reason) {
        results.push(entry.result);
        continue;
      }
      problems.push({ id, reason: checked.reason, files: checked.missing });
    } else {
      problems.push({ id, reason: entry?.reason ?? "Thiếu artifact hoặc kết quả không đọc được", files: entry?.missing ?? files });
    }
  }
  const merged = !problems.length && results.length ? mergeResults(results) : null;
  return { problems, merged, manualApproval, reviewed: results.reduce((n, result) => n + result.files_reviewed.length, 0) };
}

function readAttempt(raw, outcome) {
  if (outcome === "failure") return { reason: "Claude action thất bại" };
  if (!raw) return { reason: "Agent không trả structured_output" };
  try { return { result: JSON.parse(raw) }; }
  catch { return { reason: "structured_output không phải JSON hợp lệ" }; }
}

async function main() {
  const [command, input, location] = process.argv.slice(2);
  const manifest = readJson(join(input, "manifest.json"));
  const expected = { mode: process.env.EXPECT_MODE, prompt: process.env.EXPECT_PROMPT, round: manifest.round };
  if (command === "collect") {
    if (manifest.head !== process.env.ANALYZED_SHA) throw new Error("Manifest thuộc commit khác.");
    const { GITHUB_TOKEN: token, GITHUB_REPOSITORY: repo, PR: pr } = process.env;
    const manualApproval = manifest.manual.length && token && /^[1-9]\d*$/.test(pr ?? "")
      ? await readManualApproval(new Github({ token, repo }), pr, manifest)
      : null;
    const report = collect(manifest, (id) => {
      try { return readJson(join(location, `coverage-${id}.json`)); }
      catch { return null; }
    }, expected, manualApproval);
    mkdirSync("result", { recursive: true });
    writeFileSync("result/coverage.json", JSON.stringify({ ...report, merged: undefined, head: manifest.head, skipped: manifest.skipped }, null, 2));
    if (report.merged) writeFileSync("result/review.json", JSON.stringify(report.merged));
    const lines = [
      "### AI review: độ phủ",
      `SHA: ${manifest.head} · vòng ${manifest.round} · ${report.reviewed}/${manifest.parts.reduce((n, { files }) => n + files.length, 0)} file trong gói đạt · ${manifest.skipped.length} loại trừ theo chính sách`,
      ...report.problems.map(({ id, reason, files }) => `- ${id ? `Phần ${id}: ` : ""}${reason}. File: ${JSON.stringify(files)}`),
    ];
    if (manualApproval) {
      lines.push(`- Chủ repo xác nhận review thủ công trong comment #${manualApproval.commentId}: ${JSON.stringify(manualApproval.files)}`);
    } else if (manifest.manual.length) {
      lines.push("", "Chủ repo có thể xác nhận sau khi đã kiểm tra tất cả file sau, rồi kích hoạt review lại qua label ai-review:",
        "", "~~~text", `/ai-review-manual ${manifest.base} ${manifest.head}`, JSON.stringify(manifest.manual), "~~~");
    }
    const summary = lines.join("\n") + "\n";
    console.log(summary);
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
    appendFileSync(process.env.GITHUB_OUTPUT, `ready=${Boolean(report.merged)}\n`);
    if (report.problems.length) process.exitCode = 1;
    return;
  }

  const id = Number(location);
  const part = manifest.parts.find((item) => item.id === id);
  if (!part) throw new Error("Không tìm thấy phần trong manifest.");
  const { files } = part;
  const out = join(process.env.RUNNER_TEMP ?? ".", "review-coverage");
  mkdirSync(out, { recursive: true });
  const latest = readAttempt(process.env.RESULT, process.env.AGENT_OUTCOME);
  if (command === "attempt") {
    const checked = checkCoverage(latest.result, files, manifest.previous, expected);
    if (checked.reason) {
      const patches = filePatches(readFileSync(join(input, `shard-${id}.diff`), "utf8"));
      writePackage(input, id, retryScope(files, checked, expected.round), patches);
      writeFileSync(join(out, "first.json"), JSON.stringify(latest.result ?? null));
    } else {
      writeFileSync(join(out, `coverage-${id}.json`), JSON.stringify(latest));
    }
    appendFileSync(process.env.GITHUB_OUTPUT, `retry=${Boolean(checked.reason)}\n`);
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `Phần ${id}: lần đầu ${latest.reason ?? (checked.reason || "đủ phạm vi")} · ${files.length - checked.missing.length}/${files.length} file.\n`);
    return;
  }
  if (command !== "retry") throw new Error("Lệnh kiểm tra độ phủ không hợp lệ.");
  const first = readJson(join(out, "first.json"));
  const entry = recover(first, latest.result, files, manifest.previous, expected);
  if (latest.reason) entry.reason = latest.reason;
  writeFileSync(join(out, `coverage-${id}.json`), JSON.stringify(entry));
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `Phần ${id}: lần thử lại ${entry.reason ?? "đủ phạm vi"}.\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
