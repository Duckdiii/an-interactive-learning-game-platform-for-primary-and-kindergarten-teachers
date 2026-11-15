// Hook PreToolUse (Bash) của Claude Code: chặn `node -e`/`node --eval` có code nhiều dòng hoặc dài > 200 ký tự, và heredoc
// không nháy mà thân có chuỗi bash sẽ nuốt `\`. Lý do: sinh code qua bash đã làm mất một lớp escape nhiều lần
// (docs/corrections.md, lessons-inbox); ghi file bằng công cụ Write/Edit thì không.
// shortcut: công cụ Bash còn gộp `\\` thành `\` trước khi lệnh tới hook (đo 2026-11-15, kể cả trong nháy đơn), nên hook
// không thấy được ý định gõ mấy dấu `\`; phần đó chỉ chặn được bằng thói quen ghi file qua Write/Edit (KNOWN-GAPS #20).
// Nhận JSON của hook trên stdin, in quyết định deny ra stdout; lệnh khác thì im lặng cho qua.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const MAX_INLINE = 200;
export const MESSAGE = "Hãy ghi script vào một file .mjs trong scripts/tmp/ rồi chạy file đó";
export const HEREDOC_MESSAGE =
  "Heredoc không nháy làm bash nuốt \\\\, \\$, \\` và \\ cuối dòng: ghi file bằng công cụ Write/Edit (heredoc qua công cụ Bash còn gộp \\\\ thành \\)";
// `node` hoặc `node.exe` đứng đầu lệnh hoặc sau khoảng trắng, ; & | (. Không có lượng từ lồng nhau: bản regex cũ gộp cả
// phần tuỳ chọn vào một regex bị CodeQL báo backtrack theo hàm mũ (ReDoS), nên phần tuỳ chọn duyệt bằng vòng lặp.
const NODE = /(?:^|[\s;&|(])node(?:\.exe)?(?=\s)/g;
const isSpace = (ch) => ch === " " || ch === "\t" || ch === "\n" || ch === "\r";

const tooLong = (code) => code.includes("\n") || code.length > MAX_INLINE;

// Vị trí ngay sau dấu nháy đóng của đoạn bắt đầu ở `from` (đã qua nháy mở); `escapes`: `\` bỏ qua ký tự kế tiếp.
function closeQuote(text, from, quote, escapes) {
  let k = from;
  while (k < text.length && text[k] !== quote) k += escapes && text[k] === "\\" ? 2 : 1;
  return Math.min(k, text.length);
}

// Đọc một đối số shell bắt đầu ở i, gồm mọi đoạn nối liền: 'nháy đơn', "nháy kép", $'nháy ANSI-C' (\n là xuống dòng)
// và chữ không nháy; dừng ở khoảng trắng hay ký tự nối lệnh, để `node -e x;node -e …` vẫn thấy `node` thứ hai.
// Chỉ đo đúng đối số code, nên chữ `node -e` nằm trong lời văn (ví dụ heredoc của `git commit -m`) không bị chặn.
function readWord(text, i) {
  let code = "";
  let j = i;
  while (j < text.length && !isSpace(text[j]) && !";&|()".includes(text[j])) {
    const ansi = text[j] === "$" && text[j + 1] === "'";
    const quote = ansi ? "'" : text[j];
    if (ansi || quote === "'" || quote === '"') {
      const open = j + (ansi ? 2 : 1);
      const close = closeQuote(text, open, quote, ansi || quote === '"');
      const part = text.slice(open, close);
      code += ansi ? part.replace(/\\n/g, "\n") : part;
      j = Math.min(close + 1, text.length);
    } else {
      code += text[j++];
    }
  }
  return { code, end: j };
}

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
      let codeStart = -1;
      if (token === "-e" || token === "--eval") {
        while (i < text.length && isSpace(text[i])) i++;
        codeStart = i;
      } else if (token.startsWith("--eval=")) {
        codeStart = start + "--eval=".length;
      }
      if (codeStart >= 0) {
        // shortcut: code lấy từ nơi khác (`-e "$(cat x.js)"`, heredoc `node <<EOF`) không bị đo; đủ cho lỗi mất escape đã gặp.
        const { code, end } = readWord(text, codeStart);
        if (tooLong(code)) return true;
        i = end; // code ngắn: quét tiếp phần sau, có thể còn một `node -e` khác trong cùng lệnh
        break;
      }
    }
    // Các `node` nằm trong tuỳ chọn vừa duyệt (ví dụ token `-;node`) không duyệt lại: giữ tổng công việc tuyến tính.
    NODE.lastIndex = Math.max(NODE.lastIndex, i);
  }
  return false;
}

