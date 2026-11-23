import { test } from "node:test";
import assert from "node:assert/strict";
import { fileSizes, planShards, sizesFromFileList, unquote } from "./shard.mjs";

const sizesOf = (n, chars = 1000, prefix = "backend/src/F") => new Map(Array.from({ length: n }, (_, i) => [`${prefix}${String(i).padStart(3, "0")}.java`, chars]));

test("PR nhỏ là một phần duy nhất", () => {
  const { shards } = planShards(sizesOf(5));
  assert.equal(shards.length, 1);
  assert.equal(shards[0].files.length, 5);
});

test("nhiều file hơn ngưỡng thì chia đều, không phần nào rỗng và không mất file", () => {
  const sizes = sizesOf(63);
  const { shards } = planShards(sizes, { maxFiles: 15 });
  assert.equal(shards.length, 5);
  assert.ok(shards.every((s) => s.files.length > 0));
  assert.deepEqual(shards.flatMap((s) => s.files).sort(), [...sizes.keys()].sort());
  assert.ok(Math.max(...shards.map((s) => s.files.length)) <= 15, "mỗi phần không quá ngưỡng số file");
});

test("diff dài ít file vẫn bị chia theo số ký tự", () => {
  const { shards } = planShards(sizesOf(6, 100_000), { maxChars: 120_000 });
  assert.equal(shards.length, 5);
});

test("không vượt số phần tối đa; số phần không lớn hơn số file", () => {
  assert.equal(planShards(sizesOf(500), { maxShards: 6 }).shards.length, 6);
  assert.equal(planShards(sizesOf(2, 900_000), { maxShards: 6 }).shards.length, 2);
});

test("file sinh tự động và nhật ký bị loại khỏi phần, được ghi vào skipped", () => {
  const sizes = new Map([
    ["package-lock.json", 900_000], ["frontend/package-lock.json", 900_000], ["ai-usage-log.md", 50_000],
    ["docs/ai-usage-log-archive/STT-0201-0300.md", 50_000], ["docs/openapi/INDEX.md", 20_000], ["docs/srs/UC-18.md", 9_000],
    ["backend/A.java", 100],
  ]);
  const { shards, skipped } = planShards(sizes);
  assert.deepEqual(shards.map((s) => s.files), [["backend/A.java"]]);
  assert.equal(skipped.length, 6);
});

test("file cùng thư mục nằm cạnh nhau (xếp theo đường dẫn)", () => {
  const sizes = new Map([["b/z.java", 10], ["a/x.java", 10], ["b/y.java", 10], ["a/w.java", 10]]);
  const { shards } = planShards(sizes, { maxFiles: 2 });
  assert.deepEqual(shards.map((s) => s.files), [["a/w.java", "a/x.java"], ["b/y.java", "b/z.java"]]);
});

test("PR chỉ có file bị loại thì vẫn trả đúng một phần rỗng, không ném lỗi", () => {
  const { shards } = planShards(new Map([["package-lock.json", 5]]));
  assert.deepEqual(shards, [{ files: [], chars: 0 }]);
});

test("fileSizes đọc đường dẫn phía mới, gộp đổi tên và tính ký tự theo từng file", () => {
  const diff = [
    "diff --git a/old/Name.java b/new/Name.java", "similarity index 90%", "rename from old/Name.java", "rename to new/Name.java",
    "diff --git a/x.txt b/x.txt", "--- a/x.txt", "+++ b/x.txt", "@@ -1 +1 @@", "-a", "+b", "",
  ].join("\n");
  const sizes = fileSizes(diff);
  assert.deepEqual([...sizes.keys()], ["new/Name.java", "x.txt"]);
});

test("tên file có dấu bị git bọc nháy và viết dạng bát phân vẫn được giải mã (không bị bỏ rơi)", () => {
  assert.equal(unquote(String.raw`"docs/wiki/S\306\241 \304\221\341\273\223.md"`), "docs/wiki/Sơ đồ.md");
  const q = String.raw`"docs/S\306\241.md"`;
  const diff = [`diff --git "a/docs/S${String.raw`\306\241`}.md" "b/docs/S${String.raw`\306\241`}.md"`, "index 1..2 100644", `--- ${q.replace('"d', '"a/d')}`, `+++ ${q.replace('"d', '"b/d')}`, "@@ -1 +1 @@", "-a", "+b", ""].join("\n");
  assert.deepEqual([...fileSizes(diff).keys()], ["docs/Sơ.md"]);
});

test("đường dẫn có khoảng trắng hoặc chuỗi ' b/' không bị tách sai; file nhị phân và đổi tên vẫn có tên", () => {
  const spaced = ["diff --git a/p b/q b/p b/q", "--- a/p b/q", "+++ b/p b/q", "@@ -1 +1 @@", "-a", "+b", ""].join("\n");
  assert.deepEqual([...fileSizes(spaced).keys()], ["p b/q"]);
  const binary = ["diff --git a/img/x y.png b/img/x y.png", "index 1..2 100644", "Binary files a/img/x y.png and b/img/x y.png differ", ""].join("\n");
  assert.deepEqual([...fileSizes(binary).keys()], ["img/x y.png"]);
  const deleted = ["diff --git a/old.txt b/old.txt", "deleted file mode 100644", "--- a/old.txt", "+++ /dev/null", "@@ -1 +0,0 @@", "-x", ""].join("\n");
  assert.deepEqual([...fileSizes(deleted).keys()], ["old.txt"]);
});

test("dự phòng khi không có diff cả PR: dùng danh sách file (patch hoặc số dòng đổi)", () => {
  const sizes = sizesFromFileList([{ filename: "a.java", patch: "x".repeat(500), changes: 9 }, { filename: "b.png", changes: 0 }, { filename: "c.ts", changes: 10 }]);
  assert.deepEqual([...sizes], [["a.java", 500], ["b.png", 1], ["c.ts", 600]]);
});

test("chế độ A (maxFiles và maxChars vô hạn) luôn là một phần dù PR rất lớn", () => {
  assert.equal(planShards(sizesOf(200, 500_000), { maxFiles: Infinity, maxChars: Infinity }).shards.length, 1);
});
