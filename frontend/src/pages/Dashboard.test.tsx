import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getGames } from '../api/gamesApi'
import { loginAsTeacher, makeGame, renderWithProviders } from '../test/renderWithApp'
import Dashboard from './Dashboard'

vi.mock('../api/gamesApi', () => ({ getGames: vi.fn() }))

const mockedGetGames = vi.mocked(getGames)

const renderDashboard = () => renderWithProviders(<Dashboard />)

describe('Trang chủ giáo viên', () => {
  beforeEach(() => loginAsTeacher())
  afterEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('chào bằng tên (từ cuối của họ tên) và có câu hỏi thân thiện', async () => {
    mockedGetGames.mockResolvedValue([])
    renderDashboard()

    expect(screen.getByRole('heading', { level: 1, name: 'Xin chào, Lan' })).toBeInTheDocument()
    expect(screen.getByText('Hôm nay bạn muốn dạy gì cho các bé?')).toBeInTheDocument()
    await screen.findByText('Bắt đầu với trò chơi đầu tiên')
  })

  it('không có họ tên thì chỉ chào chung, không in "undefined"', () => {
    localStorage.clear()
    mockedGetGames.mockResolvedValue([])
    renderDashboard()

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/^Xin chào$/)
  })

  it('luôn có khối tạo game với hai lối vào: từ ý tưởng và ngẫu nhiên', () => {
    mockedGetGames.mockResolvedValue([])
    renderDashboard()
    const hero = within(screen.getByRole('region', { name: /Tạo trò chơi mới/ }))

    expect(hero.getByText('Đang hoàn thiện')).toBeInTheDocument()
    expect(hero.getByRole('link', { name: 'Tạo từ ý tưởng' })).toHaveAttribute('href', '/games/new')
    expect(hero.getByRole('link', { name: 'Tạo ngẫu nhiên' })).toHaveAttribute('href', '/games/new?random=1')
  })

  it('đang tải hiện đúng một vùng trạng thái cho trình đọc màn hình', () => {
    mockedGetGames.mockReturnValue(new Promise(() => {}))
    renderDashboard()

    expect(screen.getAllByRole('status')).toHaveLength(1)
    expect(screen.getByRole('status')).toHaveAccessibleName('Đang tải trò chơi')
  })

  it('có game: thống kê dẫn thẳng tới bộ lọc tương ứng', async () => {
    mockedGetGames.mockResolvedValue([
      makeGame(1),
      makeGame(2),
      makeGame(3, { status: 'PUBLISHED', shareCode: 'A3F9K2' }),
    ])
    renderDashboard()
    const stats = within(await screen.findByRole('region', { name: 'Thống kê trò chơi' }))

    expect(stats.getByRole('link', { name: /Tất cả/ })).toHaveAttribute('href', '/workspace')
    expect(stats.getByRole('link', { name: /Bản nháp/ })).toHaveAttribute('href', '/workspace?status=DRAFT')
    expect(stats.getByRole('link', { name: /Đã đăng/ })).toHaveAttribute('href', '/workspace?status=PUBLISHED')
    expect(stats.getByRole('link', { name: /Tất cả/ })).toHaveTextContent('3')
    expect(stats.getByRole('link', { name: /Bản nháp/ })).toHaveTextContent('2')
    expect(stats.getByRole('link', { name: /Đã đăng/ })).toHaveTextContent('1')
  })

  it('"Tiếp tục soạn" chỉ có bản nháp, mới cập nhật nhất lên đầu và tối đa 3', async () => {
    const hours = (n: number) => new Date(Date.now() - n * 3_600_000).toISOString()
    mockedGetGames.mockResolvedValue([
      makeGame(1, { title: 'Nháp cũ nhất', updatedAt: hours(50) }),
      makeGame(2, { title: 'Nháp mới nhất', updatedAt: hours(1) }),
      makeGame(3, { title: 'Đã đăng mới', status: 'PUBLISHED', shareCode: 'ABC123', updatedAt: hours(0.5) }),
      makeGame(4, { title: 'Nháp giữa', updatedAt: hours(10) }),
      makeGame(5, { title: 'Nháp thứ tư', updatedAt: hours(20) }),
    ])
    renderDashboard()
    const section = within(await screen.findByRole('region', { name: 'Tiếp tục soạn' }))

    const titles = section.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)
    expect(titles).toEqual(['Nháp mới nhất', 'Nháp giữa', 'Nháp thứ tư'])
    expect(section.queryByText('Đã đăng mới')).toBeNull()
    expect(section.queryByText('Nháp cũ nhất')).toBeNull()
  })

  it('chỉ có game đã đăng thì nói rõ không có bản nháp dở dang', async () => {
    mockedGetGames.mockResolvedValue([makeGame(1, { status: 'PUBLISHED', shareCode: 'ABC123' })])
    renderDashboard()

    expect(await screen.findByText('Bạn không có bản nháp nào đang soạn dở.')).toBeInTheDocument()
  })

  it('chưa có game nào: hướng dẫn 3 bước (không lặp nút tạo game)', async () => {
    mockedGetGames.mockResolvedValue([])
    renderDashboard()
    const guide = within(await screen.findByRole('region', { name: 'Bắt đầu với trò chơi đầu tiên' }))

    expect(guide.getAllByRole('listitem')).toHaveLength(3)
    // Khối tạo game ở trên đã là lối vào duy nhất, hướng dẫn không lặp thêm nút.
    expect(guide.queryByRole('link')).toBeNull()
    expect(screen.getAllByRole('link', { name: /Tạo từ ý tưởng/ })).toHaveLength(1)
    expect(screen.queryByRole('region', { name: 'Thống kê trò chơi' })).toBeNull()
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
})
