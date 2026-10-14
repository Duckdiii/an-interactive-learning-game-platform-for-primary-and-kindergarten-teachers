import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useUnsavedChangesGuard } from './useUnsavedChangesGuard'

function Harness({ active }: { active: boolean }) {
  useUnsavedChangesGuard(active, 'Rời trang?')

  return (
    <div>
      <a href="/workspace">Trong ứng dụng</a>
      <a href={window.location.pathname}>Cùng trang</a>
      <a href="https://example.com/ngoai">Bên ngoài</a>
      <a href="/workspace" target="_blank">
        Tab mới
      </a>
    </div>
  )
}

// jsdom không điều hướng khi bấm liên kết: fireEvent.click trả về false khi sự kiện bị chặn (preventDefault).
const clickAndCheckPrevented = async (name: string) => !fireEvent.click(screen.getByRole('link', { name }))

afterEach(() => vi.restoreAllMocks())

describe('useUnsavedChangesGuard', () => {
  it('có thay đổi chưa lưu: đóng hoặc tải lại tab bị trình duyệt hỏi lại', () => {
    render(<Harness active />)

    const event = new Event('beforeunload', { cancelable: true })

    window.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
  })

  it('không có thay đổi thì không cản gì', async () => {
    const confirm = vi.spyOn(window, 'confirm')

    render(<Harness active={false} />)

    const event = new Event('beforeunload', { cancelable: true })

    window.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(false)
    expect(await clickAndCheckPrevented('Trong ứng dụng')).toBe(false)
    expect(confirm).not.toHaveBeenCalled()
  })

  it('bấm liên kết trong ứng dụng: hỏi xác nhận, chọn Hủy thì chặn điều hướng', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)

    render(<Harness active />)

    expect(await clickAndCheckPrevented('Trong ứng dụng')).toBe(true)
    expect(confirm).toHaveBeenCalledWith('Rời trang?')
  })

  it('chọn đồng ý rời đi thì không chặn', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    render(<Harness active />)

    expect(await clickAndCheckPrevented('Trong ứng dụng')).toBe(false)
  })

  it('liên kết cùng trang, ra ngoài, hoặc mở tab mới thì không hỏi', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)

    render(<Harness active />)

    for (const name of ['Cùng trang', 'Bên ngoài', 'Tab mới']) {
      await clickAndCheckPrevented(name)
    }

    expect(confirm).not.toHaveBeenCalled()
  })

  it('gỡ bộ lắng nghe khi hết thay đổi hoặc rời trang', () => {
    const { unmount } = render(<Harness active />)

    unmount()

    const event = new Event('beforeunload', { cancelable: true })

    window.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(false)
  })
})
