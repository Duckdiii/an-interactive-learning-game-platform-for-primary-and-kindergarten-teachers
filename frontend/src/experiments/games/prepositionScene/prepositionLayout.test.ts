import { describe, expect, it } from 'vitest'
import { STAGE_WIDTH } from '../../../games/common/mediaLayout'
import { SCENE_HEIGHT, SCENE_WIDTH } from './prepositionGeometry'
import { computePrepositionLayout, layoutBoxes, overlaps, SCENE_X, type Box } from './prepositionLayout'

const variants = [true, false].flatMap((hasAudio) =>
  [true, false].flatMap((showConfirm) =>
    [0, 40, 40.5, 120, 400, Number.NaN, -10].map((instructionHeight) => ({ hasAudio, showConfirm, instructionHeight })),
  ),
)

describe('computePrepositionLayout', () => {
  it.each(variants)('không phần nào đè nhau và nằm trong sân: %j', (input) => {
    const layout = computePrepositionLayout(input)
    const entries = Object.entries(layoutBoxes(layout))
    for (const [name, [x, y, w, h]] of entries) {
      expect([name, x >= 0, x + w <= STAGE_WIDTH]).toEqual([name, true, true])
      expect([name, y >= 0, y + h <= layout.stageHeight]).toEqual([name, true, true])
    }
    for (let i = 0; i < entries.length; i += 1) {
      for (let j = i + 1; j < entries.length; j += 1) {
        expect([entries[i][0], entries[j][0], overlaps(entries[i][1], entries[j][1])]).toEqual([entries[i][0], entries[j][0], false])
      }
    }
  })

  it('cảnh đúng cỡ và nằm giữa sân', () => {
    const boxes = layoutBoxes(computePrepositionLayout({ hasAudio: false, instructionHeight: 80, showConfirm: true }))
    expect(boxes.scene[2]).toBe(SCENE_WIDTH)
    expect(boxes.scene[3]).toBe(SCENE_HEIGHT)
    expect(SCENE_X).toBe((STAGE_WIDTH - SCENE_WIDTH) / 2)
  })

  it('thứ tự từ trên xuống: nghe lại → lệnh → cảnh → «Done!»', () => {
    const l = computePrepositionLayout({ hasAudio: true, instructionHeight: 80, showConfirm: true })
    const order = [l.audioY!, l.instructionY, l.sceneY, l.confirmY!]
    expect([...order].sort((a, b) => a - b)).toEqual(order)
    expect(new Set(order).size).toBe(order.length)
    expect(l.stageHeight).toBeGreaterThan(l.confirmY!)
  })

  it('không có nghe lại thì không chừa chỗ; xem lại thì không có nút xác nhận', () => {
    const plain = computePrepositionLayout({ hasAudio: false, instructionHeight: 80, showConfirm: false })
    expect(plain.audioY).toBeNull()
    expect(plain.confirmY).toBeNull()
    expect(computePrepositionLayout({ hasAudio: true, instructionHeight: 80, showConfirm: true }).stageHeight).toBeGreaterThan(plain.stageHeight)
  })

  it('lệnh cao hơn thì sân cao đúng bằng phần chênh', () => {
    const a = computePrepositionLayout({ hasAudio: false, instructionHeight: 80, showConfirm: true })
    const b = computePrepositionLayout({ hasAudio: false, instructionHeight: 200, showConfirm: true })
    expect(b.stageHeight - a.stageHeight).toBe(120)
  })

  it('chiều cao lệnh không hợp lệ dùng mức tối thiểu', () => {
    const min = computePrepositionLayout({ hasAudio: false, instructionHeight: 0, showConfirm: true })
    expect(computePrepositionLayout({ hasAudio: false, instructionHeight: Number.NaN, showConfirm: true })).toEqual(min)
    expect(computePrepositionLayout({ hasAudio: false, instructionHeight: -50, showConfirm: true })).toEqual(min)
    expect(min.instructionHeight).toBeGreaterThan(0)
  })
})

describe('overlaps', () => {
  const a: Box = [0, 0, 10, 10]
  it('chồng một phần là đè', () => expect(overlaps(a, [5, 5, 10, 10])).toBe(true))
  it('chỉ chạm cạnh không tính là đè', () => {
    expect(overlaps(a, [10, 0, 5, 5])).toBe(false)
    expect(overlaps(a, [0, 10, 5, 5])).toBe(false)
  })
  it('tách rời là không đè', () => expect(overlaps(a, [20, 20, 5, 5])).toBe(false))
})
