import { fireEvent, render, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { usePresentKeys } from './usePresentKeys'

describe('usePresentKeys', () => {
  it('gọi đúng hàm theo phím; phím chữ không phân biệt hoa thường; chặn hành vi mặc định khi đã xử lý', () => {
    const next = vi.fn()
    const replay = vi.fn()

    renderHook(() => usePresentKeys({ ArrowRight: next, r: replay }))

    const event = new KeyboardEvent('keydown', { key: 'ArrowRight', cancelable: true })

    window.dispatchEvent(event)
    fireEvent.keyDown(window, { key: 'R' })

    expect(next).toHaveBeenCalledTimes(1)
    expect(event.defaultPrevented).toBe(true)
    expect(replay).toHaveBeenCalledTimes(1)
  })

  it('bỏ qua khi giữ phím (lặp), có Ctrl/Alt/Meta, đang gõ trong ô nhập, hoặc Space/Enter trên nút (nút tự bấm)', () => {
    const start = vi.fn()

    renderHook(() => usePresentKeys({ ' ': start, Enter: start }))
    const { getByRole } = render(
      <>
        <input aria-label="ô" />
        <button type="button">nút</button>
      </>,
    )

    fireEvent.keyDown(window, { key: ' ', repeat: true })
    fireEvent.keyDown(window, { key: ' ', ctrlKey: true })
    fireEvent.keyDown(getByRole('textbox'), { key: ' ' })
    fireEvent.keyDown(getByRole('button'), { key: ' ' })
    fireEvent.keyDown(getByRole('button'), { key: 'Enter' })
    expect(start).not.toHaveBeenCalled()

    fireEvent.keyDown(document.body, { key: ' ' })
    expect(start).toHaveBeenCalledTimes(1)
  })

  it('hàm trả false thì không chặn hành vi mặc định', () => {
    renderHook(() => usePresentKeys({ ' ': () => false }))
    const event = new KeyboardEvent('keydown', { key: ' ', cancelable: true })

    window.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
  })
})
