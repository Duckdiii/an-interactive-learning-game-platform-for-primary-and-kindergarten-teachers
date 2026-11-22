import { describe, expect, it } from 'vitest'
import type { DragDropQuestion } from '../../../types/game-dsl.types'
import {
  addItem,
  addZone,
  canAddItem,
  canAddZone,
  canRemoveItem,
  canRemoveZone,
  firstUnusedItemNumber,
  firstUnusedZoneNumber,
  nextItemId,
  nextZoneId,
  removeItemById,
  removeZoneById,
  setItemTargetZone,
  setItemText,
  setZoneLabel,
} from './dragDropEditing'

const createQuestion = (zoneCount = 2, itemCount = 3): DragDropQuestion => ({
  id: 'q1',
  timeLimitSeconds: 30,
  points: 10,
  dropZones: Array.from({ length: zoneCount }, (_, i) => ({
    id: `z${i + 1}`,
    label: `Giỏ ${i + 1}`,
  })),
  items: Array.from({ length: itemCount }, (_, i) => ({
    id: `i${i + 1}`,
    text: `Vật ${i + 1}`,
    targetZoneId: `z${(i % zoneCount) + 1}`,
  })),
})

describe('dragDropEditing', () => {
  describe('canAddZone / canRemoveZone', () => {
    it('cho phép thêm giỏ từ 2 đến 3, khóa khi đủ 4 giỏ', () => {
      expect(canAddZone(createQuestion(2))).toBe(true)
      expect(canAddZone(createQuestion(3))).toBe(true)
      expect(canAddZone(createQuestion(4))).toBe(false)
    })

    it('cho phép xóa giỏ từ 3 đến 4, khóa khi còn 2 giỏ', () => {
      expect(canRemoveZone(createQuestion(2))).toBe(false)
      expect(canRemoveZone(createQuestion(3))).toBe(true)
      expect(canRemoveZone(createQuestion(4))).toBe(true)
    })
  })

  describe('canAddItem / canRemoveItem', () => {
    it('cho phép thêm vật từ 3 đến 7, khóa khi đủ 8 vật', () => {
      expect(canAddItem(createQuestion(2, 3))).toBe(true)
      expect(canAddItem(createQuestion(2, 7))).toBe(true)
      expect(canAddItem(createQuestion(2, 8))).toBe(false)
    })

    it('cho phép xóa vật từ 4 đến 8, khóa khi còn 3 vật', () => {
      expect(canRemoveItem(createQuestion(2, 3))).toBe(false)
      expect(canRemoveItem(createQuestion(2, 4))).toBe(true)
      expect(canRemoveItem(createQuestion(2, 8))).toBe(true)
    })
  })

  describe('ID generation helpers', () => {
    it('sinh id giỏ và id item tuần tự', () => {
      const q = createQuestion(2, 3)
      expect(nextZoneId(q.dropZones)).toBe('z3')
      expect(firstUnusedZoneNumber(q.dropZones)).toBe(3)
      expect(nextItemId(q.items)).toBe('i4')
      expect(firstUnusedItemNumber(q.items)).toBe(4)
    })
  })

  describe('addZone & removeZoneById', () => {
    it('thêm giỏ mới thành công', () => {
      const q = createQuestion(2, 3)
      const updated = addZone(q, 'z3')
      expect(updated.dropZones).toHaveLength(3)
      expect(updated.dropZones[2]?.id).toBe('z3')
    })

    it('xóa giỏ và tự động chuyển các item đang trỏ giỏ đó sang giỏ còn lại', () => {
      const q = createQuestion(3, 3)
      // q có 3 giỏ: z1, z2, z3. Item 3 trỏ z3.
      expect(q.items[2]?.targetZoneId).toBe('z3')

      const updated = removeZoneById(q, 'z3')
      expect(updated.dropZones).toHaveLength(2)
      expect(updated.dropZones.map((z) => z.id)).toEqual(['z1', 'z2'])
      // Item 3 phải được chuyển về giỏ đầu tiên z1
      expect(updated.items[2]?.targetZoneId).toBe('z1')
    })
  })

  describe('addItem & removeItemById', () => {
    it('thêm item mới gán mặc định vào giỏ đầu tiên', () => {
      const q = createQuestion(2, 3)
      const updated = addItem(q, 'i4')
      expect(updated.items).toHaveLength(4)
      expect(updated.items[3]).toEqual({
        id: 'i4',
        text: '',
        targetZoneId: 'z1',
      })
    })

    it('xóa item theo ID', () => {
      const q = createQuestion(2, 4)
      const updated = removeItemById(q, 'i2')
      expect(updated.items).toHaveLength(3)
      expect(updated.items.map((i) => i.id)).toEqual(['i1', 'i3', 'i4'])
    })
  })

  describe('setZoneLabel & setItemText & setItemTargetZone', () => {
    it('cập nhật nhãn giỏ', () => {
      const q = createQuestion(2, 3)
      const updated = setZoneLabel(q, 'z1', 'Hoa quả')
      expect(updated.dropZones[0]?.label).toBe('Hoa quả')
    })

    it('cập nhật chữ của item', () => {
      const q = createQuestion(2, 3)
      const updated = setItemText(q, 'i1', 'Quả chuối')
      expect(updated.items[0]?.text).toBe('Quả chuối')
    })

    it('đổi giỏ đích của item', () => {
      const q = createQuestion(2, 3)
      const updated = setItemTargetZone(q, 'i1', 'z2')
      expect(updated.items[0]?.targetZoneId).toBe('z2')
    })
  })
})
