import { describe, expect, it } from 'vitest'
import { burstParticle, easeOutBack, progress, wiggle } from './motion'
import { colorWordOf, objectKindForTheme, quantityPicture, singlePicture } from './optionVisual'

describe('colorWordOf', () => {
  it.each([
    ['Red', 'red'],
    ['màu đỏ', 'red'],
    ['Xanh dương', 'blue'],
    ['xanh lá cây', 'green'],
    ['Màu vàng', 'yellow'],
    ['Green', 'green'],
  ])('"%s" là màu %s', (text, color) => {
    expect(colorWordOf(text)).toBe(color)
  })

  it.each(['quả cam chín ngọt lắm', 'Con mèo', 'cảm ơn', 'cái đèn', '5000 m', 'Con mèo đen', 'quả cam', 'Red apple', 'Con cá vàng', 'xanh'])('"%s" không phải tên màu', (text) => {
    expect(colorWordOf(text)).toBeNull()
  })
})

describe('quantityPicture', () => {
  it('"3 con vịt" vẽ 3 con vịt', () => {
    expect(quantityPicture('3 con vịt')).toEqual({ count: 3, imageUrl: '/assets/animals/duck.svg' })
  })

  it.each(['50 m', '5000 m', '3 kg', '7 m 5 cm', '12 quả táo', '0 con mèo', 'con vịt'])('"%s" không hình hóa', (text) => {
    expect(quantityPicture(text)).toBeNull()
  })
})

describe('singlePicture', () => {
  it('tên một con vật thì có hình, có số thì không', () => {
    expect(singlePicture('Con mèo')).toBe('/assets/animals/cat.svg')
    expect(singlePicture('5 con mèo')).toBeNull()
    expect(singlePicture('Số 5')).toBeNull()
  })
})

describe('objectKindForTheme', () => {
  it('đại dương là bong bóng, vũ trụ là hành tinh, còn lại bóng bay', () => {
    expect(objectKindForTheme('ocean')).toBe('bubble')
    expect(objectKindForTheme('space')).toBe('planet')
    expect(objectKindForTheme('farm')).toBe('balloon')
    expect(objectKindForTheme(undefined)).toBe('balloon')
  })
})

describe('motion', () => {
  it('easeOutBack đi từ 0 tới 1 và vượt nhẹ ở giữa', () => {
    expect(easeOutBack(0)).toBeCloseTo(0)
    expect(easeOutBack(1)).toBeCloseTo(1)
    expect(Math.max(...[0.6, 0.7, 0.8].map(easeOutBack))).toBeGreaterThan(1)
  })

  it('wiggle tắt hẳn sau thời gian hiệu ứng và không vượt biên độ', () => {
    expect(wiggle(-0.1)).toBe(0)
    expect(wiggle(0.95)).toBe(0)
    for (let t = 0; t < 0.9; t += 0.05) expect(Math.abs(wiggle(t))).toBeLessThanOrEqual(10)
  })

  it('hạt mừng mờ dần và biến mất ở cuối', () => {
    expect(burstParticle(0, 6, 0.9).opacity).toBe(0)
    expect(burstParticle(0, 6, -1).opacity).toBe(0)
    expect(progress(5, 0)).toBe(1)
  })
})
