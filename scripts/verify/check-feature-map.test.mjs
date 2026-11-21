import assert from "node:assert/strict";
import test from "node:test";
import { checkFeatureMap, countLines } from "./check-feature-map.mjs";

const MAP = `# FEATURE-MAP

## Đã có code

| Tính năng | Endpoint | Controller | Frontend |
|---|---|---|---|
| Mở game | \`GET /api/games/{gameId}\` | \`C/controller/GamesController.java:53\` | \`F/api/gamesApi.ts:37\` |

## Frontend gọi nhưng backend chưa có

| Tính năng | Endpoint | Frontend | OA |
|---|---|---|---|
| Xuất bản | \`POST /api/games/{gameId}/publish\` | \`F/api/gamesApi.ts:120\` | \`OA:542\` |

## Đối chiếu

- Xem \`T/flow/AbstractTeacherFlowTest.java\` và \`F/components/editor/play/*PlayTest.tsx\`.
`;
const FILES = {
  "backend/src/main/java/com/aigameplatform/backend/controller/GamesController.java": 80,
  "frontend/src/api/gamesApi.ts": 130,
  "backend/src/test/java/com/aigameplatform/backend/flow/AbstractTeacherFlowTest.java": 200,
  "docs/openapi/openapi.yaml": 4000,
};
const lineCount = (p) => FILES[p] ?? null;
const GET = { method: "GET", path: "/api/games/{id}", file: "C.java", line: 53 };

test("map khớp code thì không lỗi (tham số {id} và {gameId} coi là một)", () => {
  assert.deepEqual(checkFeatureMap(MAP, [GET], lineCount), []);
});

test("route bị đổi tên: map ghi có code mà controller không có, và endpoint mới chưa có trong map", () => {
  const errors = checkFeatureMap(MAP, [{ ...GET, path: "/api/game/{id}" }], lineCount);
  assert.equal(errors.length, 2, errors.join("\n"));
  assert.match(errors[0], /GET \/api\/games\/\{\} ghi "đã có code"/);
  assert.match(errors[1], /GET \/api\/game\/\{\} có trong controller nhưng chưa có/);
});

test("endpoint ghi 'backend chưa có' mà đã có controller", () => {
  const errors = checkFeatureMap(MAP, [GET, { method: "POST", path: "/api/games/{id}/publish", file: "P.java", line: 9 }], lineCount);
  assert.ok(errors.some((e) => /ghi "backend chưa có" nhưng đã có ở P\.java:9/.test(e)), errors.join("\n"));
});

test("trích dẫn tới file không có hoặc vượt độ dài file; bỏ qua glob", () => {
  const missingFile = { ...FILES };
  delete missingFile["frontend/src/api/gamesApi.ts"];
  const errors = checkFeatureMap(MAP, [GET], (p) => missingFile[p] ?? null);
  assert.equal(errors.length, 2, errors.join("\n"));
  assert.ok(errors.every((e) => /F\/api\/gamesApi\.ts:\d+ trỏ tới file không có/.test(e)));
  assert.match(checkFeatureMap(MAP, [GET], (p) => (p.endsWith("GamesController.java") ? 50 : lineCount(p)))[0], /:53 vượt độ dài file \(50 dòng\)/);
  assert.match(checkFeatureMap(MAP, [GET], (p) => (p.endsWith("openapi.yaml") ? 100 : lineCount(p)))[0], /OA:542 vượt độ dài openapi\.yaml/);
});

test("countLines khớp wc -l, kể cả dòng cuối không có xuống dòng (reviewer: trích dẫn N+1 từng lọt)", () => {
  assert.equal(countLines(""), 0);
  assert.equal(countLines("a\nb\n"), 2);
  assert.equal(countLines("a\nb"), 2);
  assert.equal(countLines("a\r\nb\r\n"), 2);
  const at129 = MAP.replace("gamesApi.ts:37", "gamesApi.ts:129");
  const n = (p) => (p.endsWith("gamesApi.ts") ? countLines("x\n".repeat(128)) : lineCount(p));
  assert.match(checkFeatureMap(at129, [GET], n)[0], /gamesApi\.ts:129 vượt độ dài file \(128 dòng\)/);
  assert.deepEqual(checkFeatureMap(MAP.replace("gamesApi.ts:37", "gamesApi.ts:128"), [GET], n), []);
});

test("đổi tên tiêu đề mục thì báo, không âm thầm bỏ qua cả mục", () => {
  const renamed = MAP.replace("## Frontend gọi nhưng backend chưa có", "## Chưa có backend");
  assert.ok(checkFeatureMap(renamed, [GET], lineCount).some((e) => /không thấy tiêu đề "## Frontend gọi/.test(e)));
});
