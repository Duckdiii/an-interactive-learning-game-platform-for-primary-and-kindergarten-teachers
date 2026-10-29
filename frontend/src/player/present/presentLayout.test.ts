import { describe, expect, it } from 'vitest'
import { fitScale, heightScale } from './presentLayout'

describe('fitScale', () => {
  it('khớp chiều hẹp hơn để không méo: màn 16:9 vừa khít, màn 4:3 viền trên dưới, màn siêu rộng viền hai bên', () => {
    expect(fitScale(1920, 1080)).toBe(1.5)
    expect(fitScale(1024, 768)).toBe(0.8)
    expect(fitScale(2560, 720)).toBe(1)
  })
})

describe('heightScale', () => {
  it('cao quá chỗ trống thì thu nhỏ đúng tỉ lệ; vừa hoặc thấp hơn thì giữ nguyên; chưa đo được thì giữ nguyên', () => {
    expect(heightScale(440, 550)).toBe(0.8)
    expect(heightScale(440, 300)).toBe(1)
    expect(heightScale(0, 300)).toBe(1)
  })
})
