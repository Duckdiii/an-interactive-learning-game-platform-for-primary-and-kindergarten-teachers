import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import axiosInstance from '../api/axiosInstance'
import { getMockGame, resetMockGames } from '../services/mock/mockGames'
import { setMockScenario } from '../services/mock/mockRuntime'
import { loginAsTeacher, renderWithProviders } from '../test/renderWithApp'
import { playTestPanelLoader } from '../components/editor/playTestPanelLoader'
import WorkspaceEditor from './WorkspaceEditor'

// Canvas không có trong jsdom: mock react-konva thành DOM thường (xem PlayTestPanel.test.tsx).
vi.mock('react-konva', () => ({
  Stage: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Layer: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Group: ({ children, onClick }: { children?: React.ReactNode; onClick?: () => void }) => (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div onClick={onClick}>{children}</div>
  ),
  Rect: () => null,
  Text: ({ text }: { text?: string }) => <span>{text}</span>,
  Image: () => null,
  Line: () => null,
}))
vi.mock('use-image', () => ({ default: () => [undefined, 'loading'] }))
vi.mock('howler', () => ({ Howl: class { play = vi.fn(); stop = vi.fn(); unload = vi.fn() } }))
vi.mock('../games/common/measureText', () => ({ measureWrappedTextHeight: () => null }))
vi.mock('../games/common/useFeedback', () => ({ useFeedback: () => ({ showFeedback: vi.fn() }) }))
vi.mock('../games/common/sound', () => ({ playSound: vi.fn() }))
vi.mock('../api/axiosInstance', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn(), request: vi.fn() },
}))

// mock-game-1 là QUIZ, mock-game-5 là ORDERING (chưa có renderer chơi thử).
const QUIZ_ID = 'mock-game-1'
const ORDERING_ID = 'mock-game-5'
const titleBox = () => screen.getByRole('textbox', { name: /Tên trò chơi/ })
const playButton = () => screen.getByRole('button', { name: 'Chơi thử' })

async function openLoaded(gameId: string) {
  renderWithProviders(<WorkspaceEditor />, `/workspace/editor?gameId=${gameId}`)
  await screen.findByRole('textbox', { name: /Tên trò chơi/ })
}

// Nạp sẵn màn chơi thử (kéo theo renderer Canvas) một lần: lần nạp đầu tiên rất chậm khi nhiều file test chạy song song và sẽ làm test đầu tiên quá hạn.
beforeAll(async () => {
  await import('../components/editor/PlayTestPanel')
}, 120_000)

beforeEach(() => {
  vi.stubEnv('VITE_USE_MOCK', 'editor')
  loginAsTeacher()
  resetMockGames()
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.stubEnv('VITE_USE_MOCK', 'none')
  setMockScenario('normal')
  localStorage.clear()
  vi.clearAllMocks()
})

describe('trình soạn thảo: Chơi thử', () => {
  it('mở màn chơi thử bằng bản đang soạn, Thoát thì về đúng chỗ cũ, phần chưa lưu vẫn còn, và không gọi API ghi nào', async () => {
    const user = userEvent.setup()
    const before = getMockGame(QUIZ_ID).metadata.title

    await openLoaded(QUIZ_ID)
    await user.type(titleBox(), ' (thử)')
    await user.click(playButton())

    expect(await screen.findByText('Câu 1 trên 3', {}, { timeout: 10_000 })).toBeInTheDocument()
    // Đang chơi thử thì không còn ô soạn thảo hay nút Lưu.
    expect(screen.queryByRole('textbox', { name: /Tên trò chơi/ })).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('3'))
    expect(screen.getByRole('status')).toHaveTextContent('Đúng rồi!')

    await user.click(screen.getByRole('button', { name: 'Thoát' }))

    expect(titleBox()).toHaveValue(`${before} (thử)`)
    expect(screen.getByText('Chưa lưu')).toBeInTheDocument()
    await waitFor(() => expect(playButton()).toHaveFocus())
    // Chơi thử không lưu gì: kho vẫn giữ tên cũ và không có yêu cầu mạng nào.
    expect(getMockGame(QUIZ_ID).metadata.title).toBe(before)
    for (const method of Object.values(axiosInstance)) expect(method).not.toHaveBeenCalled()
  })

  it('dữ liệu chưa đủ (UC-03 2a): từ chối mở màn chơi thử, hiện đúng câu của SRS, sửa xong thì mở được', async () => {
    const user = userEvent.setup()

    await openLoaded(QUIZ_ID)
    await user.clear(titleBox())
    await user.click(playButton())

    const alert = await screen.findByRole('alert')

    expect(alert).toHaveTextContent(
      'Trò chơi chưa đủ dữ liệu hoặc thiếu thông tin bắt buộc để chơi thử. Vui lòng kiểm tra và hoàn thiện nội dung trong màn hình soạn thảo.',
    )
    expect(screen.queryByText('Câu 1 trên 3')).not.toBeInTheDocument()
    expect(titleBox()).toBeInTheDocument()

    await user.type(titleBox(), 'Có tên rồi')

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    await user.click(playButton())

    expect(await screen.findByText('Câu 1 trên 3', {}, { timeout: 10_000 })).toBeInTheDocument()
  })

  it('loại game chưa có renderer: hiện ảnh tĩnh và thông báo, không để trống', async () => {
    const user = userEvent.setup()

    await openLoaded(ORDERING_ID)
    await user.click(playButton())

    expect(await screen.findByRole('heading', { name: 'Loại game này chưa hỗ trợ chơi thử' }, { timeout: 10_000 })).toBeInTheDocument()
    // Ảnh minh họa tĩnh nằm trong chính khung "chưa hỗ trợ", không phải biểu tượng nào đó trong trang.
    expect(document.querySelector('section[aria-labelledby="play-unsupported-title"] svg')).not.toBeNull()

    await user.click(screen.getByRole('button', { name: 'Quay lại chỉnh sửa' }))

    expect(titleBox()).toBeInTheDocument()
  })
})

describe('trình soạn thảo: tải màn chơi thử bị lỗi (UC-03 3b)', () => {
  it('tải gói đồ họa lỗi: hiện đúng câu của SRS; quay lại chỉnh sửa rồi bấm Chơi thử lại thì mở được', async () => {
    const user = userEvent.setup()

    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(playTestPanelLoader, 'load').mockRejectedValueOnce(new Error('ChunkLoadError: mạng chập chờn'))

    await openLoaded(QUIZ_ID)
    await user.type(titleBox(), ' (thử)')
    await user.click(playButton())

    const alert = await screen.findByRole('alert', {}, { timeout: 10_000 })

    expect(alert).toHaveTextContent(
      'Hệ thống gặp sự cố khi tải tài nguyên đồ họa của trò chơi. Vui lòng kiểm tra lại kết nối mạng hoặc cập nhật lại tài nguyên.',
    )

    // Quay lại chỉnh sửa: nội dung đang soạn còn nguyên.
    await user.click(screen.getByRole('button', { name: 'Quay lại chỉnh sửa' }))
    expect(titleBox()).toHaveValue(`${getMockGame(QUIZ_ID).metadata.title} (thử)`)

    // Mạng đã ổn: bấm Chơi thử lần nữa thì mở được (lần tải lỗi không bị ghi nhớ mãi).
    await user.click(playButton())
    expect(await screen.findByText('Câu 1 trên 3', {}, { timeout: 10_000 })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
