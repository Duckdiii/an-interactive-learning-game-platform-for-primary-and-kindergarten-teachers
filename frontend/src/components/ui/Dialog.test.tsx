import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import Dialog from './Dialog'

function Harness({ onEscape = vi.fn(), initialFocusId }: { onEscape?: () => void; initialFocusId?: string }) {
  const [open, setOpen] = useState(false)

  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        Mở
      </button>
      <button type="button">Nút nền</button>
      {open ? (
        <Dialog
          title="Hộp thử"
          initialFocusId={initialFocusId}
          onEscape={() => {
            onEscape()
            setOpen(false)
          }}
        >
          <input aria-label="Ô đầu" id="first" />
          <input aria-label="Ô giữa" id="middle" />
          <button type="button">Nút cuối</button>
          <button type="button" disabled>
            Nút khóa
          </button>
        </Dialog>
      ) : null}
    </div>
  )
}

describe('Dialog', () => {
  it('là hộp thoại chặn có tên: role dialog, aria-modal, nhãn theo tiêu đề; vẽ ra body', async () => {
    const user = userEvent.setup()

    render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Mở' }))

    const dialog = screen.getByRole('dialog', { name: 'Hộp thử' })

    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog.parentElement?.parentElement).toBe(document.body)
  })

  it('tiêu điểm vào ô đầu tiên (hoặc ô được chỉ định) khi mở', async () => {
    const user = userEvent.setup()
    const first = render(<Harness />)

    await user.click(screen.getByRole('button', { name: 'Mở' }))
    expect(screen.getByRole('textbox', { name: 'Ô đầu' })).toHaveFocus()
    first.unmount()

    render(<Harness initialFocusId="middle" />)
    await user.click(screen.getByRole('button', { name: 'Mở' }))
    expect(screen.getByRole('textbox', { name: 'Ô giữa' })).toHaveFocus()
  })

  it('Tab quay vòng trong hộp (bỏ qua nút khóa), Shift+Tab đi ngược và cũng quay vòng; tiêu điểm không thoát ra nút nền', async () => {
    const user = userEvent.setup()

    render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Mở' }))

    await user.tab()
    expect(screen.getByRole('textbox', { name: 'Ô giữa' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Nút cuối' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('textbox', { name: 'Ô đầu' })).toHaveFocus()

    await user.tab({ shift: true })
    expect(screen.getByRole('button', { name: 'Nút cuối' })).toHaveFocus()
  })

  it('Esc gọi onEscape; bấm ra ngoài vùng tối KHÔNG đóng', async () => {
    const user = userEvent.setup()
    const onEscape = vi.fn()

    render(<Harness onEscape={onEscape} />)
    await user.click(screen.getByRole('button', { name: 'Mở' }))

    fireEvent.mouseDown(document.body)
    fireEvent.click(document.body)
    expect(onEscape).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(onEscape).toHaveBeenCalledTimes(1)
  })

  it('tiêu điểm rơi ra ngoài hộp (ví dụ nút đang giữ tiêu điểm vừa bị gỡ): Esc vẫn đóng được và Tab kéo tiêu điểm trở lại vào hộp', async () => {
    const user = userEvent.setup()
    const onEscape = vi.fn()

    render(<Harness onEscape={onEscape} />)
    await user.click(screen.getByRole('button', { name: 'Mở' }))
    ;(document.activeElement as HTMLElement).blur()
    expect(document.body).toHaveFocus()

    await user.tab()
    expect(screen.getByRole('textbox', { name: 'Ô đầu' })).toHaveFocus()

    ;(document.activeElement as HTMLElement).blur()
    await user.tab({ shift: true })
    expect(screen.getByRole('button', { name: 'Nút cuối' })).toHaveFocus()

    ;(document.activeElement as HTMLElement).blur()
    await user.keyboard('{Escape}')
    expect(onEscape).toHaveBeenCalledTimes(1)
  })

  it('Esc khi đang gõ bằng bộ gõ (isComposing) hoặc giữ phím (repeat) không đóng hộp', async () => {
    const user = userEvent.setup()
    const onEscape = vi.fn()

    render(<Harness onEscape={onEscape} />)
    await user.click(screen.getByRole('button', { name: 'Mở' }))

    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Ô đầu' }), { key: 'Escape', isComposing: true })
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Ô đầu' }), { key: 'Escape', repeat: true })
    expect(onEscape).not.toHaveBeenCalled()

    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Ô đầu' }), { key: 'Escape' })
    expect(onEscape).toHaveBeenCalledTimes(1)
  })

  it('đóng thì trả tiêu điểm về nút đã mở và trả lại cuộn của trang nền; đang mở thì trang nền bị khóa cuộn', async () => {
    const user = userEvent.setup()

    document.body.style.overflow = 'auto'
    render(<Harness />)

    const opener = screen.getByRole('button', { name: 'Mở' })

    await user.click(opener)
    expect(document.body.style.overflow).toBe('hidden')

    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(opener).toHaveFocus()
    expect(document.body.style.overflow).toBe('auto')
    document.body.style.overflow = ''
  })
})
