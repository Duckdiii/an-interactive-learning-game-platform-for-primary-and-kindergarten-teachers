import { afterEach, describe, expect, it } from 'vitest'
import { isPlainShortcut } from './keyboard'

const key = (init: KeyboardEventInit = {}) => new KeyboardEvent('keydown', { key: '1', ...init })

afterEach(() => document.body.replaceChildren())

describe('isPlainShortcut', () => {
  it('phím số thường là phím tắt; có Ctrl/Alt/Meta hoặc đang gõ trong ô nhập thì không', () => {
    expect(isPlainShortcut(key())).toBe(true)
    expect(isPlainShortcut(key({ ctrlKey: true }))).toBe(false)

    const input = document.createElement('input')
    document.body.append(input)
    const event = key()

    Object.defineProperty(event, 'target', { value: input })
    expect(isPlainShortcut(event)).toBe(false)
  })

  it('trang có khung xem trước của trình soạn thảo (data-game-hotkeys-off) thì renderer không nhận phím, kể cả khi tiêu điểm ở body', () => {
    const frame = document.createElement('div')

    frame.setAttribute('data-game-hotkeys-off', '')
    document.body.append(frame)

    expect(isPlainShortcut(key())).toBe(false)
  })
})
