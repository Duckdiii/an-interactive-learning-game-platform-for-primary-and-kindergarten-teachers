import type { ReactNode } from 'react'

/**
 * Hợp đồng giữa trang chơi và khung (SPEC mục 3). Khung chỉ lo BỐ CỤC và những gì hiện quanh vùng chơi; trang chơi (bước sau) đưa vào số liệu
 * và nội dung. Khung nào không hiện một mục (ví dụ khung Bé không có đồng hồ, không có điểm) thì bỏ qua prop đó, nơi gọi không cần biết khung.
 */
export interface ShellProps {
  title: string
  /** Câu hiện tại (tính từ 1) trên tổng số câu. */
  progress: { current: number; total: number }
  /** Điểm hiện có; chỉ khung có điểm mới hiện. */
  score?: number
  /** Số giây còn lại của câu; `null` hoặc vắng là không đếm giờ. Chỉ khung có đồng hồ mới hiện. */
  remainingSeconds?: number | null
  /** Chỗ chừa cho nhân vật theo theme (các trạng thái chào, nói, hỏi, vui, an ủi, ăn mừng làm ở bước theme). */
  mascot?: ReactNode
  /** Thanh phản hồi sau khi máy chủ chấm (isCorrect, correctAnswer). */
  feedback?: ReactNode
  /** Vùng trò chơi: renderer chiếm toàn bộ phần còn lại của màn hình. */
  children?: ReactNode
}
