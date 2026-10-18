import { describe, expect, it } from 'vitest'
import { STAGE_WIDTH } from '../../../games/common/mediaLayout'
import {
  BAND_HEIGHT,
  BAND_WIDTH,
  BAND_X,
  computeNumberLineLayout,
  controlsLeft,
  controlsX,
  GAP,
  LABEL_FONT_SIZE,
  LABEL_OFFSET_Y,
  LABEL_WIDTH,
  layoutBoxes,
  LINE_LEFT,
  LINE_RIGHT,
  MARKER_RADIUS,
  overlaps,
  REVEAL_RING_RADIUS,
  REVEAL_RING_STROKE,
  type Box,
} from './numberLineLayout'

const variants = [true, false].flatMap((hasAudio) =>
  [true, false].flatMap((showConfirm) =>
    [0, 40, 40.5, 120, 400, Number.NaN, -10].map((questionHeight) => ({ hasAudio, showConfirm, questionHeight })),
  ),
)

describe('computeNumberLineLayout', () => {
  it.each(variants)('không phần nào đè nhau và nằm trong sân: %j', (input) => {
    const layout = computeNumberLineLayout(input)
    const boxes = layoutBoxes(layout)
    const entries = Object.entries(boxes)
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

  it('thứ tự từ trên xuống: nghe lại → câu hỏi → dải thang → hàng − số + → xong rồi', () => {
    const layout = computeNumberLineLayout({ hasAudio: true, questionHeight: 80, showConfirm: true })
    expect(layout.audioY).not.toBeNull()
    expect(layout.audioY!).toBeLessThan(layout.questionY)
    expect(layout.questionY).toBeLessThan(layout.bandY)
    expect(layout.bandY).toBeLessThan(layout.controlsY)
    expect(layout.controlsY).toBeLessThan(layout.confirmY!)
    expect(layout.stageHeight).toBeGreaterThan(layout.confirmY!)
  })

  it('không có nghe lại thì không chừa chỗ; xem lại thì không có nút xác nhận', () => {
    const plain = computeNumberLineLayout({ hasAudio: false, questionHeight: 80, showConfirm: false })
    expect(plain.audioY).toBeNull()
    expect(plain.confirmY).toBeNull()
    const full = computeNumberLineLayout({ hasAudio: true, questionHeight: 80, showConfirm: true })
    expect(full.stageHeight).toBeGreaterThan(plain.stageHeight)
  })

  it('câu hỏi cao hơn thì sân cao đúng bằng phần chênh', () => {
    const a = computeNumberLineLayout({ hasAudio: false, questionHeight: 80, showConfirm: true })
    const b = computeNumberLineLayout({ hasAudio: false, questionHeight: 200, showConfirm: true })
    expect(b.stageHeight - a.stageHeight).toBe(120)
    expect(b.bandY - a.bandY).toBe(120)
  })

  it('chiều cao câu hỏi không hợp lệ (NaN, âm, 0) dùng mức tối thiểu', () => {
    const min = computeNumberLineLayout({ hasAudio: false, questionHeight: 0, showConfirm: true })
    expect(computeNumberLineLayout({ hasAudio: false, questionHeight: Number.NaN, showConfirm: true })).toEqual(min)
    expect(computeNumberLineLayout({ hasAudio: false, questionHeight: -50, showConfirm: true })).toEqual(min)
    expect(min.questionHeight).toBeGreaterThan(0)
  })

  it('đường thang nằm giữa dải', () => {
    const layout = computeNumberLineLayout({ hasAudio: false, questionHeight: 80, showConfirm: true })
    expect(layout.lineY).toBe(layout.bandY + BAND_HEIGHT / 2)
  })
})

describe('hằng số hình học', () => {
  it('đường thang và điểm kéo nằm trọn trong dải', () => {
    expect(LINE_LEFT - MARKER_RADIUS).toBeGreaterThanOrEqual(BAND_X)
    expect(LINE_RIGHT + MARKER_RADIUS).toBeLessThanOrEqual(BAND_X + BAND_WIDTH)
    expect(MARKER_RADIUS * 2).toBeLessThanOrEqual(BAND_HEIGHT)
  })

  it('nhãn số nằm dưới điểm kéo và vòng gợi ý (không bị che) và trong dải', () => {
    const layout = computeNumberLineLayout({ hasAudio: false, questionHeight: 80, showConfirm: true })
    const labelTop = layout.lineY + LABEL_OFFSET_Y
    expect(labelTop).toBeGreaterThanOrEqual(layout.lineY + REVEAL_RING_RADIUS + REVEAL_RING_STROKE / 2)
    expect(labelTop).toBeGreaterThan(layout.lineY + MARKER_RADIUS)
    // Chữ đậm 26 cao khoảng 1,2 lần cỡ chữ; còn dư lề dưới trong dải.
    expect(labelTop + LABEL_FONT_SIZE * 1.2).toBeLessThanOrEqual(layout.bandY + BAND_HEIGHT - 8)
  })

  it('vòng gợi ý nằm trọn trong dải theo chiều dọc', () => {
    const layout = computeNumberLineLayout({ hasAudio: false, questionHeight: 80, showConfirm: true })
    expect(layout.lineY - REVEAL_RING_RADIUS - REVEAL_RING_STROKE / 2).toBeGreaterThanOrEqual(layout.bandY)
  })

  it('nhãn hai vạch liền kề (thang 0..20 bước 1, 21 vạch, nhãn mỗi 2 vạch) không chồng nhau', () => {
    const tickGap = (LINE_RIGHT - LINE_LEFT) / 20
    expect(tickGap * 2).toBeGreaterThanOrEqual(LABEL_WIDTH)
  })

  it('hàng − số + nằm giữa sân', () => {
    const [x, , w] = layoutBoxes(computeNumberLineLayout({ hasAudio: false, questionHeight: 80, showConfirm: true })).minus
    const [px, , pw] = layoutBoxes(computeNumberLineLayout({ hasAudio: false, questionHeight: 80, showConfirm: true })).plus
    expect(x).toBe(controlsLeft())
    expect(x + w).toBeLessThan(px)
    expect(x).toBeCloseTo(STAGE_WIDTH - (px + pw), 6) // đối xứng hai bên
  })
})

describe('controlsX', () => {
  it('khớp hộp của layoutBoxes và cách nhau đúng GAP', () => {
    const boxes = layoutBoxes(computeNumberLineLayout({ hasAudio: false, questionHeight: 80, showConfirm: true }))
    const x = controlsX()
    expect([boxes.minus[0], boxes.value[0], boxes.plus[0]]).toEqual([x.minus, x.value, x.plus])
    expect(x.value - (x.minus + boxes.minus[2])).toBe(GAP)
    expect(x.plus - (x.value + boxes.value[2])).toBe(GAP)
  })
})

describe('overlaps', () => {
  const a: Box = [0, 0, 10, 10]
  it('chồng một phần là đè', () => expect(overlaps(a, [5, 5, 10, 10])).toBe(true))
  it('chứa trọn là đè', () => expect(overlaps(a, [2, 2, 3, 3])).toBe(true))
  it('chỉ chạm cạnh không tính là đè', () => {
    expect(overlaps(a, [10, 0, 5, 5])).toBe(false)
    expect(overlaps(a, [0, 10, 5, 5])).toBe(false)
  })
  it('tách rời là không đè', () => expect(overlaps(a, [20, 20, 5, 5])).toBe(false))
})
