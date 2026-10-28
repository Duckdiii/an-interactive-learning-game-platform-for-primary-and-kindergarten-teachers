// shortcut: tiến độ chỉ ƯỚC TÍNH theo thời gian vì Backend chưa gửi sự kiện từng bước (SSE `progress`, API-CONTRACT 2.9); có SSE thì thay hàm này bằng dữ liệu thật.
export const ESTIMATED_STEP_COUNT = 4

// Ngưỡng % bắt đầu từng bước: Đọc mô tả, Soạn câu hỏi, Kiểm tra an toàn, Gắn hình và giọng.
const STEP_STARTS = [0, 15, 60, 85]
// Hằng số thời gian (ms): khoảng 8 giây đạt ~63%, sau đó chậm dần.
const TAU_MS = 8000
// Chưa có kết quả thì không bao giờ báo xong.
const MAX_PERCENT = 95

export function estimateProgress(elapsedMs: number): { percent: number; step: number } {
  const percent = Math.min(MAX_PERCENT, Math.round(100 * (1 - Math.exp(-Math.max(0, elapsedMs) / TAU_MS))))
  const step = STEP_STARTS.findLastIndex((start) => percent >= start)

  return { percent, step }
}
