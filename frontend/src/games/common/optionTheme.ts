import type { ThemeColors } from '../../experiments/theme/themeTypes'

/**
 * Màu nền ô đáp án. Sai: KHÔNG dùng đỏ gắt, chỉ tô màu "thử lại" nhẹ để biết đã chọn. Đúng: luôn tô màu "đúng"
 * để trẻ học được, kể cả khi trẻ không chọn ô đó.
 */
export function optionFill(
  colors: ThemeColors,
  { locked, isCorrect, isSelected }: { locked: boolean; isCorrect: boolean; isSelected: boolean },
): string {
  if (locked && isCorrect) return colors.surfaceCorrect
  if (locked && isSelected) return colors.surfaceTryAgain
  return colors.surface
}
