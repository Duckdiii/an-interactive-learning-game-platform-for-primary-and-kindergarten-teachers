import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes, useLocation } from 'react-router-dom'
import { AxiosError } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getGames } from '../api/gamesApi'
import { getHomeApi } from '../services/home'
import type { HomeApi, LiveSession, ReviewNeeded } from '../services/home'
import { RealHomeApi } from '../services/home/realHomeApi'
import { loginAsTeacher, makeGame, renderWithProviders } from '../test/renderWithApp'
import Dashboard from './Dashboard'

vi.mock('../api/gamesApi', () => ({ getGames: vi.fn() }))
vi.mock('../services/home', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/home')>()),
  getHomeApi: vi.fn(),
}))

const mockedGetGames = vi.mocked(getGames)
const mockedGetHomeApi = vi.mocked(getHomeApi)

const LIVE: LiveSession = {
  sessionId: 's1',
  gameId: 'g1',
  gameTitle: 'Đếm số đến 10',
  status: 'ACTIVE',
  participantCount: 24,
  currentQuestionIndex: 2,
  questionCount: 10,
}
const REVIEW: ReviewNeeded = {
  gameId: 'g2',
  gameTitle: 'Ghép chữ về gia đình',
  questionId: 'q1',
  questionText: 'CHỊ',
  correctRate: 0.408,
  commonWrong: { label: 'CHI', count: 9 },
}

function useSampleHome(live: LiveSession[] = [LIVE], review: ReviewNeeded[] = [REVIEW]) {
  const api: HomeApi = {
    listLiveSessions: () => Promise.resolve(live),
    listReviewNeeded: () => Promise.resolve(review),
    getGameInsights: () => Promise.reject(new Error('không dùng ở Trang chủ')),
  }
  mockedGetHomeApi.mockResolvedValue({ api, isSample: true })
}

function LocationProbe() {
  const location = useLocation()

  return <p data-testid="where">{location.pathname + location.search}</p>
}

const renderDashboard = () =>
  renderWithProviders(
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="*" element={<LocationProbe />} />
    </Routes>,
  )

const whereTo = () => {
  const url = new URL(screen.getByTestId('where').textContent ?? '', 'http://localhost')

  return { path: url.pathname, params: url.searchParams }
}

