import { appendFileSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

export const DEFAULT_MAX_FILES = 10;
export const DEFAULT_MAX_CHARS = 55_000;
export const DEFAULT_MAX_SHARDS = 24;

// File sinh tự động hoặc nhật ký: prompt đã bảo agent bỏ qua, nên không chiếm chỗ trong ngân sách của phần nào.
const NOISE = [
  /(^|\/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock)$/,
  /^docs\/ai-usage-log-archive\//,
  /^ai-usage-log\.md$/,
  /^docs\/openapi\/INDEX\.md$/,
  /^docs\/srs\//,
  /\.(png|jpe?g|gif|webp|ico|avif)$/i,
  /\.min\.(js|css)$/,
];

/** Git bọc đường dẫn có ký tự đặc biệt (kể cả tiếng Việt) trong dấu nháy và viết byte dạng \ooo; giải mã về chữ thường. */
export function unquote(raw) {
  const p = raw.trim();
  if (!(p.startsWith('"') && p.endsWith('"') && p.length >= 2)) return p;
  const bytes = [];
  const body = p.slice(1, -1);
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (c === "\\" && /^[0-7]{3}/.test(body.slice(i + 1, i + 4))) { bytes.push(parseInt(body.slice(i + 1, i + 4), 8)); i += 3; }
    else if (c === "\\" && i + 1 < body.length) {
      const next = body[++i];
      bytes.push(...Buffer.from({ n: "\n", t: "\t", '"': '"', "\\": "\\" }[next] ?? next));
    } else bytes.push(...Buffer.from(c));
  }
  return Buffer.from(bytes).toString("utf8");
}

// Đường dẫn phía mới của một khối diff. Ưu tiên dòng `rename to` / `+++ b/` (không mơ hồ khi tên có khoảng trắng hay " b/");
// khi không có (file nhị phân, đổi chế độ) thì tách từ dòng `diff --git`, với file không đổi tên hai nửa giống hệt nhau.
function newPath(part) {
  const rename = /^rename to (.+?)\r?$/m.exec(part);
  if (rename) return unquote(rename[1]);
  const plus = /^\+\+\+ (.+?)\r?$/m.exec(part);
  if (plus && plus[1].trim() !== "/dev/null") return unquote(plus[1].replace(/\t.*$/, "")).replace(/^b\//, "");
  const minus = /^--- (.+?)\r?$/m.exec(part);
  if (minus && minus[1].trim() !== "/dev/null") return unquote(minus[1].replace(/\t.*$/, "")).replace(/^a\//, "");
  const header = part.split("\n", 1)[0].replace(/\r$/, "").slice("diff --git ".length);
  const quoted = /^("a\/(?:[^"\\]|\\.)*") ("b\/(?:[^"\\]|\\.)*")$/.exec(header);
  if (quoted) return unquote(quoted[2]).replace(/^b\//, "");
  if (header.startsWith("a/") && (header.length - 5) % 2 === 0) {
    const half = (header.length - 5) / 2;
    if (header.slice(2, 2 + half) === header.slice(5 + half)) return header.slice(5 + half);
  }
  const lazy = /^a\/.+? b\/(.+)$/.exec(header);
  return lazy ? lazy[1] : null;
}

export function filePatches(diff) {
  const patches = new Map();
  for (const part of diff.split(/^(?=diff --git )/m).filter(Boolean)) {
    const path = newPath(part);
    if (!part.startsWith("diff --git ") || !path || patches.has(path)) {
      throw new Error("Không đọc được đầy đủ đường dẫn trong diff.");
    }
    patches.set(path, part);
  }
  return patches;
}

export function planShards(patches, { maxFiles = DEFAULT_MAX_FILES, maxChars = DEFAULT_MAX_CHARS, maxShards = DEFAULT_MAX_SHARDS } = {}) {
  const skipped = [];
  const manual = [];
  const shards = [];
  let current;
  for (const [path, patch] of [...patches].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) {
    if (NOISE.some((re) => re.test(path))) {
      skipped.push(path);
      continue;
    }
    if (patch.length > maxChars || path.length > 300 || /^Binary files .* differ\r?$/m.test(patch)) {
      manual.push(path);
      continue;
    }
    if (!current || current.files.length === maxFiles || current.chars + patch.length > maxChars) {
      if (shards.length === maxShards) {
        manual.push(path);
        continue;
      }
      current = { files: [], chars: 0 };
      shards.push(current);
    }
    current.files.push(path);
    current.chars += patch.length;
  }
  return { shards, skipped, manual };
}

export function pinnedDiff(source, base, head, merge) {
  const git = (...args) => execFileSync("git", args, { cwd: source, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  for (const sha of [base, head, ...(merge ? [merge] : [])]) {
    if (!/^[a-f0-9]{40}$/.test(sha)) throw new Error("SHA phạm vi review không hợp lệ.");
  }
  // Backtest PR đã merge dùng parent trước merge nếu GitHub giữ nguyên head làm parent thứ hai.
  if (merge) {
    const [first, second] = git("show", "-s", "--format=%P", merge).trim().split(" ");
    if (second === head) base = first;
  }
  const range = `${base}...${head}`;
  const diff = git("diff", "--no-ext-diff", "--no-textconv", "--find-renames", range);
  const paths = git("diff", "--name-only", "-z", "--find-renames", range).split("\0").filter(Boolean);
  const patches = filePatches(diff);
  if (paths.length !== patches.size || paths.some((file) => !patches.has(file))) {
    throw new Error("Danh sách file Git khác nội dung diff. Dừng để tránh review thiếu.");
  }
  return patches;
}

export function writePackage(dir, id, files, patches) {
  writeFileSync(join(dir, `shard-${id}.json`), JSON.stringify({ files }));
  writeFileSync(join(dir, `shard-${id}.diff`), files.map((file) => patches.get(file)).join(""));
}

function main() {
  const [source, base, head, merge, round, dir] = process.argv.slice(2);
  mkdirSync(dir, { recursive: true });
  const previous = round === "2" ? JSON.parse(readFileSync(join(dir, "previous.json"), "utf8")).findings.map((finding) => finding.ref) : [];
  const patches = round === "2"
    ? filePatches(readFileSync(join(dir, "incremental.diff"), "utf8"))
    : pinnedDiff(source, base, head, merge);
  const { shards, skipped, manual } = planShards(patches);
  if (round === "2" && (shards.length > 1 || manual.length)) {
    throw new Error("Diff vòng 2 vượt ngân sách. Chạy lại với force để review toàn bộ.");
  }
  if (round === "2" && !shards.length && previous.length) shards.push({ files: [], chars: 0 });
  for (const [index, shard] of shards.entries()) writePackage(dir, index + 1, shard.files, patches);
  const parts = shards.map(({ files }, i) => ({ id: i + 1, files }));
  // Một job rỗng giữ cấu trúc matrix hợp lệ. Không gọi model khi không có phần cần review.
  const matrix = { shard: parts.length ? parts.map(({ id }) => id) : [0] };
  writeFileSync(join(dir, "manifest.json"), JSON.stringify({ round: Number(round), base, head, parts, skipped, manual, previous }));
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `matrix=${JSON.stringify(matrix)}\n`);
  console.log(`Chia review: ${parts.length} phần, ${shards.map(({ files }) => files.length).join("+") || "0"} file; ${skipped.length} loại trừ, ${manual.length} cần review tay.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
