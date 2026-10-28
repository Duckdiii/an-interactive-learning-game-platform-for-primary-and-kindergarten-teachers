import { describe, expect, it } from 'vitest'
import { estimateProgress } from './estimatedProgress'

describe('estimateProgress', () => {
  it('chuyển bước đúng ngưỡng: 0 ms bước 1, 1 giây vẫn bước 1, 8 giây (63%) bước 3, 20 giây bước 4', () => {
    expect(estimateProgress(0)).toEqual({ percent: 0, step: 0 })
    expect(estimateProgress(1000)).toEqual({ percent: 12, step: 0 })
    expect(estimateProgress(2000).step).toBe(1)
    expect(estimateProgress(8000)).toEqual({ percent: 63, step: 2 })
    expect(estimateProgress(20000).step).toBe(3)
  })

  it('không bao giờ lùi theo thời gian', () => {
    const points = Array.from({ length: 60 }, (_, index) => estimateProgress(index * 1000))

    for (let index = 1; index < points.length; index++) {
      expect(points[index].percent).toBeGreaterThanOrEqual(points[index - 1].percent)
      expect(points[index].step).toBeGreaterThanOrEqual(points[index - 1].step)
    }
  })

  it('không bao giờ báo 100% khi chưa có kết quả, và không âm', () => {
    expect(estimateProgress(10 * 60 * 1000).percent).toBe(95)
    expect(estimateProgress(-500)).toEqual({ percent: 0, step: 0 })
  })
})
