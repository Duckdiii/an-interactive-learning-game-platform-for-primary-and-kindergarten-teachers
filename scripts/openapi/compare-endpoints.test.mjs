import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { compare, controllerOperations, normalize, openapiOperations } from "./compare-endpoints.mjs";

const SPEC = [
  "servers:", "  - url: http://localhost:8080/api", "paths:",
  "  /games/{gameId}:", "    get:", "      x-status: implemented", "    delete:", "      x-status: planned",
  "  /games:", "    get:", "      x-status: implemented",
  "components:", "  schemas:", "    X:", "      type: object",
].join("\n");

const CONTROLLER = `
@RestController
@RequestMapping("/api/games")
class GamesController {
    @GetMapping
    List<X> list() {}
    @GetMapping("/{id}")
    X get() {}
    @PostMapping("/{gameId}/revise")
    X revise() {}
    @PutMapping(value = "/x")
    X weird() {}
}`;

test("normalize gộp tên tham số và bỏ / cuối", () => {
  assert.equal(normalize("/api/games/{id}/"), normalize("/api/games/{gameId}"));
});

test("openapiOperations gắn tiền tố servers, đọc x-status, dừng ở components", () => {
  assert.deepEqual(openapiOperations(SPEC).map((o) => `${o.method} ${o.path} ${o.status}`), [
    "GET /api/games/{gameId} implemented", "DELETE /api/games/{gameId} planned", "GET /api/games implemented",
  ]);
});

test("controllerOperations ghép tiền tố class, báo dạng không đọc được", () => {
  const { ops, unreadable } = controllerOperations(CONTROLLER);
  assert.deepEqual(ops.map((o) => `${o.method} ${o.path}`), ["GET /api/games", "GET /api/games/{id}", "POST /api/games/{gameId}/revise"]);
  assert.deepEqual(unreadable.map((u) => u.text), ['@PutMapping(value = "/x")']);
});

test("compare tìm chênh lệch cả hai chiều", () => {
  const { onlyCode, onlySpec } = compare(openapiOperations(SPEC), controllerOperations(CONTROLLER).ops);
  assert.deepEqual(onlyCode.map((o) => `${o.method} ${o.path}`), ["POST /api/games/{gameId}/revise"]);
  assert.deepEqual(onlySpec.map((o) => `${o.method} ${o.path}`), ["DELETE /api/games/{gameId}"]);
});

test("bỏ comment: chữ class và @Mapping trong Javadoc không làm lệch (reviewer)", () => {
  const source = `/** Giống class GamesController cũ; ví dụ @PostMapping("/ma") trong comment. */
@RestController
@RequestMapping("/api/games") // tiền tố "http://không-phải-comment" vẫn là chuỗi
class GamesController {
    @GetMapping("{id}")
    X get() {}
}`;
  assert.deepEqual(controllerOperations(source).ops.map((o) => `${o.method} ${o.path}`), ["GET /api/games/{id}"]);
});

test("tiền tố class không đọc được thì bỏ mọi endpoint của file, báo không đọc được", () => {
  const { ops, unreadable } = controllerOperations(`@RequestMapping(path = "/api/x")\nclass A {\n @GetMapping("/y")\n X y() {}\n}`);
  assert.deepEqual(ops, []);
  assert.match(unreadable[0].text, /tiền tố class/);
});

test("tiền tố class thiếu / đầu vẫn ghép đúng như Spring", () => {
  const { ops } = controllerOperations(`@RequestMapping("api/x")\nclass A {\n @GetMapping("y")\n X y() {}\n}`);
  assert.deepEqual(ops.map((o) => o.path), ["/api/x/y"]);
});

test("stalePlanned: operation ghi planned mà code đã có", () => {
  const spec = openapiOperations(SPEC);
  const code = [...controllerOperations(CONTROLLER).ops, { method: "DELETE", path: "/api/games/{x}" }];
  assert.deepEqual(compare(spec, code).stalePlanned.map((o) => `${o.method} ${o.path}`), ["DELETE /api/games/{gameId}"]);
});

test("servers dùng URL tương đối vẫn lấy được tiền tố", () => {
  assert.equal(openapiOperations(SPEC.replace("http://localhost:8080/api", "/api"))[0].path, "/api/games/{gameId}");
});

test("chạy thật: in chênh lệch và luôn thoát 0", () => {
  const script = join(dirname(fileURLToPath(import.meta.url)), "compare-endpoints.mjs");
  const root = mkdtempSync(join(tmpdir(), "compare-endpoints-"));
  try {
    mkdirSync(join(root, "docs", "openapi"), { recursive: true });
    mkdirSync(join(root, "backend", "src", "main", "java", "c"), { recursive: true });
    writeFileSync(join(root, "docs", "openapi", "openapi.yaml"), SPEC);
    writeFileSync(join(root, "backend", "src", "main", "java", "c", "GamesController.java"), CONTROLLER);
    const run = spawnSync(process.execPath, [script, root], { encoding: "utf8" });
    assert.equal(run.status, 0);
    assert.match(run.stdout, /Có trong code, không có trong openapi\.yaml \(1\):\n  POST \/api\/games\/\{gameId\}\/revise/);
    assert.match(run.stdout, /Có trong openapi\.yaml, không có trong code \(1\):\n  DELETE \/api\/games\/\{gameId\}  \[x-status: planned\]/);
    assert.match(run.stdout, /Không đọc được \(1\)/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
