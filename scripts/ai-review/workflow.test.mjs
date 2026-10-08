// Kiểm tra các bất biến bảo mật của .github/workflows/ai-review.yml bằng phân tích văn bản
// (không có YAML parser trong repo). Không thay thế actionlint nhưng chặn các sai sót nguy hiểm khi sửa workflow.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const file = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", ".github", "workflows", "ai-review.yml");
const text = readFileSync(file, "utf8").replace(/\r\n/g, "\n");
const lines = text.split("\n");

function jobBlock(name) {
  const start = lines.findIndex((l) => l === `  ${name}:`);
  assert.ok(start >= 0, `không thấy job ${name}`);
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) if (/^  [\w-]+:/.test(lines[i])) { end = i; break; }
  return lines.slice(start, end).join("\n");
}
const analyze = jobBlock("analyze");
const post = jobBlock("post");

/** Nội dung các khối `run: |` (đến khi thụt lề giảm). */
function runBlocks() {
  const blocks = [];
  for (let i = 0; i < lines.length; i++) {
    const m = /^(\s*)run: \|\s*$/.exec(lines[i]);
    if (!m) continue;
    const indent = m[1].length;
    const body = [];
    for (let j = i + 1; j < lines.length && (lines[j].trim() === "" || lines[j].search(/\S/) > indent); j++) body.push(lines[j]);
    blocks.push(body.join("\n"));
  }
  return blocks;
}

test("không dùng pull_request_target hay workflow_run", () => {
  assert.doesNotMatch(text, /^\s*pull_request_target:/m);
  assert.doesNotMatch(text, /^\s*workflow_run:/m);
});

test("mọi action đều pin theo SHA 40 ký tự", () => {
  const uses = lines.filter((l) => /^\s*-?\s*(name: .*\n)?\s*uses:|^\s*-\s*uses:|^\s+uses:/.test(l));
  assert.ok(uses.length >= 5);
  for (const l of uses) assert.match(l, /uses: [\w.-]+\/[\w.-]+@[0-9a-f]{40}\b/, `chưa pin SHA: ${l.trim()}`);
});

test("job analyze chỉ có quyền đọc", () => {
  assert.match(analyze, /contents: read/);
  assert.match(analyze, /pull-requests: read/);
  const noComments = analyze.split("\n").filter((l) => !l.trim().startsWith("#")).join("\n");
  assert.doesNotMatch(noComments, /: write/);
});

test("job post có pull-requests: write nhưng không chạy agent và không có token Claude", () => {
  assert.match(post, /pull-requests: write/);
  assert.doesNotMatch(post, /claude-code-action/);
  assert.doesNotMatch(post, /CLAUDE_CODE_OAUTH_TOKEN|ANTHROPIC_API_KEY/);
});

test("OAuth token chỉ xuất hiện đúng một lần, trong job analyze", () => {
  assert.equal((text.match(/secrets\.CLAUDE_CODE_OAUTH_TOKEN/g) ?? []).length, 1);
  assert.match(analyze, /secrets\.CLAUDE_CODE_OAUTH_TOKEN/);
});

test("bước agent truyền github_token tường minh (không dùng token của Claude GitHub App)", () => {
  assert.match(analyze, /github_token: \$\{\{ secrets\.GITHUB_TOKEN \}\}/);
});

test("mọi checkout đều tắt persist-credentials", () => {
  const checkouts = (text.match(/uses: actions\/checkout@/g) ?? []).length;
  const off = (text.match(/persist-credentials: false/g) ?? []).length;
  assert.ok(checkouts >= 3);
  assert.equal(off, checkouts);
});

