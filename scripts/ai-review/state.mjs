// Trạng thái của các lần review được lưu ngay trong comment tổng kết (dưới dạng marker ẩn):
//   - commit đã review, version prompt, chế độ, số lần đã chạy
//   - danh sách vấn đề còn mở (để lần sau kiểm tra "đã xử lý chưa")
// Nội dung trong comment là dữ liệu không tin cậy: mọi thứ đọc ra đều được kiểm tra lại theo schema.
import { validate } from "./schema-validate.mjs";
import { cleanGuidance, redactSecrets, sanitizeText } from "./sanitize.mjs";

export const MARKER_SUMMARY = "<!-- ai-review:summary -->";
export const STATE_RE = /<!-- ai-review:sha=([0-9a-f]{7,40}) prompt=(\S+) mode=([ABC])(?: runs=(\d+))? -->/;
const DATA_RE = /<!-- ai-review:data=([A-Za-z0-9+/=]+) -->/;
export const MAX_DATA_CHARS = 20000;
/** Số lần review tự động tối đa mỗi PR (label và chạy tay bỏ qua giới hạn này). */
export const MAX_AUTO_RUNS = 5;
export const MAX_OPEN = 40;
const SEVERITY_ORDER = { blocker: 0, major: 1, minor: 2 };

const DATA_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["v", "open"],
  properties: {
    v: { const: 1 },
    open: {
      type: "array",
      maxItems: MAX_OPEN,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["fp", "file", "category", "severity", "code", "message"],
        properties: {
          fp: { type: "string", pattern: "^[0-9a-f]{16}$" },
          file: { type: "string", minLength: 1, maxLength: 300 },
          category: { enum: ["bug", "security", "transaction", "n_plus_one", "exception", "architecture", "contract", "ux", "gap", "suggestion"] },
          severity: { enum: ["blocker", "major", "minor"] },
          code: { type: "string", maxLength: 300 },
          message: { type: "string", maxLength: 300 },
          fix: { type: "string", maxLength: 300 },
        },
      },
    },
  },
};

/** Tìm comment tổng kết do bot đăng (chỉ tin comment của bot, người khác giả marker bị bỏ qua). */
export function findSummary(comments, bot = "github-actions[bot]") {
  return comments.find((c) => c.user?.login === bot && typeof c.body === "string" && c.body.includes(MARKER_SUMMARY)) ?? null;
}

/** @returns {{sha: string, prompt: string, mode: string, runs: number} | null} */
export function parseState(body) {
  const m = STATE_RE.exec(body ?? "");
  return m ? { sha: m[1], prompt: m[2], mode: m[3], runs: m[4] === undefined ? 0 : Number(m[4]) } : null;
}

/** Bản ghi gọn của một vấn đề, đã làm sạch để lưu lâu dài và đưa lại cho agent. */
export function toRecord({ fp, file, category, severity, code, message, fix }) {
  return {
    fp,
    file: String(file).slice(0, 300),
    category,
    severity,
    code: redactSecrets(String(code ?? "")).slice(0, 300),
    message: sanitizeText(String(message ?? ""), { max: 300 }),
    ...(cleanGuidance(fix, { max: 300 }) ? { fix: cleanGuidance(fix, { max: 300 }) } : {}),
  };
}

const encode = (open) => Buffer.from(JSON.stringify({ v: 1, open }), "utf8").toString("base64");

/** Giữ lại các vấn đề quan trọng nhất cho vừa giới hạn kích thước. */
export function fitOpen(open) {
  let list = [...open].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]).slice(0, MAX_OPEN);
  while (list.length > 0 && encode(list).length > MAX_DATA_CHARS) list = list.slice(0, -1);
  return list;
}

/** Các dòng marker ghi vào cuối comment tổng kết. */
export function renderStateMarkers({ sha, prompt, mode, runs, open }) {
  return [
    MARKER_SUMMARY,
    `<!-- ai-review:sha=${sha} prompt=${prompt} mode=${mode} runs=${runs} -->`,
    `<!-- ai-review:data=${encode(fitOpen(open))} -->`,
  ];
}

/** @returns {Array|null} danh sách vấn đề còn mở đã kiểm tra schema; null nếu không có hoặc không hợp lệ */
export function parseOpenFindings(body) {
  const m = DATA_RE.exec(body ?? "");
  if (!m) return null;
  try {
    const data = JSON.parse(Buffer.from(m[1], "base64").toString("utf8"));
    return validate(data, DATA_SCHEMA).length === 0 ? data.open : null;
  } catch {
    return null;
  }
}
