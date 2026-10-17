import type { ThemeColors } from '../../experiments/theme/themeTypes'

/**
 * - idle: chưa làm gì. selected: ô trái đang được chọn. linked: đã nối (viền theo màu cặp).
 * - correct / wrong: sau khi chấm (xanh / vàng nhẹ, tuyệt đối không dùng đỏ).
 */
export type MatchingCardState = 'idle' | 'selected' | 'linked' | 'correct' | 'wrong'

/** Màu nền thẻ theo trạng thái; thẻ đã nối (`linked`) giữ nền thường, chỉ viền đổi màu. */
export function matchingCardFill(colors: ThemeColors, state: MatchingCardState): string {
  switch (state) {
    case 'selected':
      return colors.surfaceSelected
    case 'correct':
      return colors.surfaceCorrect
    case 'wrong':
      return colors.surfaceTryAgain
    case 'idle':
    case 'linked':
      return colors.surface
  }
}

/** Màu đường nối/viền của cặp thứ `index` (theo ô trái), quay vòng nếu cặp nhiều hơn số màu. */
export function matchingLinkColor(colors: ThemeColors, index: number): string {
  return colors.linkColors[index % colors.linkColors.length]
}
