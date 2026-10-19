import { AUDIO_BUTTON_HEIGHT, AUDIO_BUTTON_WIDTH, STAGE_WIDTH } from '../../../games/common/mediaLayout'

/**
 * Bố cục NUMBER_LINE theo hệ toạ độ thiết kế của `ResponsiveStage` (sân rộng 800). Tính bằng hàm thuần để test được
 * trong jsdom và để các phần xếp nối tiếp nhau, không phần nào đè lên phần khác.
 */
export const BAND_X = 40
export const BAND_WIDTH = STAGE_WIDTH - 2 * BAND_X
/** Dải thang số: cả dải là vùng chạm để đặt điểm vào vạch gần nhất. */
export const BAND_HEIGHT = 200
export const LINE_LEFT = 90
export const LINE_RIGHT = STAGE_WIDTH - 90
export const LINE_THICKNESS = 8
export const TICK_HEIGHT = 28
export const LABEL_FONT_SIZE = 26
export const MARKER_RADIUS = 36
/**
 * Vùng bắt chạm của điểm kéo rộng 144 đơn vị (bán kính 72) dù hình vẽ chỉ 72: ở khung điện thoại 390px (sân co ×0,445) 144 đơn vị
 * mới đạt 64px. Dùng `hitStrokeWidth` của Konva nên không đổi hình vẽ.
 */
export const MARKER_HIT_RADIUS = 72
/** `hitStrokeWidth` để vùng bắt chạm của vòng tròn đạt `MARKER_HIT_RADIUS` (nét viền tính từ mép, mỗi bên một nửa). */
export const MARKER_HIT_STROKE = (MARKER_HIT_RADIUS - MARKER_RADIUS) * 2
/** Vòng nét đứt chỉ vạch đúng lớn hơn điểm kéo một chút để bao quanh khi hai cái trùng nhau. */
export const REVEAL_RING_RADIUS = MARKER_RADIUS + 10
export const REVEAL_RING_STROKE = 6
/** Nhãn số nằm dưới cả điểm kéo lẫn vòng gợi ý (từ tâm đường thang) để điểm kéo không che số. */
export const LABEL_OFFSET_Y = REVEAL_RING_RADIUS + REVEAL_RING_STROKE / 2 + 6
export const LABEL_WIDTH = 60

// Nút cao/rộng 144 đơn vị: ở khung 390px (sân co ×0,445) mới đạt 64px (xem results/t5-2, mục 3).
export const STEP_BUTTON_WIDTH = 144
export const STEP_BUTTON_HEIGHT = 144
export const VALUE_BOX_WIDTH = 220
export const CONFIRM_BUTTON_WIDTH = 300
export const CONFIRM_BUTTON_HEIGHT = 144
export const QUESTION_FONT_SIZE = 32
export const QUESTION_WIDTH = STAGE_WIDTH - 80

const TOP_PADDING = 20
const BOTTOM_PADDING = 40
export const GAP = 24
const MIN_QUESTION_HEIGHT = 40

export interface NumberLineLayoutInput {
  hasAudio: boolean
  /** Chiều cao khung câu hỏi đã đo (hoặc ước lượng); nhỏ hơn mức tối thiểu thì dùng mức tối thiểu. */
  questionHeight: number
  showConfirm: boolean
}

export interface NumberLineLayout {
  audioY: number | null
  questionY: number
  questionHeight: number
  bandY: number
  /** Toạ độ y của đường thang (giữa dải). */
  lineY: number
  controlsY: number
  confirmY: number | null
  stageHeight: number
}

export function computeNumberLineLayout({ hasAudio, questionHeight, showConfirm }: NumberLineLayoutInput): NumberLineLayout {
  let y = TOP_PADDING
  const audioY = hasAudio ? y : null
  if (hasAudio) y += AUDIO_BUTTON_HEIGHT + GAP

  const questionY = y
  const qHeight = Math.max(MIN_QUESTION_HEIGHT, Number.isFinite(questionHeight) ? questionHeight : MIN_QUESTION_HEIGHT)
  y += qHeight + GAP

  const bandY = y
  const lineY = bandY + BAND_HEIGHT / 2
  y += BAND_HEIGHT + GAP

  const controlsY = y
  y += STEP_BUTTON_HEIGHT

  let confirmY: number | null = null
  if (showConfirm) {
    y += GAP
    confirmY = y
    y += CONFIRM_BUTTON_HEIGHT
  }
  return { audioY, questionY, questionHeight: qHeight, bandY, lineY, controlsY, confirmY, stageHeight: y + BOTTOM_PADDING }
}

/** Hộp [x, y, rộng, cao] của một phần, để test kiểm các phần không đè nhau. */
export type Box = readonly [x: number, y: number, width: number, height: number]

export function layoutBoxes(layout: NumberLineLayout): Record<string, Box> {
  const boxes: Record<string, Box> = {
    question: [(STAGE_WIDTH - QUESTION_WIDTH) / 2, layout.questionY, QUESTION_WIDTH, layout.questionHeight],
    band: [BAND_X, layout.bandY, BAND_WIDTH, BAND_HEIGHT],
    minus: [controlsX().minus, layout.controlsY, STEP_BUTTON_WIDTH, STEP_BUTTON_HEIGHT],
    value: [controlsX().value, layout.controlsY, VALUE_BOX_WIDTH, STEP_BUTTON_HEIGHT],
    plus: [controlsX().plus, layout.controlsY, STEP_BUTTON_WIDTH, STEP_BUTTON_HEIGHT],
  }
  if (layout.audioY !== null) boxes.audio = [(STAGE_WIDTH - AUDIO_BUTTON_WIDTH) / 2, layout.audioY, AUDIO_BUTTON_WIDTH, AUDIO_BUTTON_HEIGHT]
  if (layout.confirmY !== null) boxes.confirm = [(STAGE_WIDTH - CONFIRM_BUTTON_WIDTH) / 2, layout.confirmY, CONFIRM_BUTTON_WIDTH, CONFIRM_BUTTON_HEIGHT]
  return boxes
}

/** x của ba phần hàng điều khiển; renderer và hộp kiểm đè nhau cùng dùng hàm này nên không lệch nhau. */
export function controlsX(): { minus: number; value: number; plus: number } {
  const minus = controlsLeft()
  const value = minus + STEP_BUTTON_WIDTH + GAP
  return { minus, value, plus: value + VALUE_BOX_WIDTH + GAP }
}

/** x của nút "−" sao cho hàng điều khiển (− số +) nằm giữa sân. */
export function controlsLeft(): number {
  const total = STEP_BUTTON_WIDTH * 2 + VALUE_BOX_WIDTH + GAP * 2
  return (STAGE_WIDTH - total) / 2
}

export function overlaps(a: Box, b: Box): boolean {
  return a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3]
}
