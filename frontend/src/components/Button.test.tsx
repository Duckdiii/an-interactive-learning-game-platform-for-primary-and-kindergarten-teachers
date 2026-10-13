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
