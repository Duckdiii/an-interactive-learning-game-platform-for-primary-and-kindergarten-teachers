import { AUDIO_BUTTON_HEIGHT, AUDIO_BUTTON_WIDTH, STAGE_WIDTH } from '../../../games/common/mediaLayout'
import { SYLLABLE_SLOTS, type SyllableSlot } from './syllableTypes'

/**
 * Bố cục SYLLABLE_BUILDER theo hệ toạ độ thiết kế của `ResponsiveStage` (sân rộng 800). Hàm thuần để test được trong
 * jsdom và để các phần xếp nối tiếp nhau, không phần nào đè lên phần khác.
 * Mỗi ô chọn là một cột: nút ▲ (trước), ô giá trị, nút ▼ (sau); chạm vòng quanh các lựa chọn của ô.
 */
export const SLOT_WIDTH = 220
export const SLOT_GAP = 24
// Cao 144 đơn vị: ở khung 390px (sân co ×0,445) mới đạt 64px (xem results/t5-2, mục 3).
export const SLOT_BUTTON_HEIGHT = 144
export const SLOT_VALUE_HEIGHT = 100
export const SLOT_INNER_GAP = 12
export const SLOT_HEIGHT = SLOT_BUTTON_HEIGHT * 2 + SLOT_VALUE_HEIGHT + SLOT_INNER_GAP * 2

export const COMPOSED_WIDTH = 440
export const COMPOSED_HEIGHT = 130
export const COMPOSED_FONT_SIZE = 84
export const MESSAGE_HEIGHT = 64
export const MESSAGE_FONT_SIZE = 24
export const MESSAGE_WIDTH = STAGE_WIDTH - 80

export const CONFIRM_BUTTON_WIDTH = 300
export const CONFIRM_BUTTON_HEIGHT = 144
export const QUESTION_FONT_SIZE = 32
export const QUESTION_WIDTH = STAGE_WIDTH - 80

const TOP_PADDING = 20
const BOTTOM_PADDING = 40
const GAP = 24
const MIN_QUESTION_HEIGHT = 40

export interface SyllableLayoutInput {
  hasAudio: boolean
  /** Chiều cao khung câu hỏi đã đo (hoặc ước lượng); nhỏ hơn mức tối thiểu hoặc không hợp lệ thì dùng mức tối thiểu. */
  questionHeight: number
  showConfirm: boolean
}

export interface SyllableLayout {
  audioY: number | null
  questionY: number
  questionHeight: number
  composedY: number
  messageY: number
  slotsY: number
  confirmY: number | null
  stageHeight: number
}

export function computeSyllableLayout({ hasAudio, questionHeight, showConfirm }: SyllableLayoutInput): SyllableLayout {
  let y = TOP_PADDING
  const audioY = hasAudio ? y : null
  if (hasAudio) y += AUDIO_BUTTON_HEIGHT + GAP

  const questionY = y
  const qHeight = Math.max(MIN_QUESTION_HEIGHT, Number.isFinite(questionHeight) ? questionHeight : MIN_QUESTION_HEIGHT)
  y += qHeight + GAP

  const composedY = y
  y += COMPOSED_HEIGHT + GAP / 2
  const messageY = y
  y += MESSAGE_HEIGHT + GAP / 2
  const slotsY = y
  y += SLOT_HEIGHT

  let confirmY: number | null = null
  if (showConfirm) {
    y += GAP
    confirmY = y
    y += CONFIRM_BUTTON_HEIGHT
  }
  return { audioY, questionY, questionHeight: qHeight, composedY, messageY, slotsY, confirmY, stageHeight: y + BOTTOM_PADDING }
}

/** x của cột ô chọn thứ `index` (0 = âm đầu, 1 = vần, 2 = thanh); cả hàng nằm giữa sân. */
export function slotX(index: number): number {
  const total = SLOT_WIDTH * SYLLABLE_SLOTS.length + SLOT_GAP * (SYLLABLE_SLOTS.length - 1)
  return (STAGE_WIDTH - total) / 2 + index * (SLOT_WIDTH + SLOT_GAP)
}

/** y (tương đối với đầu hàng ô chọn) của nút ▲, ô giá trị, nút ▼. */
export function slotParts(): { up: number; value: number; down: number } {
  const value = SLOT_BUTTON_HEIGHT + SLOT_INNER_GAP
  return { up: 0, value, down: value + SLOT_VALUE_HEIGHT + SLOT_INNER_GAP }
}

export type Box = readonly [x: number, y: number, width: number, height: number]

/** Hộp [x, y, rộng, cao] của từng phần, để test kiểm các phần không đè nhau. */
export function layoutBoxes(layout: SyllableLayout): Record<string, Box> {
  const parts = slotParts()
  const boxes: Record<string, Box> = {
    question: [(STAGE_WIDTH - QUESTION_WIDTH) / 2, layout.questionY, QUESTION_WIDTH, layout.questionHeight],
    composed: [(STAGE_WIDTH - COMPOSED_WIDTH) / 2, layout.composedY, COMPOSED_WIDTH, COMPOSED_HEIGHT],
    message: [(STAGE_WIDTH - MESSAGE_WIDTH) / 2, layout.messageY, MESSAGE_WIDTH, MESSAGE_HEIGHT],
  }
  SYLLABLE_SLOTS.forEach((slot: SyllableSlot, index) => {
    boxes[`${slot}Up`] = [slotX(index), layout.slotsY + parts.up, SLOT_WIDTH, SLOT_BUTTON_HEIGHT]
    boxes[`${slot}Value`] = [slotX(index), layout.slotsY + parts.value, SLOT_WIDTH, SLOT_VALUE_HEIGHT]
    boxes[`${slot}Down`] = [slotX(index), layout.slotsY + parts.down, SLOT_WIDTH, SLOT_BUTTON_HEIGHT]
  })
  if (layout.audioY !== null) boxes.audio = [(STAGE_WIDTH - AUDIO_BUTTON_WIDTH) / 2, layout.audioY, AUDIO_BUTTON_WIDTH, AUDIO_BUTTON_HEIGHT]
  if (layout.confirmY !== null) boxes.confirm = [(STAGE_WIDTH - CONFIRM_BUTTON_WIDTH) / 2, layout.confirmY, CONFIRM_BUTTON_WIDTH, CONFIRM_BUTTON_HEIGHT]
  return boxes
}

export function overlaps(a: Box, b: Box): boolean {
  return a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3]
}
