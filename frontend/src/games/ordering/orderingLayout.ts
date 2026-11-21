import { AUDIO_BUTTON_HEIGHT, ILLUSTRATION_SIZE, STAGE_WIDTH } from '../common/mediaLayout'
import type { Bounds, OrderingBoardLayout, OrderingDisplayStep, Point, SlotLayout } from './orderingTypes'

export const DEFAULT_ITEM_HEIGHT = 140
export const DEFAULT_GAP = 16
export const SLOT_INDICATOR_OFFSET = 32
export const DEFAULT_CONFIRM_BUTTON_HEIGHT = 72
export const CONFIRM_BUTTON_WIDTH = 260

export function isInsideSlot(point: Point, bounds: Bounds): boolean {
  return (
    point.x >= bounds.x &&
    point.x <= bounds.x + bounds.width &&
    point.y >= bounds.y &&
    point.y <= bounds.y + bounds.height
  )
}

export function findNearestSlot(
  dropPosition: Point,
  slots: SlotLayout[],
  tolerancePx = 60,
): SlotLayout | null {
  let nearest: SlotLayout | null = null
  let minDistance = Infinity

  for (const slot of slots) {
    const { bounds } = slot
    const expandedBounds: Bounds = {
      x: bounds.x - tolerancePx,
      y: bounds.y - tolerancePx,
      width: bounds.width + tolerancePx * 2,
      height: bounds.height + tolerancePx * 2,
    }

    if (isInsideSlot(dropPosition, expandedBounds)) {
      const centerX = bounds.x + bounds.width / 2
      const centerY = bounds.y + bounds.height / 2
      const dist = Math.hypot(dropPosition.x - centerX, dropPosition.y - centerY)

      if (dist < minDistance) {
        minDistance = dist
        nearest = slot
      }
    }
  }

  return nearest
}

export function computeOrderingLayout(params: {
  steps: OrderingDisplayStep[]
  hasAudio: boolean
  hasIllustration: boolean
  promptHeight?: number
  minTouchPx?: number
  scale?: number
}): OrderingBoardLayout {
  const { steps, hasAudio, hasIllustration, promptHeight = 36 } = params
  const count = Math.max(1, steps.length)

  const promptY = 20
  let topContentY = promptY + promptHeight + 16

  let audioY: number | null = null
  if (hasAudio) {
    audioY = topContentY
    topContentY += AUDIO_BUTTON_HEIGHT + 12
  }

  let illustrationY: number | null = null
  if (hasIllustration) {
    illustrationY = topContentY
    topContentY += ILLUSTRATION_SIZE + 12
  }

  // Chừa chỗ cho nhãn số slot (ví dụ "1", "2" ở trên ô y - 30)
  const slotsY = topContentY + SLOT_INDICATOR_OFFSET + 8

  // Tính chiều rộng item
  const maxAvailableWidth = STAGE_WIDTH - 64
  const gap = count <= 3 ? 20 : count === 4 ? 16 : 12
  const rawItemWidth = (maxAvailableWidth - (count - 1) * gap) / count
  const itemWidth = Math.max(params.minTouchPx ?? 72, Math.min(220, Math.floor(rawItemWidth)))
  const itemHeight = Math.max(params.minTouchPx ?? 72, DEFAULT_ITEM_HEIGHT)

  const totalBoardWidth = count * itemWidth + (count - 1) * gap
  const startX = Math.round((STAGE_WIDTH - totalBoardWidth) / 2)

  const slots: SlotLayout[] = []
  const slotPositions: Record<number, Point> = {}

  for (let i = 0; i < count; i++) {
    const slotNumber = i + 1
    const x = startX + i * (itemWidth + gap)
    const bounds: Bounds = {
      x,
      y: slotsY,
      width: itemWidth,
      height: itemHeight,
    }
    slots.push({ slotNumber, bounds })
    slotPositions[slotNumber] = { x, y: slotsY }
  }

  // Khay ở phía dưới hàng slots
  const trayY = slotsY + itemHeight + 48
  const trayBounds: Bounds = {
    x: startX - 16,
    y: trayY - 14,
    width: totalBoardWidth + 32,
    height: itemHeight + 28,
  }

  const trayPositions: Record<string, Point> = {}
  steps.forEach((step, index) => {
    const x = startX + index * (itemWidth + gap)
    trayPositions[step.id] = { x, y: trayY }
  })

  const confirmY = trayY + itemHeight + 32
  const confirmHeight = DEFAULT_CONFIRM_BUTTON_HEIGHT
  const confirmWidth = CONFIRM_BUTTON_WIDTH

  const height = confirmY + confirmHeight + 32

  return {
    width: STAGE_WIDTH,
    height,
    promptY,
    promptHeight,
    illustrationY,
    audioY,
    slots,
    slotPositions,
    trayBounds,
    trayPositions,
    itemWidth,
    itemHeight,
    confirmY,
    confirmHeight,
    confirmWidth,
  }
}
