import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import Button from './Button'
import ButtonLink from './ButtonLink'
import { buttonClass } from './buttonStyles'

describe('nút dùng chung', () => {
  it('nút và liên kết dạng nút có cùng kích thước tối thiểu 48px và chữ 16px', () => {
    for (const variant of ['primary', 'secondary'] as const) {
      const classes = buttonClass(variant)
      expect(classes).toContain('min-h-12')
      expect(classes).toContain('text-base')
    }
  })

  it('primary dùng màu thương hiệu, secondary có viền', () => {
    expect(buttonClass('primary')).toContain('bg-brand')
    expect(buttonClass('secondary')).toContain('border-2')
    expect(buttonClass('secondary')).not.toContain('bg-brand ')
  })

  it('mỗi variant có nền/đế đúng, ghost không có đế', () => {
    expect(buttonClass('primary')).toContain('shadow-base-brand')
    expect(buttonClass('accent')).toContain('bg-sun')
    expect(buttonClass('accent')).toContain('shadow-base-sun')
    expect(buttonClass('secondary')).toContain('bg-surface')
    expect(buttonClass('ghost')).not.toContain('shadow-base')
    expect(buttonClass('ghost')).not.toContain('bg-brand ')
  })

  it("size='lg' có min-h-14, mặc định min-h-12", () => {
    expect(buttonClass('primary', false, 'lg')).toContain('min-h-14')
    expect(buttonClass('primary')).toContain('min-h-12')
  })

  it('disabled bỏ đế và không dịch khi nhấn', () => {
    expect(buttonClass('primary')).toContain('disabled:shadow-none')
    expect(buttonClass('primary')).toContain('disabled:active:translate-y-0')
  })

  it('fullWidth thêm w-full, mặc định thì không', () => {
    expect(buttonClass('primary', true)).toContain('w-full')
    expect(buttonClass('primary')).not.toContain('w-full')
  })

  it('Button gọi onClick và bị khóa khi disabled', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    const { rerender } = render(<Button onClick={onClick}>Lưu</Button>)

    await user.click(screen.getByRole('button', { name: 'Lưu' }))
    expect(onClick).toHaveBeenCalledTimes(1)

    rerender(
      <Button onClick={onClick} disabled>
        Lưu
      </Button>,
    )
    await user.click(screen.getByRole('button', { name: 'Lưu' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('ButtonLink là liên kết thật tới đúng đường dẫn, cùng kiểu với nút', () => {
    render(
      <MemoryRouter>
        <ButtonLink to="/games/new" variant="secondary">
          Tạo game mới
        </ButtonLink>
      </MemoryRouter>,
    )

    const link = screen.getByRole('link', { name: 'Tạo game mới' })
    expect(link).toHaveAttribute('href', '/games/new')
    expect(link.className).toContain('border-2')
  })
})
