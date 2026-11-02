import type { PublishInfo } from '../../types/game-student.types'

export interface ResultProps {
  info: PublishInfo
  nickname: string
  correctCount: number
  total: number
  score: number
  /** Chuỗi câu đúng liên tiếp dài nhất trong lượt chơi. */
  bestStreak: number
  onReplay: () => void
  /** Mở màn xem lại đáp án (chỉ khung Học sinh dùng). */
  /** Không có = không có gì để xem lại. */
  onReview?: () => void
}
