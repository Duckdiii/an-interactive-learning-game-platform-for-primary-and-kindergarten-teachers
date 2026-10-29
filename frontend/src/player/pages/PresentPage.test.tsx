import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError, AxiosHeaders } from 'axios'
import type { AxiosResponse } from 'axios'
import { Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getGame } from '../../services/gameService'
import { buildMockGameContents } from '../../services/mock/gameFixtures'
import { loginAsTeacher, renderWithProviders } from '../../test/renderWithApp'
import type { GameResponse } from '../../types/game-response.types'
import { playSound } from '../../games/common/sound'
import PresentPage from './PresentPage'

vi.mock('../../services/gameService', async (original) => ({
  ...(await original<typeof import('../../services/gameService')>()),
  getGame: vi.fn(),
}))

vi.mock('../../games/common/sound', () => ({ playSound: vi.fn() }))
// Canvas không có trong jsdom: Konva thay bằng DOM thường (renderer thật chạy trong màn chơi).
vi.mock('react-konva', () => ({
  Stage: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Layer: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Group: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Rect: () => null,
  Text: ({ text }: { text?: string }) => <span>{text}</span>,
  Image: () => null,
  Line: () => null,
}))
vi.mock('use-image', () => ({ default: () => [undefined, 'loading'] }))
vi.mock('howler', () => ({ Howl: class { play = vi.fn(); stop = vi.fn(); unload = vi.fn() } }))
vi.mock('../../games/common/measureText', () => ({ measureWrappedTextHeight: () => null }))

const mockedGetGame = vi.mocked(getGame)
const httpError = (status: number) =>
  new AxiosError('lỗi', 'ERR', undefined, undefined, { status, data: {}, statusText: '', headers: {}, config: { headers: new AxiosHeaders() } } as AxiosResponse)

const renderPage = () =>
  renderWithProviders(
    <Routes>
      <Route path="/present/:gameId" element={<PresentPage />} />
    </Routes>,
    '/present/g1',
  )

beforeEach(() => loginAsTeacher())
afterEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

