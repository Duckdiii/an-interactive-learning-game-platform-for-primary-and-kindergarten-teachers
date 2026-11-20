import type { DragDropQuestion, DraggableItem, DropZone } from '../../../types/game-dsl.types'
import { TYPE_LIMITS } from '../../../utils/questionSpecs'

const LIMITS = TYPE_LIMITS.DRAG_DROP

export const canAddZone = (question: DragDropQuestion) => question.dropZones.length < LIMITS.dropZones.max
export const canRemoveZone = (question: DragDropQuestion) => question.dropZones.length > LIMITS.dropZones.min
export const canAddItem = (question: DragDropQuestion) => question.items.length < LIMITS.items.max
export const canRemoveItem = (question: DragDropQuestion) => question.items.length > LIMITS.items.min

/** Mã giỏ mới: `z<n>` với n nhỏ nhất (từ 1) chưa dùng. */
export function nextZoneId(zones: ReadonlyArray<DropZone>) {
  const used = new Set(zones.map((z) => z.id))
  let number = 1

  while (used.has(`z${number}`)) number += 1

  return `z${number}`
}

/** Số nhỏ nhất mà mã `z<số>` chưa từng dùng. */
export function firstUnusedZoneNumber(zones: ReadonlyArray<DropZone>) {
  return zones.reduce((max, z) => Math.max(max, Number(z.id.replace(/^z/, '')) || 0), 0) + 1
}

/** Mã mục mới: `i<n>` với n nhỏ nhất (từ 1) chưa dùng. */
export function nextItemId(items: ReadonlyArray<DraggableItem>) {
  const used = new Set(items.map((item) => item.id))
  let number = 1

  while (used.has(`i${number}`)) number += 1

  return `i${number}`
}

/** Số nhỏ nhất mà mã `i<số>` chưa từng dùng. */
export function firstUnusedItemNumber(items: ReadonlyArray<DraggableItem>) {
  return items.reduce((max, item) => Math.max(max, Number(item.id.replace(/^i/, '')) || 0), 0) + 1
}

/** Thêm một giỏ mới vào danh sách. */
export function addZone(question: DragDropQuestion, zoneId: string = nextZoneId(question.dropZones)): DragDropQuestion {
  if (!canAddZone(question)) return question

  const newZone: DropZone = { id: zoneId, label: '' }
  return {
    ...question,
    dropZones: [...question.dropZones, newZone],
  }
}

/** Xóa giỏ theo ID; chuyển các mục đang trỏ vào giỏ này sang giỏ đầu tiên còn lại. */
export function removeZoneById(question: DragDropQuestion, zoneId: string): DragDropQuestion {
  if (!canRemoveZone(question)) return question

  const nextZones = question.dropZones.filter((z) => z.id !== zoneId)
  const fallbackZoneId = nextZones[0]?.id ?? ''

  const nextItems = question.items.map((item) =>
    item.targetZoneId === zoneId ? { ...item, targetZoneId: fallbackZoneId } : item
  )

  return {
    ...question,
    dropZones: nextZones,
    items: nextItems,
  }
}

/** Sửa nhãn tên giỏ. */
export function setZoneLabel(question: DragDropQuestion, zoneId: string, label: string): DragDropQuestion {
  return {
    ...question,
    dropZones: question.dropZones.map((z) => (z.id === zoneId ? { ...z, label } : z)),
  }
}

/** Thêm một mục kéo thả mới. */
export function addItem(question: DragDropQuestion, itemId: string = nextItemId(question.items)): DragDropQuestion {
  if (!canAddItem(question)) return question

  const fallbackZoneId = question.dropZones[0]?.id ?? ''
  const newItem: DraggableItem = {
    id: itemId,
    text: '',
    targetZoneId: fallbackZoneId,
  }

  return {
    ...question,
    items: [...question.items, newItem],
  }
}

/** Xóa mục kéo thả theo ID. */
export function removeItemById(question: DragDropQuestion, itemId: string): DragDropQuestion {
  if (!canRemoveItem(question)) return question

  return {
    ...question,
    items: question.items.filter((item) => item.id !== itemId),
  }
}

/** Sửa chữ nội dung mục kéo thả. */
export function setItemText(question: DragDropQuestion, itemId: string, text: string): DragDropQuestion {
  return {
    ...question,
    items: question.items.map((item) => (item.id === itemId ? { ...item, text } : item)),
  }
}

/** Đổi giỏ đích mà mục kéo thả trỏ tới. */
export function setItemTargetZone(question: DragDropQuestion, itemId: string, targetZoneId: string): DragDropQuestion {
  return {
    ...question,
    items: question.items.map((item) => (item.id === itemId ? { ...item, targetZoneId } : item)),
  }
}
