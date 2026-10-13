import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getGames } from '../api/gamesApi'
import { AuthProvider } from '../context/AuthContext'
import type { GameSummary } from '../types/game-summary.types'
import { storeSession } from '../utils/authStorage'
import Dashboard, { FILTER_MIN_GAMES } from './Dashboard'

vi.mock('../api/gamesApi', () => ({ getGames: vi.fn() }))

const mockedGetGames = vi.mocked(getGames)

const makeGame = (
  index: number,
  overrides: Partial<GameSummary> = {},
): GameSummary => ({
  id: `g${index}`,
  title: `Trò chơi ${index}`,
  subject: 'MATH',
  gradeLevel: 'GRADE_1',
  status: 'DRAFT',
  thumbnailUrl: null,
  ...overrides,
})

const makeGames = (count: number) =>
  Array.from({ length: count }, (_, index) => makeGame(index + 1))

function renderDashboard() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  )
}

describe('Dashboard (trang chủ giáo viên)', () => {
  beforeEach(() => {
    localStorage.clear()
    storeSession({ id: 't1', email: 'giaovien@example.com' }, 'token', 'refresh')
  })

  afterEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('luôn có khối Tạo game mới với 3 bước và nút dẫn tới trang tạo game', () => {
    mockedGetGames.mockResolvedValue([])
    renderDashboard()

    const banner = screen.getByRole('region', {
      name: 'Tạo trò chơi mới cho lớp của bạn',
    })
    const steps = within(banner).getAllByRole('listitem')
    expect(steps.map((step) => step.textContent)).toEqual([
      '1Chọn môn học và khối lớp',
      '2Nhập chủ đề bài học',
      '3Xem lại và chỉnh sửa trước khi đăng',
    ])
    expect(within(banner).getByText('Đang hoàn thiện')).toBeInTheDocument()
    expect(
      within(banner).getByRole('link', { name: '+ Tạo game mới' }),
    ).toHaveAttribute('href', '/games/new')
  })

  it('trạng thái trống không lặp lại nút tạo game (đã có ở khối phía trên)', async () => {
    mockedGetGames.mockResolvedValue([])
    renderDashboard()

    await screen.findByText('Chưa có trò chơi nào')
    expect(screen.getAllByRole('link', { name: /Tạo game mới/ })).toHaveLength(1)
  })

  it('thẻ game hiển thị môn, khối lớp, trạng thái bằng tiếng Việt và hình bìa theo môn', async () => {
    mockedGetGames.mockResolvedValue([makeGame(1, { title: 'Đếm số đến 10' })])
    renderDashboard()

    const card = (await screen.findByText('Đếm số đến 10')).closest(
      'article',
    ) as HTMLElement
    const inCard = within(card)
    expect(inCard.getByText('Toán · Lớp 1')).toBeInTheDocument()
    expect(inCard.getByText('Bản nháp')).toBeInTheDocument()
    // Chưa có ảnh bìa thì dùng hình SVG mặc định, không có thẻ <img>.
    expect(card.querySelector('svg')).not.toBeNull()
    expect(card.querySelector('img')).toBeNull()
  })

  it('có ảnh bìa thì dùng ảnh, không dùng hình mặc định', async () => {
    mockedGetGames.mockResolvedValue([
      makeGame(1, { title: 'Có ảnh', thumbnailUrl: 'https://example.com/a.png' }),
    ])
    renderDashboard()

    const card = (await screen.findByText('Có ảnh')).closest(
      'article',
    ) as HTMLElement
    expect(card.querySelector('img')).toHaveAttribute(
      'src',
      'https://example.com/a.png',
    )
    expect(card.querySelector('svg')).toBeNull()
  })

  it('bộ lọc ẩn khi ít game và hiện từ ngưỡng FILTER_MIN_GAMES trở lên', async () => {
    mockedGetGames.mockResolvedValue(makeGames(FILTER_MIN_GAMES - 1))
    const { unmount } = renderDashboard()
    await screen.findByText('Trò chơi 1')
    expect(screen.queryByRole('region', { name: 'Bộ lọc trò chơi' })).toBeNull()
    unmount()

    mockedGetGames.mockResolvedValue(makeGames(FILTER_MIN_GAMES))
    renderDashboard()
    await screen.findByText('Trò chơi 1')
    expect(
      screen.getByRole('region', { name: 'Bộ lọc trò chơi' }),
    ).toBeInTheDocument()
  })

  it('bộ lọc hiển thị nhãn Việt nhưng gửi giá trị enum gốc lên API, và vẫn hiện khi đang lọc', async () => {
    const user = userEvent.setup()
    mockedGetGames.mockResolvedValue(makeGames(FILTER_MIN_GAMES))
    renderDashboard()
    await screen.findByText('Trò chơi 1')

    const statusSelect = screen.getByLabelText('Trạng thái')
    expect(
      within(statusSelect).getByRole('option', { name: 'Bản nháp' }),
    ).toHaveValue('DRAFT')
    expect(
      within(statusSelect).getByRole('option', { name: 'Đã đăng' }),
    ).toHaveValue('PUBLISHED')

    // Đang lọc mà kết quả ít hơn ngưỡng thì bộ lọc vẫn phải còn để giáo viên bỏ lọc.
    mockedGetGames.mockResolvedValue(makeGames(1))
    await user.selectOptions(statusSelect, 'DRAFT')

    await waitFor(() =>
      expect(mockedGetGames).toHaveBeenLastCalledWith({
        subject: '',
        gradeLevel: '',
        status: 'DRAFT',
      }),
    )
    await screen.findByText('Trò chơi 1')
    expect(screen.getByLabelText('Trạng thái')).toHaveValue('DRAFT')
  })

  it('ô chọn Khối lớp xếp Mầm non trước Lớp 1, Môn học theo thứ tự đã định', async () => {
    const grades = ['GRADE_2', 'KINDERGARTEN', 'GRADE_1']
    const subjects = ['MATH', 'ENGLISH', 'VIETNAMESE']
    mockedGetGames.mockResolvedValue(
      Array.from({ length: FILTER_MIN_GAMES }, (_, index) =>
        makeGame(index + 1, {
          gradeLevel: grades[index % grades.length],
          subject: subjects[index % subjects.length],
        }),
      ),
    )
    renderDashboard()
    await screen.findByText('Trò chơi 1')

    const optionTexts = (labelText: string) =>
      within(screen.getByLabelText(labelText))
        .getAllByRole('option')
        .map((option) => option.textContent)

    expect(optionTexts('Khối lớp')).toEqual(['Tất cả', 'Mầm non', 'Lớp 1', 'Lớp 2'])
    expect(optionTexts('Môn học')).toEqual([
      'Tất cả',
      'Toán',
      'Tiếng Việt',
      'Tiếng Anh',
    ])
  })

  it('đang lọc mà không có kết quả thì nói rõ không khớp bộ lọc và cho bỏ lọc', async () => {
    const user = userEvent.setup()
    mockedGetGames.mockResolvedValue(makeGames(FILTER_MIN_GAMES))
    renderDashboard()
    await screen.findByText('Trò chơi 1')

    mockedGetGames.mockResolvedValue([])
    await user.selectOptions(screen.getByLabelText('Trạng thái'), 'PUBLISHED')

    await screen.findByText('Không có trò chơi nào khớp bộ lọc')
    expect(screen.queryByText('Chưa có trò chơi nào')).toBeNull()
    // Bộ lọc vẫn còn (không biến mất) để giáo viên đổi lựa chọn.
    expect(screen.getByLabelText('Trạng thái')).toHaveValue('PUBLISHED')

    mockedGetGames.mockResolvedValue(makeGames(FILTER_MIN_GAMES))
    await user.click(screen.getByRole('button', { name: 'Bỏ bộ lọc' }))

    await screen.findByText('Trò chơi 1')
    expect(screen.getByLabelText('Trạng thái')).toHaveValue('')
    expect(mockedGetGames).toHaveBeenLastCalledWith({
      subject: '',
      gradeLevel: '',
      status: '',
    })
  })

  it('đang tải hiện đúng một vùng trạng thái (không đọc lặp 3 lần)', () => {
    mockedGetGames.mockReturnValue(new Promise(() => {}))
    renderDashboard()

    expect(screen.getAllByRole('status')).toHaveLength(1)
  })

  it('quá hạn (máy chủ treo) thì báo lỗi ngay, không thử lại', async () => {
    mockedGetGames.mockRejectedValue(
      new AxiosError('timeout of 10000ms exceeded', 'ECONNABORTED'),
    )
    renderDashboard()

    await screen.findByRole('alert')
    expect(mockedGetGames).toHaveBeenCalledTimes(1)
  })

  it('lỗi tải danh sách hiện thông báo và nút Thử lại gọi lại API', async () => {
    const user = userEvent.setup()
    mockedGetGames.mockRejectedValue(new Error('mạng lỗi'))
    renderDashboard()

    // Dashboard thử lại đúng 1 lần (cách nhau khoảng 1 giây) rồi mới báo lỗi.
    const alert = await screen.findByRole('alert', {}, { timeout: 4000 })
    expect(mockedGetGames).toHaveBeenCalledTimes(2)
    expect(
      within(alert).getByText('Không thể tải danh sách trò chơi'),
    ).toBeInTheDocument()

    mockedGetGames.mockResolvedValue([makeGame(1, { title: 'Đã tải lại' })])
    await user.click(within(alert).getByRole('button', { name: 'Thử lại' }))

    await screen.findByText('Đã tải lại')
    expect(mockedGetGames).toHaveBeenCalledTimes(3)
  })
})
