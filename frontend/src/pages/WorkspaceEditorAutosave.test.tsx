import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getMockGame, resetMockGames } from '../services/mock/mockGames'
import { setMockScenario } from '../services/mock/mockRuntime'
import { AUTOSAVE_WAIT, autosaved } from '../test/autosave'
import { loginAsTeacher, renderWithProviders } from '../test/renderWithApp'
import WorkspaceEditor from './WorkspaceEditor'

// P3.8: thanh trên cùng và nhãn tự lưu. mock-game-1 là Trắc nghiệm 3 câu, mock-game-2 là bản nháp.
const QUIZ_ID = 'mock-game-1'
const DRAFT_ID = 'mock-game-2'
const titleBox = () => screen.getByRole('textbox', { name: /Tên trò chơi/ })

async function openLoaded(gameId: string) {
  renderWithProviders(<WorkspaceEditor />, `/workspace/editor?gameId=${gameId}`)
  await screen.findByRole('textbox', { name: /Tên trò chơi/ })
}

beforeEach(() => {
  vi.stubEnv('VITE_USE_MOCK', 'editor')
  loginAsTeacher()
  resetMockGames()
})
afterEach(() => {
  vi.stubEnv('VITE_USE_MOCK', 'none')
  setMockScenario('normal')
  localStorage.clear()
})

describe('trình soạn thảo: thanh trên cùng', () => {
  it('có nút quay lại, chip môn và kiểu chơi, nút Chơi thử / Xuất bản; không còn nút Lưu bản nháp', async () => {
    await openLoaded(QUIZ_ID)

    expect(screen.getByRole('link', { name: 'Quay lại kệ trò chơi' })).toHaveAttribute('href', '/workspace')
    expect(screen.getByText('Trắc nghiệm · 3 câu')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Chơi thử' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Xuất bản/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Lưu bản nháp' })).not.toBeInTheDocument()
    expect(screen.getByText('Đã tự lưu').closest('[role="status"]')).not.toBeNull()
  })
})

describe('trình soạn thảo: nhãn tự lưu', () => {
  it('sửa thì "Sắp tự lưu...", rồi tự lưu và quay lại "Đã tự lưu" (đúng một lần ghi vào kho)', async () => {
    const user = userEvent.setup()

    await openLoaded(DRAFT_ID)
    await user.type(titleBox(), '!')
    expect(screen.getByText('Sắp tự lưu...')).toBeInTheDocument()

    await autosaved()
    expect(getMockGame(DRAFT_ID).metadata.title).toMatch(/!$/)
  })

  it('còn lỗi kiểm tra: báo số lỗi, không lưu, "Xem lỗi" đưa tiêu điểm tới ô lỗi đầu tiên', async () => {
    const user = userEvent.setup()
    const before = getMockGame(DRAFT_ID).metadata.title

    await openLoaded(DRAFT_ID)
    await user.clear(titleBox())

    expect(screen.getByText('Chưa tự lưu: còn 1 lỗi cần sửa')).toBeInTheDocument()
    // Đợi quá thời gian tự lưu: kho vẫn nguyên.
    await new Promise((resolve) => setTimeout(resolve, 2500))
    expect(getMockGame(DRAFT_ID).metadata.title).toBe(before)

    await user.click(screen.getByRole('button', { name: 'Xem lỗi' }))
    await waitFor(() => expect(titleBox()).toHaveFocus())
    expect(titleBox()).toHaveAttribute('aria-invalid', 'true')
  })

  it('lưu lỗi: báo "Chưa lưu được" kèm "Thử lại", giữ nội dung; bấm Thử lại thì lưu được', async () => {
    const user = userEvent.setup()

    await openLoaded(DRAFT_ID)
    setMockScenario('error')
    await user.type(titleBox(), ' (bản 2)')

    expect(await screen.findByText('Chưa lưu được', {}, AUTOSAVE_WAIT)).toBeInTheDocument()
    expect(titleBox()).toHaveValue(`${getMockGame(DRAFT_ID).metadata.title} (bản 2)`)

    setMockScenario('normal')
    await user.click(screen.getByRole('button', { name: 'Thử lại' }))
    await autosaved()
    expect(getMockGame(DRAFT_ID).metadata.title).toMatch(/\(bản 2\)$/)
  })
})
