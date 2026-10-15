import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { regenerateQuestion } from '../services/aiService'
import { buildMockGameContents } from '../services/mock/gameFixtures'
import { mockApiError } from '../services/mock/mockErrors'
import { getMockGame, resetMockGames } from '../services/mock/mockGames'
import { loginAsTeacher, renderWithProviders } from '../test/renderWithApp'
import type { QuestionDsl } from '../types/game-dsl.types'
import WorkspaceEditor from './WorkspaceEditor'

// A6.3: hộp thoại làm việc với dịch vụ AI do test điều khiển (kết quả không hợp lệ, hủy, Esc, không tự thử lại, khóa khi còn chữ chưa áp).
vi.mock('../services/aiService', () => ({ regenerateQuestion: vi.fn() }))

const mockedRegenerate = vi.mocked(regenerateQuestion)
const GAME_ID = 'mock-game-1'
const SLOW = { timeout: 5000 }
const INVALID = 'Câu AI tạo lại chưa hợp lệ nên chưa được dùng. Câu hiện tại vẫn được giữ nguyên, vui lòng thử lại.'
type Resolved = Awaited<ReturnType<typeof regenerateQuestion>>

const trigger = () => screen.getByRole('button', { name: 'Yêu cầu AI làm lại' })
const dialog = () => screen.getByRole('dialog', { name: 'Yêu cầu AI làm lại câu 1' })
const confirm = () => within(dialog()).getByRole('button', { name: 'Xác nhận tạo lại' })
const listButtons = () => within(screen.getByRole('list', { name: 'Danh sách câu hỏi' })).getAllByRole('button')
const notice = () => document.getElementById('regenerate-notice')!
const goodQuestion = () => ({ ...buildMockGameContents()[0].questions[1], id: 'q1' }) as QuestionDsl

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })

  return { promise, resolve }
}

async function openDialog(user: ReturnType<typeof userEvent.setup>) {
  renderWithProviders(<WorkspaceEditor />, `/workspace/editor?gameId=${GAME_ID}`)
  await screen.findByRole('textbox', { name: /Tên trò chơi/ }, SLOW)
  await user.click(trigger())
  await screen.findByRole('dialog', {}, SLOW)
}

beforeEach(() => {
  vi.stubEnv('VITE_USE_MOCK', 'editor,ai')
  loginAsTeacher()
  resetMockGames()
  mockedRegenerate.mockResolvedValue({ question: goodQuestion(), gameType: 'QUIZ' })
})
afterEach(() => {
  vi.stubEnv('VITE_USE_MOCK', 'none')
  vi.stubEnv('VITE_MOCK_LATENCY_MS', '0')
  localStorage.clear()
  vi.clearAllMocks()
})

describe('yêu cầu gửi đi', () => {
  it('gửi mã game, mã thẻ, loại game, câu hiện hành, gợi ý đúng như đã gõ và giọng đã chọn; KHÔNG tự gọi lại', async () => {
    const user = userEvent.setup()

    await openDialog(user)
    await user.type(within(dialog()).getByRole('textbox', { name: /Gợi ý điều chỉnh/ }), 'làm dễ hơn')
    await user.click(confirm())
    await within(notice()).findByText('Điều chỉnh trò chơi thành công.', {}, SLOW)

    expect(mockedRegenerate).toHaveBeenCalledTimes(1)
    expect(mockedRegenerate).toHaveBeenCalledWith(
      { gameId: GAME_ID, questionId: 'q1', gameType: 'QUIZ', current: getMockGame(GAME_ID).questions[0], feedback: 'làm dễ hơn', voice: 'FEMALE' },
      { signal: expect.any(AbortSignal) },
    )
  })

  it('lỗi thì chỉ một lần gọi; chờ thêm không có lần gọi nào nữa; "Thử lại" là một lần gọi mới', async () => {
    const user = userEvent.setup()

    mockedRegenerate.mockRejectedValueOnce(mockApiError(504, 'AI_GENERATION_TIMEOUT', 'x'))
    await openDialog(user)
    await user.click(confirm())
    await within(dialog()).findByRole('alert', {}, SLOW)
    await new Promise((resolve) => setTimeout(resolve, 150))

    expect(mockedRegenerate).toHaveBeenCalledTimes(1)

    await user.click(within(dialog()).getByRole('button', { name: 'Thử lại' }))
    await within(notice()).findByText('Điều chỉnh trò chơi thành công.', {}, SLOW)
    expect(mockedRegenerate).toHaveBeenCalledTimes(2)
  })
})

