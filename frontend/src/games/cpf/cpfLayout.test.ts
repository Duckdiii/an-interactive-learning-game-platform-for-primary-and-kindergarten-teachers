import { describe, expect, it } from 'vitest'
import type { CpfArrangement, CpfRegion } from '../../types/cpf-game.types'
import {
  CPF_HUD_HEIGHT,
  CPF_MIN_ITEM_SIZE,
  CPF_STAGE_HEIGHT,
  CPF_STAGE_WIDTH,
  layoutGroup,
  overlaps,
  progressX,
  regionBox,
} from './cpfLayout'

const REGIONS: CpfRegion[] = ['TOP', 'MIDDLE', 'BOTTOM', 'LEFT', 'RIGHT', 'CENTER']
const ARRANGEMENTS: CpfArrangement[] = ['SINGLE', 'ROW', 'GRID', 'SCATTER']

describe('layoutGroup', () => {
  // Duyệt mọi tổ hợp vùng × cách xếp × số vật (1..8 lựa chọn của một màn).
  for (const region of REGIONS) {
    for (const arrangement of ARRANGEMENTS) {
      for (let count = 1; count <= 8; count++) {
        it(`${region}/${arrangement}/${count}: trong vùng, đủ lớn để chạm, không chồng nhau`, () => {
          const area = regionBox(region)
          const boxes = layoutGroup(region, arrangement, count)

          expect(boxes).toHaveLength(count)
          for (const b of boxes) {
            expect(b.w).toBeGreaterThanOrEqual(CPF_MIN_ITEM_SIZE)
            expect(b.h).toBeGreaterThanOrEqual(CPF_MIN_ITEM_SIZE)
            expect(b.x).toBeGreaterThanOrEqual(area.x - 0.001)
            expect(b.y).toBeGreaterThanOrEqual(area.y - 0.001)
            expect(b.x + b.w).toBeLessThanOrEqual(area.x + area.w + 0.001)
            expect(b.y + b.h).toBeLessThanOrEqual(area.y + area.h + 0.001)
          }
          for (let i = 0; i < boxes.length; i++) {
            for (let j = i + 1; j < boxes.length; j++) {
              expect(overlaps(boxes[i], boxes[j])).toBe(false)
            }
          }
        })
      }
    }
  }

  it('cùng đầu vào cho cùng bố cục (SCATTER ổn định)', () => {
    expect(layoutGroup('TOP', 'SCATTER', 5)).toEqual(layoutGroup('TOP', 'SCATTER', 5))
  })

  it('ROW xếp một hàng khi vừa', () => {
    const ys = new Set(layoutGroup('MIDDLE', 'ROW', 4).map((b) => b.y))
    expect(ys.size).toBe(1)
  })
})

describe('regionBox', () => {
  it('mọi vùng nằm dưới dải HUD và trong sân khấu', () => {
    for (const region of REGIONS) {
      const b = regionBox(region)
      expect(b.y).toBeGreaterThanOrEqual(CPF_HUD_HEIGHT)
      expect(b.x).toBeGreaterThanOrEqual(0)
      expect(b.x + b.w).toBeLessThanOrEqual(CPF_STAGE_WIDTH)
      expect(b.y + b.h).toBeLessThanOrEqual(CPF_STAGE_HEIGHT)
    }
  })
})

describe('progressX', () => {
  const box = layoutGroup('BOTTOM', 'SINGLE', 1)[0]

  it('đi từ mép trái tới mép phải vùng, không vượt đích', () => {
    const area = regionBox('BOTTOM')
    expect(progressX(box, 'BOTTOM', 0, 3)).toBe(area.x)
    expect(progressX(box, 'BOTTOM', 3, 3)).toBe(area.x + area.w - box.w)
    expect(progressX(box, 'BOTTOM', 9, 3)).toBe(area.x + area.w - box.w)
  })
})
