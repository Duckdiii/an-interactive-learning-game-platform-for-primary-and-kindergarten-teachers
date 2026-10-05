import { describe, expect, it } from 'vitest'
import { AUDIO_BUTTON_HEIGHT, ILLUSTRATION_SIZE, STAGE_WIDTH } from '../common/mediaLayout'
import {
  CARD_IMAGE_SIZE,
  CARD_MIN_HEIGHT,
  CARD_PADDING,
  CARD_WIDTH,
  CONFIRM_BUTTON_HEIGHT,
  LEFT_X,
  RIGHT_X,
  ROW_GAP,
  cardContentHeight,
  cardRect,
  cardTextWidth,
  computeMatchingLayout,
  estimateTextHeight,
  lineAnchor,
  type MatchingLayoutInput,
} from './matchingLayout'

/**
 * Canvas không kiểm tra được trong jsdom nên mọi lỗi «phần này đè lên phần kia» phải bắt ở đây, bằng cách
 * duyệt mọi tổ hợp đầu vào có thể gặp (3 đến 6 cặp, có/không ảnh/audio/tiêu đề, thẻ cao thấp khác nhau).
 */

const COMBOS: MatchingLayoutInput[] = []
for (const hasIllustration of [false, true]) {
  for (const hasAudio of [false, true]) {
    for (const headingHeight of [0, 36, 120]) {
      for (const pairCount of [3, 4, 5, 6]) {
        for (const cardContentHeights of [[], [90], [150, 90, 260], [400]]) {
          for (const showConfirmButton of [false, true]) {
            COMBOS.push({
              hasIllustration,
              hasAudio,
              headingHeight,
              pairCount,
              cardContentHeights,
              showConfirmButton,
            })
          }
        }
      }
    }
  }
}

describe('computeMatchingLayout', () => {
  it('xếp ảnh, tiêu đề, nút loa, các hàng thẻ, nút Xong nối tiếp nhau, không phần nào đè phần phía trên', () => {
    for (const input of COMBOS) {
      const layout = computeMatchingLayout(input)
      const label = JSON.stringify(input)

      let cursor = 0
      if (layout.illustrationY !== null) {
        expect(layout.illustrationY, label).toBeGreaterThanOrEqual(cursor)
        cursor = layout.illustrationY + ILLUSTRATION_SIZE
      }
      if (layout.headingY !== null) {
        expect(layout.headingY, label).toBeGreaterThanOrEqual(cursor)
        cursor = layout.headingY + input.headingHeight
      }
      if (layout.audioButtonY !== null) {
        expect(layout.audioButtonY, label).toBeGreaterThanOrEqual(cursor)
        cursor = layout.audioButtonY + AUDIO_BUTTON_HEIGHT
      }
      expect(layout.rowsOriginY, label).toBeGreaterThanOrEqual(cursor)

      const lastRow = cardRect(layout, 'left', input.pairCount - 1)
      const rowsEnd = lastRow.y + lastRow.height
      if (layout.confirmButtonY !== null) {
        expect(layout.confirmButtonY, label).toBeGreaterThanOrEqual(rowsEnd)
        expect(layout.stageHeight, label).toBeGreaterThanOrEqual(layout.confirmButtonY + CONFIRM_BUTTON_HEIGHT)
      } else {
        expect(layout.stageHeight, label).toBeGreaterThanOrEqual(rowsEnd)
      }
    }
  })

  it('các hàng thẻ không chồng nhau và có khoảng cách', () => {
    for (const input of COMBOS) {
      const layout = computeMatchingLayout(input)
      for (let i = 1; i < input.pairCount; i++) {
        const previous = cardRect(layout, 'left', i - 1)
        const current = cardRect(layout, 'left', i)
        expect(current.y - (previous.y + previous.height), JSON.stringify(input)).toBe(ROW_GAP)
      }
    }
  })

  it('chiều cao hàng lấy thẻ cao nhất, không thấp hơn mức tối thiểu', () => {
    const tall = computeMatchingLayout({
      hasIllustration: false,
      hasAudio: false,
      headingHeight: 0,
      pairCount: 3,
      cardContentHeights: [150, 90, 260],
      showConfirmButton: true,
    })
    const none = computeMatchingLayout({
      hasIllustration: false,
      hasAudio: false,
      headingHeight: 0,
      pairCount: 3,
      cardContentHeights: [],
      showConfirmButton: true,
    })

    expect(tall.rowHeight).toBe(260)
    expect(none.rowHeight).toBe(CARD_MIN_HEIGHT)
    for (const input of COMBOS) {
      expect(computeMatchingLayout(input).rowHeight, JSON.stringify(input)).toBeGreaterThanOrEqual(CARD_MIN_HEIGHT)
    }
  })

  it('chỉ chừa chỗ cho phần tử có mặt', () => {
    const base = {
      pairCount: 4,
      cardContentHeights: [],
      showConfirmButton: false,
    }
    const bare = computeMatchingLayout({ ...base, hasIllustration: false, hasAudio: false, headingHeight: 0 })
    const full = computeMatchingLayout({ ...base, hasIllustration: true, hasAudio: true, headingHeight: 40 })

    expect(bare.illustrationY).toBeNull()
    expect(bare.headingY).toBeNull()
    expect(bare.audioButtonY).toBeNull()
    expect(bare.confirmButtonY).toBeNull()
    expect(full.rowsOriginY).toBeGreaterThan(bare.rowsOriginY)
  })

  it('mọi vùng chạm đều từ 64px trở lên (quy ước UX)', () => {
    expect(CARD_MIN_HEIGHT).toBeGreaterThanOrEqual(64)
    expect(CONFIRM_BUTTON_HEIGHT).toBeGreaterThanOrEqual(64)
    expect(AUDIO_BUTTON_HEIGHT).toBeGreaterThanOrEqual(64)
    expect(CARD_WIDTH).toBeGreaterThanOrEqual(64)
  })

  it('6 cặp thẻ thấp nhất vẫn có canvas hữu hạn hợp lý', () => {
    const layout = computeMatchingLayout({
      hasIllustration: true,
      hasAudio: true,
      headingHeight: 40,
      pairCount: 6,
      cardContentHeights: [],
      showConfirmButton: true,
    })

    expect(layout.stageHeight).toBeLessThan(1500)
  })
})

