import { test } from "node:test";
import assert from "node:assert/strict";
import { parseDiff } from "./diff.mjs";

const diff = (...lines) => lines.join("\n") + "\n";

test("dòng thêm và dòng ngữ cảnh được đánh số theo phiên bản mới", () => {
  const d = parseDiff(diff(
    "diff --git a/A.java b/A.java",
    "--- a/A.java",
    "+++ b/A.java",
    "@@ -10,3 +10,4 @@ class A {",
    " ctx1",
    "-old",
    "+new1",
    "+new2",
    " ctx2",
  ));
  const a = d.get("A.java");
  assert.equal(a.get(10), "ctx1");
  assert.equal(a.get(11), "new1");
  assert.equal(a.get(12), "new2");
  assert.equal(a.get(13), "ctx2");
  assert.equal(a.has(14), false);
});

test("nhiều hunk và nhiều file", () => {
  const d = parseDiff(diff(
    "diff --git a/A.java b/A.java", "--- a/A.java", "+++ b/A.java",
    "@@ -1,1 +1,2 @@", " a", "+b",
    "@@ -20,1 +21,1 @@", "-x", "+y",
    "diff --git a/B.ts b/B.ts", "--- a/B.ts", "+++ b/B.ts",
    "@@ -5 +5 @@", "-p", "+q",
  ));
  assert.equal(d.get("A.java").get(2), "b");
  assert.equal(d.get("A.java").get(21), "y");
  assert.equal(d.get("B.ts").get(5), "q");
});

test("dòng nội dung bắt đầu bằng '+++ ' hay '@@' trong hunk không bị nhầm là header", () => {
  const d = parseDiff(diff(
    "diff --git a/A.md b/A.md", "--- a/A.md", "+++ b/A.md",
    "@@ -1,1 +1,3 @@", " keep", "+++ not a header", "+@@ -1 +1 @@ text",
  ));
  const a = d.get("A.md");
  assert.equal(a.get(2), "++ not a header");
  assert.equal(a.get(3), "@@ -1 +1 @@ text");
});

test("file mới, file bị xóa, dòng 'No newline'", () => {
  const d = parseDiff(diff(
    "diff --git a/N.java b/N.java", "new file mode 100644", "--- /dev/null", "+++ b/N.java",
    "@@ -0,0 +1,2 @@", "+l1", "+l2", "\\ No newline at end of file",
    "diff --git a/D.java b/D.java", "deleted file mode 100644", "--- a/D.java", "+++ /dev/null",
    "@@ -1,2 +0,0 @@", "-d1", "-d2",
  ));
  assert.equal(d.get("N.java").get(2), "l2");
  assert.equal(d.has("D.java"), false);
});

test("đổi tên file dùng tên mới; file nhị phân không có hunk", () => {
  const d = parseDiff(diff(
    "diff --git a/Old.java b/New.java", "similarity index 90%", "rename from Old.java", "rename to New.java",
    "--- a/Old.java", "+++ b/New.java", "@@ -1 +1 @@", "-a", "+b",
    "diff --git a/img.png b/img.png", "Binary files a/img.png and b/img.png differ",
  ));
  assert.equal(d.get("New.java").get(1), "b");
  assert.equal(d.has("img.png"), false);
});

test("đường dẫn có khoảng trắng và dấu nháy", () => {
  const d = parseDiff(diff(
    'diff --git "a/my file.txt" "b/my file.txt"', '--- "a/my file.txt"', '+++ "b/my file.txt"',
    "@@ -1 +1 @@", "-a", "+b",
  ));
  assert.equal(d.get("my file.txt").get(1), "b");
});

test("diff rỗng", () => assert.equal(parseDiff("").size, 0));
