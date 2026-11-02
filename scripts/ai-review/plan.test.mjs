import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPlan, fingerprint, MAX_INLINE, STATE_RE } from "./plan.mjs";
import { parseDiff } from "./diff.mjs";

const SHA = "a".repeat(40);
const diff = parseDiff([
  "diff --git a/Svc.java b/Svc.java", "--- a/Svc.java", "+++ b/Svc.java",
  "@@ -1,2 +1,4 @@", " class Svc {", "+  repo.save(x);", "+  other.call();", " }",
  "diff --git a/Ctl.java b/Ctl.java", "--- a/Ctl.java", "+++ b/Ctl.java",
  "@@ -1 +1,2 @@", " class Ctl {", "+  return entity;",
].join("\n") + "\n");

const f = (over = {}) => ({
  id: "F1", file: "Svc.java", line: 2, code: "  repo.save(x);", severity: "major", category: "transaction",
  message: "Thiếu transaction.", ...over,
});
const res = (findings, over = {}) => ({
  schema_version: "1.0.0", prompt_version: "1.0.0", mode: "C", status: "complete",
  files_reviewed: ["Svc.java", "Ctl.java"], summary: "Tóm tắt.", conclusion: "pass", uc_source: "declared", uc_detected: ["UC-07"], findings, ...over,
});
const plan = (findings, { result: resultOver, ...o } = {}) =>
  buildPlan({ result: res(findings, resultOver), diff, postedFps: new Set(), headSha: SHA, analyzedSha: SHA, repo: "acme/app", ...o });

test("finding hợp lệ trở thành inline với marker fingerprint", () => {
  const p = plan([f()]);
  assert.equal(p.inline.length, 1);
  assert.equal(p.inline[0].path, "Svc.java");
  assert.equal(p.inline[0].line, 2);
  assert.equal(p.inline[0].side, "RIGHT");
  assert.match(p.inline[0].body, new RegExp(`<!-- ai-review:fp=${fingerprint("Svc.java", "transaction", "repo.save(x);")} -->`));
});

test("agent nêu sai số dòng nhưng code khớp một dòng khác: định vị lại", () => {
  const p = plan([f({ line: 4 })]);
  assert.equal(p.inline[0].line, 2);
});

test("code không khớp dòng nào trong diff: vào tổng kết, không inline", () => {
  const p = plan([f({ code: "không tồn tại();" })]);
  assert.equal(p.inline.length, 0);
  assert.match(p.summary, /dòng không khớp với diff/);
});

test("file không có trong diff: vào tổng kết", () => {
  const p = plan([f({ file: "Other.java" })]);
  assert.equal(p.inline.length, 0);
  assert.equal(p.stats.inSummaryOnly, 1);
});

test("minor, gap/suggestion và line null chỉ vào tổng kết", () => {
  const p = plan([
    f({ id: "F1", severity: "minor" }),
    f({ id: "F2", line: null, code: "", category: "gap", severity: "major" }),
  ]);
  assert.equal(p.inline.length, 0);
  assert.equal(p.stats.inSummaryOnly, 2);
  assert.match(p.summary, /không gắn dòng cụ thể/);
  assert.match(p.summary, /mức độ nhỏ/);
});

