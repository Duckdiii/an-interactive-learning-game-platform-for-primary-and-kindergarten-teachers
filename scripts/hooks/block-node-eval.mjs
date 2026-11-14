// Hook PreToolUse (Bash) của Claude Code: chặn `node -e`/`node --eval` có code nhiều dòng hoặc dài > 200 ký tự.
// Lý do: sinh code qua `node -e` trong bash đã làm mất một lớp escape 3 lần (docs/corrections.md); ghi ra file thì không.
// Nhận JSON của hook trên stdin, in quyết định deny ra stdout; lệnh khác thì im lặng cho qua.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const MAX_INLINE = 200;
export const MESSAGE = "Hãy ghi script vào một file .mjs trong scripts/tmp/ rồi chạy file đó";
// `node` hoặc `node.exe` đứng đầu lệnh hoặc sau khoảng trắng, ; & | (. Không có lượng từ lồng nhau: bản regex cũ gộp cả
// phần tuỳ chọn vào một regex bị CodeQL báo backtrack theo hàm mũ (ReDoS), nên phần tuỳ chọn duyệt bằng vòng lặp.
const NODE = /(?:^|[\s;&|(])node(?:\.exe)?(?=\s)/g;
const isSpace = (ch) => ch === " " || ch === "\t" || ch === "\n" || ch === "\r";

const tooLong = (code) => code.includes("\n") || code.length > MAX_INLINE;

/** true nếu lệnh có `node -e`/`--eval` mà phần code nhiều dòng hoặc dài hơn MAX_INLINE ký tự. */
export function shouldBlock(command) {
  const text = command ?? "";
  NODE.lastIndex = 0;
  for (let m = NODE.exec(text); m; m = NODE.exec(text)) {
    let i = m.index + m[0].length;
    // Chỉ đi qua các tuỳ chọn có dấu gạch (ví dụ --input-type=module); gặp đối số khác thì dừng, nên
    // `node scripts/x.mjs | grep -e y` không khớp.
    for (;;) {
      while (i < text.length && isSpace(text[i])) i++;
      const start = i;
      while (i < text.length && !isSpace(text[i])) i++;
      if (text[start] !== "-") {
        i = start; // token này có thể chứa `;node` (ví dụ `x;node -e …`): để lần exec sau tìm trong nó
        break;
      }
      const token = text.slice(start, i);
      // shortcut: đo từ sau cờ tới hết lệnh (gồm cả lệnh nối phía sau); có thể chặn thừa lệnh dài nối sau `node -e` ngắn.
      if (token === "-e" || token === "--eval") return tooLong(text.slice(i).replace(/^\s+/, ""));
      if (token.startsWith("--eval=")) return tooLong(text.slice(start + "--eval=".length));
    }
    // Các `node` nằm trong tuỳ chọn vừa duyệt (ví dụ token `-;node`) không duyệt lại: giữ tổng công việc tuyến tính.
    NODE.lastIndex = Math.max(NODE.lastIndex, i);
  }
  return false;
}

function main() {
  let input;
  try {
    input = JSON.parse(readFileSync(0, "utf8"));
  } catch {
    return; // không đọc được input thì không chặn, để không làm hỏng mọi lệnh Bash
  }
  if (input.tool_name !== "Bash" || !shouldBlock(input.tool_input?.command)) return;
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: MESSAGE },
  }));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
