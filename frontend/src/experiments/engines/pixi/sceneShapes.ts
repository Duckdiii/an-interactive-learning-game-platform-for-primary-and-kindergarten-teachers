import { AUDIO_BUTTON_HEIGHT, AUDIO_BUTTON_WIDTH, STAGE_WIDTH } from '../../../games/common/mediaLayout'
import {
  BAND_HEIGHT,
  BAND_WIDTH,
  BAND_X,
  CONFIRM_BUTTON_HEIGHT,
  CONFIRM_BUTTON_WIDTH,
  computeNumberLineLayout,
  controlsX,
  LABEL_FONT_SIZE,
  LABEL_OFFSET_Y,
  LABEL_WIDTH,
  LINE_LEFT,
  LINE_RIGHT,
  LINE_THICKNESS,
  MARKER_RADIUS,
  QUESTION_FONT_SIZE,
  QUESTION_WIDTH,
  REVEAL_RING_RADIUS,
  REVEAL_RING_STROKE,
  STEP_BUTTON_HEIGHT,
  STEP_BUTTON_WIDTH,
  TICK_HEIGHT,
  VALUE_BOX_WIDTH,
} from '../../games/numberLine/numberLineLayout'
import { isLabeled, labelEvery, tickValues, valueToX, xToValue, type NumberLineScale } from '../../games/numberLine/numberLineLogic'
import type { ThemeColors } from '../../theme/themeTypes'

/**
 * Mô hình cảnh THUẦN (không phụ thuộc engine đồ họa) của NUMBER_LINE: danh sách hình để vẽ và các vùng bắt chạm.
 * Dùng cho thử nghiệm PixiJS (T7.1): bản Pixi chỉ là «người vẽ» danh sách này, nên bố cục và luật bắt chạm test được
 * trong jsdom (không có WebGL). Bản Konva (\`NumberLineRenderer\`) vẫn dựng bố cục riêng bằng thành phần React: hai bản
 * trùng logic vẽ là cái giá của việc so hai engine song song.
 */
export interface RectShape {
  kind: 'rect'
  key: string
  x: number
  y: number
  width: number
  height: number
  radius: number
  fill?: string
  stroke?: string
  strokeWidth?: number
}

export interface CircleShape {
  kind: 'circle'
  key: string
  x: number
  y: number
  radius: number
  fill?: string
  stroke?: string
  strokeWidth?: number
  /** Nét đứt (Pixi Graphics không có nét đứt sẵn, bản Pixi tự vẽ bằng các cung). */
  dashed?: boolean
}

/** Chữ căn giữa cả ngang lẫn dọc trong hộp (x, y, width, height). */
export interface TextShape {
  kind: 'text'
  key: string
  text: string
  x: number
  y: number
  width: number
  height: number
  fontSize: number
  fill: string
  bold?: boolean
}

export type Shape = RectShape | CircleShape | TextShape

export type HitId = 'marker' | 'minus' | 'plus' | 'confirm' | 'audio' | 'band'

export interface HitRegion {
  id: HitId
  x: number
  y: number
  width: number
  height: number
}

export interface NumberLineSceneInput {
  questionText: string
  scale: NumberLineScale
  hasAudio: boolean
  colors: ThemeColors
  /** Tô nền sân bằng \`colors.background\` (theme có \`paintStageBackground\`). */
  paintBackground: boolean
  /** Giá trị đã chọn (state). */
  value: number
  /** Toạ độ x đang kéo (nếu đang kéo), ngược lại null. */
  dragX: number | null
  phase: 'idle' | 'submitting' | 'done'
  /** Mode xem lại: khóa sẵn, không có nút xác nhận. */
  review: boolean
  /** Kết quả chấm (đã có thì tô màu điểm theo đúng/sai). */
  result: { isCorrect: boolean } | null
  /** Giá trị đúng để vẽ vòng nét đứt (khi sai hoặc không trả lời). */
  revealValue?: number
  /** Xem lại mà không chọn gì: không vẽ điểm. */
  hideMarker: boolean
  /** Chiều cao khung câu hỏi đã đo/ước lượng. */
  questionHeight: number
}

export interface NumberLineScene {
  shapes: Shape[]
  hits: HitRegion[]
  stageHeight: number
}

