// Chia PR lớn thành nhiều phần để mỗi phần có một agent review riêng (mỗi agent có đủ lượt, không bị incomplete).
// Dùng: node shard.mjs --pr 12 --repo owner/name --round 1|2 [--out-dir ai-review-input]
//        [--max-files 15] [--max-chars 120000] [--max-shards 6]
// Cần GITHUB_TOKEN (chỉ đọc diff). Ghi $GITHUB_OUTPUT: shards (số phần), matrix (JSON cho strategy.matrix).
// Từ 2 phần trở lên, ghi thêm <out-dir>/shard-<i>.json = {"shard": i, "of": n, "files": [...]}; agent đọc file này
// (tên file là dữ liệu không tin cậy nên đi qua JSON, không chép vào prompt). Vòng 2 và PR nhỏ luôn là 1 phần.
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Github, GithubError } from "./github.mjs";

export const DEFAULT_MAX_FILES = 15;
export const DEFAULT_MAX_CHARS = 120_000;
export const DEFAULT_MAX_SHARDS = 6;

// File sinh tự động hoặc nhật ký: prompt đã bảo agent bỏ qua, nên không chiếm chỗ trong ngân sách của phần nào.
const NOISE = [
  /(^|\/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock)$/,
  /^docs\/ai-usage-log-archive\//,
  /^ai-usage-log\.md$/,
  /^docs\/openapi\/INDEX\.md$/,
  /^docs\/srs\//,
  /\.min\.(js|css)$/,
];

/** Kích thước (ký tự) của từng file trong một unified diff. Khóa là đường dẫn phía mới. */
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

export function fileSizes(diffText) {
  const sizes = new Map();
  for (const part of diffText.split(/^(?=diff --git )/m)) {
    if (!part.startsWith("diff --git ")) continue;
    const path = newPath(part);
    if (path) sizes.set(path, (sizes.get(path) ?? 0) + part.length);
  }
  return sizes;
}

/** Dự phòng khi GitHub không trả diff cả PR (PR quá lớn): dùng danh sách file có phân trang, đổi dòng thay đổi ra ký tự gần đúng. */
export function sizesFromFileList(files) {
  const sizes = new Map();
  for (const f of files) sizes.set(f.filename, (f.patch?.length ?? 0) || (f.changes ?? 0) * 60 || 1);
  return sizes;
}

/**
 * @param {Map<string, number>} sizes đường dẫn → số ký tự diff
 * @returns {{shards: {files: string[], chars: number}[], skipped: string[]}}
 *   skipped: file bị loại vì là file sinh tự động; shards[0..n-1] là các phần (rỗng nếu PR chỉ có file loại đó).
 */
export function planShards(sizes, { maxFiles = DEFAULT_MAX_FILES, maxChars = DEFAULT_MAX_CHARS, maxShards = DEFAULT_MAX_SHARDS } = {}) {
  const skipped = [];
  const entries = [];
  for (const [path, chars] of sizes) {
    if (NOISE.some((re) => re.test(path))) skipped.push(path);
    else entries.push([path, chars]);
  }
  // Xếp theo đường dẫn để file cùng thư mục (thường liên quan nhau) rơi vào cùng một phần.
  entries.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  const total = entries.reduce((sum, [, c]) => sum + c, 0);
  const wanted = Math.max(Math.ceil(entries.length / maxFiles), Math.ceil(total / maxChars), 1);
  const n = Math.min(wanted, maxShards, Math.max(entries.length, 1));
  const shards = [];
  let current = { files: [], chars: 0 };
  let done = 0;
  let doneAtStart = 0; // lượng đã chia xong trước khi phần hiện tại bắt đầu
  for (const [path, chars] of entries) {
    // Cắt phần mới khi phần hiện tại đã đạt phần chia đều của lượng còn lại (và còn chỗ cho phần tiếp theo).
    const remainingShards = n - shards.length;
    const target = (total - doneAtStart) / remainingShards;
    if (current.files.length > 0 && remainingShards > 1 && current.chars >= target) {
      shards.push(current);
      current = { files: [], chars: 0 };
      doneAtStart = done;
    }
    current.files.push(path);
    current.chars += chars;
    done += chars;
  }
  if (current.files.length > 0 || shards.length === 0) shards.push(current);
  return { shards, skipped };
}

function arg(argv, name) {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
}

async function main() {
  const a = process.argv.slice(2);
  const need = (k) => { const v = arg(a, k); if (!v) throw new Error(`Thiếu --${k}`); return v; };
  const pr = need("pr");
  if (!/^[0-9]+$/.test(pr)) throw new Error("pr phải là số");
  const round = need("round");
  let shards = [{ files: [], chars: 0 }];
  let summary = "vòng 2 hoặc không có diff: 1 phần";
  if (round === "1") {
    const github = new Github({ token: process.env.GITHUB_TOKEN, repo: need("repo") });
    let sizes;
    try {
      sizes = fileSizes(await github.getDiff(Number(pr)));
    } catch (e) {
      if (!(e instanceof GithubError)) throw e;
      console.log(`Không lấy được diff cả PR (${e.message}); dùng danh sách file.`);
      sizes = sizesFromFileList(await github.listPullFiles(Number(pr)));
    }
    // Chế độ A không có công cụ Read nên không đọc được danh sách file của phần: luôn một phần.
    const single = arg(a, "mode") === "A";
    const plan = planShards(sizes, {
      maxFiles: single ? Infinity : Number(arg(a, "max-files") ?? DEFAULT_MAX_FILES),
      maxChars: single ? Infinity : Number(arg(a, "max-chars") ?? DEFAULT_MAX_CHARS),
      maxShards: Number(arg(a, "max-shards") ?? DEFAULT_MAX_SHARDS),
    });
    shards = plan.shards;
    summary = `${shards.length} phần, ${shards.map((s) => s.files.length).join("+")} file (bỏ qua ${plan.skipped.length} file sinh tự động)`;
  }
  const n = shards.length;
  // Luôn ghi manifest để thư mục đầu vào không bao giờ rỗng (job sau tải nó như một artifact).
  const dir = resolve(arg(a, "out-dir") ?? "ai-review-input");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "manifest.json"), JSON.stringify({ shards: n }));
  if (n > 1) {
    shards.forEach((s, i) => writeFileSync(join(dir, `shard-${i + 1}.json`), JSON.stringify({ shard: i + 1, of: n, files: s.files }, null, 2)));
  }
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `shards=${n}\nmatrix=${JSON.stringify({ shard: shards.map((_, i) => i + 1) })}\n`);
  }
  console.log(`Chia review: ${summary}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
