import { describe, expect, it } from 'vitest'
import { DECORATION_LIMITS } from '../../../theme/themeTypes'
import { depthStyle } from './decorDepth'

describe('depthStyle', () => {
  it('gần nhất (1) là cỡ đầy đủ, đục hoàn toàn, bóng đậm nhất; xa nhất (0) theo giới hạn trong theme', () => {
    const { minScale, minOpacity, minShadow, maxShadow } = DECORATION_LIMITS.depth
    expect(depthStyle(1)).toEqual({ scale: 1, opacity: 1, shadowOpacity: maxShadow })
    expect(depthStyle(0)).toEqual({ scale: minScale, opacity: minOpacity, shadowOpacity: minShadow })
  })
  it('tăng đơn điệu theo độ sâu', () => {
    const steps = [0, 0.25, 0.5, 0.75, 1].map(depthStyle)
    for (let i = 1; i < steps.length; i += 1) {
      expect(steps[i].scale).toBeGreaterThan(steps[i - 1].scale)
      expect(steps[i].opacity).toBeGreaterThan(steps[i - 1].opacity)
      expect(steps[i].shadowOpacity).toBeGreaterThan(steps[i - 1].shadowOpacity)
    }
  })
  it('bỏ trống, NaN hoặc ngoài khoảng thì coi là gần hoặc kẹp lại, không sinh NaN', () => {
    expect(depthStyle(undefined)).toEqual(depthStyle(1))
    expect(depthStyle(Number.NaN)).toEqual(depthStyle(1))
    expect(depthStyle(5)).toEqual(depthStyle(1))
    expect(depthStyle(-3)).toEqual(depthStyle(0))
  })
})
