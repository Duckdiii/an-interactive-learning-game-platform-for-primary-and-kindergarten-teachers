import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { checkWiki, docPaths, wikiLinks } from "./check-links.mjs";

const pagesOf = (entries) => new Map(Object.entries(entries));
const ENTRIES = ["wiki", "wiki/index.md", "wiki/A.md", "wiki/B.md", "wiki/README.md", "wiki/Trang có dấu.md", "srs", "srs/README.md", "srs/UC-01.md", "plan.md", "ui", "ui/PLAN.md", "SRS.docx"];

test("wikiLinks bỏ nhãn, neo, dấu | trong bảng và phần trong backtick", () => {
  assert.deepEqual(wikiLinks("[[A]] [[wiki/README|quy tắc]] [[srs/README\\|srs]] [[B#mục]] `[[ví dụ]]`"), ["A", "wiki/README", "srs/README", "B"]);
});

test("docPaths nhận đường dẫn có dấu cách, bỏ hậu tố, bỏ mẫu chung và chữ ngoài backtick", () => {
  assert.deepEqual(
    docPaths("`docs/a.md` `docs/wiki/Ca sử dụng.md` `docs/b.md#mục` `docs/c.md:12` `docs/e.md:12-20` `docs/ui/` `docs/srs/UC-xx.md` `docs/<x>` `docs/*.md` docs/d.md `other/e.md`"),
    ["docs/a.md", "docs/wiki/Ca sử dụng.md", "docs/b.md", "docs/c.md", "docs/e.md", "docs/ui"],
  );
});

test("tên có chữ xx không bị coi là mẫu chung", () => {
  assert.deepEqual(docPaths("`docs/maxx.md`"), ["docs/maxx.md"]);
});

test("wiki đúng thì không có lỗi, kể cả liên kết trong ô bảng", () => {
  const pages = pagesOf({ "index.md": "| [[A]] | [[wiki/README\\|quy tắc]] | [[UC-01]] |", "A.md": "[[index]] `docs/SRS.docx` `docs/ui/`", "README.md": "`[[tên trang]]`" });

  assert.deepEqual(checkWiki(pages, ENTRIES), []);
});

test("báo liên kết hỏng, kể cả liên kết có thư mục sai", () => {
  const pages = pagesOf({ "index.md": "[[A]] [[Không có]] [[wiki/khong-co]]", "A.md": "" });

  assert.deepEqual(checkWiki(pages, ENTRIES), ["index.md: liên kết hỏng [[Không có]]", "index.md: liên kết hỏng [[wiki/khong-co]]"]);
});

test("báo đường dẫn docs/ không tồn tại, phân biệt hoa thường như trên Linux", () => {
  const pages = pagesOf({ "index.md": "`docs/plan.md` `docs/khong.md` `docs/PLAN.md`" });

  assert.deepEqual(checkWiki(pages, ENTRIES), ["index.md: không có docs/khong.md", "index.md: không có docs/PLAN.md"]);
});

test("báo trang chưa có trong mục lục, kể cả khi chỉ nhắc trong backtick", () => {
  const pages = pagesOf({ "index.md": "`[[A]]`", "A.md": "" });

  assert.deepEqual(checkWiki(pages, ENTRIES), ["A.md: chưa có trong index.md"]);
});

test("liên kết tới file trùng tên ở thư mục khác không tính là đã có trong mục lục", () => {
  const pages = pagesOf({ "index.md": "[[srs/README]] [[wiki/A]]", "README.md": "", "A.md": "" });

  assert.deepEqual(checkWiki(pages, ENTRIES), ["README.md: chưa có trong index.md"]);
});

test("liên kết tới thư mục con của wiki không tính là trang cùng tên ở gốc wiki", () => {
  const pages = pagesOf({ "index.md": "[[wiki/con/README]]", "README.md": "" });

  assert.deepEqual(checkWiki(pages, [...ENTRIES, "wiki/con", "wiki/con/README.md"]), ["README.md: chưa có trong index.md"]);
});

test("đường dẫn dạng NFD vẫn khớp tên file NFC", () => {
  const pages = pagesOf({ "index.md": `\`docs/wiki/${"Trang có dấu".normalize("NFD")}.md\`` });

  assert.deepEqual(checkWiki(pages, ENTRIES), []);
});

test("tên có dấu khớp nhau dù dạng Unicode khác nhau", () => {
  const nfd = "Trang có dấu".normalize("NFD");
  const pages = pagesOf({ "index.md": `[[${nfd}]]`, "Trang có dấu.md": "" });

  assert.deepEqual(checkWiki(pages, ENTRIES), []);
});

test("thiếu index.md thì báo lỗi", () => {
  assert.deepEqual(checkWiki(pagesOf({ "A.md": "" }), ENTRIES), ["thiếu index.md"]);
});

test("chạy thật: kho đúng thoát 0, kho có liên kết hỏng thoát 1", () => {
  const script = join(dirname(fileURLToPath(import.meta.url)), "check-links.mjs");
  const root = mkdtempSync(join(tmpdir(), "check-links-"));

  try {
    mkdirSync(join(root, "docs", "wiki"), { recursive: true });
    writeFileSync(join(root, "docs", "wiki", "index.md"), "[[index]]");
    assert.equal(spawnSync(process.execPath, [script, root], { encoding: "utf8" }).status, 0);

    writeFileSync(join(root, "docs", "wiki", "index.md"), "[[Không có]]");
    const broken = spawnSync(process.execPath, [script, root], { encoding: "utf8" });

    assert.equal(broken.status, 1);
    assert.match(broken.stderr, /liên kết hỏng/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
