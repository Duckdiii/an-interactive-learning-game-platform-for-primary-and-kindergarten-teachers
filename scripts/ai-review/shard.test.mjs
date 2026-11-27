import { test } from "node:test";
import assert from "node:assert/strict";
import { filePatches, planShards, unquote } from "./shard.mjs";

const patchesOf = (n, chars = 1000, prefix = "backend/src/F") =>
  new Map(Array.from({ length: n }, (_, i) => [`${prefix}${String(i).padStart(3, "0")}.java`, "x".repeat(chars)]));

test("PR nhỏ là một phần", () => {
  const { shards } = planShards(patchesOf(5));
  assert.equal(shards.length, 1);
  assert.equal(shards[0].files.length, 5);
});

test("giới hạn số file và kích thước áp dụng đồng thời, không mất file", () => {
  const patches = patchesOf(12, 2000);
  const plan = planShards(patches, { maxFiles: 3, maxChars: 5000 });
  assert.equal(plan.shards.length, 6);
  assert.ok(plan.shards.every(({ files, chars }) => files.length <= 3 && chars <= 5000));
  assert.deepEqual(plan.shards.flatMap(({ files }) => files), [...patches.keys()]);
});

test("gói chạm giới hạn số phần hoặc có file quá lớn thì nêu phạm vi review tay", () => {
  const patches = patchesOf(4, 10);
  patches.set("large.java", "x".repeat(101));
  const plan = planShards(patches, { maxFiles: 1, maxChars: 100, maxShards: 2 });
  assert.deepEqual(plan.shards.flatMap(({ files }) => files), [...patches.keys()].slice(0, 2));
  assert.deepEqual(plan.manual, [...patches.keys()].slice(2));
});

test("loại trừ file sinh tự động, nhật ký và ảnh theo cùng chính sách", () => {
  const paths = ["ai-usage-log.md", "frontend/package-lock.json", "docs/srs/UC-18.md", "docs/a.png"];
  const plan = planShards(new Map(paths.map((path) => [path, "diff"])));
  assert.equal(plan.shards.length, 0);
  assert.deepEqual(plan.skipped.sort(), paths.sort());
  assert.deepEqual(plan.manual, []);
});
test("filePatches đọc đường dẫn phía mới và giữ patch theo từng file", () => {
  const diff = [
    "diff --git a/old/Name.java b/new/Name.java", "similarity index 90%", "rename from old/Name.java", "rename to new/Name.java",
    "diff --git a/x.txt b/x.txt", "--- a/x.txt", "+++ b/x.txt", "@@ -1 +1 @@", "-a", "+b", "",
  ].join("\n");
  const sizes = filePatches(diff);
  assert.deepEqual([...sizes.keys()], ["new/Name.java", "x.txt"]);
});

test("tên file có dấu bị git bọc nháy và viết dạng bát phân vẫn được giải mã (không bị bỏ rơi)", () => {
  assert.equal(unquote(String.raw`"docs/wiki/S\306\241 \304\221\341\273\223.md"`), "docs/wiki/Sơ đồ.md");
  const q = String.raw`"docs/S\306\241.md"`;
  const diff = [`diff --git "a/docs/S${String.raw`\306\241`}.md" "b/docs/S${String.raw`\306\241`}.md"`, "index 1..2 100644", `--- ${q.replace('"d', '"a/d')}`, `+++ ${q.replace('"d', '"b/d')}`, "@@ -1 +1 @@", "-a", "+b", ""].join("\n");
  assert.deepEqual([...filePatches(diff).keys()], ["docs/Sơ.md"]);
});

test("đường dẫn có khoảng trắng hoặc chuỗi ' b/' không bị tách sai; file nhị phân và đổi tên vẫn có tên", () => {
  const spaced = ["diff --git a/p b/q b/p b/q", "--- a/p b/q", "+++ b/p b/q", "@@ -1 +1 @@", "-a", "+b", ""].join("\n");
  assert.deepEqual([...filePatches(spaced).keys()], ["p b/q"]);
  const binary = ["diff --git a/img/x y.png b/img/x y.png", "index 1..2 100644", "Binary files a/img/x y.png and b/img/x y.png differ", ""].join("\n");
  assert.deepEqual([...filePatches(binary).keys()], ["img/x y.png"]);
  const deleted = ["diff --git a/old.txt b/old.txt", "deleted file mode 100644", "--- a/old.txt", "+++ /dev/null", "@@ -1 +0,0 @@", "-x", ""].join("\n");
  assert.deepEqual([...filePatches(deleted).keys()], ["old.txt"]);
});

test("không im lặng bỏ qua diff không đọc được", () => {
  assert.throws(() => filePatches("diff --git invalid"), /Không đọc được/);
});
