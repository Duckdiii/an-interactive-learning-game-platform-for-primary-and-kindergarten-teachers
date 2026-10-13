import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ErrorNotice from './ErrorNotice'

describe('ErrorNotice', () => {
  it('là vùng alert hiển thị câu thông báo', () => {
    render(<ErrorNotice message="Hãy thử lại sau ít phút." />)

    expect(screen.getByRole('alert')).toHaveTextContent('Hãy thử lại sau ít phút.')
  })

  it('có tiêu đề và nút hành động khi được truyền vào', () => {
    render(
      <ErrorNotice
        title="Không thể tải"
        message="Mất kết nối."
        action={<button type="button">Thử lại</button>}
      />,
    )
    const alert = screen.getByRole('alert')

    expect(within(alert).getByText('Không thể tải')).toBeInTheDocument()
    expect(within(alert).getByRole('button', { name: 'Thử lại' })).toBeInTheDocument()
  })

  it('không có tiêu đề và hành động thì không dựng thêm khối trống', () => {
    const { container } = render(<ErrorNotice message="Chỉ có câu." />)

    expect(container.querySelectorAll('p')).toHaveLength(1)
    expect(container.querySelector('button')).toBeNull()
  })
})
