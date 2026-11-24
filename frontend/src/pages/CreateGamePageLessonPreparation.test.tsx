import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import axiosInstance from '../api/axiosInstance'
import { rankGameTypes, suggestGameTypes } from '../services/gameTypeSuggestionService'
import { renderWithProviders } from '../test/renderWithApp'
import CreateGamePage from './CreateGamePage'

vi.mock('../services/gameTypeSuggestionService', async (original) => ({
  ...(await original<typeof import('../services/gameTypeSuggestionService')>()),
  suggestGameTypes: vi.fn(),
}))
vi.mock('../services/understandingService', () => ({ understandGame: vi.fn() }))

const post = vi.spyOn(axiosInstance, 'post')
const suggest = vi.mocked(suggestGameTypes)

beforeEach(() => {
  vi.stubEnv('VITE_USE_MOCK', 'none')
  post.mockReset()
  post.mockResolvedValue({ data: { data: { idea: 'Dạy bé nhận biết hình vuông và hình tròn.' } } } as never)
  suggest.mockReset()
  suggest.mockImplementation(async (input) => rankGameTypes(input))
})

afterEach(() => vi.unstubAllEnvs())

describe('FR-02 chuẩn bị ý tưởng từ giáo án', () => {
  it('gửi giáo án cho backend, cho giáo viên sửa và chỉ đề xuất game sau khi giáo viên xác nhận', async () => {
    const user = userEvent.setup()
    renderWithProviders(<CreateGamePage />, '/games/new')

    await user.click(screen.getByRole('button', { name: 'Lớp 1' }))
    await user.click(screen.getByRole('button', { name: 'Toán' }))
    fireEvent.change(screen.getByLabelText('Ý tưởng bài học'), {
      target: { value: 'Dạy các hình cơ bản cho học sinh lớp 1' },
    })
    const file = new File(['lesson'], 'giao-an.pdf', { type: 'application/pdf' })
    fireEvent.change(document.getElementById('create-file') as HTMLInputElement, { target: { files: [file] } })

    await user.click(screen.getByRole('button', { name: 'Để AI soạn giúp' }))

    await waitFor(() => expect(post).toHaveBeenCalled())
    expect(post.mock.calls[0][0]).toBe('/games/prepare')
    expect(post.mock.calls[0][1]).toBeInstanceOf(FormData)
    expect((post.mock.calls[0][1] as FormData).get('file')).toBe(file)
    expect(suggest).not.toHaveBeenCalled()
    expect(screen.getByRole('heading', { level: 1, name: 'Xem lại ý tưởng AI chuẩn bị' })).toBeInTheDocument()

    const prepared = screen.getByLabelText('Ý tưởng bài học đã chuẩn bị')
    fireEvent.change(prepared, { target: { value: 'Dạy bé phân biệt hình vuông và hình tròn trong lớp học.' } })
    await user.click(screen.getByRole('button', { name: 'Xác nhận ý tưởng và chọn kiểu chơi' }))

    await screen.findByRole('heading', { name: 'AI đề xuất kiểu chơi cho bài này' })
    expect(suggest).toHaveBeenCalledWith({
      idea: 'Dạy bé phân biệt hình vuông và hình tròn trong lớp học.',
      gradeLevel: 'GRADE_1',
      subject: 'MATH',
    })
  })

  it('giữ người dùng ở bước nhập nếu backend chuẩn bị giáo án báo lỗi', async () => {
    const user = userEvent.setup()
    renderWithProviders(<CreateGamePage />, '/games/new')
    post.mockRejectedValueOnce(new Error('prepare failed'))
    await user.click(screen.getByRole('button', { name: 'Lớp 1' }))
    await user.click(screen.getByRole('button', { name: 'Toán' }))
    fireEvent.change(screen.getByLabelText('Ý tưởng bài học'), { target: { value: 'Bài học về các hình cơ bản' } })
    fireEvent.change(document.getElementById('create-file') as HTMLInputElement, {
      target: { files: [new File(['lesson'], 'giao-an.pdf', { type: 'application/pdf' })] },
    })

    await user.click(screen.getByRole('button', { name: 'Để AI soạn giúp' }))

    await screen.findByText(/Chưa đọc được giáo án/)
    expect(screen.getByLabelText('Ý tưởng bài học')).toHaveValue('Bài học về các hình cơ bản')
    expect(screen.getByText('Đính kèm giáo án (.docx, .pdf)')).toBeInTheDocument()
    expect(suggest).not.toHaveBeenCalled()
  })

  it('không gửi trùng yêu cầu Gemini khi giáo viên bấm nút chuẩn bị liên tiếp', async () => {
    const user = userEvent.setup()
    renderWithProviders(<CreateGamePage />, '/games/new')
    await user.click(screen.getByRole('button', { name: 'Lớp 1' }))
    await user.click(screen.getByRole('button', { name: 'Toán' }))
    fireEvent.change(screen.getByLabelText('Ý tưởng bài học'), { target: { value: 'Bài học về các hình cơ bản' } })
    fireEvent.change(document.getElementById('create-file') as HTMLInputElement, {
      target: { files: [new File(['lesson'], 'giao-an.pdf', { type: 'application/pdf' })] },
    })
    const form = screen.getByLabelText('Ý tưởng bài học').closest('form')
    if (!form) throw new Error('Create game form not found')
    fireEvent.submit(form)
    fireEvent.submit(form)

    await waitFor(() => expect(post).toHaveBeenCalled())
    expect(post).toHaveBeenCalledTimes(1)
  })

})
