import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { postRegenerateGame } from '../api/gamesApi'
import { regenerateQuestion } from '../services/aiService'
import { buildMockGameContents } from '../services/mock/gameFixtures'
import { mockApiError } from '../services/mock/mockErrors'
import { createMockGame, getMockGame, resetMockGames } from '../services/mock/mockGames'
import { loginAsTeacher, renderWithProviders } from '../test/renderWithApp'
import type { QuestionDsl, VisualClozeImageQuestionDsl } from '../types/game-dsl.types'
import WorkspaceEditor from './WorkspaceEditor'

// A6.3: hộp thoại làm việc với dịch vụ AI do test điều khiển (kết quả không hợp lệ, hủy, Esc, không tự thử lại, khóa khi còn chữ chưa áp).
vi.mock('../api/gamesApi', async (importOriginal) => ({
  ...await importOriginal<typeof import('../api/gamesApi')>(),
  postRegenerateGame: vi.fn(),
}))
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

it('xem trước toàn bộ game và chỉ lưu khi nhấn Lưu bản nháp', async () => {
  vi.stubEnv('VITE_USE_MOCK', 'editor')
  const original = getMockGame(GAME_ID)
  vi.mocked(postRegenerateGame).mockResolvedValue({
    ...original,
    metadata: { ...original.metadata, title: 'Bản AI xem trước' },
  })
  const user = userEvent.setup()
  renderWithProviders(<WorkspaceEditor />, `/workspace/editor?gameId=${GAME_ID}`)
  await user.click(await screen.findByRole('button', { name: 'Tạo lại toàn bộ trò chơi' }, SLOW))
  const confirmation = screen.getByRole('dialog', { name: 'Tạo lại toàn bộ trò chơi' })
  await user.selectOptions(within(confirmation).getByRole('combobox', { name: 'Giọng đọc' }), 'MALE')
  await user.click(within(confirmation).getByRole('button', { name: 'Xác nhận làm lại tất cả' }))
  await screen.findByRole('heading', { name: 'Bản AI xem trước' }, SLOW)
  expect(postRegenerateGame).toHaveBeenCalledWith(GAME_ID, '', 'MALE', expect.any(AbortSignal))
  expect(getMockGame(GAME_ID).metadata.title).toBe(original.metadata.title)
  await user.click(screen.getByRole('button', { name: 'Lưu bản nháp' }))
  await waitFor(() => expect(getMockGame(GAME_ID).metadata.title).toBe('Bản AI xem trước'))
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

it('Điền hình: đợi ảnh mới được lưu trước khi làm lại, giữ chế độ và các ảnh gốc sau khi áp', async () => {
  const user = userEvent.setup()
  const game = createMockGame({
    gameType: 'VISUAL_CLOZE',
    mode: 'IMAGE',
    sceneImageUrl: 'https://example.com/scene.png',
    optionImages: [
      { imageUrl: 'https://example.com/cat.png', visualPrompt: 'Mèo' },
      { imageUrl: 'https://example.com/dog.png', visualPrompt: 'Chó' },
    ],
  })
  renderWithProviders(<WorkspaceEditor />, `/workspace/editor?gameId=${game.gameId}`)
  const scene = await screen.findByRole('textbox', { name: 'URL ảnh cảnh' }, SLOW)
  fireEvent.change(scene, { target: { value: 'https://example.com/updated-scene.png' } })
  expect(trigger()).toHaveAttribute('aria-disabled', 'true')
  await waitFor(() => expect(trigger()).not.toHaveAttribute('aria-disabled'), { timeout: 6000 })

  const saved = getMockGame(game.gameId).questions[0] as VisualClozeImageQuestionDsl
  expect(saved.sceneImageUrl).toBe('https://example.com/updated-scene.png')
  const question = { ...saved, questionText: 'Thả từng con vật vào ô tương ứng.' }
  mockedRegenerate.mockResolvedValueOnce({ question: { ...question, sceneImageUrl: 'https://example.com/other.png' }, gameType: 'VISUAL_CLOZE' })
  mockedRegenerate.mockResolvedValue({ question, gameType: 'VISUAL_CLOZE' })
  await user.click(trigger())
  await user.click(confirm())
  expect(await within(dialog()).findByRole('alert', {}, SLOW)).toHaveTextContent(INVALID)
  expect(scene).toHaveValue(saved.sceneImageUrl)
  await user.click(within(dialog()).getByRole('button', { name: 'Thử lại' }))
  expect(await screen.findByDisplayValue(question.questionText, {}, SLOW)).toBeInTheDocument()
  expect(screen.getByRole('textbox', { name: 'URL ảnh cảnh' })).toHaveValue(saved.sceneImageUrl)
  expect(screen.getByRole('textbox', { name: 'URL ảnh 1' })).toHaveValue(saved.options[0].imageUrl)
  expect(screen.getByRole('textbox', { name: 'URL ảnh 2' })).toHaveValue(saved.options[1].imageUrl)
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
    expect(screen.getByText('Đã tự lưu')).toBeInTheDocument()
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
    expect(screen.getByText('Đã tự lưu')).toBeInTheDocument()
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

    expect(screen.getByText('Đã tự lưu')).toBeInTheDocument()
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
