import { AUDIO_BUTTON_HEIGHT, ILLUSTRATION_SIZE, STAGE_WIDTH } from '../common/mediaLayout'
import { minCardHeightFor } from '../matching/matchingLayout'
import type { DragDropDisplayItem, Bounds, Point } from './dragDropTypes'
import type { DropZone } from '../../types/game-dsl.types'

export const DEFAULT_ITEM_SIZE = 76
export const DEFAULT_CONFIRM_BUTTON_HEIGHT = 72
export const ITEM_SIZE = 76
export const CONFIRM_BUTTON_HEIGHT = 72
export const GAP = 16
export const PADDING = 20
export const LABEL_HEIGHT = 44

export interface ZoneLayout extends DropZone {
  bounds: Bounds
  colorIndex: number
}

export interface DragDropBoardLayout {
  width: number
  height: number
  promptY: number
  promptHeight: number
  illustrationY: number | null
  audioY: number | null
  zones: ZoneLayout[]
  zoneItemPositions: Record<string, Record<number, Point>>
  trayBounds: Bounds
  trayPositions: Record<string, Point>
  confirmY: number
  confirmHeight: number
  confirmWidth: number
  itemSize: number
}

export function isInsideZone(point: Point, bounds: Bounds): boolean {
  return (
    point.x >= bounds.x &&
    point.x <= bounds.x + bounds.width &&
    point.y >= bounds.y &&
    point.y <= bounds.y + bounds.height
  )
}

export function computeDragDropLayout(params: {
  items: DragDropDisplayItem[]
  dropZones: DropZone[]
  hasAudio: boolean
  hasIllustration: boolean
  promptHeight?: number
  minTouchPx?: number
  scale?: number
}): DragDropBoardLayout {
  const {
    items,
    dropZones,
    hasAudio,
    hasIllustration,
    promptHeight = 36,
    minTouchPx = 64,
    scale = 1,
  } = params

  const minTargetSize = minCardHeightFor(minTouchPx, scale > 0 ? scale : 1)
  const itemSize = Math.max(DEFAULT_ITEM_SIZE, minTargetSize)
  const confirmHeight = Math.max(DEFAULT_CONFIRM_BUTTON_HEIGHT, minTargetSize)
  const confirmWidth = Math.max(260, Math.round(260 * (confirmHeight / DEFAULT_CONFIRM_BUTTON_HEIGHT)))

  const width = STAGE_WIDTH
  let currentY = PADDING

  const promptY = currentY
  currentY += promptHeight + 12

  let illustrationY: number | null = null
  if (hasIllustration) {
    illustrationY = currentY
    currentY += ILLUSTRATION_SIZE + 12
  }

  let audioY: number | null = null
  if (hasAudio) {
    audioY = currentY
    currentY += AUDIO_BUTTON_HEIGHT + 16
  }

  // Bố trí DropZones (rổ)
  const zoneCount = dropZones.length
  const zoneColumns = zoneCount <= 2 ? zoneCount : zoneCount === 3 ? 3 : 2
  const zoneRows = Math.ceil(zoneCount / zoneColumns)

  const availableWidth = width - PADDING * 2
  const zoneWidth = (availableWidth - GAP * (zoneColumns - 1)) / zoneColumns

  // Chiều cao rổ tính theo trường hợp xấu nhất: mọi vật có thể được xếp vào cùng một rổ
  const maxItemsPerZone = Math.max(1, items.length)
  const slotsPerRow = Math.max(1, Math.floor((zoneWidth - 16) / (itemSize + 8)))
  const slotRowsPerZone = Math.max(1, Math.ceil(maxItemsPerZone / slotsPerRow))
  const zoneHeight = LABEL_HEIGHT + 12 + slotRowsPerZone * (itemSize + 8) + 12

  const zones: ZoneLayout[] = dropZones.map((zone, index) => {
    const col = index % zoneColumns
    const row = Math.floor(index / zoneColumns)
    return {
      ...zone,
      colorIndex: index,
      bounds: {
        x: PADDING + col * (zoneWidth + GAP),
        y: currentY + row * (zoneHeight + GAP),
        width: zoneWidth,
        height: zoneHeight,
      },
    }
  })

  // Tính trước toạ độ các slot trong từng zone
  const zoneItemPositions: Record<string, Record<number, Point>> = {}
  for (const zone of zones) {
    zoneItemPositions[zone.id] = {}
    const rowWidth = slotsPerRow * (itemSize + 8) - 8
    const startX = zone.bounds.x + Math.max(8, (zone.bounds.width - rowWidth) / 2)
    for (let i = 0; i < items.length; i++) {
      const col = i % slotsPerRow
      const row = Math.floor(i / slotsPerRow)
      const slotX = startX + col * (itemSize + 8)
      const slotY = zone.bounds.y + LABEL_HEIGHT + 10 + row * (itemSize + 8)
      zoneItemPositions[zone.id][i] = { x: slotX, y: slotY }
    }
  }

  currentY += zoneRows * (zoneHeight + GAP) + 8

  // Bố trí khay chứa (Tray)
  const trayColumns = Math.max(1, Math.floor((availableWidth - 20) / (itemSize + GAP)))
  const trayRows = Math.max(1, Math.ceil(items.length / trayColumns))
  const trayHeight = trayRows * (itemSize + GAP) + 20
  const trayY = currentY

  const trayPositions: Record<string, Point> = {}
  items.forEach((item, index) => {
    const row = Math.floor(index / trayColumns)
    const rowCount = Math.min(trayColumns, items.length - row * trayColumns)
    const rowWidth = rowCount * itemSize + (rowCount - 1) * GAP
    const startX = (width - rowWidth) / 2
    trayPositions[item.id] = {
      x: startX + (index % trayColumns) * (itemSize + GAP),
      y: trayY + 12 + row * (itemSize + GAP),
    }
  })

  currentY += trayHeight + 16

  // Nút xác nhận «Xong rồi!»
  const confirmY = currentY
  currentY += confirmHeight + PADDING

  return {
    width,
    height: currentY,
    promptY,
    promptHeight,
    illustrationY,
    audioY,
    zones,
    zoneItemPositions,
    trayBounds: {
      x: PADDING,
      y: trayY,
      width: availableWidth,
      height: trayHeight,
    },
    trayPositions,
    confirmY,
    confirmHeight,
    confirmWidth,
    itemSize,
  }
}
