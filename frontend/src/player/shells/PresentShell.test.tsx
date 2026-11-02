import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AUTO_HIDE_MS } from '../present/useAutoHide'
import PresentShell from './PresentShell'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

const renderShell = () =>
  render(
    <PresentShell controls={<button type="button">Câu sau</button>} hint="← → chuyển câu">
      <h1>Đếm con vật</h1>
    </PresentShell>,
  )

describe('PresentShell', () => {
  it('vẽ theo khung 1280×720 và có thanh điều khiển của giáo viên kèm dòng nhắc phím', () => {
    renderShell()

    const stage = screen.getByTestId('present-stage')
    expect(stage.style.width).toBe('1280px')
    expect(stage.style.height).toBe('720px')
    expect(screen.getByRole('group', { name: 'Điều khiển của giáo viên' })).toHaveTextContent('← → chuyển câu')
  })

  it('thanh tự ẩn sau 3 giây (con trỏ ẩn theo); rê chuột thì hiện lại; tiêu điểm trong thanh thì không ẩn', () => {
    renderShell()
    const toolbar = screen.getByRole('group', { name: 'Điều khiển của giáo viên' })

    act(() => vi.advanceTimersByTime(AUTO_HIDE_MS))
    expect(toolbar).toHaveClass('opacity-0')
    expect(screen.getByTestId('present-stage').parentElement).toHaveClass('cursor-none')

    act(() => {
      fireEvent.mouseMove(window)
    })
    expect(toolbar).toHaveClass('opacity-100')

    // Tab bằng bàn phím vào nút: thanh giữ nguyên để giáo viên thấy mình đang ở đâu.
    act(() => {
      fireEvent.keyDown(window, { key: 'Tab' })
      screen.getByRole('button', { name: 'Câu sau' }).focus()
    })
    act(() => vi.advanceTimersByTime(AUTO_HIDE_MS * 2))
    expect(toolbar).toHaveClass('opacity-100')
  })

  it('bấm chuột vào nút thì nút trả tiêu điểm (phím Space sau đó là phím tắt); bấm bằng bàn phím thì giữ tiêu điểm', () => {
    renderShell()
    const button = screen.getByRole('button', { name: 'Câu sau' })

    button.focus()
    fireEvent.click(button, { detail: 1 })
    expect(button).not.toHaveFocus()

    button.focus()
    fireEvent.click(button, { detail: 0 })
    expect(button).toHaveFocus()
  })

  it('bấm chuột vào nút (nút vẫn giữ tiêu điểm) thì thanh vẫn tự ẩn, không kẹt hiện mãi', () => {
    renderShell()
    const toolbar = screen.getByRole('group', { name: 'Điều khiển của giáo viên' })
    const button = screen.getByRole('button', { name: 'Câu sau' })

    act(() => {
      fireEvent.pointerDown(button)
      button.focus()
    })
    act(() => vi.advanceTimersByTime(AUTO_HIDE_MS))
    expect(button).toHaveFocus()
    expect(toolbar).toHaveClass('opacity-0')
  })
})
