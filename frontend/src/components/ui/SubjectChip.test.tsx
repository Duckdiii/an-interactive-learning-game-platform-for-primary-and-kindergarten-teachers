import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import SubjectChip from './SubjectChip'

describe('SubjectChip', () => {
  it('không có onClick: là nhãn (không phải nút), chữ là tên môn, viền theo màu môn', () => {
    render(<SubjectChip subject="VIETNAMESE" />)

    const chip = screen.getByText('Tiếng Việt')

    expect(chip.tagName).toBe('SPAN')
    expect(screen.queryByRole('button')).toBeNull()
    expect(chip).toHaveClass('border-viet-mark', 'bg-viet-soft', 'text-viet-ink')
  })

  it('label thay chữ mặc định', () => {
    render(<SubjectChip subject="MATH" label="Toán · Lớp 1" />)

    expect(screen.getByText('Toán · Lớp 1')).toHaveClass('border-math-mark')
  })

  it('có onClick: là nút bật/tắt, aria-pressed theo selected, nền đậm khi chọn, bấm gọi onClick', () => {
    const onClick = vi.fn()
    const { rerender } = render(<SubjectChip subject="ENGLISH" onClick={onClick} />)
    const button = screen.getByRole('button', { name: 'Tiếng Anh' })

    expect(button).toHaveAttribute('aria-pressed', 'false')
    expect(button).toHaveClass('bg-eng-soft')
    fireEvent.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)

    rerender(<SubjectChip subject="ENGLISH" onClick={onClick} selected />)

    expect(button).toHaveAttribute('aria-pressed', 'true')
    expect(button).toHaveClass('bg-eng-ink', 'text-white')
    expect(button).not.toHaveClass('bg-eng-soft')
  })
})
