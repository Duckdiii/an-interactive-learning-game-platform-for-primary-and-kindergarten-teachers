import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { checkRows, gitShaMissing, NO_ERROR, splitCells } from "./check-ai-usage-log.mjs";

const PROMPT = "**Bối cảnh:** a.<br>**Mục tiêu:** b.<br>**Kiểm chứng:** c.";
const row = (o = {}) => {
  const v = { stt: 201, date: "2026-11-14", person: "A", tool: "Claude Opus 5.5", level: "Sinh mới", scope: "`x` — y",
    prompt: PROMPT, sha: "TODO", tune: "TODO", review: "build", err: NO_ERROR, ...o };
  return `| ${v.stt} | ${v.date} | ${v.person} | ${v.tool} | ${v.level} | ${v.scope} | ${v.prompt} | ${v.sha} | ${v.tune} | ${v.review} | ${v.err} |`;
};
const check = (...lines) => checkRows(lines.map((line) => ({ source: "t", line })), { legacyMaxStt: 0, legacyRows: new Set() });
const only = (r, re) => assert.ok(r.errors.length === 1 && re.test(r.errors[0]), JSON.stringify(r.errors));

test("dòng đúng chuẩn không có lỗi", () => {
  assert.deepEqual(check(row(), row({ stt: 202, sha: "`abc1234`, `def5678` (điền sau)" })), { errors: [], warnings: [] });
});

test("splitCells bỏ qua | trong backtick và \\|", () => {
  assert.equal(splitCells("| 1 | `a|b` | c\\|d |").length, 3);
});

test("STT trùng và nhảy", () => {
  only(check(row(), row()), /trùng/);
  only(check(row(), row({ stt: 203 })), /không liên tục/);
});

test("thiếu hoặc thừa cột", () => {
  only(check(row({ scope: "a | b" })), /12 cột/);
});

test("ngày sai định dạng là lỗi, ngày lùi chỉ là nghi ngờ", () => {
  only(check(row({ date: "14/11/2026" })), /YYYY-MM-DD/);
  const r = check(row(), row({ stt: 202, date: "2026-11-01" }));
  assert.equal(r.errors.length, 0);
  assert.match(r.warnings[0], /lùi/);
});

test("người thực hiện, phiên bản model, mức độ đóng góp", () => {
  only(check(row({ person: "TODO" })), /Người thực hiện/);
  only(check(row({ tool: "Claude" })), /phiên bản/);
  only(check(row({ level: "Viết mới" })), /Mức độ/);
});

test("SHA", () => {
  only(check(row({ sha: "chưa có" })), /SHA/);
});

test("SHA đúng định dạng nhưng không có trong git là lỗi (A1: log-auditor từng phải tự bắt `deadbee`)", () => {
  const missing = (sha) => sha === "deadbee";
  const r = checkRows([{ source: "t", line: row({ sha: "`abc1234`, `deadbee` (điền sau)" }) }],
    { legacyMaxStt: 0, legacyRows: new Set(), shaMissing: missing });
  only(r, /deadbee.*không có trong git/);
  assert.deepEqual(checkRows([{ source: "t", line: row({ sha: "`abc1234`" }) }], { legacyMaxStt: 0, legacyRows: new Set(), shaMissing: missing }).errors, []);
  assert.deepEqual(check(row({ sha: "`deadbee`" })).errors, [], "không truyền shaMissing thì không kiểm (ví dụ clone nông)");
});

test("gitShaMissing đọc đúng output của git cat-file trên repo thật, bỏ qua chữ trong ngoặc", () => {
  const dir = mkdtempSync(join(tmpdir(), "ailog-"));
  try {
    const git = (...args) => execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...args], { cwd: dir, encoding: "utf8" });
    git("init", "-q");
    git("commit", "-q", "--allow-empty", "-m", "x");
    const real = git("rev-parse", "--short", "HEAD").trim();
    const missing = gitShaMissing(dir, [{ line: row({ sha: `\`${real}\`, \`deadbee\` (xem abcdef0)` }) }]);
    assert.equal(missing(real), false);
    assert.equal(missing("deadbee"), true);
    assert.equal(missing("abcdef0"), false, "SHA trong chú thích ngoặc không được đưa đi kiểm");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("cấu trúc câu lệnh chính và câu không có lỗi", () => {
  only(check(row({ prompt: "**Bối cảnh:** a.<br>**Mục tiêu:** b." })), /thiếu mục: Kiểm chứng/);
  only(check(row({ err: "Không có lỗi." })), /nguyên văn/);
  only(check(row({ err: "" })), /trống hoặc TODO/);
  only(check(row({ err: "TODO" })), /trống hoặc TODO/);
  only(check(row({ err: "Không ghi nhận hallucination của AI." })), /nguyên văn/);
});

test("dòng legacy chỉ kiểm cột cứng", () => {
  const r = checkRows([{ source: "t", line: row({ stt: 10, prompt: "mô tả tự do", err: "" }) }]);
  assert.deepEqual(r.errors, []);
});
