/**
 * Phần phân tích THUẦN của T5.2 (không chạm trình duyệt, không đọc đĩa) để test được bằng vitest. Phần chạy Playwright
 * nằm ở `measure.mjs`. Mọi hàm nhận dữ liệu đã đo và trả kết quả/dòng bảng.
 */

/** Ngưỡng vùng chạm theo nhóm tuổi (px màn hình), đồng bộ với `src/experiments/age/ageProfiles.ts`. */
export const TOUCH_THRESHOLDS = { PRESCHOOL: 64, GRADE_1_2: 56, GRADE_3_5: 48 }

/** Có tràn ngang không: nội dung rộng hơn khung nhìn thấy (cho phép lệch `tolerance` px do làm tròn). */
export function hasHorizontalOverflow({ scrollWidth, clientWidth }, tolerance = 1) {
  if (![scrollWidth, clientWidth].every(Number.isFinite)) return false
  return scrollWidth - clientWidth > tolerance
}

/**
 * Vùng chạm (đã quy ra px màn hình) nhỏ hơn ngưỡng từng nhóm tuổi.
 * `targets`: [{ label, width, height }]; kích thước là cạnh ngắn của hộp. Trả về { band: [{label, size}] }.
 */
export function touchTargetFailures(targets, thresholds = TOUCH_THRESHOLDS) {
  const out = {}
  for (const [band, min] of Object.entries(thresholds)) {
    out[band] = targets
      .map((t) => ({ label: t.label, size: Math.min(t.width, t.height) }))
      .filter((t) => !(Number.isFinite(t.size) && t.size >= min))
      .map((t) => ({ label: t.label, size: Number.isFinite(t.size) ? Math.round(t.size * 10) / 10 : null }))
  }
  return out
}

/** Cạnh ngắn nhỏ nhất trong các vùng chạm (null nếu không có). */
export function smallestTarget(targets) {
  const sizes = targets.map((t) => Math.min(t.width, t.height)).filter(Number.isFinite)
  return sizes.length === 0 ? null : Math.round(Math.min(...sizes) * 10) / 10
}

/** Phân vị p (0 đến 100) theo nội suy gần nhất; mảng rỗng thì null. */
export function percentile(values, p) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b)
  if (sorted.length === 0) return null
  const rank = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))
  return sorted[rank]
}

/**
 * Tóm tắt các mốc thời gian khung hình (ms, từ `performance.now()` mỗi lần rAF).
 * fps = số khoảng / tổng thời gian; `dropped` = số khoảng dài hơn 2 lần chu kỳ 60 Hz (> 33,4 ms); `worstMs` = khoảng dài nhất.
 */
export function summarizeFrames(timestamps) {
  const times = timestamps.filter(Number.isFinite)
  if (times.length < 2) return { frames: times.length, fps: null, p95Ms: null, worstMs: null, dropped: 0 }
  const intervals = []
  for (let i = 1; i < times.length; i += 1) intervals.push(times[i] - times[i - 1])
  const total = times[times.length - 1] - times[0]
  return {
    frames: times.length,
    fps: total > 0 ? Math.round((intervals.length / total) * 10000) / 10 : null,
    p95Ms: Math.round(percentile(intervals, 95) * 10) / 10,
    worstMs: Math.round(intervals.reduce((max, ms) => Math.max(max, ms), 0) * 10) / 10,
    dropped: intervals.filter((ms) => ms > 33.4).length,
  }
}

/** Gom vi phạm của axe thành dòng ngắn: id, mức độ, số node. Vi phạm sắp theo mức độ rồi theo số node. */
const IMPACT_ORDER = { critical: 0, serious: 1, moderate: 2, minor: 3 }
export function summarizeAxe(violations) {
  return [...violations]
    .map((v) => ({ id: v.id, impact: v.impact ?? 'unknown', nodes: Array.isArray(v.nodes) ? v.nodes.length : 0, help: v.help ?? '' }))
    .sort((a, b) => (IMPACT_ORDER[a.impact] ?? 9) - (IMPACT_ORDER[b.impact] ?? 9) || b.nodes - a.nodes || a.id.localeCompare(b.id))
}

/** Lỗi console đáng kể: error và warning, bỏ qua thông điệp đã biết là vô hại (truyền vào `ignore`). */
export function significantConsole(messages, ignore = []) {
  return messages.filter((m) => (m.type === 'error' || m.type === 'warning') && !ignore.some((re) => re.test(m.text)))
}

/** So hai bảng kích thước tệp ({ ten: bytes }) → { added, removed, changed, totalA, totalB, delta }. */
export function diffSizes(a, b) {
  const names = new Set([...Object.keys(a), ...Object.keys(b)])
  const rows = []
  for (const name of [...names].sort()) {
    const before = a[name] ?? null
    const after = b[name] ?? null
    rows.push({ name, before, after, delta: (after ?? 0) - (before ?? 0) })
  }
  const sum = (obj) => Object.values(obj).reduce((acc, n) => acc + n, 0)
  return { rows, totalA: sum(a), totalB: sum(b), delta: sum(b) - sum(a) }
}

/**
 * Tên tệp có băm (`index-abc123.js`) → khóa ổn định (`index.js`) để so hai bản build dù băm khác nhau.
 * Chỉ bỏ đoạn băm 8 ký tự [A-Za-z0-9_-] ngay trước phần mở rộng và chỉ khi đoạn đó có chữ số, chữ hoa, `_` hoặc `-`.
 */
export function stableAssetName(file) {
  const match = /^(.*)-([A-Za-z0-9_-]{8})(\.[a-z0-9]+)$/.exec(file)
  // Băm của Vite có cả chữ số, chữ hoa, `_` hoặc `-`; tên thường toàn chữ thường (vendor-charts) không bị cắt nhầm.
  return match && /[0-9A-Z_-]/.test(match[2]) ? `${match[1]}${match[3]}` : file
}

export function formatBytes(bytes) {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes)) return '—'
  const sign = bytes < 0 ? '−' : ''
  const abs = Math.abs(bytes)
  if (abs < 1024) return `${sign}${abs} B`
  return `${sign}${(abs / 1024).toFixed(1)} KB`
}

/** Bảng Markdown từ tiêu đề và các dòng; ô chứa `|` được thoát. */
export function markdownTable(headers, rows) {
  const cell = (value) => String(value ?? '—').replace(/\|/g, '\\|').replace(/\n/g, ' ')
  const lines = [`| ${headers.map(cell).join(' | ')} |`, `| ${headers.map(() => '---').join(' | ')} |`]
  for (const row of rows) lines.push(`| ${row.map(cell).join(' | ')} |`)
  return lines.join('\n')
}
