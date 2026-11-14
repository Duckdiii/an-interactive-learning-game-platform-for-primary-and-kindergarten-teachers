import assert from "node:assert/strict";
import test from "node:test";
import { MAX_INLINE, shouldBlock } from "./block-node-eval.mjs";

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
