import { fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { postPrepareLesson } from '../api/lessonPreparationApi'
import { suggestGameTypes } from '../services/gameTypeSuggestionService'
import { renderWithProviders } from '../test/renderWithApp'
import CreateGamePage from './CreateGamePage'

vi.mock('../config/mockMode', () => ({ isMock: () => false }))
vi.mock('../api/lessonPreparationApi', () => ({ postPrepareLesson: vi.fn() }))
vi.mock('../services/gameTypeSuggestionService', () => ({ suggestGameTypes: vi.fn() }))

const mockedPrepare = vi.mocked(postPrepareLesson)
const mockedSuggest = vi.mocked(suggestGameTypes)

describe('CreateGamePage lesson preparation review', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedPrepare.mockResolvedValue({ idea: 'Dạy học sinh lớp 1 đếm từ một đến năm.' })
    mockedSuggest.mockResolvedValue([])
  })

  it('prepares a file in real mode and uses only the teacher-confirmed idea for game suggestions', async () => {
    const user = userEvent.setup()
    renderWithProviders(<CreateGamePage />, '/games/new')
    await user.click(screen.getByRole('button', { name: 'Lớp 1' }))
    await user.click(screen.getByRole('button', { name: 'Toán' }))
    const file = new File(['lesson'], 'giao-an.pdf', { type: 'application/pdf' })
    fireEvent.change(document.getElementById('create-file') as HTMLInputElement, { target: { files: [file] } })

    await user.click(screen.getByRole('button', { name: 'Đọc giáo án và chuẩn bị ý tưởng' }))
    const review = await screen.findByLabelText('Ý tưởng bài học đã chuẩn bị')
    expect(review).toHaveValue('Dạy học sinh lớp 1 đếm từ một đến năm.')
    expect(mockedPrepare).toHaveBeenCalledWith({ subject: 'MATH', gradeLevel: 'GRADE_1', file }, expect.any(AbortSignal))
    expect(mockedSuggest).not.toHaveBeenCalled()

    fireEvent.change(review, { target: { value: 'Dạy bé lớp 1 ghép số lượng con vật với các chữ số từ một đến năm.' } })
    await user.click(screen.getByRole('button', { name: 'Xác nhận ý tưởng và chọn kiểu game' }))
    expect(await screen.findByRole('heading', { name: 'AI đề xuất kiểu chơi cho bài này' })).toBeInTheDocument()
    expect(mockedSuggest).toHaveBeenCalledWith({
      idea: 'Dạy bé lớp 1 ghép số lượng con vật với các chữ số từ một đến năm.',
      gradeLevel: 'GRADE_1',
      subject: 'MATH',
    })
  })

  it('asks to expand or clear a short optional note instead of dropping it', async () => {
    const user = userEvent.setup()
    renderWithProviders(<CreateGamePage />, '/games/new')
    await user.click(screen.getByRole('button', { name: 'Lớp 1' }))
    await user.click(screen.getByRole('button', { name: 'Toán' }))
    fireEvent.change(document.getElementById('create-file') as HTMLInputElement, {
      target: { files: [new File(['lesson'], 'giao-an.pdf', { type: 'application/pdf' })] },
    })
    fireEvent.change(screen.getByLabelText('Ý tưởng bài học'), { target: { value: 'Đếm' } })

    await user.click(screen.getByRole('button', { name: 'Đọc giáo án và chuẩn bị ý tưởng' }))

    expect(await screen.findByText(
      'Nếu muốn bổ sung ý tưởng cùng giáo án, hãy nhập ít nhất 10 ký tự hoặc xóa phần ghi chú này.',
    )).toBeInTheDocument()
    expect(mockedPrepare).not.toHaveBeenCalled()
  })

  it('clears a prepared result when the source form changes', async () => {
    const user = userEvent.setup()
    renderWithProviders(<CreateGamePage />, '/games/new')
    await user.click(screen.getByRole('button', { name: 'Lớp 1' }))
    await user.click(screen.getByRole('button', { name: 'Toán' }))
    fireEvent.change(document.getElementById('create-file') as HTMLInputElement, {
      target: { files: [new File(['lesson'], 'giao-an.pdf', { type: 'application/pdf' })] },
    })
    await user.click(screen.getByRole('button', { name: 'Đọc giáo án và chuẩn bị ý tưởng' }))
    expect(await screen.findByLabelText('Ý tưởng bài học đã chuẩn bị')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Ý tưởng bài học'), { target: { value: 'Bổ sung mục tiêu nhận biết số.' } })
    expect(screen.queryByLabelText('Ý tưởng bài học đã chuẩn bị')).toBeNull()
  })
})
