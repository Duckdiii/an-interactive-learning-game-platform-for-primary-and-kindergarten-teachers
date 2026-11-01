import type { Bounds, DragDropQuestion, DropZone, PlacedState, Point } from '../../../../types/dragDrop'

export const ITEM_SIZE = 88
const GAP = 16
const PADDING = 16
const LABEL_HEIGHT = 60

export interface BoardLayout {
  width: number
  height: number
  zones: (DropZone & { bounds: Bounds })[]
  trayBounds: Bounds
  trayPositions: Record<string, Point>
  zonePositions: Record<string, Point>
}

export function isInsideZone(point: Point, bounds: Bounds) {
  return point.x >= bounds.x && point.x <= bounds.x + bounds.width &&
    point.y >= bounds.y && point.y <= bounds.y + bounds.height
}

export function validateQuestion(question: DragDropQuestion) {
  if (!question.questionId || !question.dropZones.length || !question.draggableItems.length) {
    return 'Câu hỏi cần có vật thể và rổ phân loại.'
  }
  const zoneIds = new Set(question.dropZones.map((zone) => zone.zoneId))
  const itemIds = new Set(question.draggableItems.map((item) => item.itemId))
  if (zoneIds.size !== question.dropZones.length || itemIds.size !== question.draggableItems.length) {
    return 'Mã vật thể và mã rổ phải duy nhất.'
  }
  if (question.dropZones.some((zone) => !zone.zoneId || !zone.label.trim()) ||
    question.draggableItems.some((item) => !item.itemId || !item.label.trim() || !zoneIds.has(item.correctZoneId))) {
    return 'Mỗi vật thể cần có nhãn và một rổ đích hợp lệ.'
  }
  return null
}

export function createBoardLayout(question: DragDropQuestion, width: number): BoardLayout {
  const zoneColumns = width >= 560 ? Math.min(2, question.dropZones.length) : 1
  const zoneWidth = (width - PADDING * 2 - GAP * (zoneColumns - 1)) / zoneColumns
  const slotColumns = Math.max(1, Math.floor((zoneWidth - PADDING * 2 + GAP) / (ITEM_SIZE + GAP)))
  const largestZone = Math.max(...question.dropZones.map((zone) =>
    question.draggableItems.filter((item) => item.correctZoneId === zone.zoneId).length))
  const slotRows = Math.max(1, Math.ceil(largestZone / slotColumns))
  const zoneHeight = PADDING * 2 + slotRows * (ITEM_SIZE + GAP) - GAP + LABEL_HEIGHT
  const zones = question.dropZones.map((zone, index) => ({
    ...zone,
    bounds: {
      x: PADDING + (index % zoneColumns) * (zoneWidth + GAP),
      y: PADDING + Math.floor(index / zoneColumns) * (zoneHeight + GAP),
      width: zoneWidth,
      height: zoneHeight,
    },
  }))
  const zonePositions: Record<string, Point> = {}
  for (const zone of zones) {
    const items = question.draggableItems.filter((item) => item.correctZoneId === zone.zoneId)
    items.forEach((item, index) => {
      const row = Math.floor(index / slotColumns)
      const rowCount = Math.min(slotColumns, items.length - row * slotColumns)
      const rowWidth = rowCount * ITEM_SIZE + (rowCount - 1) * GAP
      zonePositions[item.itemId] = {
        x: zone.bounds.x + (zoneWidth - rowWidth) / 2 + (index % slotColumns) * (ITEM_SIZE + GAP),
        y: zone.bounds.y + PADDING + row * (ITEM_SIZE + GAP),
      }
    })
  }
  const trayY = PADDING + Math.ceil(zones.length / zoneColumns) * (zoneHeight + GAP)
  const trayColumns = Math.max(1, Math.floor((width - PADDING * 4 + GAP) / (ITEM_SIZE + GAP)))
  const trayRows = Math.ceil(question.draggableItems.length / trayColumns)
  const trayPositions: Record<string, Point> = {}
  question.draggableItems.forEach((item, index) => {
    const row = Math.floor(index / trayColumns)
    const rowCount = Math.min(trayColumns, question.draggableItems.length - row * trayColumns)
    const rowWidth = rowCount * ITEM_SIZE + (rowCount - 1) * GAP
    trayPositions[item.itemId] = {
      x: (width - rowWidth) / 2 + (index % trayColumns) * (ITEM_SIZE + GAP),
      y: trayY + 40 + row * (ITEM_SIZE + GAP),
    }
  })
  const trayHeight = 40 + trayRows * (ITEM_SIZE + GAP)
  return {
    width,
    height: trayY + trayHeight + PADDING,
    zones,
    trayBounds: { x: PADDING, y: trayY, width: width - PADDING * 2, height: trayHeight },
    trayPositions,
    zonePositions,
  }
}

export function resolveDrop(layout: BoardLayout, question: DragDropQuestion, placed: PlacedState, itemId: string, position: Point) {
  const item = question.draggableItems.find((candidate) => candidate.itemId === itemId)
  if (!item) throw new Error(`Unknown drag item: ${itemId}`)
  if (placed[itemId]) return { outcome: 'locked' as const, position: layout.zonePositions[itemId], zoneId: placed[itemId].zoneId }
  const center = { x: position.x + ITEM_SIZE / 2, y: position.y + ITEM_SIZE / 2 }
  const zone = layout.zones.find((candidate) => isInsideZone(center, candidate.bounds))
  if (!zone) return { outcome: 'miss' as const, position: layout.trayPositions[itemId] }
  if (zone.zoneId !== item.correctZoneId) {
    return { outcome: 'wrong' as const, position: layout.trayPositions[itemId], zoneId: item.correctZoneId }
  }
  return { outcome: 'correct' as const, position: layout.zonePositions[itemId], zoneId: zone.zoneId }
}
