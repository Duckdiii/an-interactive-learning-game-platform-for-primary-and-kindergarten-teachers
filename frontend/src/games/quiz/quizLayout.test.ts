import { describe, expect, it } from 'vitest'
import { AUDIO_BUTTON_HEIGHT, ILLUSTRATION_SIZE } from '../common/mediaLayout'
import { OPTION_BUTTON_HEIGHT, optionGridHeight, optionPosition } from '../common/optionGrid'
import { computeQuizLayout, type QuizLayoutInput } from './quizLayout'

/**
 * Test cho phần tính bố cục. Canvas không kiểm tra được trong jsdom nên mọi lỗi "phần này đè lên phần
 * kia" phải bắt ở đây: lỗi cũ là nút Nghe lại (y=240..304) bị ô đáp án (bắt đầu y=210) che hẳn khi
 * câu hỏi có ảnh.
 */

const COMBOS: QuizLayoutInput[] = []
for (const hasIllustration of [false, true]) {
  for (const hasAudio of [false, true]) {
    for (const optionCount of [2, 3, 4]) {
      for (const questionLength of [1, 20, 80, 200]) {
        COMBOS.push({ hasIllustration, hasAudio, optionCount, questionLength })
      }
    }
  }
}

describe('computeQuizLayout', () => {
  it('xếp các phần nối tiếp, không phần nào đè lên phần phía trên (mọi tổ hợp ảnh/audio/độ dài)', () => {
    for (const input of COMBOS) {
      const layout = computeQuizLayout(input)
      const label = JSON.stringify(input)

      let cursor = 0
      if (layout.illustrationY !== null) {
        expect(layout.illustrationY, label).toBeGreaterThanOrEqual(cursor)
        cursor = layout.illustrationY + ILLUSTRATION_SIZE
      }
      expect(layout.questionY, label).toBeGreaterThanOrEqual(cursor)
      cursor = layout.questionY + layout.questionHeight
      if (layout.audioButtonY !== null) {
        expect(layout.audioButtonY, label).toBeGreaterThanOrEqual(cursor)
        cursor = layout.audioButtonY + AUDIO_BUTTON_HEIGHT
      }
      expect(layout.optionsOriginY, label).toBeGreaterThanOrEqual(cursor)
    }
  })

  it('chiều cao canvas luôn chứa đủ hàng đáp án cuối cùng', () => {
    for (const input of COMBOS) {
      const layout = computeQuizLayout(input)
      const lastIndex = input.optionCount - 1
      const last = optionPosition(lastIndex, layout.optionsOriginY)
      expect(layout.stageHeight, JSON.stringify(input)).toBeGreaterThan(last.y + OPTION_BUTTON_HEIGHT)
    }
  })

  it('chỉ chừa chỗ cho ảnh và nút Nghe lại khi chúng tồn tại', () => {
    const bare = computeQuizLayout({ hasIllustration: false, hasAudio: false, optionCount: 3, questionLength: 20 })
    const full = computeQuizLayout({ hasIllustration: true, hasAudio: true, optionCount: 3, questionLength: 20 })

    expect(bare.illustrationY).toBeNull()
    expect(bare.audioButtonY).toBeNull()
    expect(full.illustrationY).not.toBeNull()
    expect(full.audioButtonY).not.toBeNull()
    expect(full.optionsOriginY).toBeGreaterThan(bare.optionsOriginY)
  })

  it('câu hỏi dài dành thêm chỗ để không đè lên phần bên dưới', () => {
    const short = computeQuizLayout({ hasIllustration: false, hasAudio: true, optionCount: 3, questionLength: 10 })
    const long = computeQuizLayout({ hasIllustration: false, hasAudio: true, optionCount: 3, questionLength: 200 })

    expect(long.questionHeight).toBeGreaterThan(short.questionHeight)
    expect(long.audioButtonY!).toBeGreaterThan(short.audioButtonY!)
  })

  it('có số đo chiều cao thật thì dùng số đó, nút Nghe lại nằm dưới vùng chữ dù chữ cao hơn ước lượng', () => {
    const base = { hasIllustration: false, hasAudio: true, optionCount: 3, questionLength: 200 }
    const estimated = computeQuizLayout(base)
    const measured = computeQuizLayout({ ...base, measuredQuestionHeight: 400 })

    expect(measured.questionHeight).toBeGreaterThan(estimated.questionHeight)
    expect(measured.audioButtonY!).toBeGreaterThanOrEqual(measured.questionY + 400)
    expect(measured.optionsOriginY).toBeGreaterThanOrEqual(measured.audioButtonY! + AUDIO_BUTTON_HEIGHT)
  })

  it('số đo nhỏ vẫn dành tối thiểu một dòng; số đo null thì quay về ước lượng', () => {
    const base = { hasIllustration: false, hasAudio: false, optionCount: 2, questionLength: 10 }
    const estimated = computeQuizLayout(base)

    expect(computeQuizLayout({ ...base, measuredQuestionHeight: 5 }).questionHeight).toBeGreaterThanOrEqual(40)
    expect(computeQuizLayout({ ...base, measuredQuestionHeight: null })).toEqual(estimated)
  })

  it('mọi tổ hợp vẫn không đè nhau khi dùng số đo thật', () => {
    for (const input of COMBOS) {
      const layout = computeQuizLayout({ ...input, measuredQuestionHeight: 37 * (1 + (input.questionLength % 9)) })
      const label = JSON.stringify(input)
      const afterQuestion = layout.questionY + layout.questionHeight

      if (layout.audioButtonY !== null) {
        expect(layout.audioButtonY, label).toBeGreaterThanOrEqual(afterQuestion)
        expect(layout.optionsOriginY, label).toBeGreaterThanOrEqual(layout.audioButtonY + AUDIO_BUTTON_HEIGHT)
      } else {
        expect(layout.optionsOriginY, label).toBeGreaterThanOrEqual(afterQuestion)
      }
    }
  })

  it('vùng chạm của nút Nghe lại và ô đáp án đều từ 64px trở lên (quy ước UX)', () => {
    expect(AUDIO_BUTTON_HEIGHT).toBeGreaterThanOrEqual(64)
    expect(OPTION_BUTTON_HEIGHT).toBeGreaterThanOrEqual(64)
  })
})

describe('optionGrid', () => {
  it('lưới 2 cột: ô 0,1 cùng hàng, ô 2 xuống hàng mới', () => {
    const a = optionPosition(0, 100)
    const b = optionPosition(1, 100)
    const c = optionPosition(2, 100)

    expect(a.y).toBe(b.y)
    expect(b.x).toBeGreaterThan(a.x)
    expect(c.y).toBeGreaterThan(a.y)
    expect(c.x).toBe(a.x)
  })

  it('chiều cao lưới theo số hàng', () => {
    expect(optionGridHeight(0)).toBe(0)
    expect(optionGridHeight(2)).toBe(OPTION_BUTTON_HEIGHT)
    expect(optionGridHeight(3)).toBeGreaterThan(optionGridHeight(2))
    expect(optionGridHeight(4)).toBe(optionGridHeight(3))
  })
})