test("gap/suggestion nằm trong mục riêng 'Đối chiếu SRS', tách khỏi lỗi code", () => {
  const p = plan([
    f({ id: "F1", severity: "minor", category: "bug", message: "Lỗi nhỏ." }),
    f({ id: "F2", line: null, code: "", category: "gap", severity: "major", message: "Thiếu luồng 4a." }),
    f({ id: "F3", line: null, code: "", category: "suggestion", severity: "minor", message: "Gợi ý UX." }),
  ]);
  // Mục "Bước tiếp theo" ở đầu liệt kê mọi vấn đề còn mở; chỉ xét phần chi tiết từ "Nhận xét khác" trở đi.
  const details = p.summary.slice(p.summary.indexOf("### Nhận xét khác"));
  const [codePart, srsPart] = details.split("### Đối chiếu SRS (chỉ để tham khảo) (2)");
  assert.match(codePart, /### Nhận xét khác \(1\)[\s\S]*Lỗi nhỏ/);
  assert.doesNotMatch(codePart, /Thiếu luồng 4a/);
  assert.match(srsPart, /Thiếu luồng 4a[\s\S]*Gợi ý UX/);
  assert.equal(p.conclusion, "pass", "gap/suggestion không làm kết luận thành Chưa đạt");
});

test("giới hạn số inline, ưu tiên blocker rồi major", () => {
  const cats = ["bug", "security", "transaction", "n_plus_one", "exception", "architecture", "contract", "ux"];
  const items = [];
  for (const [i, c] of cats.entries()) {
    items.push(f({ id: `F${i + 1}`, category: c, severity: "major" }));
    items.push(f({ id: `F${i + 20}`, category: c, severity: "major", file: "Ctl.java", line: 2, code: "return entity;" }));
  }
  items.push(f({ id: "F99", category: "bug", severity: "blocker", line: 3, code: "other.call();" }));
  const p = plan(items);
  assert.equal(p.inline.length, MAX_INLINE);
  assert.equal(p.inlineMeta[0].severity, "blocker");
  assert.match(p.summary, /vượt giới hạn 8/);
});

test("fingerprint đã đăng ở lần trước thì không đăng lại", () => {
  const fp = fingerprint("Svc.java", "transaction", "repo.save(x);");
  const p = plan([f()], { postedFps: new Set([fp]) });
  assert.equal(p.inline.length, 0);
  assert.equal(p.stats.duplicates, 1);
  assert.match(p.summary, /trùng với lần trước/);
});

test("fingerprint không đổi khi số dòng dịch hoặc khoảng trắng đổi; đổi khi code đổi", () => {
  assert.equal(fingerprint("A", "bug", "  x  =  1;"), fingerprint("A", "bug", "x = 1;"));
  assert.notEqual(fingerprint("A", "bug", "x = 1;"), fingerprint("A", "bug", "x = 2;"));
  assert.notEqual(fingerprint("A", "bug", "x"), fingerprint("A", "security", "x"));
});

test("hai finding cùng fingerprint trong một lần chạy chỉ đăng một", () => {
  const p = plan([f({ id: "F1" }), f({ id: "F2", message: "Diễn đạt khác." })]);
  assert.equal(p.inline.length, 1);
  assert.equal(p.stats.duplicates, 1);
});

test("PR đã có commit mới: không inline, có cảnh báo, marker ghi SHA đã phân tích", () => {
  const p = plan([f()], { headSha: "b".repeat(40) });
  assert.equal(p.inline.length, 0);
  assert.equal(p.stats.stale, true);
  assert.match(p.summary, /commit cũ/);
  assert.equal(STATE_RE.exec(p.summary)[1], SHA);
});

test("disableInline đưa nhận xét vào tổng kết kèm lý do", () => {
  const p = plan([f()], { disableInline: true, disableReason: "GitHub từ chối vị trí inline" });
  assert.equal(p.inline.length, 0);
  assert.match(p.summary, /GitHub từ chối vị trí inline/);
});

test("kết luận do code tính lại từ findings, không tin trường của agent", () => {
  assert.equal(plan([f({ severity: "blocker" })], { result: { conclusion: "pass" } }).conclusion, "fail");
  assert.equal(plan([f()], { result: { conclusion: "fail" } }).conclusion, "pass");
  assert.match(plan([f({ severity: "blocker" })]).summary, /Chưa đạt/);
});

test("văn bản agent được làm sạch trong inline và tổng kết", () => {
  const evil = "xem ![x](https://evil.test/a.png) <!-- ai-review:fp=0123456789abcdef --> @alice ghp_" + "a".repeat(36);
  const p = plan([f({ message: evil, fix: evil })], { result: { summary: evil } });
  for (const t of [p.inline[0].body, p.summary]) {
    assert.doesNotMatch(t, /evil\.test|@alice|ghp_/);
  }
  // marker thật của script là marker duy nhất
  assert.equal((p.inline[0].body.match(/ai-review:fp=/g) ?? []).length, 1);
});

test("ghi chú file chưa được agent xem", () => {
  const p = plan([], { result: { files_reviewed: ["Svc.java"] } });
  assert.match(p.summary, /chưa được agent xem: `Ctl\.java`/);
});

test("tổng kết không vượt giới hạn độ dài của GitHub", () => {
  const long = Array.from({ length: 40 }, (_, i) => f({ id: `F${i + 1}`, severity: "minor", message: "x".repeat(1500), category: "suggestion", line: null, code: "" }));
  assert.ok(plan(long).summary.length <= 60100);
});

const gap = (over = {}) => f({ id: "F9", line: null, code: "", category: "gap", severity: "major", message: "Thiếu luồng 4a.", ...over });

test("UC suy luận (inferred): gap/suggestion bị hạ xuống minor, ghi chú và nhãn 'suy luận tự động'", () => {
  const p = plan([gap(), gap({ id: "F10", category: "suggestion", severity: "major", message: "Gợi ý." })], { result: { uc_source: "inferred" } });
  assert.equal(p.stats.downgradedSrs, 2);
  assert.match(p.summary, /\| 0 \| 0 \| 2 \|/, "cả hai đã về minor");
  assert.match(p.summary, /suy luận tự động, có thể sai/);
  assert.match(p.summary, /được hạ mức độ/);
});

test("UC suy luận: lỗi code (không phải gap/suggestion) giữ nguyên mức độ", () => {
  const p = plan([f({ severity: "major" }), gap()], { result: { uc_source: "inferred" } });
  assert.equal(p.inline.length, 1);
  assert.equal(p.inlineMeta[0].severity, "major");
});

test("UC khai báo (declared): gap không bao giờ là blocker và không làm kết luận Chưa đạt", () => {
  const p = plan([gap({ severity: "blocker" })], { result: { uc_source: "declared" } });
  assert.equal(p.conclusion, "pass");
  assert.match(p.summary, /\| 0 \| 1 \| 0 \|/);
  assert.match(p.summary, /khai báo trong PR/);
});

test("không xác định được UC (none) hoặc thiếu trường: bỏ gap/suggestion, giữ lỗi code", () => {
  for (const uc_source of ["none", undefined]) {
    const p = plan([f({ id: "F1" }), gap(), gap({ id: "F10", category: "suggestion" })], { result: { uc_source, uc_detected: [] } });
    assert.equal(p.stats.findings, 1);
    assert.equal(p.stats.droppedSrs, 2);
    assert.match(p.summary, /bị bỏ vì không xác định được UC/);
    assert.doesNotMatch(p.summary, /Đối chiếu SRS/);
  }
});

test("blocker thật ở lỗi code vẫn làm kết luận Chưa đạt dù UC suy luận", () => {
  assert.equal(plan([f({ severity: "blocker" })], { result: { uc_source: "inferred" } }).conclusion, "fail");
});

const dupDiff = (offset = 0) =>
  parseDiff([
    "diff --git a/Dup.java b/Dup.java", "--- a/Dup.java", "+++ b/Dup.java",
    `@@ -1,1 +1,${5 + offset} @@`,
    ...Array.from({ length: offset }, (_, i) => `+  // dòng chèn thêm ${i}`),
    " class Dup {", "+  return null;", "+  int x = 1;", "+  return null;", " }",
  ].join("\n") + "\n");
const nullFinding = (id, line) => f({ id, file: "Dup.java", line, code: "return null;", category: "bug", message: `Trả về null (${id}).` });
const dupPlan = (postedFps = new Set(), offset = 0, lines = [2 + offset, 4 + offset]) =>
  buildPlan({ result: res([nullFinding("F1", lines[0]), nullFinding("F2", lines[1])]), diff: dupDiff(offset), postedFps, headSha: SHA, analyzedSha: SHA, repo: "acme/app" });

test("hai dòng giống hệt nhau trong cùng file (ví dụ 2 chỗ 'return null;') không bị coi là trùng", () => {
  const p = dupPlan();
  assert.equal(p.inline.length, 2);
  assert.equal(p.stats.duplicates, 0);
  assert.notEqual(p.inlineMeta[0].fp, p.inlineMeta[1].fp);
  assert.deepEqual(p.inline.map((i) => i.line).sort(), [2, 4]);
});

test("fingerprint của hai dòng giống nhau vẫn ổn định khi diff dịch số dòng; đã đăng dòng đầu thì chỉ đăng dòng sau", () => {
  const first = dupPlan();
  const shifted = dupPlan(new Set(), 3);
  assert.deepEqual(first.inlineMeta.map((m) => m.fp), shifted.inlineMeta.map((m) => m.fp));
  const again = dupPlan(new Set([first.inlineMeta[0].fp]));
  assert.equal(again.inline.length, 1);
  assert.equal(again.stats.duplicates, 1);
  assert.equal(again.inline[0].line, 4);
});

test("agent ghi sai số dòng cho dòng giống hệt: vẫn định vị về dòng gần nhất và không mất nhận xét nào", () => {
  const p = dupPlan(new Set(), 0, [1, 5]);
  assert.equal(p.inline.length, 2);
});

test("occurrence 0 không đổi chuỗi băm (tương thích với fingerprint một dòng)", () => {
  assert.equal(fingerprint("A", "bug", "x"), fingerprint("A", "bug", "x", 0));
  assert.notEqual(fingerprint("A", "bug", "x", 1), fingerprint("A", "bug", "x", 0));
});

// ---- Vòng 2: đối chiếu vấn đề cũ ----
import { parseOpenFindings, parseState, toRecord } from "./state.mjs";

const FP_TX = fingerprint("Svc.java", "transaction", "repo.save(x);");
const FP_EX = "aaaaaaaaaaaaaaaa";
const prior = (over = {}) => [
  toRecord({ fp: FP_TX, file: "Svc.java", category: "transaction", severity: "major", code: "repo.save(x);", message: "Thiếu transaction." }),
  toRecord({ fp: FP_EX, file: "Ctl.java", category: "exception", severity: "major", code: "return entity;", message: "Lộ stack trace.", ...over }),
];
const r2 = (findings, previous_findings, o = {}) =>
  plan(findings, { round: 2, previous: prior(), runs: 1, baseSha: "b".repeat(40), ...o, result: { previous_findings, ...(o.result ?? {}) } });
const prev = (ref, status, evidence = "") => ({ ref, status, evidence });

test("vòng 2: đã xử lý (có căn cứ) bị loại khỏi danh sách còn mở, vẫn còn thì giữ lại", () => {
  const p = r2([], [prev(FP_TX, "resolved", "Dòng đã có @Transactional."), prev(FP_EX, "still_present", "Vẫn trả entity.")]);
  assert.equal(p.stats.round, 2);
  assert.equal(p.stats.resolved, 1);
  assert.equal(p.stats.stillPresent, 1);
  assert.equal(p.stats.open, 1);
  assert.deepEqual(p.state.open.map((o) => o.fp), [FP_EX]);
  assert.match(p.summary, /Vòng 2: kiểm tra vấn đề cũ/);
  assert.match(p.summary, /\| 1 \| 1 \| 0 \| 0 \|/);
  assert.match(p.summary, /\*\*Đã xử lý \(1\)\*\*[\s\S]*Thiếu transaction[\s\S]*căn cứ: Dòng đã có/);
  assert.match(p.summary, /vòng 2 \(so với commit `bbbbbbb`\)/);
});

test("vòng 2: báo 'đã xử lý' mà không có căn cứ thì bị hạ xuống 'chưa rõ' và vẫn còn mở", () => {
  const p = r2([], [prev(FP_TX, "resolved", "   "), prev(FP_EX, "resolved", "Đã bỏ trả entity.")]);
  assert.equal(p.stats.resolved, 1);
  assert.equal(p.stats.unclear, 1);
  assert.deepEqual(p.state.open.map((o) => o.fp), [FP_TX]);
  assert.match(p.summary, /thiếu căn cứ nên ghi là "chưa rõ"/);
});

test("vòng 2: agent bỏ sót một vấn đề cũ thì mặc định là 'chưa rõ', không tự coi là đã xử lý", () => {
  const p = r2([], [prev(FP_TX, "resolved", "Đã sửa.")]);
  assert.equal(p.stats.unclear, 1);
  assert.deepEqual(p.state.open.map((o) => o.fp), [FP_EX]);
});

test("vòng 2: ref lạ do agent bịa ra bị bỏ qua", () => {
  const p = r2([], [prev("ffffffffffffffff", "resolved", "x"), prev(FP_TX, "still_present", "còn"), prev(FP_EX, "still_present", "còn")]);
  assert.equal(p.stats.resolved, 0);
  assert.equal(p.stats.open, 2);
});

test("vòng 2: lỗi mới của commit được đăng inline và đếm là 'mới'; lỗi cũ không bị đăng lại", () => {
  const p = r2(
    [f({ id: "F1", category: "bug", message: "Lỗi mới.", line: 3, code: "other.call();" })],
    [prev(FP_TX, "still_present", "còn"), prev(FP_EX, "resolved", "đã sửa")],
  );
  assert.equal(p.inline.length, 1);
  assert.equal(p.stats.newFindings, 1);
  assert.match(p.summary, /\| 1 \| 1 \| 0 \| 1 \|/);
  assert.equal(p.state.open.length, 2, "một cũ chưa xử lý + một mới");
});

test("vòng 2: agent báo lại vấn đề cũ như thể là mới thì không bị đăng lại và không tính là mới", () => {
  const p = r2([f({ id: "F1" })], [prev(FP_TX, "still_present", "còn"), prev(FP_EX, "still_present", "còn")]);
  assert.equal(p.inline.length, 0);
  assert.equal(p.stats.newFindings, 0);
  assert.equal(p.stats.duplicates, 1);
});

test("kết luận tính trên vấn đề còn mở: blocker cũ chưa xử lý vẫn là Chưa đạt, xử lý xong thì Đạt", () => {
  const blocker = [toRecord({ fp: FP_TX, file: "Svc.java", category: "security", severity: "blocker", code: "x", message: "Lộ khóa." })];
  assert.equal(r2([], [prev(FP_TX, "still_present", "còn")], { previous: blocker }).conclusion, "fail");
  assert.equal(r2([], [prev(FP_TX, "resolved", "đã xóa khóa")], { previous: blocker }).conclusion, "pass");
});

test("round 2 nhưng không có danh sách vấn đề cũ thì chạy như vòng 1", () => {
  const p = plan([f()], { round: 2, previous: null });
  assert.equal(p.stats.round, 1);
  assert.doesNotMatch(p.summary, /Vòng 2/);
});

test("vòng 1 (review toàn bộ) thay danh sách còn mở bằng kết quả mới, bỏ qua danh sách cũ", () => {
  const p = plan([f()], { round: 1, previous: prior(), runs: 3 });
  assert.equal(p.stats.round, 1);
  assert.deepEqual(p.state.open.map((o) => o.fp), [FP_TX]);
});

test("trạng thái trong comment: runs tăng một, danh sách còn mở khớp và đọc lại được", () => {
  const p = r2([], [prev(FP_TX, "still_present", "còn"), prev(FP_EX, "still_present", "còn")], { runs: 2 });
  assert.equal(parseState(p.summary).runs, 3);
  assert.equal(parseState(p.summary).sha, SHA);
  assert.deepEqual(parseOpenFindings(p.summary).map((o) => o.fp).sort(), [FP_EX, FP_TX].sort());
});

test("vòng 2 không liệt kê 'file chưa được xem' (agent chỉ xem phần mới)", () => {
  const p = r2([], [prev(FP_TX, "still_present", "còn"), prev(FP_EX, "still_present", "còn")], { result: { files_reviewed: ["Svc.java"] } });
  assert.doesNotMatch(p.summary, /chưa được agent xem/);
});

test("hai nhận xét không gắn dòng khác nhau cùng file/loại không bị gộp thành một", () => {
  const a = f({ id: "F1", line: null, code: "", category: "gap", severity: "minor", message: "Thiếu luồng 4a." });
  const b = f({ id: "F2", line: null, code: "", category: "gap", severity: "minor", message: "Thiếu luồng 5b." });
  const p = plan([a, b]);
  assert.equal(p.state.open.length, 2);
});

test("nội dung lưu trong trạng thái đã được làm sạch (không giữ secret hay HTML)", () => {
  const p = plan([f({ message: "xem ![x](https://evil.test/a.png) ghp_" + "a".repeat(36), code: "repo.save(x);" })]);
  assert.doesNotMatch(JSON.stringify(p.state.open), /evil\.test|ghp_/);
});

// ---- Hướng giải quyết bằng lời và mục "Bước tiếp theo" ----
import { MAX_AUTO_RUNS } from "./state.mjs";

test("inline có 'Hướng giải quyết' và 'Tác động'; mọi khối code trong fix bị bỏ", () => {
  const p = plan([f({ fix: "Đưa lưu và xuất bản vào cùng một giao dịch.\n```java\n@Transactional\nvoid publish() {}\n```", impact: "Giáo viên thấy game đã lưu nhưng không xuất bản được." })]);
  const body = p.inline[0].body;
  assert.ok(body.includes("**Hướng giải quyết:** Đưa lưu và xuất bản vào cùng một giao dịch."));
  assert.ok(body.includes("**Tác động:** Giáo viên thấy game đã lưu nhưng không xuất bản được."));
  assert.doesNotMatch(body, /void publish|```/);
});

test("blocker/major thiếu hướng giải quyết thì có chữ báo thiếu và được đếm; minor thiếu thì im lặng", () => {
  const p = plan([f({ id: "F1", severity: "major" }), f({ id: "F2", severity: "minor", category: "bug", message: "Nhỏ.", line: null, code: "" })]);
  assert.ok(p.inline[0].body.includes("(AI chưa đưa ra hướng giải quyết)"));
  assert.equal(p.stats.missingGuidance, 1);
  const minorLine = p.summary.split("\n").find((l) => l.includes("Nhỏ.") && l.includes("minor"));
  assert.ok(minorLine && !minorLine.includes("chưa đưa ra hướng giải quyết"));
});

test("nhận xét không inline vẫn hiển thị hướng giải quyết trong tổng kết (trước đây bị mất)", () => {
  const p = plan([f({ id: "F1", severity: "minor", category: "bug", message: "Biến đặt chưa rõ.", fix: "Đổi tên biến cho đúng nghĩa.", line: null, code: "" })]);
  // Dòng trong mục chi tiết "Nhận xét khác" (có kèm lý do không inline), khác với dòng trong "Bước tiếp theo".
  const line = p.summary.split("\n").find((l) => l.includes("Biến đặt chưa rõ.") && l.includes("mức độ nhỏ"));
  assert.ok(line.includes("→ Đổi tên biến cho đúng nghĩa."));
});

test("'Bước tiếp theo': sắp theo mức độ, có số thứ tự, hướng giải quyết và nhắc cách chạy tiếp", () => {
  const p = plan([
    f({ id: "F1", severity: "minor", category: "bug", line: null, code: "", message: "Việc nhỏ.", fix: "Sửa nhỏ." }),
    f({ id: "F2", severity: "blocker", category: "security", file: "Ctl.java", line: 2, code: "return entity;", message: "Lộ dữ liệu.", fix: "Trả DTO thay vì entity." }),
    f({ id: "F3", severity: "major", message: "Thiếu giao dịch.", fix: "Thêm giao dịch." }),
  ]);
  const i = p.summary.indexOf("### Bước tiếp theo");
  assert.ok(i > 0);
  const todo = p.summary.slice(i);
  const order = ["Lộ dữ liệu.", "Thiếu giao dịch.", "Việc nhỏ."].map((m) => todo.indexOf(m));
  assert.ok(order[0] > 0 && order[0] < order[1] && order[1] < order[2], "blocker, rồi major, rồi minor");
  assert.ok(todo.includes("1. **[blocker]**") && todo.includes("→ Trả DTO thay vì entity."));
  assert.ok(todo.includes(`tối đa ${MAX_AUTO_RUNS} lần tự động`));
});

test("'Bước tiếp theo' nằm trước các mục chi tiết (nếu bị cắt ngắn thì chi tiết mất trước)", () => {
  const p = plan([f({ severity: "minor", category: "bug", line: null, code: "", message: "Nhỏ." })]);
  assert.ok(p.summary.indexOf("### Bước tiếp theo") < p.summary.indexOf("### Nhận xét khác"));
});

test("'Bước tiếp theo' khi không còn gì, và giới hạn 10 mục kèm số còn lại", () => {
  assert.ok(plan([]).summary.includes("Không còn vấn đề nào cần xử lý."));
  const many = Array.from({ length: 13 }, (_, i) => f({ id: `F${i + 1}`, severity: "minor", category: "bug", line: null, code: "", message: `Việc số ${i + 1}.` }));
  const todo = plan(many).summary.split("### Bước tiếp theo")[1].split("\n### ")[0];
  assert.equal((todo.match(/^\d+\. \*\*/gm) ?? []).length, 10);
  assert.ok(todo.includes("... và 3 vấn đề khác"));
});

test("mục gợi ý SRS trong 'Bước tiếp theo' được đánh dấu để phân biệt với lỗi code", () => {
  const p = plan([f({ id: "F1", line: null, code: "", category: "gap", severity: "major", message: "Thiếu luồng 4a.", fix: "Thêm kiểm tra." })]);
  assert.ok(p.summary.split("### Bước tiếp theo")[1].includes("(đối chiếu SRS)"));
});

test("vòng 2: vấn đề còn lại hiện hướng giải quyết đã lưu; vấn đề đã xử lý thì không lặp lại", () => {
  const withFix = [
    toRecord({ fp: FP_TX, file: "Svc.java", category: "transaction", severity: "major", code: "x", message: "Thiếu giao dịch.", fix: "Thêm giao dịch." }),
    toRecord({ fp: FP_EX, file: "Ctl.java", category: "exception", severity: "major", code: "y", message: "Lộ stack trace.", fix: "Dùng thông điệp chung." }),
  ];
  const p = r2([], [prev(FP_TX, "resolved", "Đã thêm."), prev(FP_EX, "still_present", "Vẫn còn.")], { previous: withFix });
  const v2 = p.summary.split("### Vòng 2: kiểm tra vấn đề cũ")[1];
  const resolvedLine = v2.split("\n").find((l) => l.includes("Thiếu giao dịch."));
  const stillLine = v2.split("\n").find((l) => l.includes("Lộ stack trace."));
  assert.ok(!resolvedLine.includes("→"), "đã xử lý thì không cần hướng giải quyết");
  assert.ok(stillLine.includes("→ Dùng thông điệp chung."));
});

test("hướng giải quyết được lưu trong trạng thái (không có khối code) để các vòng sau còn dùng", () => {
  const p = plan([f({ fix: "Làm A.\n```js\ncode();\n```" })]);
  assert.equal(p.state.open[0].fix, "Làm A.");
});

test("vòng 2: 'Bước tiếp theo' gộp vấn đề cũ chưa xử lý và vấn đề mới rồi sắp lại theo mức độ (blocker mới lên trước major cũ)", () => {
  const oldMajor = [toRecord({ fp: FP_TX, file: "Svc.java", category: "transaction", severity: "major", code: "x", message: "Thiếu giao dịch cũ.", fix: "Thêm giao dịch." })];
  const p = r2(
    [f({ id: "F1", severity: "blocker", category: "security", file: "Ctl.java", line: 2, code: "return entity;", message: "Lỗ hổng mới.", fix: "Trả DTO." })],
    [prev(FP_TX, "still_present", "Vẫn còn.")],
    { previous: oldMajor },
  );
  const todo = p.summary.split("### Bước tiếp theo")[1];
  assert.ok(todo.indexOf("Lỗ hổng mới.") > 0);
  assert.ok(todo.indexOf("Lỗ hổng mới.") < todo.indexOf("Thiếu giao dịch cũ."), "blocker mới phải đứng trước major cũ");
});
