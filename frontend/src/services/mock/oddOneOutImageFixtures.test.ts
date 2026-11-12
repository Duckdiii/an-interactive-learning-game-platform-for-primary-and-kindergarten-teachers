import { describe, expect, it } from 'vitest'
import { buildOddOneOutImageMock } from './oddOneOutImageFixtures'

describe('Odd One Out renderer-only fixtures', () => {
  it.each([4, 5, 6] as const)('has %i local Noto images with one identified answer', (count) => {
    const q = buildOddOneOutImageMock(count).questions[0]
    expect(q.renderMode).toBe('IMAGE')
    expect(q.items).toHaveLength(count)
    expect(new Set(q.items.map((i) => i.id)).size).toBe(count)
    expect(new Set(q.items.map((i) => i.imageUrl)).size).toBe(count)
    expect(q.items.every((i) => i.imageUrl?.startsWith('/assets/noto/'))).toBe(true)
    expect(q.oddOneOutId).toBe('b')
  })
  it('rejects a count outside the renderer fixture contract', () => {
    expect(() => buildOddOneOutImageMock(7 as 4)).toThrow()
  })
})
