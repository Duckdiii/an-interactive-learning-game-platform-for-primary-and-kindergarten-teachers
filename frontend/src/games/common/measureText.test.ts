import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * Mock `konva` vì jsdom không có Canvas thật (Konva.Text cần `measureText`); chỉ kiểm tra hàm bọc
 * truyền đúng tham số, đọc đúng chiều cao, dọn node, và không ném lỗi khi đo thất bại.
 */
const textCtor = vi.fn()
const destroyMock = vi.fn()
let nextHeight: number | (() => number) = 120

vi.mock('konva', () => ({
  default: {
    Text: class {
      constructor(options: unknown) {
        textCtor(options)
      }
      height() {
        return typeof nextHeight === 'function' ? nextHeight() : nextHeight
      }
      destroy = destroyMock
    },
  },
}))

import { measureWrappedTextHeight } from './measureText'

describe('measureWrappedTextHeight', () => {
  afterEach(() => {
    textCtor.mockClear()
    destroyMock.mockClear()
    nextHeight = 120
  })

  it('tạo node Text đúng chữ, cỡ chữ, độ rộng; trả chiều cao và huỷ node tạm', () => {
    const height = measureWrappedTextHeight({ text: 'Có mấy con mèo?', fontSize: 32, width: 720 })

    expect(height).toBe(120)
    expect(textCtor).toHaveBeenCalledWith({ text: 'Có mấy con mèo?', fontSize: 32, width: 720 })
    expect(destroyMock).toHaveBeenCalledTimes(1)
  })

  it('trả null khi Konva ném lỗi (không đo được, ví dụ không có Canvas)', () => {
    nextHeight = () => {
      throw new Error('measureText is not available')
    }

    expect(measureWrappedTextHeight({ text: 'x', fontSize: 32, width: 720 })).toBeNull()
  })

  it('trả null khi chiều cao đo được không hợp lệ (0 hoặc NaN)', () => {
    nextHeight = 0
    expect(measureWrappedTextHeight({ text: 'x', fontSize: 32, width: 720 })).toBeNull()

    nextHeight = Number.NaN
    expect(measureWrappedTextHeight({ text: 'x', fontSize: 32, width: 720 })).toBeNull()
  })
})