describe('câu AI trả về không hợp lệ', () => {
  it('không qua bộ kiểm tra dữ liệu: KHÔNG áp, báo lỗi, câu cũ và "Đã lưu" nguyên vẹn, cho thử lại', async () => {
    const user = userEvent.setup()

    mockedRegenerate.mockResolvedValue({ question: { ...goodQuestion(), points: 0 } as QuestionDsl, gameType: 'QUIZ' })
    await openDialog(user)

    const before = listButtons().map((button) => button.textContent)

    await user.click(confirm())

    expect(await within(dialog()).findByRole('alert', {}, SLOW)).toHaveTextContent(INVALID)
    expect(listButtons().map((button) => button.textContent)).toEqual(before)
    expect(screen.getByText('Đã lưu')).toBeInTheDocument()
    expect(within(dialog()).getByRole('button', { name: 'Thử lại' })).toBeInTheDocument()
    expect(within(notice()).queryByRole('button', { name: 'Hoàn tác' })).not.toBeInTheDocument()
  })

  it('AI trả sai loại game hoặc sai mã thẻ thì cũng không áp', async () => {
    const user = userEvent.setup()

    mockedRegenerate.mockResolvedValueOnce({ question: goodQuestion(), gameType: 'MATCHING' })
    await openDialog(user)
    await user.click(confirm())
    expect(await within(dialog()).findByRole('alert', {}, SLOW)).toHaveTextContent(INVALID)

    mockedRegenerate.mockResolvedValueOnce({ question: { ...goodQuestion(), id: 'q9' } as QuestionDsl, gameType: 'QUIZ' })
    await user.click(within(dialog()).getByRole('button', { name: 'Thử lại' }))
    await waitFor(() => expect(mockedRegenerate).toHaveBeenCalledTimes(2))
    expect(await within(dialog()).findByRole('alert', {}, SLOW)).toHaveTextContent(INVALID)
    expect(screen.getByText('Đã lưu')).toBeInTheDocument()
  })
})

describe('hủy yêu cầu đang chạy', () => {
  it('"Hủy yêu cầu": gửi tín hiệu hủy, mở khóa Lưu, hộp thoại vẫn mở và nhập lại được; kết quả về muộn bị bỏ', async () => {
    const user = userEvent.setup()
    const pending = deferred<Resolved>()

    mockedRegenerate.mockReturnValue(pending.promise)
    await openDialog(user)
    await user.click(confirm())
    await screen.findByText('Đang nhờ AI làm lại câu này', {}, SLOW)
    expect(screen.getByText('Đang áp dụng chỉnh sửa...')).toBeInTheDocument()

    await user.click(within(dialog()).getByRole('button', { name: 'Hủy yêu cầu' }))

    expect(mockedRegenerate.mock.calls[0][1]?.signal?.aborted).toBe(true)
    expect(screen.queryByText('Đang áp dụng chỉnh sửa...')).not.toBeInTheDocument()
    expect(confirm()).toBeInTheDocument()
    // Nút Hủy vừa biến mất: tiêu điểm phải về lại trong hộp (nếu không, Tab/Esc kế tiếp lạc ra trang nền).
    await waitFor(() => expect(confirm()).toHaveFocus())

    pending.resolve({ question: goodQuestion(), gameType: 'QUIZ' })
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(screen.getByText('Đã lưu')).toBeInTheDocument()
    expect(within(dialog()).queryByRole('alert')).not.toBeInTheDocument()
  })

  it('Esc khi đang chạy chỉ hủy yêu cầu (hộp thoại còn); Esc lần nữa mới đóng', async () => {
    const user = userEvent.setup()

    mockedRegenerate.mockReturnValue(deferred<Resolved>().promise)
    await openDialog(user)
    await user.click(confirm())
    await screen.findByText('Đang nhờ AI làm lại câu này', {}, SLOW)

    await user.keyboard('{Escape}')
    expect(mockedRegenerate.mock.calls[0][1]?.signal?.aborted).toBe(true)
    expect(dialog()).toBeInTheDocument()

    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('khi thanh tiến trình hiện, nút "Hủy yêu cầu" nhận tiêu điểm', async () => {
    const user = userEvent.setup()

    mockedRegenerate.mockReturnValue(deferred<Resolved>().promise)
    await openDialog(user)
    await user.click(confirm())

    await waitFor(() => expect(within(dialog()).getByRole('button', { name: 'Hủy yêu cầu' })).toHaveFocus())
  })
})

describe('còn chữ chưa áp vào bản đang soạn', () => {
  it('đang gõ dở (chưa qua bước kiểm tra từ ngữ) thì nút khóa kèm lý do; áp xong thì mở lại', async () => {
    const user = userEvent.setup()

    renderWithProviders(<WorkspaceEditor />, `/workspace/editor?gameId=${GAME_ID}`)
    await screen.findByRole('textbox', { name: /Tên trò chơi/ }, SLOW)
    vi.stubEnv('VITE_MOCK_LATENCY_MS', '400')

    fireEvent.change(screen.getByRole('textbox', { name: /^Nội dung câu hỏi/ }), { target: { value: 'Có mấy quả cam trong hình?' } })

    await waitFor(() => expect(trigger()).toHaveAttribute('aria-disabled', 'true'))
    expect(screen.getByText('Đang áp dụng chỉnh sửa, đợi một chút rồi bấm lại.')).toBeInTheDocument()

    await user.click(trigger())
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await waitFor(() => expect(trigger()).not.toHaveAttribute('aria-disabled'), { timeout: 6000 })
  })
})
