import { describe, expect, it } from 'vitest'
import { subjectTheme } from './subjectTheme'

describe('subjectTheme', () => {
  it('mỗi môn có màu và ô chữ riêng, không nhầm lẫn giữa các môn', () => {
    const math = subjectTheme('MATH')
    const viet = subjectTheme('VIETNAMESE')
    const eng = subjectTheme('ENGLISH')

    expect(math.cover).toBe('bg-math-soft')
    expect(math.tiles).toEqual(['1', '2', '3'])
    expect(viet.cover).toBe('bg-viet-soft')
    expect(viet.tiles).toEqual(['A', 'Ă', 'Â'])
    expect(eng.cover).toBe('bg-eng-soft')
    expect(eng.tiles).toEqual(['A', 'B', 'C'])
    expect(new Set([math.chip, viet.chip, eng.chip]).size).toBe(3)
  })

  it('môn chưa biết dùng giao diện mặc định, không vỡ', () => {
    const theme = subjectTheme('SCIENCE')

    expect(theme.cover).toBe('bg-brand-soft')
    expect(theme.tiles).toEqual(['★', '★', '★'])
  })

  it('không nhầm khoá có sẵn của Object (constructor)', () => {
    expect(subjectTheme('constructor').cover).toBe('bg-brand-soft')
  })
})
