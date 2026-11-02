import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { RegenerateFailure } from '../../utils/regenerateErrors'
import RegenerateQuestionDialog from './RegenerateQuestionDialog'

const noop = vi.fn()

const props = { questionNumber: 2, working: false, mock: true, voiceLabel: 'Giọng nữ', onSubmit: noop, onCancelRequest: noop, onClose: noop }

describe('RegenerateQuestionDialog', () => {
  it('đã báo lỗi 5a: cha vẽ lại với một đối tượng lỗi MỚI (cùng nội dung) không được kéo tiêu điểm về ô gợi ý khi giáo viên đang ở nút khác', async () => {
    const user = userEvent.setup()
    const failure = (): RegenerateFailure => ({ kind: 'unsafe', message: 'Không an toàn' })
    const { rerender } = render(<RegenerateQuestionDialog {...props} failure={failure()} />)

    await user.tab()
    expect(screen.getByRole('button', { name: 'Xác nhận tạo lại' })).toHaveFocus()

    rerender(<RegenerateQuestionDialog {...props} failure={failure()} />)

    expect(screen.getByRole('button', { name: 'Xác nhận tạo lại' })).toHaveFocus()
  })

  it('lỗi 5a lặp lại (đi qua trạng thái đang chạy rồi lỗi lần nữa) thì đưa tiêu điểm về ô gợi ý mỗi lần', () => {
    const unsafe: RegenerateFailure = { kind: 'unsafe', message: 'Không an toàn' }
    const { rerender } = render(<RegenerateQuestionDialog {...props} failure={unsafe} />)

    expect(screen.getByRole('textbox', { name: /Gợi ý điều chỉnh/ })).toHaveFocus()
    screen.getByRole('button', { name: 'Hủy' }).focus()

    rerender(<RegenerateQuestionDialog {...props} working failure={null} />)
    rerender(<RegenerateQuestionDialog {...props} failure={{ ...unsafe }} />)

    expect(screen.getByRole('textbox', { name: /Gợi ý điều chỉnh/ })).toHaveFocus()
  })

  it('lỗi không có nút xác nhận (chưa lưu, có phòng chơi): sau khi thanh tiến trình biến mất, tiêu điểm về nút Đóng', () => {
    const { rerender } = render(<RegenerateQuestionDialog {...props} working failure={null} />)

    rerender(<RegenerateQuestionDialog {...props} failure={{ kind: 'locked', message: 'Có phòng chơi' }} />)

    expect(screen.getByRole('button', { name: 'Đóng' })).toHaveFocus()
    expect(screen.queryByRole('button', { name: 'Xác nhận tạo lại' })).not.toBeInTheDocument()
  })

  it('không có nhãn mô phỏng hay dòng giọng đọc khi dùng AI thật', () => {
    render(<RegenerateQuestionDialog {...props} mock={false} voiceLabel={null} failure={null} />)

    expect(screen.queryByText('Dữ liệu mô phỏng')).not.toBeInTheDocument()
    expect(screen.queryByText(/Giọng đọc thuyết minh/)).not.toBeInTheDocument()
  })
})
