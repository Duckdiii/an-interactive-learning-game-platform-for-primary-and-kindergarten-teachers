import type { LayoutBox } from './beeGardenGeometry'

/** Hình học của hàng tiến độ: `total` ô chia đều trong hộp, hình mỗi ô nhỏ hơn ô một chút. Thuần để test mọi `total`. */
export interface ProgressSlots {
  /** Hộp của thanh (cả hộp đưa vào). */
  pill: LayoutBox
  /** Toạ độ x tâm của từng ô và y tâm chung. */
  centers: number[]
  centerY: number
  /** Cạnh ô và cạnh hình trong ô. */
  cell: number
  icon: number
}

export const PROGRESS_MAX_ICON = 32
const PROGRESS_ICON_MARGIN = 6

export function progressSlots(box: LayoutBox, total: number): ProgressSlots {
  const [x, y, width, height] = box
  const count = Math.max(1, Math.round(Number.isFinite(total) ? total : 1))
  const cell = width / count
  const icon = Math.max(8, Math.min(PROGRESS_MAX_ICON, cell - PROGRESS_ICON_MARGIN, height - PROGRESS_ICON_MARGIN))
  return { pill: box, centers: Array.from({ length: count }, (_, index) => x + cell * (index + 0.5)), centerY: y + height / 2, cell, icon }
}
