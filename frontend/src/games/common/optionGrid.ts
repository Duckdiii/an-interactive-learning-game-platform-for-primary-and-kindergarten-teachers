/**
 * Hằng số và phép tính lưới ô đáp án, tách khỏi component Konva để logic bố cục test được trong
 * jsdom (jsdom không có Canvas thật). Toạ độ theo hệ "thiết kế" của ResponsiveStage (rộng 800).
 */
export const OPTION_BUTTON_WIDTH = 340
export const OPTION_BUTTON_HEIGHT = 200
export const OPTION_GAP = 40
export const OPTION_COLUMNS = 2
export const OPTION_GRID_X = 40

/** Vị trí góc trên-trái của ô thứ `index`, tính từ mép trên của lưới (`originY`). */
export function optionPosition(index: number, originY: number) {
  const col = index % OPTION_COLUMNS
  const row = Math.floor(index / OPTION_COLUMNS)
  return {
    x: OPTION_GRID_X + col * (OPTION_BUTTON_WIDTH + OPTION_GAP),
    y: originY + row * (OPTION_BUTTON_HEIGHT + OPTION_GAP),
  }
}

/** Tổng chiều cao lưới với `count` ô (không tính lề). */
export function optionGridHeight(count: number) {
  const rows = Math.ceil(count / OPTION_COLUMNS)
  return rows <= 0 ? 0 : rows * OPTION_BUTTON_HEIGHT + (rows - 1) * OPTION_GAP
}
