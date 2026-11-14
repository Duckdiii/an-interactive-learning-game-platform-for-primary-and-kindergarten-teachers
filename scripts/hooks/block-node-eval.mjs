// Hook PreToolUse (Bash) của Claude Code: chặn `node -e`/`node --eval` có code nhiều dòng hoặc dài > 200 ký tự.
// Lý do: sinh code qua `node -e` trong bash đã làm mất một lớp escape 3 lần (docs/corrections.md); ghi ra file thì không.
// Nhận JSON của hook trên stdin, in quyết định deny ra stdout; lệnh khác thì im lặng cho qua.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const MAX_INLINE = 200;
export const MESSAGE = "Hãy ghi script vào một file .mjs trong scripts/tmp/ rồi chạy file đó";
// `node` (hoặc node.exe), tuỳ chọn có dấu gạch (ví dụ --input-type=module), rồi -e/--eval. Không vượt qua đối số
// không phải tuỳ chọn, nên `node scripts/x.mjs | grep -e y` không khớp.
const NODE_EVAL = /(?:^|[\s;&|(])node(?:\.exe)?((?:\s+--?[\w-]+(?:=\S+)?)*?)\s+(?:-e|--eval)(?:=|\s+)/;

/** true nếu lệnh có `node -e`/`--eval` mà phần code nhiều dòng hoặc dài hơn MAX_INLINE ký tự. */
export function shouldBlock(command) {
  const m = NODE_EVAL.exec(command ?? "");
  if (!m) return false;
  // shortcut: đo từ sau cờ tới hết lệnh (gồm cả lệnh nối phía sau); đủ để chặn ca nguy hiểm, có thể chặn thừa lệnh dài.
  const code = command.slice(m.index + m[0].length);
  return code.includes("\n") || code.length > MAX_INLINE;
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
