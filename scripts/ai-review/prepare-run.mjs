// Chuẩn bị đầu vào cho bước claude-code-action từ file prompt/schema ở thư mục tin cậy (checkout nhánh base).
// Dùng: node prepare-run.mjs --mode C --trusted trusted --repo owner/name --pr 12 [--max-turns 15] [--uc UC-04,UC-05] [--round 2 --base-sha <sha>]
// Ghi ra $GITHUB_OUTPUT: prompt, claude_args, prompt_version, mode (nhiều dòng dùng dấu phân cách ngẫu nhiên).
import { appendFileSync, readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const GH_READ = ["Bash(gh pr view:*)", "Bash(gh pr diff:*)"];
const REPO_TOOLS = ["Read", "Grep", "Glob"];
// Chế độ A chỉ thấy diff; B và C được đọc repo. Khác biệt B/C (có SRS hay không) do prompt quy định.
const TOOLS = { A: GH_READ, B: [...GH_READ, ...REPO_TOOLS], C: [...GH_READ, ...REPO_TOOLS] };
const DEFAULT_TURNS = { A: 6, B: 15, C: 15 };
// Thư mục trong workspace chứa file đầu vào của vòng 2 (do precheck.mjs ghi); agent đọc bằng Read.
export const INPUT_DIR = "ai-review-input";

function roundHeader(round, baseSha) {
  if (round === 1) return "ROUND: 1";
  return ["ROUND: 2", `BASE_SHA: ${baseSha}`, `PREVIOUS_FINDINGS_FILE: ${INPUT_DIR}/previous.json`, `INCREMENTAL_DIFF_FILE: ${INPUT_DIR}/incremental.diff`].join("\n");
}

export function buildRunInputs({ mode, promptText, schema, repo, pr, maxTurns, uc = "", round = 1, baseSha = "" }) {
  if (!["A", "B", "C"].includes(mode)) throw new Error(`mode phải là A, B hoặc C (nhận: ${mode})`);
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) throw new Error("repo phải có dạng owner/name");
  if (!/^[0-9]+$/.test(String(pr))) throw new Error("pr phải là số");
  // UC đã được extract-uc.mjs kiểm tra; ở đây chỉ chấp nhận đúng dạng để không lọt chữ lạ vào prompt.
  if (!/^(UC-\d{2}(,UC-\d{2})*)?$/.test(uc)) throw new Error("uc phải có dạng UC-01,UC-02 hoặc để trống");
  if (![1, 2].includes(round)) throw new Error("round phải là 1 hoặc 2");
  if (round === 2) {
    if (!/^[0-9a-f]{40}$/.test(baseSha)) throw new Error("vòng 2 cần base-sha hợp lệ");
    if (mode === "A") throw new Error("chế độ A không có công cụ Read nên không chạy được vòng 2");
  }
  const turns = maxTurns === undefined || maxTurns === "" ? DEFAULT_TURNS[mode] : Number(maxTurns);
  if (!Number.isInteger(turns) || turns < 1 || turns > 40) throw new Error("max-turns phải là số nguyên từ 1 đến 40");
  const version = /^prompt_version: (\d+\.\d+\.\d+)\r?\n/.exec(promptText)?.[1];
  if (!version) throw new Error("prompt.md thiếu dòng prompt_version ở đầu file");
  const compact = JSON.stringify(schema);
  // claude_args tách theo kiểu shell; dấu nháy đơn trong schema sẽ phá chuỗi bọc '...'.
  if (compact.includes("'")) throw new Error("schema chứa dấu nháy đơn, không nhúng an toàn vào claude_args");
  return {
    promptVersion: version,
    mode,
    round,
    prompt: `MODE: ${mode}\nREPO: ${repo}\nPR NUMBER: ${pr}\nUC: ${uc ? uc.split(",").join(", ") : "(không khai báo)"}\n${roundHeader(round, baseSha)}\n\n${promptText}`,
    claudeArgs: [`--allowedTools "${TOOLS[mode].join(",")}"`, `--max-turns ${turns}`, `--json-schema '${compact}'`].join("\n"),
  };
}

export function formatOutputs(inputs, delimiter = `EOF_${randomBytes(12).toString("hex")}`) {
  const multi = (k, v) => {
    if (v.includes(delimiter)) throw new Error("giá trị chứa dấu phân cách output");
    return `${k}<<${delimiter}\n${v}\n${delimiter}\n`;
  };
  return multi("prompt", inputs.prompt) + multi("claude_args", inputs.claudeArgs) + `prompt_version=${inputs.promptVersion}\nmode=${inputs.mode}\n`;
}

function arg(argv, name) {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const a = process.argv.slice(2);
    const trusted = arg(a, "trusted");
    if (!trusted) throw new Error("Thiếu --trusted");
    const dir = join(trusted, ".github", "ai-review");
    const inputs = buildRunInputs({
      mode: arg(a, "mode"),
      repo: arg(a, "repo"),
      pr: arg(a, "pr"),
      maxTurns: arg(a, "max-turns"),
      uc: arg(a, "uc") ?? "",
      round: arg(a, "round") === "2" ? 2 : 1,
      baseSha: arg(a, "base-sha") ?? "",
      promptText: readFileSync(join(dir, "prompt.md"), "utf8"),
      schema: JSON.parse(readFileSync(join(dir, "review-result.schema.json"), "utf8")),
    });
    const out = process.env.GITHUB_OUTPUT;
    if (!out) throw new Error("Không có GITHUB_OUTPUT");
    appendFileSync(out, formatOutputs(inputs));
    console.log(`Đã chuẩn bị: chế độ ${inputs.mode}, prompt ${inputs.promptVersion}`);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
