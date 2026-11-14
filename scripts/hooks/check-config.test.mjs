import assert from "node:assert/strict";
import test from "node:test";
import { checkFiles } from "./check-config.mjs";

const one = (path, content = null) => checkFiles([{ path, content }]);

test("file nhạy cảm và file build bị chặn", () => {
  for (const p of ["backend/.env", ".env.local", "backend/src/main/resources/application-local.yml", "a/key.pem",
    "backend/target/x.jar", "frontend/node_modules/a/b.js", "frontend/dist/index.html"]) {
    assert.equal(one(p).length, 1, p);
  }
  assert.deepEqual(one("backend/.env.example"), []);
  assert.deepEqual(one(".env.production.example"), []);
});

test("cấu hình hiện có của repo không bị chặn", () => {
  const yml = "hikari:\n  maximum-pool-size: 5\n# Chỉ đặt MODERATION_REQUIRED=false ở máy cá nhân\nrequired: ${MODERATION_REQUIRED:true}\n";
  assert.deepEqual(one("backend/src/main/resources/application.yml", yml), []);
  assert.deepEqual(one("backend/.env.example", "OPENAI_API_KEY=\n# MODERATION_REQUIRED=false\n"), []);
});

test("cổng 6543, pool khác 5, tắt kiểm duyệt, key mẫu trong .env.example", () => {
  assert.match(one("a.yml", "url: jdbc:postgresql://h:6543/postgres")[0], /6543/);
  assert.match(one("a.yml", "maximum-pool-size: 10")[0], /pool-size là 10/);
  assert.match(one("a.yml", "required: ${MODERATION_REQUIRED:false}")[0], /kiểm duyệt/);
  assert.match(one(".github/workflows/ci.yml", "      MODERATION_REQUIRED: false")[0], /kiểm duyệt/);
  assert.match(one(".github/workflows/ci.yml", '      MODERATION_REQUIRED: "false"')[0], /kiểm duyệt/);
  assert.match(one("backend/src/main/resources/application.yml", "app:\n  moderation:\n    required: false\n")[0], /:3: tắt kiểm duyệt/);
  assert.deepEqual(one("docs-like.yml", "app:\n  moderation:\n    enabled: true\n  other:\n    required: false\n"), []);
  assert.ok(one("backend/.env.example", "OPENAI_API_KEY=sk-abc").some((e) => /để trống/.test(e)));
});

test("mật khẩu chữ cố định mà gitleaks bỏ sót (entropy thấp) bị chặn", () => {
  // gitleaks 8.30.1 với rule mặc định: "no leaks found" cho cả hai dòng dưới (đã chạy 2026-11-15).
  assert.match(one("backend/src/main/resources/application.yml", "spring:\n  datasource:\n    password: hocsinh2026\n")[0], /:3: .*chữ cố định/);
  assert.match(one("a.yml", "url: postgresql://postgres:hocsinh2026@db.example.com:5432/postgres")[0], /connection string/);
  assert.match(one("backend/.env.example", "DB_PASSWORD=hocsinh2026")[0], /chữ cố định/);
  for (const bad of ["    secret-key: abc", "signing-key: abc", "pwd: abc", "export DB_PASSWORD=abc", "  - password: abc",
    '"password": "abc"']) {
    assert.equal(one("a.yml", bad).length, 1, bad);
  }
  for (const ok of ["password: ${DB_PASSWORD}", 'password: "${DB_PASSWORD:}"', 'api-key: ""', "api-key: ${OPENAI_API_KEY:}",
    "  password:", "DB_PASSWORD=", "refresh-token-ttl: 7d", "max-tokens: 2048", "secret-key-ttl: 1h", "password: ${{ secrets.DB_PASSWORD }}",
    "url: jdbc:postgresql://aws-0.pooler.supabase.com:5432/postgres", "DB_PASSWORD=<SUPABASE_DB_PASSWORD>", "id-token: write", "url: postgresql://${DB_USERNAME}:${DB_PASSWORD}@h:5432/db"]) {
    assert.deepEqual(one("a.yml", ok), [], ok);
  }
});

test("test và tài liệu được nhắc tới các chuỗi này", () => {
  assert.deepEqual(one("backend/src/test/resources/application-test.yml", "url: h:6543"), []);
  assert.deepEqual(one("docs/openapi/openapi.yaml", "MODERATION_REQUIRED=false"), []);
});
