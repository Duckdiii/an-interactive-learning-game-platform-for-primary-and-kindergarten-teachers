import { AUDIO_BUTTON_HEIGHT, AUDIO_BUTTON_WIDTH, STAGE_WIDTH } from '../../../games/common/mediaLayout'
import { SCENE_HEIGHT, SCENE_WIDTH } from './prepositionGeometry'

/**
 * Bố cục PREPOSITION_SCENE theo hệ toạ độ thiết kế của `ResponsiveStage` (sân rộng 800). Hàm thuần để test được trong
 * jsdom và để các phần xếp nối tiếp nhau, không phần nào đè lên phần khác. Cảnh (720 × 380) là vùng chạm: chạm một chỗ
 * để đặt vật vào đó.
 */
export const SCENE_X = (STAGE_WIDTH - SCENE_WIDTH) / 2
export const CONFIRM_BUTTON_WIDTH = 300
export const CONFIRM_BUTTON_HEIGHT = 144 // đạt 64px ở khung 390px (sân co ×0,445)

/** Vùng chạm tối thiểu của vật kéo (đơn vị thiết kế): 144 để đạt 64px ở khung 390px. */
export const ITEM_MIN_TOUCH = 144
/** `hitStrokeWidth` của hình vẽ vật để cạnh ngắn nhất của vùng bắt chạm đạt `ITEM_MIN_TOUCH` (0 nếu vật đã đủ lớn). */
export const itemHitStroke = (item: { width: number; height: number }): number => Math.max(0, ITEM_MIN_TOUCH - Math.min(item.width, item.height))
export const INSTRUCTION_FONT_SIZE = 32
export const INSTRUCTION_WIDTH = STAGE_WIDTH - 80

const TOP_PADDING = 20
const BOTTOM_PADDING = 40
const GAP = 24
const MIN_INSTRUCTION_HEIGHT = 40

export interface PrepositionLayoutInput {
  hasAudio: boolean
  /** Chiều cao khung lệnh đã đo (hoặc ước lượng); nhỏ hơn mức tối thiểu hoặc không hợp lệ thì dùng mức tối thiểu. */
  instructionHeight: number
  showConfirm: boolean
}

export interface PrepositionLayout {
  audioY: number | null
  instructionY: number
  instructionHeight: number
  sceneY: number
  confirmY: number | null
  stageHeight: number
}

export function computePrepositionLayout({ hasAudio, instructionHeight, showConfirm }: PrepositionLayoutInput): PrepositionLayout {
  let y = TOP_PADDING
  const audioY = hasAudio ? y : null
  if (hasAudio) y += AUDIO_BUTTON_HEIGHT + GAP

  const instructionY = y
  const height = Math.max(MIN_INSTRUCTION_HEIGHT, Number.isFinite(instructionHeight) ? instructionHeight : MIN_INSTRUCTION_HEIGHT)
  y += height + GAP

  const sceneY = y
  y += SCENE_HEIGHT

  let confirmY: number | null = null
  if (showConfirm) {
    y += GAP
    confirmY = y
    y += CONFIRM_BUTTON_HEIGHT
  }
  return { audioY, instructionY, instructionHeight: height, sceneY, confirmY, stageHeight: y + BOTTOM_PADDING }
}

export type Box = readonly [x: number, y: number, width: number, height: number]

/** Hộp [x, y, rộng, cao] của từng phần, để test kiểm các phần không đè nhau. */
export function layoutBoxes(layout: PrepositionLayout): Record<string, Box> {
  const boxes: Record<string, Box> = {
    instruction: [(STAGE_WIDTH - INSTRUCTION_WIDTH) / 2, layout.instructionY, INSTRUCTION_WIDTH, layout.instructionHeight],
    scene: [SCENE_X, layout.sceneY, SCENE_WIDTH, SCENE_HEIGHT],
  }
  if (layout.audioY !== null) boxes.audio = [(STAGE_WIDTH - AUDIO_BUTTON_WIDTH) / 2, layout.audioY, AUDIO_BUTTON_WIDTH, AUDIO_BUTTON_HEIGHT]
  if (layout.confirmY !== null) boxes.confirm = [(STAGE_WIDTH - CONFIRM_BUTTON_WIDTH) / 2, layout.confirmY, CONFIRM_BUTTON_WIDTH, CONFIRM_BUTTON_HEIGHT]
  return boxes
}

export function overlaps(a: Box, b: Box): boolean {
  return a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3]
}
