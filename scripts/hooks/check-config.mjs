// Chặn file nhạy cảm/file build và cấu hình nguy hiểm (thay phần tất định của agent pre-commit-checker; secret do gitleaks).
// Dùng: node scripts/hooks/check-config.mjs            (file đã stage: hook pre-commit)
//       node scripts/hooks/check-config.mjs --tracked  (mọi file đang track: CI)
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const FORBIDDEN_PATHS = [
  [/(^|\/)\.env(\.[^/]*)?$/, (p) => !/\.example$/.test(p), "file .env (chỉ commit .env.example)"],
  [/(^|\/)application-local\.ya?ml$/, () => true, "cấu hình cá nhân application-local.yml"],
  [/\.(pem|key|p12|jks)$/, () => true, "file khoá/chứng chỉ"],
  [/(^|\/)(target|node_modules|dist)\//, () => true, "file build (target/, node_modules/, dist/)"],
];
const MODERATION_OFF = "tắt kiểm duyệt Layer 3 trong file dùng chung (chỉ được ở .env cá nhân)";
// Chỉ soi nội dung file cấu hình dùng chung; test được phép tắt kiểm duyệt, tài liệu được nhắc tới các chuỗi này.
const CONFIG_FILE = /(\.ya?ml|\.properties|(^|\/)\.env[^/]*)$/;
const SKIP_CONTENT = /(^|\/)src\/test\/|^docs\//;
const CONTENT_RULES = [
  [/:6543\b/, "cổng Transaction Pooler 6543 của Supabase (không tương thích prepared statement của Hibernate)"],
  [/(MODERATION_REQUIRED|moderation\.required)\s*[=:]\s*["']?false/i, MODERATION_OFF],
];

/** files: [{path, content}] (content null nếu không đọc được, ví dụ file bị xoá). Trả về mảng lỗi. */
export function checkFiles(files) {
  const errors = [];
  for (const { path, content } of files) {
    for (const [re, applies, why] of FORBIDDEN_PATHS) {
      if (re.test(path) && applies(path)) errors.push(`${path}: ${why}`);
    }
    if (content == null || !CONFIG_FILE.test(path) || SKIP_CONTENT.test(path)) continue;
    let moderationIndent = -1; // thụt lề của khoá `moderation:` đang mở trong YAML lồng, -1 nếu không ở trong khối đó
    content.split("\n").forEach((raw, i) => {
      const line = raw.replace(/(^|\s)#.*$/, ""); // bỏ comment YAML/.env
      const at = `${path}:${i + 1}`;
      for (const [re, why] of CONTENT_RULES) if (re.test(line)) errors.push(`${at}: ${why}`);
      if (line.trim()) {
        const indent = line.search(/\S/);
        if (moderationIndent >= 0 && indent <= moderationIndent) moderationIndent = -1;
        if (/^\s*moderation:\s*$/.test(line)) moderationIndent = indent;
        else if (moderationIndent >= 0 && /^\s*required:\s*["']?false\b/.test(line)) errors.push(`${at}: ${MODERATION_OFF}`);
      }
      const pool = /maximum-pool-size\s*[=:]\s*(\S+)/.exec(line);
      if (pool && pool[1] !== "5") errors.push(`${at}: maximum-pool-size là ${pool[1]}, phải giữ 5 (giới hạn Supabase free tier)`);
      if (/\.env\.example$/.test(path) && /^\s*OPENAI_API_KEY\s*=\s*\S/.test(line)) {
        errors.push(`${at}: OPENAI_API_KEY trong .env.example phải để trống`);
      }
    });
  }
  return errors;
}

function main() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
  // quotepath=off: tên file tiếng Việt không bị git bọc nháy/escape làm hỏng regex đuôi file và `git show`.
  const git = (...args) => execFileSync("git", ["-c", "core.quotepath=off", ...args],
    { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const tracked = process.argv.includes("--tracked");
  const paths = (tracked ? git("ls-files") : git("diff", "--cached", "--name-only", "--diff-filter=ACMR"))
    .split("\n").filter(Boolean);
  const read = (p) => {
    if (!CONFIG_FILE.test(p) || SKIP_CONTENT.test(p)) return null;
    try { return git("show", `${tracked ? "HEAD" : ""}:${p}`); } catch { return null; }
  };
  const errors = checkFiles(paths.map((path) => ({ path, content: read(path) })));
  for (const e of errors) console.error(`[CHẶN] ${e}`);
  if (errors.length) process.exit(1);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
