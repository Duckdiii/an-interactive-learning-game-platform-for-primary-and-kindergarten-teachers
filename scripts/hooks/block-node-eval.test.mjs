import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { blockReason, HEREDOC_MESSAGE, MAX_INLINE, MESSAGE, shouldBlock, unquotedHeredocLosesBackslash } from "./block-node-eval.mjs";

const HOOK = fileURLToPath(new URL("./block-node-eval.mjs", import.meta.url));
// Chạy hook như Claude Code: JSON trên stdin; trả về lời nhắn deny, hoặc "" nếu cho qua.
const runHook = (input) => {
  const r = spawnSync("node", [HOOK], { input, encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  return r.stdout ? JSON.parse(r.stdout).hookSpecificOutput.permissionDecisionReason : "";
};

test("chặn node -e / --eval nhiều dòng hoặc dài", () => {
  assert.equal(shouldBlock("node -e 'const a = 1;\nconsole.log(a)'"), true);
  assert.equal(shouldBlock(`node --eval "${"x".repeat(MAX_INLINE + 1)}"`), true);
  assert.equal(shouldBlock("cd backend && node --input-type=module -e '\nimport x from \"y\"'"), true);
  assert.equal(shouldBlock("node.exe --eval='a;\nb'"), true);
});

test("cho qua lệnh ngắn một dòng và lệnh chạy file", () => {
  assert.equal(shouldBlock('node -e "console.log(1)"'), false);
  assert.equal(shouldBlock("node scripts/x.mjs"), false);
  assert.equal(shouldBlock("node --test scripts/a.test.mjs scripts/b.test.mjs"), false);
  assert.equal(shouldBlock("node scripts/x.mjs | grep -e foo\nnext line"), false);
  assert.equal(shouldBlock("npx vitest run -e2e\nmore"), false);
  assert.equal(shouldBlock(""), false);
  assert.equal(shouldBlock(undefined), false);
  assert.equal(shouldBlock("node -e"), false);
});

test("chạy tuyến tính với chuỗi CodeQL báo ReDoS (node - rồi lặp '-- -')", () => {
  const evil = "node -" + "-- -".repeat(50_000);
  const t0 = performance.now();
  assert.equal(shouldBlock(evil), false);
  assert.equal(shouldBlock(evil + " -e 'a;\nb'"), true);
  assert.ok(performance.now() - t0 < 500, "phải chạy xong rất nhanh");
});

test("tuyến tính khi có rất nhiều lần `node` (reviewer: bản trước mất ~38 giây)", () => {
  const t0 = performance.now();
  assert.equal(shouldBlock("node " + "-;node ".repeat(20_000)), false);
  assert.equal(shouldBlock("node - ".repeat(50_000)), false);
  assert.ok(performance.now() - t0 < 500, "phải chạy xong rất nhanh");
});

test("vẫn tìm `node -e` nằm sau một đối số không có dấu gạch", () => {
  assert.equal(shouldBlock("node x;node -e 'a;\nb'"), true);
  assert.equal(shouldBlock("node scripts/x.mjs && node -e 'a;\nb'"), true);
  assert.equal(shouldBlock("node -a;node -e 'a;\nb'"), true);
});

test("không chặn `node -e` nằm trong lời văn của commit message nhiều dòng", () => {
  const commit = "git commit -m \"$(cat <<'EOF'\nfix(hooks): sửa lỗi\n\nTrước đây node -e x bị chặn nhầm.\nEOF\n)\"";
  assert.equal(shouldBlock(commit), false);
  assert.equal(shouldBlock("node -e 'console.log(1)' && echo 'dòng 1\ndòng 2'"), false);
});

test("chỉ đo đúng đối số code, rồi quét tiếp phần sau", () => {
  assert.equal(shouldBlock("node -e \"a;\nb\""), true);
  assert.equal(shouldBlock("node --eval='a;\nb'"), true);
  assert.equal(shouldBlock("node -e 'x'; node -e 'a;\nb'"), true);
  assert.equal(shouldBlock("git commit -m \"node -e\"; node -e 'a;\nb'"), true);
  assert.equal(shouldBlock(`node -e "a\\"b;\nc"`), true);
  // reviewer: code không nháy ngắn từng nuốt luôn `;node` phía sau
  assert.equal(shouldBlock("node -e x;node -e 'a;\nb'"), true);
  assert.equal(shouldBlock("node -e x&&node -e 'a;\nb'"), true);
  assert.equal(shouldBlock("node --eval='x' && node -e 'a;\nb'"), true);
  assert.equal(shouldBlock("node -e 'chưa đóng\nnháy"), true);
});

test("nháy $'...' và đối số ghép nhiều đoạn (KNOWN-GAPS #17)", () => {
  assert.equal(shouldBlock("node -e $'a\n" + "x".repeat(300) + "'"), true);
  assert.equal(shouldBlock("node -e $'const a = 1;\\nconsole.log(a)'"), true, "\\n trong $'...' là xuống dòng");
  assert.equal(shouldBlock(`node -e 'a'"${"x".repeat(MAX_INLINE)}"`), true, "đoạn sau của từ ghép cũng được đo");
  assert.equal(shouldBlock("node -e 'a'\"b;\nc\""), true);
  assert.equal(shouldBlock("node -e $'console.log(1)'"), false);
  assert.equal(shouldBlock("node -e 'a'\"b\" && echo ok"), false);
  assert.equal(shouldBlock("node -e $'it\\'s' && node -e 'a;\nb'"), true, "\\' trong $'...' không đóng nháy");
});

test("heredoc không nháy mà thân có chuỗi bash nuốt mất `\\` (lessons-inbox 10-13, 10-30, 11-13)", () => {
  // Bash xử lý \\ \$ \` và \ cuối dòng trong heredoc không nháy; \n, \d thì giữ nguyên.
  assert.equal(unquotedHeredocLosesBackslash("cat > a.js <<EOF\nconst re = /\\\\d+/\nEOF"), true, "\\\\");
  assert.equal(unquotedHeredocLosesBackslash("node <<EOF\nconsole.log(`\\${x}`)\nEOF"), true, "\\$");
  assert.equal(unquotedHeredocLosesBackslash("cat > a.sh <<-END\n\techo \\`date\\`\n\tEND"), true, "\\`");
  assert.equal(unquotedHeredocLosesBackslash("cat > a.txt <<EOF\ndòng một \\\ndòng hai\nEOF"), true, "\\ cuối dòng");
  // Dấu kết thúc có nháy thì thân giữ nguyên.
  for (const d of ["'EOF'", '"EOF"', "\\EOF", "E'OF'"]) {
    assert.equal(unquotedHeredocLosesBackslash(`cat > a.js <<${d}\nconst re = /\\\\d+/\nEOF`), false, d);
  }
  assert.equal(unquotedHeredocLosesBackslash("cat <<EOF\nprintf('a\\n')\nconst re = /\\d/\nEOF"), false, "\\n, \\d được giữ");
  assert.equal(unquotedHeredocLosesBackslash("grep x <<< 'a\\\\b'"), false, "here-string không phải heredoc");
  assert.equal(unquotedHeredocLosesBackslash("git commit -m \"$(cat <<'EOF'\nfix: a\\\\b\nEOF\n)\""), false);
  assert.equal(unquotedHeredocLosesBackslash("echo 'x << y'\nz \\\\ w"), false, "<< trong chuỗi nháy");
  assert.equal(unquotedHeredocLosesBackslash("cat <<EOF\nx \\\\ y\nEOF\necho \\\\ ngoài heredoc"), true);
  assert.equal(unquotedHeredocLosesBackslash("cat <<EOF\nsạch\nEOF\necho \\\\ ngoài heredoc"), false, "chỉ xét thân heredoc");
  // reviewer: các ca dưới đây diệt đột biến còn sống ở bản đầu
  assert.equal(unquotedHeredocLosesBackslash("cat <<EOF\r\nsạch\r\nEOF\r\necho \\\\ ngoài"), false, "CRLF: vẫn nhận dòng kết thúc");
  assert.equal(unquotedHeredocLosesBackslash("cat <<-END\n\tsạch\n\tEND\necho \\\\ ngoài"), false, "<<-: dòng kết thúc có tab");
  assert.equal(unquotedHeredocLosesBackslash("echo \"a << b c\"\nz \\\\ w"), false, "<< trong nháy kép không phải heredoc");
  assert.equal(unquotedHeredocLosesBackslash("cat <<'EOF'\nfoo <<BAR\nx \\\\ y\nBAR\nEOF"), false, "không quét lại thân heredoc có nháy");
  assert.equal(unquotedHeredocLosesBackslash("cat <<EOF\nx \\\\ y"), true, "heredoc chưa đóng vẫn xét thân");
});

test("main() qua stdin: đúng lời nhắn từng loại, lệnh khác và input hỏng thì cho qua", () => {
  const bash = (command) => JSON.stringify({ tool_name: "Bash", tool_input: { command } });
  assert.equal(runHook(bash("node -e 'a;\nb'")), MESSAGE);
  assert.equal(runHook(bash("cat > a.js <<EOF\nx \\\\ y\nEOF")), HEREDOC_MESSAGE);
  assert.equal(runHook(bash("ls -la")), "");
  assert.equal(runHook(JSON.stringify({ tool_name: "Write", tool_input: { command: "node -e 'a;\nb'" } })), "", "chỉ xét Bash");
  assert.equal(runHook("không phải JSON"), "");
  assert.equal(runHook("null"), "");
});

test("blockReason trả đúng lời nhắn cho từng loại", () => {
  assert.equal(blockReason("node -e 'a;\nb'"), MESSAGE);
  assert.equal(blockReason("cat > a.js <<EOF\nx \\\\ y\nEOF"), HEREDOC_MESSAGE);
  assert.equal(blockReason("ls"), null);
  assert.equal(blockReason("node -e 'a;\nb'\ncat <<EOF\nx \\\\ y\nEOF"), MESSAGE, "có cả hai thì báo node -e trước");
});
