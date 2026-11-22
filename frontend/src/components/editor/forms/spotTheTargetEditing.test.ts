import { describe, expect, it } from 'vitest'
import type { SpotTheTargetQuestion } from '../../../types/game-dsl.types'
import {
  clearHitRegion,
  setHitRegion,
  setTargetDescription,
  setVisualPrompt,
} from './spotTheTargetEditing'

const createQuestion = (): SpotTheTargetQuestion => ({
  id: 'q1',
  timeLimitSeconds: 30,
  points: 10,
  visualPrompt: 'https://example.com/forest.jpg',
  targetDescription: 'Tìm chú chim màu xanh',
})

describe('spotTheTargetEditing', () => {
  it('cập nhật targetDescription', () => {
    const q = createQuestion()
    const updated = setTargetDescription(q, 'Tìm con thỏ trắng')
    expect(updated.targetDescription).toBe('Tìm con thỏ trắng')
  })

  it('cập nhật visualPrompt', () => {
    const q = createQuestion()
    const updated = setVisualPrompt(q, 'https://example.com/park.jpg')
    expect(updated.visualPrompt).toBe('https://example.com/park.jpg')
  })

  it('đặt hitRegion với x, y, radius và kẹp trong [0, 1]', () => {
    const q = createQuestion()
    const updated = setHitRegion(q, 0.45678, 0.65432, 0.15)
    expect(updated.hitRegion).toEqual({
      x: 0.4568,
      y: 0.6543,
      radius: 0.15,
    })

    // Giá trị vượt biên được kẹp lại
    const clamped = setHitRegion(q, 1.5, -0.2, 2.0)
    expect(clamped.hitRegion).toEqual({
      x: 1,
      y: 0,
      radius: 1,
    })
  })

  it('xóa hitRegion thành công', () => {
    const q = createQuestion()
    const withHit = setHitRegion(q, 0.5, 0.5, 0.1)
    expect(withHit.hitRegion).toBeDefined()

    const cleared = clearHitRegion(withHit)
    expect(cleared.hitRegion).toBeUndefined()
  })
})
