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

test("ngoại lệ đổi số một lần khi gộp dev vào main chỉ áp cho đúng các tên đã ghi", () => {
  const mainBase = ["V6__game_curriculum_reviews.sql", "V7__visual_cloze_image_mode.sql", "V8__self_play_answer_state.sql",
    "V9__allow_in_progress_interactions.sql", "V11__game_topic.sql"];
  const merged = ["V6__game_curriculum_reviews.sql", "V7__cpf_custom_game.sql", "V8__game_updated_at.sql",
    "V9__game_presentation.sql", "V11__game_topic.sql", "V17__visual_cloze_image_mode.sql"];
  const removed = mainBase.slice(1, 4).map((f) => ({ status: "D", path: `x/${f}` }));
  const added = [...merged.slice(1, 4), merged[5]].map((f) => ({ status: "A", path: `x/${f}` }));
  assert.deepEqual(run({ baseFiles: mainBase, currentFiles: merged, changes: [...removed, ...added] }), []);
  // git diff -M có thể thấy V9 → V19 là đổi tên.
  const renamed = [{ status: "R", oldPath: "x/V9__allow_in_progress_interactions.sql", path: "x/V19__allow_in_progress_interactions.sql" }];
  assert.deepEqual(run({ baseFiles: mainBase, currentFiles: [...merged, "V19__allow_in_progress_interactions.sql"],
    changes: [...removed.slice(0, 2), ...added, ...renamed] }), []);
  only(run({ baseFiles: mainBase, currentFiles: [...mainBase.filter((f) => f !== "V11__game_topic.sql"), "V12__topic.sql"],
    changes: [{ status: "R", oldPath: "x/V11__game_topic.sql", path: "x/V12__topic.sql" }] }), /V11__game_topic.*đổi tên/);

  // Tên khác vẫn bị chặn như thường: xoá migration khác của base, thêm migration khác chèn lùi.
  only(run({ baseFiles: mainBase, currentFiles: mainBase.filter((f) => f !== "V11__game_topic.sql"),
    changes: [{ status: "D", path: "x/V11__game_topic.sql" }] }), /V11__game_topic.*bị xoá/);
  only(run({ baseFiles: mainBase, currentFiles: [...mainBase, "V10__backfill.sql"] }), /V10__backfill.*> V11/);
  // Sửa (không phải xoá) file trong danh sách vẫn bị chặn.
  only(run({ baseFiles: mainBase, currentFiles: mainBase, changes: [{ status: "M", path: "x/V7__visual_cloze_image_mode.sql" }] }),
    /V7__visual_cloze_image_mode.*bị sửa/);
});