describe('PresentPage', () => {
  it('mở game trong khung trình chiếu, có thanh điều khiển của giáo viên', async () => {
    const content = buildMockGameContents()[0]
    mockedGetGame.mockResolvedValue({ ...content, gameId: 'g1', status: 'PUBLISHED' } as GameResponse)
    renderPage()

    expect(await screen.findByRole('heading', { name: content.metadata.title })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Điều khiển của giáo viên' })).toBeInTheDocument()
  })

  it('Tv-Lobby: môn, khối, số câu, nhân vật chào, "Cả lớp sẵn sàng chưa nào?"; Space bắt đầu; nút Toàn màn hình và Kiểm tra âm thanh', async () => {
    const user = userEvent.setup()
    const content = buildMockGameContents()[0]
    const requestFullscreen = vi.fn(() => Promise.resolve())

    Object.defineProperty(document.documentElement, 'requestFullscreen', { value: requestFullscreen, configurable: true })
    mockedGetGame.mockResolvedValue({ ...content, gameId: 'g1', status: 'PUBLISHED' } as GameResponse)
    renderPage()

    expect(await screen.findByText('Cả lớp sẵn sàng chưa nào?')).toBeInTheDocument()
    expect(screen.getByText(`${content.questions.length} câu`)).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /chào/i })).toBeInTheDocument()
    expect(screen.getByText('Phím Space để bắt đầu · thanh tự ẩn sau 3 giây')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Toàn màn hình' }))
    expect(requestFullscreen).toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Kiểm tra âm thanh' }))
    expect(playSound).toHaveBeenCalledWith('/sounds/correct.wav')

    // Đúng trình tự trên lớp: bấm chuột "Kiểm tra âm thanh" rồi nhấn Space. Nút vừa bấm bằng chuột trả tiêu điểm nên Space là bắt đầu,
    // không phải phát âm thêm lần nữa.
    expect(document.activeElement).not.toBe(screen.getByRole('button', { name: 'Kiểm tra âm thanh' }))
    await user.keyboard(' ')
    expect(playSound).toHaveBeenCalledTimes(1)
    expect(await screen.findByText(`Câu 1/${content.questions.length}`, { selector: 'h1' })).toBeInTheDocument()
    expect(screen.queryByText('Cả lớp sẵn sàng chưa nào?')).toBeNull()
  })

  it('chơi hết game chỉ bằng bàn phím: Space bắt đầu, → qua từng câu, tới kết quả cả lớp (không điểm, không tên bé)', async () => {
    const user = userEvent.setup()
    const content = buildMockGameContents()[0]

    mockedGetGame.mockResolvedValue({ ...content, gameId: 'g1', status: 'PUBLISHED' } as GameResponse)
    renderPage()
    await screen.findByText('Cả lớp sẵn sàng chưa nào?')
    await user.keyboard(' ')
    await screen.findByText('Câu 1/3', { selector: 'h1' })
    await user.keyboard('r{ArrowRight}{ArrowLeft}{ArrowRight}{ArrowRight}{ArrowRight}')

    expect(await screen.findByText('Lớp mình trả lời đúng 0/3 câu')).toBeInTheDocument()
    // 0 câu đúng thì không khen "giỏi quá", động viên nhẹ.
    expect(screen.getByRole('heading', { name: 'Cả lớp chơi chăm quá! Mình cùng ôn lại nhé!' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Kết thúc buổi chơi' })).toBeInTheDocument()
  })

  it('trả lời bằng phím số; đang tạm dừng thì phím số không chọn, Esc tiếp tục rồi phím số mới chọn', async () => {
    const user = userEvent.setup()
    const content = buildMockGameContents()[0]

    mockedGetGame.mockResolvedValue({ ...content, gameId: 'g1', status: 'PUBLISHED' } as GameResponse)
    renderPage()
    await screen.findByText('Cả lớp sẵn sàng chưa nào?')
    await user.keyboard(' ')
    await screen.findByText('Câu 1/3', { selector: 'h1' })

    await user.click(screen.getByRole('button', { name: 'Tạm dừng' }))
    await user.keyboard('1')
    expect(screen.getByRole('status')).toHaveTextContent('Bạn nào biết nào?')

    await user.keyboard('{Escape}1')
    await waitFor(() => expect(screen.getByRole('status')).not.toHaveTextContent('Bạn nào biết nào?'))
    expect(screen.getByRole('button', { name: 'Cho thử lại' })).toHaveAttribute('aria-disabled', 'false')
  })

  it('game không có (404) thì báo không mở được và dẫn về kệ, không mời thử lại', async () => {
    mockedGetGame.mockRejectedValue(httpError(404))
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Không mở được trò chơi này' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Về kệ trò chơi' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Thử lại' })).toBeNull()
  })

  it('lỗi mạng thì có nút Thử lại, bấm thì tải lại', async () => {
    const user = userEvent.setup()
    const content = buildMockGameContents()[0]

    // useGame tự thử lại một lần với lỗi mạng (có độ trễ) rồi mới báo lỗi.
    mockedGetGame.mockRejectedValue(new AxiosError('mất mạng', 'ERR_NETWORK'))
    renderPage()
    const retry = await screen.findByRole('button', { name: 'Thử lại' }, { timeout: 4000 })

    expect(screen.getByRole('heading', { name: /Chưa tải được trò chơi/ })).toBeInTheDocument()
    mockedGetGame.mockResolvedValue({ ...content, gameId: 'g1', status: 'PUBLISHED' } as GameResponse)
    await user.click(retry)

    expect(await screen.findByRole('heading', { name: content.metadata.title })).toBeInTheDocument()
    await waitFor(() => expect(mockedGetGame).toHaveBeenCalledTimes(3))
  })
})
