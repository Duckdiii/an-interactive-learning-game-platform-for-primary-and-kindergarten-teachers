import { describe, expect, it } from 'vitest'
import { ILLUSTRATION_SIZE, illustrationGrid } from './mediaLayout'

describe('illustrationGrid', () => {
  for (let count = 1; count <= 10; count++) {
    it(`${count} hình: đủ số hình, nằm trọn trong ô, không chồng nhau`, () => {
      const cells = illustrationGrid(count)
      expect(cells).toHaveLength(count)
      for (const c of cells) {
        expect(c.x).toBeGreaterThanOrEqual(0)
        expect(c.y).toBeGreaterThanOrEqual(0)
        expect(c.x + c.size).toBeLessThanOrEqual(ILLUSTRATION_SIZE)
        expect(c.y + c.size).toBeLessThanOrEqual(ILLUSTRATION_SIZE)
      }
      for (let i = 0; i < cells.length; i++) {
        for (let j = i + 1; j < cells.length; j++) {
          const [a, b] = [cells[i], cells[j]]
          expect(a.x + a.size <= b.x || b.x + b.size <= a.x || a.y + a.size <= b.y || b.y + b.size <= a.y).toBe(true)
        }
      }
    })
  }
})
