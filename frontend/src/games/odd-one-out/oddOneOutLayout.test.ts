import { describe, expect, it } from 'vitest'
import { getOddOneOutLayout } from './oddOneOutLayout'

describe('Odd One Out grid', () => {
  it.each([[4, [2, 2]], [5, [3, 2]], [6, [3, 3]]] as const)('centers each row for %i items', (count, rows) => {
    const layout = getOddOneOutLayout(count)!
    expect(layout.positions).toHaveLength(count)
    const groups = [...new Set(layout.positions.map((p) => p.y))].map((y) => layout.positions.filter((p) => p.y === y))
    expect(groups.map((row) => row.length)).toEqual(rows)
    for (const row of groups) {
      expect((row[0].x + row.at(-1)!.x + layout.itemSize) / 2).toBe(400)
      row.forEach((p, i) => {
        expect(p.x).toBeGreaterThanOrEqual(0)
        expect(p.x + layout.itemSize).toBeLessThanOrEqual(layout.width)
        expect(p.y + layout.itemSize).toBeLessThanOrEqual(layout.height)
        if (i) expect(p.x).toBeGreaterThan(row[i - 1].x + layout.itemSize)
      })
    }
    expect(layout.itemSize * (320 / layout.width)).toBe(64)
  })
  it.each([0, 3, 7, NaN, 4.5])('rejects unsupported count %s', (count) => {
    expect(getOddOneOutLayout(count)).toBeNull()
  })
})
