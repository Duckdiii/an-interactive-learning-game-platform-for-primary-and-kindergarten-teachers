import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getGames } from '../api/gamesApi'
import { getHomeApi } from '../services/home'
import type { GameInsights, HomeApi, InsightsSessionType } from '../services/home'
import { RealHomeApi } from '../services/home/realHomeApi'
import { loginAsTeacher, makeGame, renderWithProviders } from '../test/renderWithApp'
import ResultsPage from './ResultsPage'

vi.mock('../api/gamesApi', () => ({ getGames: vi.fn() }))
vi.mock('../services/home', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/home')>()),
  getHomeApi: vi.fn(),
}))

const mockedGetGames = vi.mocked(getGames)
const mockedGetHomeApi = vi.mocked(getHomeApi)

const PUBLISHED = makeGame(1, { status: 'PUBLISHED', title: 'Ghép chữ về gia đình', subject: 'VIETNAMESE', gradeLevel: 'GRADE_1' })
const DRAFT = makeGame(2, { status: 'DRAFT', title: 'Bản nháp chưa đăng' })

const INSIGHTS: GameInsights = {
  playCount: 26,
  correctRate: 0.72,
  avgAttemptsPerQuestion: 1.6,
  questions: [
    { questionId: 'q1', order: 1, text: 'MẸ', answeredCount: 26, correctRate: 0.92, avgAttempts: 1.1, needsReview: false, commonWrong: [] },
    {
      questionId: 'q4',
      order: 4,
      text: 'CHỊ',
      answeredCount: 26,
      correctRate: 0.408,
      avgAttempts: 2.1,
      needsReview: true,
      commonWrong: [{ label: 'ghép thành “CHI”', count: 9 }],
    },
  ],
}

function useInsights(produce: (sessionType?: InsightsSessionType) => Promise<GameInsights>, isSample = true) {
  const getGameInsights = vi.fn((_gameId: string, sessionType?: InsightsSessionType) => produce(sessionType))
  const api: HomeApi = {
    listLiveSessions: () => Promise.resolve([]),
    listReviewNeeded: () => Promise.resolve([]),
    getGameInsights,
  }
  mockedGetHomeApi.mockResolvedValue({ api, isSample })

  return getGameInsights
}

function LocationProbe() {
  const location = useLocation()

  return <p data-testid="where">{location.pathname + location.search}</p>
}

const renderResults = (path = '/results') =>
  renderWithProviders(
    <>
      <Routes>
        <Route path="/results" element={<ResultsPage />} />
        <Route path="*" element={<p>trang khác</p>} />
      </Routes>
      <LocationProbe />
    </>,
    path,
  )

