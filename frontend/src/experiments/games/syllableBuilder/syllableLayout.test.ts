import { describe, expect, it } from 'vitest'
import { STAGE_WIDTH } from '../../../games/common/mediaLayout'
import {
  computeSyllableLayout,
  layoutBoxes,
  overlaps,
  SLOT_BUTTON_HEIGHT,
  SLOT_GAP,
  SLOT_VALUE_HEIGHT,
  SLOT_WIDTH,
  slotParts,
  slotX,
  type Box,
} from './syllableLayout'

const variants = [true, false].flatMap((hasAudio) =>
  [true, false].flatMap((showConfirm) =>
    [0, 40, 40.5, 120, 400, Number.NaN, -10].map((questionHeight) => ({ hasAudio, showConfirm, questionHeight })),
  ),
)

describe('computeSyllableLayout', () => {
  it.each(variants)('không phần nào đè nhau và nằm trong sân: %j', (input) => {
    const layout = computeSyllableLayout(input)
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

  it('đủ phần: 3 ô × (▲, giá trị, ▼) + câu hỏi + ô ghép + thông điệp; nghe lại và xác nhận tùy chọn', () => {
    const full = Object.keys(layoutBoxes(computeSyllableLayout({ hasAudio: true, questionHeight: 80, showConfirm: true })))
    expect(full).toHaveLength(3 * 3 + 3 + 2)
    const plain = Object.keys(layoutBoxes(computeSyllableLayout({ hasAudio: false, questionHeight: 80, showConfirm: false })))
    expect(plain).toHaveLength(3 * 3 + 3)
    expect(plain).not.toContain('audio')
    expect(plain).not.toContain('confirm')
  })

  it('thứ tự từ trên xuống: nghe lại → câu hỏi → ô ghép → thông điệp → ô chọn → xác nhận', () => {
    const l = computeSyllableLayout({ hasAudio: true, questionHeight: 80, showConfirm: true })
    const order = [l.audioY!, l.questionY, l.composedY, l.messageY, l.slotsY, l.confirmY!]
    expect([...order].sort((a, b) => a - b)).toEqual(order)
    expect(new Set(order).size).toBe(order.length)
    expect(l.stageHeight).toBeGreaterThan(l.confirmY!)
  })

  it('câu hỏi cao hơn thì sân cao đúng bằng phần chênh', () => {
    const a = computeSyllableLayout({ hasAudio: false, questionHeight: 80, showConfirm: true })
    const b = computeSyllableLayout({ hasAudio: false, questionHeight: 200, showConfirm: true })
    expect(b.stageHeight - a.stageHeight).toBe(120)
  })

  it('chiều cao câu hỏi không hợp lệ dùng mức tối thiểu', () => {
    const min = computeSyllableLayout({ hasAudio: false, questionHeight: 0, showConfirm: true })
    expect(computeSyllableLayout({ hasAudio: false, questionHeight: Number.NaN, showConfirm: true })).toEqual(min)
    expect(computeSyllableLayout({ hasAudio: false, questionHeight: -50, showConfirm: true })).toEqual(min)
    expect(min.questionHeight).toBeGreaterThan(0)
  })
})

describe('hàng ô chọn', () => {
  it('ba cột đối xứng quanh giữa sân, cách nhau đúng SLOT_GAP', () => {
    expect(slotX(1) - (slotX(0) + SLOT_WIDTH)).toBe(SLOT_GAP)
    expect(slotX(2) - (slotX(1) + SLOT_WIDTH)).toBe(SLOT_GAP)
    expect(slotX(0)).toBeCloseTo(STAGE_WIDTH - (slotX(2) + SLOT_WIDTH), 6)
    expect(slotX(0)).toBeGreaterThanOrEqual(0)
  })

  it('trong mỗi cột: ▲ rồi ô giá trị rồi ▼, không đè', () => {
    const { up, value, down } = slotParts()
    expect(up).toBe(0)
    expect(value).toBeGreaterThanOrEqual(up + SLOT_BUTTON_HEIGHT)
    expect(down).toBeGreaterThanOrEqual(value + SLOT_VALUE_HEIGHT)
  })

  it('hộp của layoutBoxes khớp slotX và slotParts', () => {
    const l = computeSyllableLayout({ hasAudio: false, questionHeight: 80, showConfirm: true })
    const boxes = layoutBoxes(l)
    expect(boxes.rhymeUp[0]).toBe(slotX(1))
    expect(boxes.toneDown[1]).toBe(l.slotsY + slotParts().down)
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
