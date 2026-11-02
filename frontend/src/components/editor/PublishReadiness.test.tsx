import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ValidationIssue } from '../../utils/gameValidation'
import PublishReadiness from './PublishReadiness'

const issue = (questionIndex: number | null, message: string): ValidationIssue =>
  ({ questionIndex, field: 'x', code: 'required', message }) as ValidationIssue

const renderBlock = (issues: ValidationIssue[], questionCount = 3) => {
  const onSelectQuestion = vi.fn()
  const onSelectGameInfo = vi.fn()

  render(<PublishReadiness issues={issues} questionCount={questionCount} onSelectQuestion={onSelectQuestion} onSelectGameInfo={onSelectGameInfo} />)

  return { onSelectQuestion, onSelectGameInfo }
}

describe('PublishReadiness', () => {
  it('không còn lỗi: báo cả N câu đã sẵn sàng', () => {
    renderBlock([])

    expect(screen.getByRole('heading', { name: 'Sẵn sàng xuất bản?' })).toBeInTheDocument()
    expect(screen.getByText('Cả 3 câu đã sẵn sàng')).toBeInTheDocument()
  })

  it('liệt kê câu đạt, mỗi câu lỗi một dòng (chỉ lỗi đầu tiên), theo thứ tự câu; bấm thì tới đúng câu', async () => {
    const user = userEvent.setup()
    const { onSelectQuestion } = renderBlock([issue(2, 'Câu 3: Hai đáp án trùng nhau'), issue(2, 'Câu 3: Lỗi thứ hai'), issue(0, 'Câu 1: Thiếu đáp án đúng')])

    expect(screen.getByText('Câu 2 đã sẵn sàng')).toBeInTheDocument()
    const buttons = screen.getAllByRole('button')

    expect(buttons.map((button) => button.textContent)).toEqual(['Câu 1: Thiếu đáp án đúng', 'Câu 3: Hai đáp án trùng nhau'])
    await user.click(buttons[1])
    expect(onSelectQuestion).toHaveBeenCalledWith(2)
  })

  it('chưa có câu nào: báo rõ thay vì để khối trống', () => {
    renderBlock([], 0)

    expect(screen.getByText('Chưa có câu hỏi nào')).toBeInTheDocument()
    expect(screen.queryByText(/đã sẵn sàng/)).toBeNull()
  })

  it('lỗi ở thông tin trò chơi có dòng riêng dẫn tới ô tên', async () => {
    const user = userEvent.setup()
    const { onSelectGameInfo } = renderBlock([issue(null, 'Trò chơi: Tên trò chơi không được để trống')])

    await user.click(screen.getByRole('button', { name: 'Trò chơi: Tên trò chơi không được để trống' }))
    expect(onSelectGameInfo).toHaveBeenCalled()
    expect(screen.getByText('Câu 1, 2, 3 đã sẵn sàng')).toBeInTheDocument()
  })
})
