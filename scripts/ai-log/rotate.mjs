// Giữ ai-usage-log.md gọn: khi bảng vượt TRIGGER dòng, chuyển các dòng cũ nhất sang
// docs/ai-usage-log-archive/ (mỗi file 100 STT) và chỉ giữ KEEP dòng mới nhất.
// Dùng: node scripts/ai-log/rotate.mjs   (im lặng nếu chưa cần xoay vòng; chạy tự động ở hook Stop)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const KEEP = 25;
export const TRIGGER = 40; // trigger > keep để không xoay vòng mỗi lần thêm 1 dòng
export const BUCKET = 100;
export const MAX_ROWS = 60; // ngưỡng của --check (CI): đủ rộng để hook Stop/pre-commit kịp xoay vòng trước đó
const ROW = /^\| (\d+) \|/;

export const countRows = (text) => text.split("\n").filter((l) => ROW.test(l)).length;
const pad = (n) => String(n).padStart(4, "0");

/** Trả về null nếu chưa cần xoay vòng, ngược lại {newText, byFile: Map<tên file, dòng[]>, header}. */
export function planRotation(text, { keep = KEEP, trigger = TRIGGER } = {}) {
  const lines = text.split("\n");
  const idx = [];
  lines.forEach((l, i) => ROW.test(l) && idx.push(i));
  if (idx.length <= trigger) return null;
  if (idx.at(-1) - idx[0] + 1 !== idx.length) {
    throw new Error("Các dòng bảng không liền nhau (có dòng bị xuống dòng thật hoặc bị chèn giữa); sửa tay rồi chạy lại.");
  }
  const moved = idx.slice(0, idx.length - keep);
  const byFile = new Map();
  for (const i of moved) {
    const lo = Math.floor((Number(ROW.exec(lines[i])[1]) - 1) / BUCKET) * BUCKET + 1;
    const name = `STT-${pad(lo)}-${pad(lo + BUCKET - 1)}.md`;
    byFile.set(name, [...(byFile.get(name) ?? []), lines[i]]);
  }
  const newLines = [...lines.slice(0, idx[0]), ...lines.slice(idx[0] + moved.length)];
  return { newText: newLines.join("\n"), byFile, header: lines.slice(idx[0] - 2, idx[0]) };
}

/** Nội dung file lưu trữ sau khi thêm các dòng mới (bỏ dòng đã có theo STT, giữ thứ tự STT). */
export function mergeArchive(existing, rows, header, name) {
  const base = existing ?? `# Nhật ký sử dụng AI — lưu trữ ${name.replace(".md", "")}\n\n> Chuyển tự động từ \`ai-usage-log.md\` bằng \`scripts/ai-log/rotate.mjs\`. Không sửa tay; dòng mới nhất nằm ở file gốc.\n\n${header.join("\n")}\n`;
  const have = new Set(base.split("\n").map((l) => ROW.exec(l)?.[1]).filter(Boolean));
  const fresh = rows.filter((r) => !have.has(ROW.exec(r)[1]));
  return fresh.length ? base.replace(/\n*$/, "\n") + fresh.join("\n") + "\n" : base;
}

function main() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
  const logPath = join(root, "ai-usage-log.md");
  const text = readFileSync(logPath, "utf8");
  if (process.argv.includes("--check")) {
    const n = countRows(text);
    if (n > MAX_ROWS) {
      console.error(`ai-usage-log.md có ${n} dòng (tối đa ${MAX_ROWS}): chạy node scripts/ai-log/rotate.mjs rồi commit lại.`);
      process.exit(1);
    }
    return;
  }
  const plan = planRotation(text);
  if (!plan) return;
  const dir = join(root, "docs", "ai-usage-log-archive");
  mkdirSync(dir, { recursive: true });
  // Ghi archive trước, log gốc sau: nếu lỗi giữa chừng thì chỉ bị trùng (lần sau tự bỏ trùng), không mất dòng.
  for (const [name, rows] of plan.byFile) {
    const p = join(dir, name);
    writeFileSync(p, mergeArchive(existsSync(p) ? readFileSync(p, "utf8") : null, rows, plan.header, name));
  }
  writeFileSync(logPath, plan.newText);
  console.log(`ai-usage-log: đã chuyển ${[...plan.byFile.values()].flat().length} dòng cũ sang docs/ai-usage-log-archive/`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
