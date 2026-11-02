// Làm sạch văn bản do agent sinh ra trước khi đăng lên PR. Văn bản của agent là dữ liệu không tin cậy.
// Loại: bình luận HTML, thẻ HTML, ảnh markdown, liên kết lạ, secret; vô hiệu hóa @mention.

const SECRET_PATTERNS = [
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g,
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g,
  /\bsk-ant-[A-Za-z0-9_-]{10,}\b/g,
  /\bsk-[A-Za-z0-9_-]{20,}\b/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?(?:-----END [A-Z ]*PRIVATE KEY-----|$)/g,
];
const BEARER = /\b(Bearer\s+)[A-Za-z0-9._~+/=-]{20,}/gi;
const KEY_VALUE = /\b(password|passwd|secret|token|api[_-]?key)(\s*[:=]\s*)(["']?)[^\s"']{6,}\3/gi;
const REDACTED = "[đã ẩn]";
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/** Che secret và ký tự điều khiển; dùng cho mọi chuỗi, kể cả trong khối code. */
export function redactSecrets(text) {
  let out = text.replace(CONTROL, "");
  for (const re of SECRET_PATTERNS) out = out.replace(re, REDACTED);
  return out.replace(BEARER, `$1${REDACTED}`).replace(KEY_VALUE, `$1$2${REDACTED}`);
}

// Gỡ một lượt có thể ghép phần còn lại thành đúng thứ vừa loại (`<<b>script>` thành `<script>`), nên lặp tới khi không đổi.
// Giới hạn số lượt để đầu vào lồng rất sâu không gây chậm; quá giới hạn thì thoát mọi dấu < (an toàn hơn là giữ lại).
const MAX_PASSES = 20;
const MAX_INPUT = 20000;

function untilStable(text, step) {
  let out = text;
  for (let pass = 0; pass < MAX_PASSES; pass++) {
    const prev = out;
    out = step(out);
    if (out === prev) return out;
  }
  return out.replace(/</g, "&lt;");
}

/** Bỏ bình luận HTML, kể cả bình luận lồng để tái tạo sau khi gỡ. */
export function stripHtmlComments(text) {
  let out = text;
  let prev;
  // Mỗi lượt có đổi thì chuỗi ngắn đi nên vòng lặp luôn dừng, không cần MAX_PASSES.
  do {
    prev = out;
    out = out.replace(/<!--[\s\S]*?-->/g, "");
  } while (out !== prev);
  return out;
}

function stripHtmlTags(text) {
  let out = text;
  let prev;
  let pass = 0;
  // Còn sót thẻ khi quá MAX_PASSES thì `sanitizeProse` thoát dấu < ở bước cuối.
  do {
    prev = out;
    out = out.replace(/<\/?[A-Za-z][^>]*>/g, "");
    pass++;
  } while (out !== prev && pass < MAX_PASSES);
  return out;
}

function stripMarkup(segment, repo) {
  const noLinks = segment
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "[ảnh đã loại]")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");
  return stripHtmlTags(noLinks)
    .replace(/\b(?:https?:\/\/|ftp:\/\/|mailto:|xmpp:|www\d{0,3}\.)[^\s)>\]]+/gi, (url) =>
      repo && url.startsWith(`https://github.com/${repo}/`) ? url : "[liên kết đã loại]",
    );
}

function sanitizeProse(segment, repo) {
  return untilStable(segment, (s) => stripMarkup(s, repo))
    // Lưới cuối cho những gì regex ở trên không khớp (ngoặc lồng, liên kết tham chiếu, thẻ bị tách đôi ở biên code span):
    // thoát `]` để Markdown không còn hiểu là liên kết, thoát `<` để không còn hiểu là HTML.
    .replace(/\](?=[([:])/g, "]\\")
    .replace(/<(?=[A-Za-z/!?])/g, "&lt;")
    .replace(/([\w.+-])@([\w-]+\.[\w.-]+)/g, "$1@​$2")
    .replace(/(^|[^\w`@])@([A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)?)/g, "$1@​$2");
}

/**
 * @param {string} text
 * @param {{repo?: string, max?: number}} [opts] repo "owner/name": chỉ giữ liên kết trỏ vào repo này.
 */
export function sanitizeText(text, { repo, max = 1500 } = {}) {
  // Cắt trước khi làm sạch để regex không chạy bậc hai trên chuỗi dài do người ngoài kiểm soát; `max` chỉ cắt đầu ra.
  // JS coi U+2028, U+2029 là xuống dòng còn Markdown thì không; chuẩn hóa để `^` dưới đây không nhận nhầm fence.
  const normalized = String(text).slice(0, MAX_INPUT).replace(/\r\n?|[\u0085\u2028\u2029]/g, "\n");
  let t = stripHtmlComments(redactSecrets(normalized)).replace(/<!--/g, "&lt;!--");
  // Phần trong khối code / code span được giữ nguyên (ví dụ List<String>), phần còn lại bị làm sạch.
  // Chỉ giữ dạng chắc chắn là code trong Markdown (fence đầu dòng, code span một backtick); dạng khác thì vẫn làm sạch.
  const parts = t.split(/(^```[^`\n]*\n[\s\S]*?^ {0,3}`{3,}[ \t]*$|(?<![\\`])`[^`\n]*`(?!`))/m);
  t = parts.map((p, i) => (i % 2 === 1 ? p : sanitizeProse(p, repo))).join("");
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

/**
 * Hướng giải quyết bằng lời: bỏ mọi khối code (kể cả khối chưa đóng), làm sạch như văn bản agent khác,
 * gộp khoảng trắng và cắt độ dài. AI có thể không nghe lời prompt "không viết code", nên việc này do code đảm bảo.
 */
export function cleanGuidance(text, { repo, max = 400 } = {}) {
  if (!text) return "";
  const noCode = String(text).replace(/```[\s\S]*?```/g, " ").replace(/```[\s\S]*$/, " ");
  return sanitizeText(noCode, { repo, max }).replace(/\s+/g, " ").trim();
}
