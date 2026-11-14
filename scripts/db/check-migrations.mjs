// Kiểm migration Flyway so với nhánh base (thay phần tất định của agent migration-checker):
// không sửa/xoá/đổi tên migration đã có ở base, tên đúng V<n>__mo_ta.sql, version không trùng, version mới lớn hơn
// version lớn nhất ở base, và ddl-auto ở cấu hình main luôn là validate.
// Dùng: node scripts/db/check-migrations.mjs [--base origin/main]   (so cả thay đổi đã commit lẫn chưa commit)
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const MIGRATION_DIR = "backend/src/main/resources/db/migration";
export const RESOURCES_DIR = "backend/src/main/resources";
const NAME = /^V(\d+)__[a-z0-9_]+\.sql$/;
const versionOf = (file) => Number(NAME.exec(file)?.[1]);
const base = (path) => path.split("/").pop();

/**
 * baseFiles: tên file migration ở base; currentFiles: tên file hiện có; changes: [{status, path}] từ git diff --name-status
 * so với merge-base; configs: {tên file: nội dung} các application*.yml của main. Trả về mảng lỗi.
 */
export function checkMigrations({ baseFiles, currentFiles, changes, configs }) {
  const errors = [];
  const inBase = new Set(baseFiles);
  for (const { status, path, oldPath } of changes) {
    const touched = oldPath ? base(oldPath) : base(path);
    if (status !== "A" && inBase.has(touched)) {
      const verb = { M: "bị sửa", D: "bị xoá", R: "bị đổi tên" }[status[0]] ?? `thay đổi (${status})`;
      errors.push(`${touched} đã có ở base nhưng ${verb}: chỉ được thêm migration mới`);
    }
  }
  const seen = new Map();
  for (const f of currentFiles) {
    if (!NAME.test(f)) { errors.push(`${f}: tên phải dạng V<số>__mo_ta.sql (chữ thường, số, gạch dưới)`); continue; }
    const v = versionOf(f);
    if (seen.has(v)) errors.push(`${f}: trùng version V${v} với ${seen.get(v)}`);
    seen.set(v, f);
  }
  const baseMax = Math.max(0, ...baseFiles.filter((f) => NAME.test(f)).map(versionOf));
  for (const f of currentFiles.filter((f) => NAME.test(f) && !inBase.has(f))) {
    if (versionOf(f) <= baseMax) errors.push(`${f}: migration mới phải có version > V${baseMax} (lớn nhất ở base)`);
  }
  for (const [name, text] of Object.entries(configs)) {
    const code = text.replace(/(^|\s)#.*$/gm, ""); // bỏ comment YAML để dòng ví dụ không bị chặn nhầm
    for (const m of code.matchAll(/ddl-auto:\s*([^\s#]+)/g)) {
      if (m[1] !== "validate") errors.push(`${name}: ddl-auto là "${m[1]}", phải là validate (schema do Flyway quản lý)`);
    }
  }
  return errors;
}

/** Parse output của `git diff --name-status -M`. */
export function parseNameStatus(out) {
  return out.split("\n").filter(Boolean).map((line) => {
    const [status, a, b] = line.split("\t");
    return status.startsWith("R") ? { status: "R", oldPath: a, path: b } : { status, path: a };
  });
}

function main() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
  const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" });
  const i = process.argv.indexOf("--base");
  const baseRef = i > 0 ? process.argv[i + 1] : "origin/main";
  let mergeBase;
  try {
    mergeBase = git("merge-base", baseRef, "HEAD").trim();
  } catch {
    console.error(`Không tìm thấy merge-base với ${baseRef} (CI cần checkout fetch-depth: 0; máy cá nhân dùng --base main).`);
    process.exit(2);
  }
  const baseFiles = git("ls-tree", "--name-only", `${mergeBase}:${MIGRATION_DIR}`).split("\n").filter(Boolean);
  // So merge-base với cây làm việc: gồm commit của nhánh và thay đổi chưa commit (file chưa track xem ở currentFiles).
  const changes = parseNameStatus(git("diff", "--name-status", "-M", mergeBase, "--", MIGRATION_DIR));
  const dir = join(root, MIGRATION_DIR);
  const currentFiles = existsSync(dir) ? readdirSync(dir).filter((f) => !f.startsWith(".")) : [];
  const res = join(root, RESOURCES_DIR);
  const configs = Object.fromEntries(readdirSync(res).filter((f) => /^application.*\.ya?ml$/.test(f))
    .map((f) => [f, readFileSync(join(res, f), "utf8")]));
  const errors = checkMigrations({ baseFiles, currentFiles, changes, configs });
  for (const e of errors) console.error(`[CHẶN] ${e}`);
  if (errors.length) process.exit(1);
  console.log(`migrations: hợp lệ so với ${baseRef} (${currentFiles.length} file, base có ${baseFiles.length}).`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