test("script/prompt/schema lấy từ thư mục trusted (base), checkout từ base.sha hoặc ref chạy workflow", () => {
  assert.equal((text.match(/path: trusted/g) ?? []).length, 2, "cả hai job đều checkout trusted");
  // hai checkout trusted (analyze, post) và bước boot kiểm tra cùng một ref bằng API
  assert.equal((text.match(/github\.event\.pull_request\.base\.sha \|\| github\.sha/g) ?? []).length, 3);
  for (const b of runBlocks()) {
    for (const m of b.matchAll(/\bnode\s+(?!-e\b)(\S+)/g)) assert.match(m[1], /^trusted\/scripts\/ai-review\//, `chạy script ngoài trusted: ${m[1]}`);
  }
});

test("không nội suy ${{ }} trực tiếp trong khối run (chống injection); dữ liệu đi qua env", () => {
  for (const b of runBlocks()) assert.doesNotMatch(b, /\$\{\{/);
});

test("concurrency tách theo label và run_id để label khác/chạy lặp không hủy lẫn nhau", () => {
  const g = /^  group: (.*)$/m.exec(text)[1];
  assert.match(g, /github\.event\.label\.name/);
  assert.match(g, /github\.run_id/);
  assert.match(g, /pr_number|pull_request\.number/);
});

test("điều kiện job analyze: label ai-review, không draft, không fork, không dependabot", () => {
  const cond = /if: >-\n([\s\S]*?)\n    runs-on/.exec(analyze)[1];
  assert.match(cond, /label\.name == 'ai-review'/);
  assert.match(cond, /draft == false/);
  assert.match(cond, /head\.repo\.full_name == github\.repository/);
  assert.match(cond, /dependabot\[bot\]/);
});

test("PR đã đóng chỉ được chạy dry_run; kết quả phải hợp lệ JSON trước khi đăng", () => {
  assert.match(text, /PR không còn mở: chỉ được chạy với dry_run=true/);
  assert.match(text, /structured_output không phải JSON hợp lệ/);
  assert.match(text, /Agent không trả structured_output/);
});

test("job post chỉ chạy khi analyze thành công, và có timeout", () => {
  assert.match(post, /needs: analyze/);
  assert.match(post, /needs\.analyze\.result == 'success'/);
  assert.match(analyze, /timeout-minutes:/);
  assert.match(post, /timeout-minutes:/);
});

test("tự chạy khi mở/mở lại/ready/có commit mới, và có label ai-review để chạy tiếp", () => {
  const types = /^    types: \[(.*)\]$/m.exec(text)[1].split(",").map((t) => t.trim());
  for (const t of ["opened", "reopened", "ready_for_review", "synchronize", "labeled"]) assert.ok(types.includes(t), `thiếu ${t}`);
});

test("commit mới được chờ gom push, và lần chạy bị thay thế thì các bước tốn kém bị bỏ qua", () => {
  assert.match(analyze, /id: wait/);
  assert.match(analyze, /ACTION" = "synchronize"/);
  assert.match(analyze, /sleep "\$DEBOUNCE_SECONDS"/);
  assert.match(analyze, /DEBOUNCE_SECONDS: "\d+"/);
  // checkout và bước precheck chỉ chạy khi chưa bị commit mới hơn thay thế
  const gated = analyze.split("\n").filter((l) => l.includes("steps.wait.outputs.superseded != 'true'")).length;
  assert.ok(gated >= 3, "hai checkout và precheck phải có điều kiện superseded");
});

test("precheck chạy trước agent; mọi bước tốn token chỉ chạy khi precheck cho phép", () => {
  const iPre = analyze.indexOf("id: pre");
  const iClaude = analyze.indexOf("id: claude");
  assert.ok(iPre > 0 && iClaude > iPre, "precheck phải đứng trước agent");
  for (const id of ["uc", "prep", "claude"]) {
    const block = analyze.slice(analyze.indexOf(`id: ${id}`), analyze.indexOf(`id: ${id}`) + 160);
    assert.match(block, /steps\.pre\.outputs\.run == 'true'/, `bước ${id} phải có điều kiện run`);
  }
  assert.match(analyze, /precheck\.mjs/);
});

test("job post chỉ chạy khi precheck quyết định chạy, và nhận vòng và mốc commit từ precheck (không từ agent)", () => {
  assert.match(post, /needs\.analyze\.outputs\.run == 'true'/);
  assert.match(post, /ROUND: \$\{\{ needs\.analyze\.outputs\.round \}\}/);
  assert.match(post, /BASE_SHA: \$\{\{ needs\.analyze\.outputs\.base_sha \}\}/);
  assert.ok(post.includes('[ "$ROUND" = "2" ] && args+=(--round 2 --base-sha "$BASE_SHA")'));
});

test("giới hạn số lần tự động và quyết định vòng nằm trong precheck (code), có timeout đủ cho thời gian chờ", () => {
  const timeout = Number(/timeout-minutes: (\d+)/.exec(analyze)[1]);
  const debounce = Number(/DEBOUNCE_SECONDS: "(\d+)"/.exec(analyze)[1]);
  assert.ok(timeout * 60 > debounce + 20 * 60, "timeout phải lớn hơn thời gian chờ cộng thời gian chạy agent");
});

test("bỏ qua PR chỉ đụng tài liệu bằng paths-ignore", () => {
  assert.match(text, /paths-ignore:\n\s+- "\*\*\/\*\.md"\n\s+- "docs\/\*\*"/);
});

test("sự kiện labeled chỉ chạy với label ai-review", () => {
  const cond = /if: >-\n([\s\S]*?)\n    runs-on/.exec(analyze)[1];
  assert.match(cond, /github\.event\.action != 'labeled' \|\| github\.event\.label\.name == 'ai-review'/);
});

test("khi bỏ qua vì đã có kết quả, job summary ghi rõ lý do thay vì im lặng", () => {
  assert.ok(post.includes(`grep -q '"skipped":true' result/post-result.json`));
  assert.ok(post.includes("Bỏ qua:** đã có kết quả AI review cho commit này"));
});

test("nhánh base chưa có hệ thống thì bỏ qua nhẹ nhàng: kiểm tra bằng API trước mọi bước tốn kém, không báo lỗi đỏ", () => {
  assert.match(analyze, /id: boot/);
  // kiểm tra đủ ba file cần có ở nhánh base
  for (const f of ["scripts/ai-review/precheck.mjs", ".github/ai-review/prompt.md", ".github/ai-review/review-result.schema.json"]) {
    assert.ok(analyze.includes(f), `boot phải kiểm tra ${f}`);
  }
  // boot đứng trước bước chờ, hai checkout và precheck; các bước đó chỉ chạy khi ready
  const iBoot = analyze.indexOf("id: boot");
  for (const id of ["wait", "pre"]) {
    const at = analyze.indexOf(`id: ${id}`);
    assert.ok(at > iBoot, `${id} phải đứng sau boot`);
    assert.match(analyze.slice(at, at + 200), /steps\.boot\.outputs\.ready == 'true'/, `bước ${id} phải có điều kiện ready`);
  }
  const gatedCheckouts = analyze.split("\n").filter((l) => l.includes("steps.boot.outputs.ready == 'true' && steps.wait.outputs.superseded != 'true'")).length;
  assert.ok(gatedCheckouts >= 3, "hai checkout và precheck phải có điều kiện ready và superseded");
  // bước boot không được làm job thất bại và phải để lại lời giải thích
  assert.ok(analyze.slice(iBoot, analyze.indexOf("id: wait")).includes("Bỏ qua:"));
  // chỉ 404 mới là "chưa có hệ thống"; lỗi khác (xác thực, giới hạn tốc độ, 5xx) phải làm job thất bại để chạy lại
  const boot = analyze.slice(iBoot, analyze.indexOf("id: wait"));
  assert.ok(boot.includes('grep -q "HTTP 404"'), "phải phân biệt 404");
  assert.ok(boot.includes("lỗi không phải 404"));
  const after404 = boot.slice(boot.indexOf('grep -q "HTTP 404"'), boot.indexOf("else", boot.indexOf('grep -q "HTTP 404"')));
  assert.ok(!after404.includes("exit 1"), "nhánh 404 không được làm job thất bại");
  assert.match(boot.slice(boot.indexOf("else", boot.indexOf('grep -q "HTTP 404"'))), /exit 1/);
});

test("dependabot được xác định theo tác giả PR (user.login), không theo người kích hoạt (github.actor)", () => {
  const noComments = text.split("\n").filter((l) => !l.trim().startsWith("#")).join("\n");
  assert.doesNotMatch(noComments, /github\.actor/, "github.actor là người gắn label, không phải tác giả PR");
  const cond = /if: >-\n([\s\S]*?)\n    runs-on/.exec(analyze)[1];
  assert.match(cond, /github\.event\.pull_request\.user\.login != 'dependabot\[bot\]'/);
  // chạy tay không đi qua điều kiện job, nên bước ctx và boot phải kiểm tra lại tác giả
  assert.match(analyze, /\.user\.login/);
  assert.match(analyze, /author_ok/);
  assert.match(analyze, /AUTHOR_OK/);
});

test("chạy thật bằng workflow_dispatch chỉ được từ nhánh mặc định (chỉ dry_run mới được từ nhánh khác)", () => {
  const ctx = analyze.slice(analyze.indexOf("id: ctx"), analyze.indexOf("id: boot"));
  assert.match(ctx, /DEFAULT_BRANCH: \$\{\{ github\.event\.repository\.default_branch \}\}/);
  assert.match(ctx, /REF: \$\{\{ github\.ref \}\}/);
  assert.ok(ctx.includes('"$EVENT" = "workflow_dispatch"') && ctx.includes('"$DRY_RUN" != "true"') && ctx.includes('refs/heads/${DEFAULT_BRANCH}'));
});

test("mọi lần chạy có ghi lên PR dùng chung nhóm concurrency; chỉ dry_run mới có nhóm riêng theo run_id", () => {
  const g = /^  group: (.*)$/m.exec(text)[1];
  assert.match(g, /github\.event_name == 'workflow_dispatch' && inputs\.dry_run && github\.run_id/);
});

test("job post truyền chế độ, version prompt và số lần chạy do job analyze quyết định", () => {
  for (const k of ["--expect-mode", "--expect-prompt", "--expect-runs"]) assert.ok(post.includes(k), `post thiếu ${k}`);
  assert.match(analyze, /runs: \$\{\{ steps\.pre\.outputs\.runs \}\}/);
  assert.match(post, /EXPECT_RUNS: \$\{\{ needs\.analyze\.outputs\.runs \}\}/);
});
