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

function sanitizeProse(segment, repo) {
  return segment
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "[ảnh đã loại]")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<\/?[A-Za-z][^>]*>/g, "")
    .replace(/https?:\/\/[^\s)>\]]+/g, (url) =>
      repo && url.startsWith(`https://github.com/${repo}/`) ? url : "[liên kết đã loại]",
    )
    .replace(/(^|[^\w`@])@([A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)?)/g, "$1@​$2");
}

/**
 * @param {string} text
 * @param {{repo?: string, max?: number}} [opts] repo "owner/name": chỉ giữ liên kết trỏ vào repo này.
 */
export function sanitizeText(text, { repo, max = 1500 } = {}) {
  let t = redactSecrets(String(text)).replace(/<!--[\s\S]*?-->/g, "").replace(/<!--/g, "&lt;!--");
  // Phần trong khối code / code span được giữ nguyên (ví dụ List<String>), phần còn lại bị làm sạch.
  const parts = t.split(/(```[\s\S]*?```|`[^`\n]*`)/);
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
