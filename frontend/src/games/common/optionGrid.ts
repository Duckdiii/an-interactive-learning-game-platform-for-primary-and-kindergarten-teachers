/**
 * Hằng số và phép tính lưới ô đáp án, tách khỏi component Konva để logic bố cục test được trong
 * jsdom (jsdom không có Canvas thật). Toạ độ theo hệ "thiết kế" của ResponsiveStage (rộng 800).
 */
import type { PresentationLayout } from '../../types/game-dsl.types'

export const OPTION_BUTTON_WIDTH = 340
export const OPTION_BUTTON_HEIGHT = 200
export const OPTION_GAP = 40
export const OPTION_COLUMNS = 2
export const OPTION_GRID_X = 40
const STAGE_WIDTH = 800

// Độ lệch luôn nhỏ hơn khe OPTION_GAP nên hai ô cạnh nhau không bao giờ chạm nhau; giá trị cố định theo chỉ số để vị trí
// không nhảy giữa các lần vẽ lại. "scatter": so le nhẹ; "arc": hai cột lệch nhau như đường lượn.
const SCATTER_OFFSETS: ReadonlyArray<readonly [number, number]> = [[-14, 0], [14, 28], [10, 12], [-10, 30]]
const ARC_DROP = 36
const LAYOUT_EXTRA_HEIGHT: Record<PresentationLayout, number> = { row: 0, scatter: 30, arc: ARC_DROP }

/**
 * Vị trí góc trên-trái của ô thứ `index`, tính từ mép trên của lưới (`originY`). "row" giữ đúng lưới 2 cột cũ; "scatter" và "arc"
 * còn đặt ô lẻ cuối cùng vào giữa (cần biết `count`).
 */
export function optionPosition(index: number, originY: number, count = 0, layout: PresentationLayout = 'row') {
  const col = index % OPTION_COLUMNS
  const row = Math.floor(index / OPTION_COLUMNS)
  let x = OPTION_GRID_X + col * (OPTION_BUTTON_WIDTH + OPTION_GAP)
  let y = originY + row * (OPTION_BUTTON_HEIGHT + OPTION_GAP)
  if (layout === 'row') return { x, y }

  const lastAlone = count % OPTION_COLUMNS === 1 && index === count - 1
  if (lastAlone) x = (STAGE_WIDTH - OPTION_BUTTON_WIDTH) / 2
  if (layout === 'scatter') {
    const [dx, dy] = SCATTER_OFFSETS[index % SCATTER_OFFSETS.length]
    x += lastAlone ? 0 : dx
    y += dy
  } else {
    // Hàng chẵn cột phải thấp hơn, hàng lẻ cột trái thấp hơn; ô lẻ ở giữa nằm giữa hai mức.
    y += lastAlone ? ARC_DROP / 2 : (col + row) % 2 === 1 ? ARC_DROP : 0
  }
  return { x, y }
}

/** Tổng chiều cao lưới với `count` ô (không tính lề), kể cả phần lệch xuống của bố cục. */
export function optionGridHeight(count: number, layout: PresentationLayout = 'row') {
  const rows = Math.ceil(count / OPTION_COLUMNS)
  return rows <= 0 ? 0 : rows * OPTION_BUTTON_HEIGHT + (rows - 1) * OPTION_GAP + LAYOUT_EXTRA_HEIGHT[layout]
}