describe('Trang Kết quả', () => {
  beforeEach(() => {
    loginAsTeacher()
    mockedGetGames.mockResolvedValue([PUBLISHED, DRAFT])
    useInsights(() => Promise.resolve(INSIGHTS))
  })
  afterEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  describe('chưa chọn game', () => {
    it('chỉ liệt kê game đã đăng, mỗi game dẫn tới ?gameId=', async () => {
      renderResults()

      expect(await screen.findByRole('heading', { level: 1, name: 'Kết quả' })).toBeInTheDocument()
      const list = await screen.findByRole('list', { name: 'Trò chơi đã đăng' })
      const links = within(list).getAllByRole('link')

      expect(links).toHaveLength(1)
      expect(links[0]).toHaveTextContent('Ghép chữ về gia đình')
      expect(links[0]).toHaveAttribute('href', '/results?gameId=g1')
      expect(screen.queryByText('Bản nháp chưa đăng')).toBeNull()
    })

    it('chưa có game đã đăng thì trạng thái trống dẫn tới Trò chơi của tôi', async () => {
      mockedGetGames.mockResolvedValue([DRAFT])
      renderResults()

      expect(await screen.findByText('Cô chưa đăng trò chơi nào')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Tới Trò chơi của tôi' })).toHaveAttribute('href', '/workspace')
    })

    it('lỗi tải danh sách: có nút Thử lại', async () => {
      mockedGetGames.mockRejectedValue(new Error('boom'))
      renderResults()

      const alert = await screen.findByRole('alert', {}, { timeout: 4000 })
      expect(within(alert).getByRole('button', { name: 'Thử lại' })).toBeInTheDocument()
    })
  })

  describe('đã chọn game', () => {
    it('hiện 3 chỉ số kiểu Việt Nam, từng câu, câu cần ôn kèm lỗi hay gặp và một h1', async () => {
      renderResults('/results?gameId=g1')

      expect(await screen.findByRole('heading', { level: 1, name: 'Ghép chữ về gia đình' })).toBeInTheDocument()
      expect(await screen.findByText('26')).toBeInTheDocument()
      expect(screen.getByText('72%')).toBeInTheDocument()
      expect(screen.getByText('1,6')).toBeInTheDocument()
      expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)

      expect(screen.getByText('Câu 1: MẸ, 92% đúng')).toBeInTheDocument()
      expect(screen.getByText('Câu 4: CHỊ, 41% đúng')).toBeInTheDocument()

      const review = within(screen.getByRole('region', { name: 'Cần ôn lại' }))
      expect(review.getByText('Câu 4: “CHỊ”')).toBeInTheDocument()
      expect(review.getByText('Chỉ 41% bạn đúng. Lỗi hay gặp: ghép thành “CHI”.')).toBeInTheDocument()
      expect(screen.getByText(/Chỉ thống kê theo biệt danh/)).toBeInTheDocument()
      expect(screen.getByText('Dữ liệu mô phỏng')).toBeInTheDocument()
    })

    it('nút Tạo game ôn tập chỉ mang tên game, khối lớp và môn, không có câu trả lời của học sinh', async () => {
      renderResults('/results?gameId=g1')
      const link = await screen.findByRole('link', { name: 'Tạo game ôn tập' })
      const url = new URL(link.getAttribute('href') ?? '', 'http://localhost')

      expect(url.pathname).toBe('/games/new')
      expect(url.searchParams.get('idea')).toBe('Ôn tập: Ghép chữ về gia đình')
      expect(url.searchParams.get('grade')).toBe('GRADE_1')
      expect(url.searchParams.get('subject')).toBe('VIETNAMESE')
      expect(link.getAttribute('href')).not.toMatch(/CHI|CHỊ/)
      expect(screen.queryByText(/AI soạn từ lỗi/)).toBeNull()
    })

    it('thiếu commonWrong thì bỏ vế "Lỗi hay gặp"', async () => {
      useInsights(() =>
        Promise.resolve({ ...INSIGHTS, questions: [{ ...INSIGHTS.questions[1], commonWrong: [] }] }),
      )
      renderResults('/results?gameId=g1')

      expect(await screen.findByText('Chỉ 41% bạn đúng.')).toBeInTheDocument()
    })

    it('không có câu nào cần ôn thì báo tích cực và không có nút ôn tập', async () => {
      useInsights(() => Promise.resolve({ ...INSIGHTS, questions: [INSIGHTS.questions[0]] }))
      renderResults('/results?gameId=g1')

      expect(await screen.findByText('Lớp làm tốt cả, chưa có câu cần ôn.')).toBeInTheDocument()
      expect(screen.queryByRole('link', { name: 'Tạo game ôn tập' })).toBeNull()
    })

    it('chip lọc đổi sessionType, số liệu và địa chỉ (?type=)', async () => {
      const user = userEvent.setup()
      const fetchInsights = useInsights((sessionType) =>
        Promise.resolve(sessionType === 'TEAM' ? { ...INSIGHTS, playCount: 18 } : INSIGHTS),
      )
      renderResults('/results?gameId=g1')
      await screen.findByText('26')
      const group = screen.getByRole('group', { name: 'Lọc theo loại lượt chơi' })

      expect(within(group).getByRole('button', { name: 'Tất cả lượt' })).toHaveAttribute('aria-pressed', 'true')
      expect(fetchInsights).toHaveBeenLastCalledWith('g1', undefined)

      await user.click(within(group).getByRole('button', { name: 'Phòng thi đấu' }))

      expect(await screen.findByText('18')).toBeInTheDocument()
      expect(fetchInsights).toHaveBeenLastCalledWith('g1', 'TEAM')
      expect(within(group).getByRole('button', { name: 'Phòng thi đấu' })).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getByTestId('where')).toHaveTextContent('/results?gameId=g1&type=TEAM')

      await user.click(within(group).getByRole('button', { name: 'Tất cả lượt' }))
      expect(screen.getByTestId('where')).toHaveTextContent(/^\/results\?gameId=g1$/)
    })

    it('?type=SELF trên địa chỉ chọn sẵn chip Chơi ở nhà', async () => {
      const fetchInsights = useInsights(() => Promise.resolve(INSIGHTS))
      renderResults('/results?gameId=g1&type=SELF')

      expect(await screen.findByRole('button', { name: 'Chơi ở nhà', pressed: true })).toBeInTheDocument()
      expect(fetchInsights).toHaveBeenCalledWith('g1', 'SELF')
    })

    it('chưa có lượt chơi thì hiện "Chưa có lượt chơi nào" thay cho bảng', async () => {
      useInsights(() => Promise.resolve({ playCount: 0, correctRate: 0, avgAttemptsPerQuestion: 0, questions: [] }))
      renderResults('/results?gameId=g1')

      expect(await screen.findByText('Chưa có lượt chơi nào')).toBeInTheDocument()
      expect(screen.queryByRole('region', { name: 'Từng câu' })).toBeNull()
    })

    it('bản thật chưa hỗ trợ: "Chưa có số liệu", không báo lỗi', async () => {
      mockedGetHomeApi.mockResolvedValue({ api: new RealHomeApi(), isSample: false })
      renderResults('/results?gameId=g1')

      expect(await screen.findByText('Chưa có số liệu')).toBeInTheDocument()
      expect(screen.queryByRole('alert')).toBeNull()
    })

    it('lỗi tải số liệu: ErrorNotice có Thử lại', async () => {
      useInsights(() => Promise.reject(new Error('boom')))
      renderResults('/results?gameId=g1')

      const alert = await screen.findByRole('alert', {}, { timeout: 4000 })
      expect(within(alert).getByRole('button', { name: 'Thử lại' })).toBeInTheDocument()
    })

    it('gameId không thuộc danh sách của cô: báo không tìm thấy và có liên kết quay lại', async () => {
      renderResults('/results?gameId=khong-co')

      expect(await screen.findByRole('heading', { level: 1, name: 'Không tìm thấy trò chơi này' })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Chọn trò chơi khác' })).toHaveAttribute('href', '/results')
    })
  })
})
