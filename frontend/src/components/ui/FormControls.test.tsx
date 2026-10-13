import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import FileDropZone from './FileDropZone'
import FormField from './FormField'
import Icon from './Icon'
import PasswordInput from './PasswordInput'
import { describedBy } from './formStyles'

describe('describedBy', () => {
  it('nối đúng id gợi ý và lỗi, trả undefined khi không có gì', () => {
    expect(describedBy('x', { hint: true, error: true })).toBe('x-hint x-error')
    expect(describedBy('x', { hint: true })).toBe('x-hint')
    expect(describedBy('x', { error: true })).toBe('x-error')
    expect(describedBy('x', {})).toBeUndefined()
  })
})

describe('FormField', () => {
  it('nhãn gắn với ô nhập, hiện gợi ý và lỗi ngay trong cùng khối', () => {
    render(
      <FormField id="ten" label="Họ và tên" hint="Viết đầy đủ" error="Vui lòng nhập họ và tên">
        <input
          id="ten"
          aria-describedby={describedBy('ten', { hint: true, error: true })}
        />
      </FormField>,
    )

    const input = screen.getByLabelText('Họ và tên')
    expect(input).toHaveAccessibleDescription('Viết đầy đủ Vui lòng nhập họ và tên')
  })

  it('dấu * bắt buộc chỉ để nhìn (aria-hidden), không lẫn vào tên của ô', () => {
    render(
      <FormField id="lop" label="Khối lớp" required>
        <select id="lop" />
      </FormField>,
    )

    expect(screen.getByRole('combobox', { name: /Khối lớp/ })).toBeInTheDocument()
    expect(screen.getByText('*')).toHaveAttribute('aria-hidden', 'true')
  })

  it('không có gợi ý và lỗi thì không dựng đoạn trống', () => {
    const { container } = render(
      <FormField id="a" label="A">
        <input id="a" />
      </FormField>,
    )

    expect(container.querySelectorAll('p')).toHaveLength(0)
  })
})

describe('PasswordInput', () => {
  function Harness() {
    const [value, setValue] = useState('')

    return (
      <PasswordInput id="mk" name="mk" value={value} onChange={setValue} autoComplete="new-password" />
    )
  }

  it('mặc định ẩn mật khẩu, bấm nút thì hiện và đổi tên nút', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const input = document.getElementById('mk') as HTMLInputElement

    await user.type(input, 'bi-mat-123')
    expect(input).toHaveAttribute('type', 'password')

    const show = screen.getByRole('button', { name: 'Hiện mật khẩu' })
    expect(show).toHaveAttribute('aria-pressed', 'false')
    await user.click(show)

    expect(input).toHaveAttribute('type', 'text')
    expect(input).toHaveValue('bi-mat-123')
    expect(screen.getByRole('button', { name: 'Ẩn mật khẩu' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('nút hiện/ẩn không gửi form', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault())
    render(
      <form onSubmit={onSubmit}>
        <Harness />
      </form>,
    )

    await user.click(screen.getByRole('button', { name: 'Hiện mật khẩu' }))

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('hậu tố tên nút giúp phân biệt ô xác nhận', () => {
    render(
      <PasswordInput id="x" name="x" value="" onChange={() => {}} autoComplete="off" toggleSuffix=" xác nhận" />,
    )

    expect(screen.getByRole('button', { name: 'Hiện mật khẩu xác nhận' })).toBeInTheDocument()
  })

  it('invalid đánh dấu aria-invalid để trình đọc màn hình báo lỗi', () => {
    render(<PasswordInput id="x" name="x" value="" onChange={() => {}} autoComplete="off" invalid />)

    expect(document.getElementById('x')).toHaveAttribute('aria-invalid', 'true')
  })
})

describe('FileDropZone', () => {
  const file = new File(['abc'], 'giao-an.pdf', { type: 'application/pdf' })

  it('chưa có tệp: ô chọn tệp chỉ nhận .pdf và .docx và gọi onSelect khi chọn', () => {
    const onSelect = vi.fn()
    const { container } = render(
      <FileDropZone id="f" file={null} onSelect={onSelect} onRemove={() => {}} />,
    )
    const input = container.querySelector('input[type="file"]') as HTMLInputElement

    expect(input).toHaveAttribute('accept', '.pdf,.docx')
    fireEvent.change(input, { target: { files: [file] } })

    expect(onSelect).toHaveBeenCalledWith(file)
  })

  it('kéo thả tệp vào vùng cũng gọi onSelect', () => {
    const onSelect = vi.fn()
    const { container } = render(
      <FileDropZone id="f" file={null} onSelect={onSelect} onRemove={() => {}} />,
    )

    fireEvent.drop(container.querySelector('label') as HTMLElement, {
      dataTransfer: { files: [file] },
    })

    expect(onSelect).toHaveBeenCalledWith(file)
  })

  it('đã có tệp: hiện tên, dung lượng và nút bỏ tệp có tên riêng', async () => {
    const user = userEvent.setup()
    const onRemove = vi.fn()
    render(<FileDropZone id="f" file={file} onSelect={() => {}} onRemove={onRemove} />)

    expect(screen.getByText('giao-an.pdf')).toBeInTheDocument()
    expect(screen.getByText('3 B')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Bỏ tệp: giao-an.pdf' }))

    expect(onRemove).toHaveBeenCalledTimes(1)
  })

  it('chọn tệp thì tiêu điểm chuyển sang nút bỏ tệp; bỏ tệp thì quay lại ô chọn tệp (không rơi về đầu trang)', () => {
    const { rerender } = render(<FileDropZone id="f" file={null} onSelect={() => {}} onRemove={() => {}} />)
    const input = document.getElementById('f') as HTMLInputElement
    input.focus()
    expect(input).toHaveFocus()

    rerender(<FileDropZone id="f" file={file} onSelect={() => {}} onRemove={() => {}} />)
    expect(screen.getByRole('button', { name: 'Bỏ tệp: giao-an.pdf' })).toHaveFocus()

    rerender(<FileDropZone id="f" file={null} onSelect={() => {}} onRemove={() => {}} />)
    expect(document.getElementById('f')).toHaveFocus()
  })

  it('cha tự bỏ tệp khi tiêu điểm đang ở ô khác thì không kéo tiêu điểm đi', () => {
    const { rerender } = render(
      <>
        <input aria-label="ô khác" />
        <FileDropZone id="f" file={file} onSelect={() => {}} onRemove={() => {}} />
      </>,
    )
    screen.getByLabelText('ô khác').focus()

    rerender(
      <>
        <input aria-label="ô khác" />
        <FileDropZone id="f" file={null} onSelect={() => {}} onRemove={() => {}} />
      </>,
    )

    expect(screen.getByLabelText('ô khác')).toHaveFocus()
  })
})

describe('Icon', () => {
  it('luôn là trang trí: aria-hidden và không nhận tiêu điểm', () => {
    const { container } = render(<Icon name="check" />)
    const svg = container.querySelector('svg')

    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(svg).toHaveAttribute('focusable', 'false')
    expect(svg?.querySelectorAll('path').length).toBeGreaterThan(0)
  })
})