describe('cardRect và lineAnchor', () => {
  const layout = computeMatchingLayout({
    hasIllustration: false,
    hasAudio: true,
    headingHeight: 40,
    pairCount: 4,
    cardContentHeights: [140],
    showConfirmButton: true,
  })

  it('hai cột nằm trong canvas, không chồng nhau, chừa khoảng cho đường nối', () => {
    const left = cardRect(layout, 'left', 0)
    const right = cardRect(layout, 'right', 0)

    expect(left.x).toBeGreaterThanOrEqual(0)
    expect(right.x + right.width).toBeLessThanOrEqual(STAGE_WIDTH)
    expect(right.x - (left.x + left.width)).toBeGreaterThanOrEqual(100)
    expect(left.x).toBe(LEFT_X)
    expect(right.x).toBe(RIGHT_X)
  })

  it('thẻ trái và thẻ phải cùng hàng có cùng y và cùng chiều cao', () => {
    for (let i = 0; i < 4; i++) {
      expect(cardRect(layout, 'left', i).y).toBe(cardRect(layout, 'right', i).y)
      expect(cardRect(layout, 'left', i).height).toBe(layout.rowHeight)
    }
  })

  it('điểm bám đường nối nằm giữa cạnh phía trong của thẻ', () => {
    const leftRect = cardRect(layout, 'left', 2)
    const rightRect = cardRect(layout, 'right', 1)
    const leftPoint = lineAnchor(layout, 'left', 2)
    const rightPoint = lineAnchor(layout, 'right', 1)

    expect(leftPoint).toEqual({ x: leftRect.x + leftRect.width, y: leftRect.y + leftRect.height / 2 })
    expect(rightPoint).toEqual({ x: rightRect.x, y: rightRect.y + rightRect.height / 2 })
    expect(rightPoint.x).toBeGreaterThan(leftPoint.x)
  })
})

describe('estimateTextHeight', () => {
  it('chữ ngắn một dòng, chữ dài nhiều dòng hơn, luôn bội số của cỡ chữ', () => {
    const oneLine = estimateTextHeight('chó', 26, 248)
    const many = estimateTextHeight('a'.repeat(100), 26, 152)

    expect(oneLine).toBe(26)
    expect(many).toBeGreaterThan(oneLine * 3)
    expect(many % 26).toBe(0)
  })

  it('chữ rỗng hoặc khung rất hẹp vẫn cho chiều cao hợp lệ', () => {
    expect(estimateTextHeight('', 26, 248)).toBe(26)
    expect(estimateTextHeight('abc', 26, 1)).toBe(3 * 26)
  })

  it('khung hẹp hơn (thẻ có ảnh) cần nhiều dòng hơn khung rộng cho cùng một đoạn chữ', () => {
    const text = 'một đoạn chữ khá dài trong thẻ'

    expect(estimateTextHeight(text, 26, cardTextWidth(true))).toBeGreaterThanOrEqual(
      estimateTextHeight(text, 26, cardTextWidth(false)),
    )
  })
})

describe('cardContentHeight và cardTextWidth', () => {
  it('thẻ có ảnh thì chữ hẹp hơn vì ảnh chiếm bên trái', () => {
    expect(cardTextWidth(true)).toBe(cardTextWidth(false) - CARD_IMAGE_SIZE - CARD_PADDING)
    expect(cardTextWidth(true)).toBeGreaterThan(0)
  })

  it('chiều cao nội dung lấy ảnh hoặc chữ, cái nào cao hơn, cộng đệm hai phía', () => {
    expect(cardContentHeight({ hasImage: false, textHeight: 30 })).toBe(30 + 2 * CARD_PADDING)
    expect(cardContentHeight({ hasImage: true, textHeight: 30 })).toBe(CARD_IMAGE_SIZE + 2 * CARD_PADDING)
    expect(cardContentHeight({ hasImage: true, textHeight: 200 })).toBe(200 + 2 * CARD_PADDING)
  })
})
