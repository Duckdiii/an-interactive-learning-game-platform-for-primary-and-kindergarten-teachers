import assert from "node:assert/strict";
import test from "node:test";
import { checkMigrations, parseNameStatus } from "./check-migrations.mjs";

const BASE = ["V1__enable_extensions.sql", "V2__create_core_tables.sql", "V9__game_presentation.sql"];
const OK_YML = { "application.yml": "spring:\n  jpa:\n    hibernate:\n      ddl-auto: validate\n" };
const run = (o = {}) => checkMigrations({ baseFiles: BASE, currentFiles: BASE, changes: [], configs: OK_YML, ...o });
const only = (errors, re) => assert.ok(errors.length === 1 && re.test(errors[0]), JSON.stringify(errors));

test("không đổi gì thì hợp lệ", () => assert.deepEqual(run(), []));

test("thêm migration mới với version lớn hơn thì hợp lệ", () => {
  const added = "V10__add_sessions.sql";
  assert.deepEqual(run({ currentFiles: [...BASE, added], changes: [{ status: "A", path: `x/${added}` }] }), []);
});

test("sửa, xoá, đổi tên migration cũ bị chặn", () => {
  only(run({ changes: [{ status: "M", path: "x/V2__create_core_tables.sql" }] }), /V2__.*bị sửa/);
  only(run({ currentFiles: BASE.slice(1), changes: [{ status: "D", path: "x/V1__enable_extensions.sql" }] }), /bị xoá/);
  const renamed = run({ currentFiles: [BASE[0], "V2__core.sql", BASE[2]],
    changes: [{ status: "R", oldPath: "x/V2__create_core_tables.sql", path: "x/V2__core.sql" }] });
  assert.ok(renamed.some((e) => /V2__create_core_tables.*đổi tên/.test(e)), JSON.stringify(renamed));
});

test("version trùng, version chèn lùi, tên sai", () => {
  const errs = run({ currentFiles: [...BASE, "V9__dup.sql"] });
  assert.ok(errs.some((e) => /trùng version V9/.test(e)) && errs.some((e) => /> V9/.test(e)), JSON.stringify(errs));
  only(run({ currentFiles: [...BASE, "V5__backfill.sql"] }), /> V9/);
  only(run({ currentFiles: [...BASE, "v10-Add.sql"] }), /tên phải dạng/);
});

test("ddl-auto khác validate bị chặn", () => {
  only(run({ configs: { "application.yml": "# ddl-auto: update là ví dụ\nddl-auto: update # tạm" } }), /"update"/);
});

test("parseNameStatus đọc được đổi tên", () => {
  assert.deepEqual(parseNameStatus("M\ta.sql\nR100\tb.sql\tc.sql\n"),
    [{ status: "M", path: "a.sql" }, { status: "R", oldPath: "b.sql", path: "c.sql" }]);
});
