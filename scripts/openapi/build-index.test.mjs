import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { buildIndex } from "./build-index.mjs";

const SAMPLE = `openapi: 3.1.0
info:
  title: T
paths:
  /a:
    get:
      operationId: getA
      summary: Lấy A
      x-status: implemented
    post:
      operationId: postA
      x-status: planned

  /b/{id}:
    delete:
      operationId: delB
components:
  parameters:
    Page:
      name: page
  schemas:
    Foo:
      type: object
    Bar:
      type: string
`;

test("liệt kê operation và component kèm khoảng dòng", () => {
  const out = buildIndex(SAMPLE);
  assert.match(out, /\| GET \| `\/a` \| getA \| implemented \| 6–9 \|/);
  assert.match(out, /\| POST \| `\/a` \| postA \| planned \| 10–12 \|/);
  assert.match(out, /\| DELETE \| `\/b\/\{id\}` \| delB \| {2}\| 15–16 \|/);
  assert.match(out, /\| parameters \| `Page` \| 19–20 \|/);
  assert.match(out, /\| schemas \| `Bar` \| 24–25 \|/);
});

test("INDEX.md trong repo khớp openapi.yaml hiện tại", () => {
  const dir = join(dirname(fileURLToPath(import.meta.url)), "../../docs/openapi");
  const expected = buildIndex(readFileSync(join(dir, "openapi.yaml"), "utf8"));
  const actual = readFileSync(join(dir, "INDEX.md"), "utf8").replace(/\r\n/g, "\n");
  assert.equal(actual, expected, "Chạy: node scripts/openapi/build-index.mjs");
});