/**
 * true nếu lệnh có heredoc mà dấu kết thúc không nháy (`<<EOF`, không phải `<<'EOF'`) và thân có `\\`, `\$`, `` \` `` hay
 * `\` cuối dòng: bash xử lý các chuỗi đó nên file ghi ra thiếu `\`. `\n`, `\d`... bash giữ nguyên nên không chặn.
 * shortcut: bỏ qua nội dung trong nháy (kể cả heredoc nằm trong "$(...)" hay `bash -c '...'`), không hiểu chú thích `#`
 * (dấu nháy trong `# don't` che heredoc phía sau), chỉ đọc một heredoc mỗi dòng, và `<<` không phải heredoc (`$((1 << 2))`)
 * có thể bị coi là heredoc chưa đóng. Đều hiếm trong lệnh thật; nâng cấp khi gặp.
 */
export function unquotedHeredocLosesBackslash(command) {
  const text = command ?? "";
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === "'" || ch === '"') {
      i = closeQuote(text, i + 1, ch, ch === '"') + 1;
      continue;
    }
    if (ch === "\\") {
      i += 2;
      continue;
    }
    if (ch !== "<" || text[i + 1] !== "<") {
      i++;
      continue;
    }
    if (text[i + 2] === "<") {
      i += 3; // here-string <<<, không phải heredoc
      continue;
    }
    let k = i + 2;
    const stripTabs = text[k] === "-";
    if (stripTabs) k++;
    while (text[k] === " " || text[k] === "\t") k++;
    const start = k;
    while (k < text.length && !isSpace(text[k]) && !";&|()<>".includes(text[k])) k++;
    const rawDelim = text.slice(start, k);
    const bodyStart = text.indexOf("\n", k);
    if (!rawDelim || bodyStart < 0) {
      i = k;
      continue;
    }
    const delim = rawDelim.replace(/['"\\]/g, "");
    const isEnd = (line) => (stripTabs ? line.replace(/^\t+/, "") : line) === delim;
    const body = [];
    let p = bodyStart + 1;
    for (;;) {
      const nl = text.indexOf("\n", p);
      const line = text.slice(p, nl < 0 ? text.length : nl).replace(/\r$/, "");
      if (isEnd(line)) {
        p = nl < 0 ? text.length : nl;
        break;
      }
      body.push(line);
      if (nl < 0) {
        p = text.length; // heredoc chưa đóng: xét tới hết lệnh
        break;
      }
      p = nl + 1;
    }
    if (rawDelim === delim && /\\[\\$`]|\\$/m.test(body.join("\n"))) return true;
    i = p;
  }
  return false;
}

/** Lời nhắn deny cho lệnh, hoặc null nếu cho qua. */
export function blockReason(command) {
  if (shouldBlock(command)) return MESSAGE;
  if (unquotedHeredocLosesBackslash(command)) return HEREDOC_MESSAGE;
  return null;
}

function main() {
  let input;
  try {
    input = JSON.parse(readFileSync(0, "utf8"));
  } catch {
    return; // không đọc được input thì không chặn, để không làm hỏng mọi lệnh Bash
  }
  const reason = input?.tool_name === "Bash" ? blockReason(input.tool_input?.command) : null;
  if (!reason) return;
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: reason },
  }));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
