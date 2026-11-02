// Chạy ở ĐẦU job analyze, trước khi tốn token: quyết định bỏ qua, review toàn bộ (vòng 1) hay chỉ vòng 2.
// Dùng: node precheck.mjs --pr 12 --repo owner/name --head-sha <sha> --mode C --trigger auto|label|dispatch
//         --prompt-file trusted/.github/ai-review/prompt.md [--force] [--max-runs 5] [--out-dir ai-review-input]
// Ghi $GITHUB_OUTPUT: run, round, base_sha, runs, reason. Vòng 2 còn ghi previous.json và incremental.diff vào --out-dir.
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Github, GithubError } from "./github.mjs";
import { findSummary, MAX_AUTO_RUNS, parseOpenFindings, parseState } from "./state.mjs";

export const DEFAULT_MAX_RUNS = MAX_AUTO_RUNS;
// Diff quá lớn thì không đưa riêng cho agent (đằng nào cũng phải đọc nhiều); quay về review toàn bộ.
export const MAX_INCREMENTAL_CHARS = 300_000;

const major = (v) => String(v).split(".")[0];
const full = (reason, extra = {}) => ({ run: true, round: 1, reason, baseSha: "", runs: 0, previous: null, incrementalDiff: "", ...extra });
const skip = (reason, extra = {}) => ({ run: false, round: 1, reason, baseSha: "", runs: 0, previous: null, incrementalDiff: "", ...extra });

/**
 * @param {object} o
 * @param {Github} o.github
 * @param {number} o.pr
 * @param {string} o.headSha          commit mới nhất của PR (lúc bắt đầu chạy)
 * @param {"A"|"B"|"C"} o.mode
 * @param {"auto"|"label"|"dispatch"} o.trigger  auto: mở/mở lại/ready/push; label: gắn lại label (bỏ qua giới hạn số lần)
 * @param {string} o.promptVersion
 * @param {boolean} [o.force]
 * @param {number} [o.maxRuns]
 */
export async function decide({ github, pr, headSha, mode, trigger, promptVersion, force = false, maxRuns = DEFAULT_MAX_RUNS, bot = "github-actions[bot]" }) {
  const summary = findSummary(await github.listIssueComments(pr), bot);
  const state = summary ? parseState(summary.body) : null;
  if (!summary || !state) return full("lần review đầu tiên cho PR này");
  const runs = state.runs;

  if (!force) {
    if (state.sha === headSha && state.prompt === promptVersion && state.mode === mode) {
      return skip("đã có kết quả cho commit này (cùng prompt và chế độ); dùng workflow_dispatch với force để ép chạy lại", { runs });
    }
    if (trigger === "auto" && runs >= maxRuns) {
      return skip(`đã đủ ${maxRuns} lần review tự động cho PR này; gắn label ai-review để chạy tiếp`, { runs });
    }
  }

  // Từ đây quyết định giữa vòng 2 và review toàn bộ. Mặc định an toàn là review toàn bộ.
  if (force) return full("chạy lại theo yêu cầu (force)", { runs });
  if (mode === "A") return full("chế độ A không đọc được file đầu vào của vòng 2", { runs });
  if (state.mode !== mode) return full("chế độ khác lần trước", { runs });
  if (major(state.prompt) !== major(promptVersion)) return full("prompt đổi phiên bản lớn", { runs });
  if (state.sha === headSha) return full("cùng commit nhưng prompt đã đổi", { runs });

  const previous = parseOpenFindings(summary.body);
  if (previous === null) return full("không đọc được danh sách vấn đề của lần trước", { runs });

  let cmp;
  try {
    cmp = await github.compare(state.sha, headSha);
  } catch (e) {
    if (e instanceof GithubError && (e.status === 404 || e.status === 422)) return full("commit đã review lần trước không còn trên nhánh (force-push hoặc rebase)", { runs });
    throw e;
  }
  if (cmp.status !== "ahead") return full("lịch sử nhánh đã bị viết lại (force-push hoặc rebase)", { runs });

  const incrementalDiff = await github.getCompareDiff(state.sha, headSha);
  if (!incrementalDiff.trim()) return skip("commit mới không đổi code so với lần review trước", { runs });
  if (incrementalDiff.length > MAX_INCREMENTAL_CHARS) return full("phần thay đổi mới quá lớn để xem riêng", { runs });
  return { run: true, round: 2, reason: "vòng 2: kiểm tra vấn đề cũ và phần thay đổi mới", baseSha: state.sha, runs, previous, incrementalDiff };
}

/** Nội dung file previous.json đưa cho agent (dữ liệu, không phải chỉ dẫn). */
export function previousFileContent(baseSha, previous) {
  return JSON.stringify({
    round: 2,
    base_sha: baseSha,
    findings: previous.map((p) => ({ ref: p.fp, file: p.file, category: p.category, severity: p.severity, code: p.code, message: p.message })),
  }, null, 2);
}

function arg(argv, name) {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const a = process.argv.slice(2);
    const need = (k) => { const v = arg(a, k); if (!v) throw new Error(`Thiếu --${k}`); return v; };
    const promptText = readFileSync(need("prompt-file"), "utf8");
    const promptVersion = /^prompt_version: (\d+\.\d+\.\d+)/.exec(promptText)?.[1];
    if (!promptVersion) throw new Error("prompt.md thiếu prompt_version");
    const mode = need("mode");
    const trigger = need("trigger");
    if (!["A", "B", "C"].includes(mode)) throw new Error("mode không hợp lệ");
    if (!["auto", "label", "dispatch"].includes(trigger)) throw new Error("trigger không hợp lệ");
    const headSha = need("head-sha");
    if (!/^[0-9a-f]{40}$/.test(headSha)) throw new Error("head-sha không hợp lệ");
    const github = new Github({ token: process.env.GITHUB_TOKEN, repo: need("repo") });
    const d = await decide({
      github, pr: Number(need("pr")), headSha, mode, trigger, promptVersion,
      force: a.includes("--force"), maxRuns: Number(arg(a, "max-runs") ?? DEFAULT_MAX_RUNS),
    });
    if (d.run && d.round === 2) {
      const dir = resolve(arg(a, "out-dir") ?? "ai-review-input");
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, "previous.json"), previousFileContent(d.baseSha, d.previous));
      writeFileSync(join(dir, "incremental.diff"), d.incrementalDiff);
    }
    const reason = d.reason.replace(/\s+/g, " ").slice(0, 300);
    if (process.env.GITHUB_OUTPUT) {
      appendFileSync(process.env.GITHUB_OUTPUT, `run=${d.run}\nround=${d.round}\nbase_sha=${d.baseSha}\nruns=${d.runs}\nreason=${reason}\n`);
    }
    console.log(`${d.run ? "CHẠY" : "BỎ QUA"} (vòng ${d.round}): ${reason}`);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
