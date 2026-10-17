import { contrastRatio } from './contrast'
import type { ThemeManifest } from './themeTypes'
import { CONTRAST_PAIRS, LARGE_TEXT_SIZE, MIN_CONTRAST_LARGE_TEXT, MIN_CONTRAST_TEXT } from './validateTheme'

export interface ContrastRow {
  label: string
  foreground: string
  background: string
  ratio: number | null
  required: number
  /** `text`: bắt buộc (validateTheme kiểm). `graphic`: viền/đường nối so với nền, chỉ báo cáo (WCAG 1.4.11, 3:1). */
  kind: 'text' | 'graphic'
  ok: boolean
}

/** Ngưỡng tương phản của đồ họa phi chữ (viền thẻ, đường nối): WCAG 1.4.11. */
export const MIN_CONTRAST_GRAPHIC = 3

const row = (label: string, foreground: string, background: string, required: number, kind: ContrastRow['kind']): ContrastRow => {
  const ratio = contrastRatio(foreground, background)
  return { label, foreground, background, ratio, required, kind, ok: ratio !== null && ratio >= required }
}

/**
 * Bảng tương phản của một theme: các cặp chữ/nền mà `validateTheme` bắt buộc, và các cặp đồ họa (viền, đường nối so
 * với nền sân) chỉ để báo cáo. Hàm thuần, dùng cho trang xem thử và test.
 */
export function contrastRows(theme: ThemeManifest): ContrastRow[] {
  const { colors } = theme
  const textRequired = theme.font.baseSize >= LARGE_TEXT_SIZE ? MIN_CONTRAST_LARGE_TEXT : MIN_CONTRAST_TEXT
  const rows = CONTRAST_PAIRS.map(([fg, bg]) => row(`${fg} trên ${bg}`, colors[fg], colors[bg], textRequired, 'text'))
  rows.push(
    row('border trên background', colors.border, colors.background, MIN_CONTRAST_GRAPHIC, 'graphic'),
    row('lineCorrect trên background', colors.lineCorrect, colors.background, MIN_CONTRAST_GRAPHIC, 'graphic'),
    row('lineTryAgain trên background', colors.lineTryAgain, colors.background, MIN_CONTRAST_GRAPHIC, 'graphic'),
    ...colors.linkColors.map((color, index) => row(`linkColors[${index}] trên background`, color, colors.background, MIN_CONTRAST_GRAPHIC, 'graphic')),
  )
  return rows
}
