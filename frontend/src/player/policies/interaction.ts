import type { UiProfile } from '../profile/types'

export interface InteractionRules {
  /** Số giây đếm ngược cho câu có giới hạn `limitSeconds`; `null` là không đếm giờ (khung Bé). */
  countdownSeconds(limitSeconds: number): number | null
  /** Chờ bao lâu chưa trả lời thì gợi ý nhẹ (ms); `null` là không gợi ý. */
  hintDelayMs: number | null
  /** Chạm là chấm: renderer nhiều bước (nối cặp) tự nộp khi vừa xong, không cần nút xác nhận. */
  autoSubmitWhenComplete: boolean
  /** Thời gian báo cho máy chủ. Khung không đếm giờ chặn ở giới hạn của câu để thời gian trẻ suy nghĩ không bị tính là hết giờ. */
  timeSpentMs(spentMs: number, limitSeconds: number): number
}

/** Quy tắc tương tác suy ra từ profile; khung và renderer hỏi ở đây thay vì tự đọc tuổi hay `if (band === ...)`. */
export function interactionRules({ interaction }: UiProfile): InteractionRules {
  return {
    countdownSeconds: (limitSeconds) => (interaction.timer ? limitSeconds : null),
    hintDelayMs: interaction.hintAfterMs,
    autoSubmitWhenComplete: interaction.tapToSubmit,
    timeSpentMs: (spentMs, limitSeconds) => (interaction.timer ? spentMs : Math.min(spentMs, limitSeconds * 1000)),
  }
}