describe('Trang chủ giáo viên', () => {
  beforeEach(() => {
    loginAsTeacher()
    useSampleHome()
  })
  afterEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('chào bằng tên (từ cuối của họ tên)', () => {
    mockedGetGames.mockResolvedValue([])
    renderDashboard()

    expect(
      screen.getByRole('heading', { level: 1, name: 'Chào cô Lan, hôm nay lớp mình học gì?' }),
    ).toBeInTheDocument()
  })

  it('thư viện trống (giáo viên mới): vẫn có chip gợi ý chủ đề và chip "Tạo ngẫu nhiên" tới /games/new?random=1', async () => {
    mockedGetGames.mockResolvedValue([])
    renderDashboard()
    const suggestions = within(await screen.findByRole('list', { name: 'Gợi ý chủ đề' }))

    expect(suggestions.getAllByRole('link').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByRole('link', { name: /Tạo ngẫu nhiên/ })).toHaveAttribute('href', '/games/new?random=1')
  })

  it('không có họ tên thì chỉ chào chung, không in "undefined"', () => {
    localStorage.clear()
    mockedGetGames.mockResolvedValue([])
    renderDashboard()

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/^Chào cô, hôm nay lớp mình học gì\?$/)
  })

  it('gõ mô tả rồi "Tạo trò chơi" thì sang /games/new?idea=...', async () => {
    const user = userEvent.setup()
    mockedGetGames.mockResolvedValue([])
    renderDashboard()

    await user.type(screen.getByLabelText('Mô tả bài học'), '  Bé đếm số con vật  ')
    await user.click(screen.getByRole('button', { name: 'Tạo trò chơi' }))

    const { path, params } = whereTo()
    expect(path).toBe('/games/new')
    expect(params.get('idea')).toBe('Bé đếm số con vật')
  })

  it('ô mô tả trống vẫn sang trang tạo, không kèm idea', async () => {
    const user = userEvent.setup()
    mockedGetGames.mockResolvedValue([])
    renderDashboard()

    await user.click(screen.getByRole('button', { name: 'Tạo trò chơi' }))

    const { path, params } = whereTo()
    expect(path).toBe('/games/new')
    expect(params.has('idea')).toBe(false)
  })

  it('chip gợi ý: 4 gợi ý bám khối lớp, môn gần đây, bấm sang Tạo game mới với ô mô tả điền sẵn', async () => {
    mockedGetGames.mockResolvedValue([makeGame(1, { gradeLevel: 'GRADE_1', subject: 'VIETNAMESE', title: 'Bài riêng' })])
    renderDashboard()
    const topics = within(screen.getByRole('list', { name: 'Gợi ý chủ đề' }))

    await screen.findByText('Bài riêng')
    const links = topics.getAllByRole('link').filter((link) => link.getAttribute('href')?.includes('idea='))
    expect(links).toHaveLength(4)
    expect(links[0]).toHaveTextContent('Tiếng Việt · Lớp 1')
    const url = new URL(links[0].getAttribute('href') ?? '', 'http://localhost')
    expect(url.pathname).toBe('/games/new')
    expect(url.searchParams.get('idea')).toBeTruthy()
    expect(url.searchParams.get('grade')).toBe('GRADE_1')
    expect(url.searchParams.get('subject')).toBe('VIETNAMESE')
  })

  it('đang tải hiện đúng một vùng trạng thái cho trình đọc màn hình', () => {
    mockedGetGames.mockReturnValue(new Promise(() => {}))
    renderDashboard()

    expect(screen.getAllByRole('status')).toHaveLength(1)
    expect(screen.getByRole('status')).toHaveAccessibleName('Đang tải trò chơi')
  })

  it('"Soạn dở" chỉ có bản nháp, mới cập nhật nhất lên đầu và tối đa 3', async () => {
    const hours = (n: number) => new Date(Date.now() - n * 3_600_000).toISOString()
    mockedGetGames.mockResolvedValue([
      makeGame(1, { title: 'Nháp cũ nhất', updatedAt: hours(50) }),
      makeGame(2, { title: 'Nháp mới nhất', updatedAt: hours(1) }),
      makeGame(3, { title: 'Đã đăng mới', status: 'PUBLISHED', shareCode: 'ABC123', updatedAt: hours(0.5) }),
      makeGame(4, { title: 'Nháp giữa', updatedAt: hours(10) }),
      makeGame(5, { title: 'Nháp thứ tư', updatedAt: hours(20) }),
    ])
    renderDashboard()
    const section = within(screen.getByRole('region', { name: 'Soạn dở' }))
    await section.findByText('Nháp mới nhất')

    const titles = section.getAllByRole('listitem').map((item) => within(item).getByText(/^Nháp/).textContent)
    expect(titles).toEqual(['Nháp mới nhất', 'Nháp giữa', 'Nháp thứ tư'])
    expect(section.queryByText('Đã đăng mới')).toBeNull()
    expect(section.queryByText('Nháp cũ nhất')).toBeNull()
  })

  it('chỉ có game đã đăng thì nói rõ không có bản nháp dở dang', async () => {
    mockedGetGames.mockResolvedValue([makeGame(1, { status: 'PUBLISHED', shareCode: 'ABC123' })])
    renderDashboard()

    expect(await screen.findByText('Cô không có bản nháp nào đang soạn dở.')).toBeInTheDocument()
  })

  it('lỗi mạng: thông báo kiểm tra mạng và nút Thử lại gọi lại API', async () => {
    const user = userEvent.setup()
    mockedGetGames.mockRejectedValue(new AxiosError('Network Error', 'ERR_NETWORK'))
    renderDashboard()

    // Thử lại 1 lần (cách nhau khoảng 1 giây) rồi mới báo lỗi.
    const alert = await screen.findByRole('alert', {}, { timeout: 4000 })
    expect(alert).toHaveTextContent('Không thể tải danh sách trò chơi')
    expect(alert).toHaveTextContent('Không kết nối được máy chủ. Hãy kiểm tra mạng rồi thử lại.')

    mockedGetGames.mockResolvedValue([makeGame(1, { title: 'Đã tải lại' })])
    await user.click(within(alert).getByRole('button', { name: 'Thử lại' }))

    expect(await screen.findByText('Đã tải lại')).toBeInTheDocument()
  })

  it('quá hạn (máy chủ treo) báo câu riêng và không thử lại', async () => {
    mockedGetGames.mockRejectedValue(new AxiosError('timeout', 'ECONNABORTED'))
    renderDashboard()

    expect(await screen.findByRole('alert')).toHaveTextContent('Máy chủ phản hồi quá chậm')
    expect(mockedGetGames).toHaveBeenCalledTimes(1)
  })

  describe('Đang diễn ra', () => {
    it('dữ liệu mẫu: có nhãn mô phỏng, số bạn, câu 3/10 và nút "Vào phòng" khóa kèm "Sắp có"', async () => {
      mockedGetGames.mockResolvedValue([])
      renderDashboard()
      const section = within(screen.getByRole('region', { name: /Đang diễn ra/ }))

      expect(await section.findByText('Đếm số đến 10')).toBeInTheDocument()
      expect(section.getByText('Phòng đang chạy · 24 bạn · câu 3/10')).toBeInTheDocument()
      expect(section.getByText('Dữ liệu mô phỏng')).toBeInTheDocument()
      const enter = section.getByRole('button', { name: 'Vào phòng: Đếm số đến 10' })

      expect(enter).toBeDisabled()
      expect(enter).toHaveAccessibleDescription('Sắp có')
    })

    it('thiếu số câu thì bỏ vế "câu ..."', async () => {
      useSampleHome([{ ...LIVE, currentQuestionIndex: null }])
      mockedGetGames.mockResolvedValue([])
      renderDashboard()

      expect(await screen.findByText('Phòng đang chạy · 24 bạn')).toBeInTheDocument()
    })

    it('API thật chưa hỗ trợ: trạng thái trống bình thường, không báo lỗi, không nhãn mô phỏng', async () => {
      mockedGetHomeApi.mockResolvedValue({ api: new RealHomeApi(), isSample: false })
      mockedGetGames.mockResolvedValue([])
      renderDashboard()
      const section = within(screen.getByRole('region', { name: 'Đang diễn ra' }))

      expect(await section.findByText('Chưa có buổi trình chiếu nào hôm nay')).toBeInTheDocument()
      expect(section.getByRole('link', { name: 'Trình chiếu một game' })).toHaveAttribute('href', '/workspace')
      expect(section.queryByRole('alert')).toBeNull()
      expect(screen.queryByText('Dữ liệu mô phỏng')).toBeNull()
      expect(screen.queryByRole('alert')).toBeNull()
    })

    it('lỗi khác hiện thông báo gọn trong khối', async () => {
      mockedGetHomeApi.mockResolvedValue({
        api: {
          listLiveSessions: () => Promise.reject(new Error('boom')),
          listReviewNeeded: () => Promise.resolve([]),
          getGameInsights: () => Promise.reject(new Error('không dùng ở Trang chủ')),
        },
        isSample: false,
      })
      mockedGetGames.mockResolvedValue([])
      renderDashboard()
      const section = within(screen.getByRole('region', { name: 'Đang diễn ra' }))

      expect(await section.findByRole('alert', {}, { timeout: 4000 })).toHaveTextContent('Chưa tải được mục này')
    })
  })

  describe('Lớp mình cần ôn lại', () => {
    it('hiện % làm tròn, nhãn hay nhầm và nút tạo game ôn tập chỉ mang tên game', async () => {
      mockedGetGames.mockResolvedValue([])
      renderDashboard()
      const section = within(screen.getByRole('region', { name: /Lớp mình cần ôn lại/ }))

      expect(await section.findByText('“CHỊ” trong game Ghép chữ về gia đình')).toBeInTheDocument()
      expect(section.getByText('Chỉ 41% đúng · hay nhầm thành “CHI”')).toBeInTheDocument()
      expect(section.getByText('AI dùng kết quả chơi để gợi ý nội dung ôn lại.')).toBeInTheDocument()

      const url = new URL(section.getByRole('link', { name: 'Tạo game ôn tập' }).getAttribute('href') ?? '', 'http://localhost')
      expect(url.pathname).toBe('/games/new')
      expect(url.searchParams.get('idea')).toBe('Ôn tập: Ghép chữ về gia đình')

      expect(section.getByRole('link', { name: 'Xem kết quả: Ghép chữ về gia đình' })).toHaveAttribute('href', '/results?gameId=g2')
    })

    it('thiếu commonWrong thì bỏ vế "hay nhầm"', async () => {
      useSampleHome([], [{ ...REVIEW, commonWrong: null }])
      mockedGetGames.mockResolvedValue([])
      renderDashboard()

      expect(await screen.findByText('Chỉ 41% đúng')).toBeInTheDocument()
    })

    it('không có mục nào thì hiện câu động viên', async () => {
      useSampleHome([], [])
      mockedGetGames.mockResolvedValue([])
      renderDashboard()

      expect(await screen.findByText('Chưa có câu nào cần ôn. Cô cứ tiếp tục nhé!')).toBeInTheDocument()
    })
  })
})
