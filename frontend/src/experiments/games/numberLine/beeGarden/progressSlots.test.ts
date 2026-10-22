import { describe, expect, it } from 'vitest'
import { PROGRESS_MAX_ICON, progressSlots } from './progressSlots'

const BOX = [34, 26, 720, 36] as const

describe('progressSlots', () => {
  it('chia đều theo tổng số ô: tâm cách đều, thứ tự trái sang phải, trong hộp', () => {
    for (const total of [1, 3, 5, 10, 20]) {
      const slots = progressSlots(BOX, total)
      expect(slots.centers).toHaveLength(total)
      for (let i = 1; i < total; i += 1) expect(slots.centers[i] - slots.centers[i - 1]).toBeCloseTo(slots.cell, 8)
      expect(slots.centers[0]).toBeGreaterThan(BOX[0])
      expect(slots.centers[total - 1]).toBeLessThan(BOX[0] + BOX[2])
      expect(slots.centerY).toBe(BOX[1] + BOX[3] / 2)
    }
  })
  it('hình trong ô không vượt cỡ tối đa, không vượt chiều cao thanh; nhiều ô thì nhỏ lại nhưng không biến mất', () => {
    for (const total of [1, 5, 12, 20, 50]) {
      const { icon, cell } = progressSlots(BOX, total)
      expect(icon).toBeLessThanOrEqual(PROGRESS_MAX_ICON)
      expect(icon).toBeLessThanOrEqual(BOX[3])
      expect(icon).toBeGreaterThanOrEqual(8)
      if (total <= 20) expect(icon).toBeLessThanOrEqual(cell)
    }
    expect(progressSlots(BOX, 20).icon).toBeLessThanOrEqual(progressSlots(BOX, 5).icon)
  })
  it('tổng không hợp lệ (0, âm, NaN, số lẻ) thì làm tròn, tối thiểu 1 ô', () => {
    expect(progressSlots(BOX, 0).centers).toHaveLength(1)
    expect(progressSlots(BOX, -3).centers).toHaveLength(1)
    expect(progressSlots(BOX, Number.NaN).centers).toHaveLength(1)
    expect(progressSlots(BOX, 2.6).centers).toHaveLength(3)
  })
  it('hai mép của thanh thẳng hàng với hộp đưa vào (thanh không lệch hàng)', () => {
    expect(progressSlots(BOX, 5).pill).toEqual([...BOX])
  })
})
