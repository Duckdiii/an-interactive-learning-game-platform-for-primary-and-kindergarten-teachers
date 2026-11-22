import { describe, expect, it } from 'vitest'
import type { OrderingQuestion } from '../../../types/game-dsl.types'
import {
  addStep,
  canAddStep,
  canRemoveStep,
  firstUnusedStepNumber,
  moveStep,
  nextStepId,
  removeStepById,
  setStepImageDescription,
  setStepMediaUrl,
  setStepText,
} from './orderingEditing'

const createQuestion = (count: number): OrderingQuestion => ({
  id: 'q1',
  timeLimitSeconds: 30,
  points: 10,
  steps: Array.from({ length: count }, (_, i) => ({
    id: `s${i + 1}`,
    text: `Bước ${i + 1}`,
    correctPosition: i + 1,
  })),
})

describe('orderingEditing', () => {
  describe('canAddStep / canRemoveStep', () => {
    it('cho phép thêm khi số bước từ 2 đến 5, khóa khi đủ 6 bước', () => {
      expect(canAddStep(createQuestion(2))).toBe(true)
      expect(canAddStep(createQuestion(5))).toBe(true)
      expect(canAddStep(createQuestion(6))).toBe(false)
    })

    it('cho phép xóa khi số bước từ 3 đến 6, khóa khi chỉ còn 2 bước', () => {
      expect(canRemoveStep(createQuestion(2))).toBe(false)
      expect(canRemoveStep(createQuestion(3))).toBe(true)
      expect(canRemoveStep(createQuestion(6))).toBe(true)
    })
  })

  describe('nextStepId / firstUnusedStepNumber', () => {
    it('tìm mã bước tiếp theo chưa dùng', () => {
      const q = createQuestion(3)
      expect(nextStepId(q.steps)).toBe('s4')
      expect(firstUnusedStepNumber(q.steps)).toBe(4)
    })

    it('lấp khoảng trống ID nếu có ID bị xóa', () => {
      const steps = [
        { id: 's1', text: 'A', correctPosition: 1 },
        { id: 's3', text: 'C', correctPosition: 2 },
      ]
      expect(nextStepId(steps)).toBe('s2')
      expect(firstUnusedStepNumber(steps)).toBe(4)
    })
  })

  describe('addStep', () => {
    it('thêm bước mới và chuẩn hóa correctPosition', () => {
      const q = createQuestion(3)
      const updated = addStep(q, 's4')
      expect(updated.steps).toHaveLength(4)
      expect(updated.steps[3]).toEqual({
        id: 's4',
        text: '',
        correctPosition: 4,
      })
    })

    it('không thêm khi đã đủ 6 bước', () => {
      const q = createQuestion(6)
      const updated = addStep(q)
      expect(updated).toBe(q)
    })
  })

  describe('removeStepById', () => {
    it('xóa bước theo ID và đánh số lại correctPosition 1..N liên tục', () => {
      const q = createQuestion(4)
      const updated = removeStepById(q, 's2')
      expect(updated.steps).toHaveLength(3)
      expect(updated.steps.map((s) => s.id)).toEqual(['s1', 's3', 's4'])
      expect(updated.steps.map((s) => s.correctPosition)).toEqual([1, 2, 3])
    })

    it('không xóa khi chỉ còn 2 bước', () => {
      const q = createQuestion(2)
      const updated = removeStepById(q, 's1')
      expect(updated).toBe(q)
    })
  })

  describe('moveStep', () => {
    it('hoán đổi vị trí và cập nhật lại correctPosition liên tục', () => {
      const q = createQuestion(3)
      // Chuyển bước 0 ('Bước 1') xuống vị trí 1
      const updated = moveStep(q, 0, 1)
      expect(updated.steps[0]?.text).toBe('Bước 2')
      expect(updated.steps[0]?.correctPosition).toBe(1)
      expect(updated.steps[1]?.text).toBe('Bước 1')
      expect(updated.steps[1]?.correctPosition).toBe(2)
      expect(updated.steps[2]?.text).toBe('Bước 3')
      expect(updated.steps[2]?.correctPosition).toBe(3)
    })

    it('bỏ qua nếu chỉ số ngoài phạm vi hoặc trùng nhau', () => {
      const q = createQuestion(3)
      expect(moveStep(q, -1, 1)).toBe(q)
      expect(moveStep(q, 0, 5)).toBe(q)
      expect(moveStep(q, 1, 1)).toBe(q)
    })
  })

  describe('setStepText / visualPrompt / imageUrl', () => {
    it('sửa text của bước, bỏ trường nếu chuỗi rỗng', () => {
      const q = createQuestion(2)
      const updated = setStepText(q, 's1', 'Nội dung mới')
      expect(updated.steps[0]?.text).toBe('Nội dung mới')

      const empty = setStepText(updated, 's1', '   ')
      expect(empty.steps[0]?.text).toBeUndefined()
    })

    it('sửa mô tả ảnh (visualPrompt) và imageUrl', () => {
      const q = createQuestion(2)
      const withImg = setStepImageDescription(q, 's1', 'Mô tả hình')
      expect(withImg.steps[0]?.visualPrompt).toBe('Mô tả hình')

      const withUrl = setStepMediaUrl(withImg, 's1', 'https://example.com/img.png')
      expect(withUrl.steps[0]?.imageUrl).toBe('https://example.com/img.png')

      const withoutUrl = setStepMediaUrl(withUrl, 's1', undefined)
      expect(withoutUrl.steps[0]?.imageUrl).toBeUndefined()
    })
  })
})
