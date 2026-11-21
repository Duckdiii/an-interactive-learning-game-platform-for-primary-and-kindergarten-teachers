import assert from "node:assert/strict";
import test from "node:test";
import { MAX_ROWS, countRows, mergeArchive, planRotation } from "./rotate.mjs";

const HEAD = ["| STT | Ngày |", "| :-: | :-: |"];
const row = (n) => `| ${n} | 2026-11-01 |`;
const log = (n) => ["# Log", "", ...HEAD, ...Array.from({ length: n }, (_, i) => row(i + 1)), "", "## Case study"].join("\n");

test("không xoay vòng khi chưa vượt ngưỡng", () => {
  assert.equal(planRotation(log(40)), null);
});

test("giữ 25 dòng mới nhất, chia archive theo 100 STT", () => {
  const plan = planRotation(log(130));
  const kept = plan.newText.split("\n").filter((l) => /^\| \d+ \|/.test(l));
  assert.equal(kept.length, 25);
  assert.equal(kept[0], row(106));
  assert.deepEqual([...plan.byFile.keys()], ["STT-0001-0100.md", "STT-0101-0200.md"]);
  assert.equal(plan.byFile.get("STT-0101-0200.md").length, 5);
  assert.match(plan.newText, /## Case study$/);
});

test("bảng bị đứt quãng thì báo lỗi thay vì mất dòng", () => {
  assert.throws(() => planRotation(log(50).replace(row(10), "")), /không liền nhau/);
});

test("mergeArchive bỏ dòng trùng STT khi chạy lại", () => {
  const once = mergeArchive(null, [row(1), row(2)], HEAD, "STT-0001-0100.md");
  const twice = mergeArchive(once, [row(2), row(3)], HEAD, "STT-0001-0100.md");
  assert.deepEqual(twice.split("\n").filter((l) => /^\| \d+ \|/.test(l)), [row(1), row(2), row(3)]);
});

test("countRows đếm đúng số dòng bảng (dùng cho --check của CI)", () => {
  assert.equal(countRows(log(MAX_ROWS)), MAX_ROWS);
  assert.equal(countRows(log(MAX_ROWS + 1)) > MAX_ROWS, true);
});
