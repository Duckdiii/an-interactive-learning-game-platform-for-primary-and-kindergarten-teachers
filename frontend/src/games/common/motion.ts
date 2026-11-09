// Bộ chuyển động dùng chung cho renderer (docs: "Đồ họa game" mục 4, "Chuyên đề 5 - Juiciness"): hàm thuần theo thời gian (giây),
// renderer chỉ việc gọi rồi vẽ. Biên độ nhỏ, không nhấp nháy, để không làm trẻ rối mắt.

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

/** Tiến độ 0..1 của một hiệu ứng dài `duration` giây đã chạy `elapsed` giây. */
export const progress = (elapsed: number, duration: number) => (duration <= 0 ? 1 : clamp01(elapsed / duration))

/** Vượt nhẹ rồi về đích (nảy kiểu lò xo khi vật xuất hiện, bay lên khi đúng). */
export function easeOutBack(t: number): number {
  const x = clamp01(t)
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2
}

/** Nhịp thở: hệ số phóng to quanh 1, dao động ±2,5%. `phase` lệch nhịp giữa các vật. */
export const breathe = (time: number, phase = 0) => 1 + 0.025 * Math.sin(time * 2.2 + phase)

/** Nhấp nhô lên xuống (px). */
export const bob = (time: number, phase = 0, amplitude = 6) => Math.sin(time * 1.8 + phase) * amplitude

/** Lắc ngang tắt dần khi trả lời chưa đúng (px); 0 ngoài khoảng hiệu ứng. Lắc nhẹ, không rung mạnh (quy ước canvas-engine). */
export function wiggle(elapsed: number, duration = 0.9, amplitude = 10): number {
  if (elapsed < 0 || elapsed >= duration) return 0
  return Math.sin(elapsed * 26) * amplitude * (1 - elapsed / duration)
}

/** Hạt mừng bung ra quanh tâm: vị trí và độ mờ của hạt thứ `index` trong `count` hạt ở thời điểm `elapsed`. */
export function burstParticle(index: number, count: number, elapsed: number, duration = 0.9, radius = 120) {
  const t = progress(elapsed, duration)
  const angle = (index / count) * Math.PI * 2
  const distance = easeOutBack(t) * radius
  return { x: Math.cos(angle) * distance, y: Math.sin(angle) * distance, opacity: elapsed < 0 ? 0 : 1 - t, rotation: t * 180 }
}