/** Dựng toàn bộ cảnh: thứ tự trong \`shapes\` là thứ tự vẽ (sau đè lên trước). Hàm thuần. */
export function buildNumberLineScene(input: NumberLineSceneInput): NumberLineScene {
  const { colors, scale } = input
  const layout = computeNumberLineLayout({ hasAudio: input.hasAudio, questionHeight: input.questionHeight, showConfirm: !input.review })
  const shapes: Shape[] = []
  const hits: HitRegion[] = []
  const interactive = !input.review && input.phase === 'idle'
  const done = input.phase === 'done'

  if (input.paintBackground) {
    shapes.push({ kind: 'rect', key: 'background', x: 0, y: 0, width: STAGE_WIDTH, height: layout.stageHeight, radius: 0, fill: colors.background })
  }

  if (layout.audioY !== null) {
    const x = (STAGE_WIDTH - AUDIO_BUTTON_WIDTH) / 2
    shapes.push({ kind: 'rect', key: 'audio', x, y: layout.audioY, width: AUDIO_BUTTON_WIDTH, height: AUDIO_BUTTON_HEIGHT, radius: 20, fill: colors.audioSurface, stroke: colors.audioBorder, strokeWidth: 3 })
    shapes.push({ kind: 'text', key: 'audio-label', text: '🔊 Nghe lại', x, y: layout.audioY, width: AUDIO_BUTTON_WIDTH, height: AUDIO_BUTTON_HEIGHT, fontSize: 30, fill: colors.text, bold: true })
    hits.push({ id: 'audio', x, y: layout.audioY, width: AUDIO_BUTTON_WIDTH, height: AUDIO_BUTTON_HEIGHT })
  }

  shapes.push({
    kind: 'text',
    key: 'question',
    text: input.questionText,
    x: (STAGE_WIDTH - QUESTION_WIDTH) / 2,
    y: layout.questionY,
    width: QUESTION_WIDTH,
    height: layout.questionHeight,
    fontSize: QUESTION_FONT_SIZE,
    fill: colors.onBackground,
  })

  // Dải thang
  shapes.push({ kind: 'rect', key: 'band', x: BAND_X, y: layout.bandY, width: BAND_WIDTH, height: BAND_HEIGHT, radius: 20, fill: colors.surface, stroke: colors.border, strokeWidth: 3 })
  shapes.push({ kind: 'rect', key: 'line', x: LINE_LEFT, y: layout.lineY - LINE_THICKNESS / 2, width: LINE_RIGHT - LINE_LEFT, height: LINE_THICKNESS, radius: LINE_THICKNESS / 2, fill: colors.border })
  const geometry = { left: LINE_LEFT, right: LINE_RIGHT }
  const ticks = tickValues(scale)
  const every = labelEvery(ticks.length)
  ticks.forEach((value, index) => {
    const x = valueToX(value, scale, geometry)
    shapes.push({ kind: 'rect', key: `tick-${value}`, x: x - 2, y: layout.lineY - TICK_HEIGHT / 2, width: 4, height: TICK_HEIGHT, radius: 0, fill: colors.border })
    if (isLabeled(index, ticks.length, every)) {
      shapes.push({ kind: 'text', key: `label-${value}`, text: String(value), x: x - LABEL_WIDTH / 2, y: layout.lineY + LABEL_OFFSET_Y, width: LABEL_WIDTH, height: LABEL_FONT_SIZE * 1.2, fontSize: LABEL_FONT_SIZE, fill: colors.text, bold: true })
    }
  })
  if (input.revealValue !== undefined) {
    shapes.push({ kind: 'circle', key: 'reveal', x: valueToX(input.revealValue, scale, geometry), y: layout.lineY, radius: REVEAL_RING_RADIUS, stroke: colors.lineCorrect, strokeWidth: REVEAL_RING_STROKE, dashed: true })
  }
  const markerX = input.dragX ?? valueToX(input.value, scale, geometry)
  if (!input.hideMarker) {
    const fill = done && input.result ? (input.result.isCorrect ? colors.surfaceCorrect : colors.surfaceTryAgain) : colors.accent
    const stroke = done && input.result ? (input.result.isCorrect ? colors.lineCorrect : colors.lineTryAgain) : colors.accentBorder
    shapes.push({ kind: 'circle', key: 'marker', x: markerX, y: layout.lineY, radius: MARKER_RADIUS, fill, stroke, strokeWidth: 6 })
  }

  // Hàng − giá trị +
  const atMin = input.value <= scale.min
  const atMax = input.value >= scale.max
  const liveValue = input.dragX === null ? input.value : xToValue(input.dragX, scale, { left: LINE_LEFT, right: LINE_RIGHT })
  const cx = controlsX()
  const stepButton = (key: 'minus' | 'plus', x: number, label: string, disabled: boolean) => {
    shapes.push({ kind: 'rect', key, x, y: layout.controlsY, width: STEP_BUTTON_WIDTH, height: STEP_BUTTON_HEIGHT, radius: 20, fill: disabled ? colors.disabledSurface : colors.accent, stroke: disabled ? colors.disabledBorder : colors.accentBorder, strokeWidth: 3 })
    shapes.push({ kind: 'text', key: `${key}-label`, text: label, x, y: layout.controlsY, width: STEP_BUTTON_WIDTH, height: STEP_BUTTON_HEIGHT, fontSize: 64, fill: disabled ? colors.onDisabled : colors.onAccent, bold: true })
    if (!disabled) hits.push({ id: key, x, y: layout.controlsY, width: STEP_BUTTON_WIDTH, height: STEP_BUTTON_HEIGHT })
  }
  stepButton('minus', cx.minus, '−', !interactive || atMin)
  shapes.push({ kind: 'rect', key: 'value-box', x: cx.value, y: layout.controlsY, width: VALUE_BOX_WIDTH, height: STEP_BUTTON_HEIGHT, radius: 20, fill: colors.surface, stroke: colors.border, strokeWidth: 3 })
  shapes.push({ kind: 'text', key: 'value', text: String(liveValue), x: cx.value, y: layout.controlsY, width: VALUE_BOX_WIDTH, height: STEP_BUTTON_HEIGHT, fontSize: 56, fill: colors.text, bold: true })
  stepButton('plus', cx.plus, '+', !interactive || atMax)

  if (layout.confirmY !== null) {
    const x = (STAGE_WIDTH - CONFIRM_BUTTON_WIDTH) / 2
    shapes.push({ kind: 'rect', key: 'confirm', x, y: layout.confirmY, width: CONFIRM_BUTTON_WIDTH, height: CONFIRM_BUTTON_HEIGHT, radius: 20, fill: interactive ? colors.accent : colors.disabledSurface, stroke: interactive ? colors.accentBorder : colors.disabledBorder, strokeWidth: 3 })
    shapes.push({ kind: 'text', key: 'confirm-label', text: input.phase === 'submitting' ? 'Đang chấm…' : 'Xong rồi!', x, y: layout.confirmY, width: CONFIRM_BUTTON_WIDTH, height: CONFIRM_BUTTON_HEIGHT, fontSize: 32, fill: interactive ? colors.onAccent : colors.onDisabled, bold: true })
    if (interactive) hits.push({ id: 'confirm', x, y: layout.confirmY, width: CONFIRM_BUTTON_WIDTH, height: CONFIRM_BUTTON_HEIGHT })
  }

  // Vùng bắt chạm theo thứ tự ưu tiên: điểm kéo trước (nằm trên dải), dải cuối cùng.
  const prioritized: HitRegion[] = []
  if (interactive && !input.hideMarker) {
    prioritized.push({ id: 'marker', x: markerX - MARKER_RADIUS, y: layout.lineY - MARKER_RADIUS, width: MARKER_RADIUS * 2, height: MARKER_RADIUS * 2 })
  }
  prioritized.push(...hits)
  if (interactive) prioritized.push({ id: 'band', x: BAND_X, y: layout.bandY, width: BAND_WIDTH, height: BAND_HEIGHT })

  return { shapes, hits: prioritized, stageHeight: layout.stageHeight }
}

/** Vùng chạm đầu tiên (theo thứ tự ưu tiên) chứa điểm; null nếu không có. Biên trái/trên tính, biên phải/dưới không. */
export function hitTest(hits: readonly HitRegion[], point: { x: number; y: number }): HitId | null {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return null
  const found = hits.find((r) => point.x >= r.x && point.x < r.x + r.width && point.y >= r.y && point.y < r.y + r.height)
  return found ? found.id : null
}
