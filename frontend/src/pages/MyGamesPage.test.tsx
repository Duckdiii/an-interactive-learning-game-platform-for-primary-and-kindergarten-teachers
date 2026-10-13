import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getGames } from '../api/gamesApi'
import { loginAsTeacher, makeGame, mockClipboard, renderWithProviders } from '../test/renderWithApp'
import MyGamesPage from './MyGamesPage'

vi.mock('../api/gamesApi', () => ({ getGames: vi.fn() }))

const mockedGetGames = vi.mocked(getGames)

// Hiện địa chỉ hiện tại để kiểm tra bộ lọc nằm trên URL.
function LocationProbe() {
  const location = useLocation()

  return <output data-testid="url">{location.pathname + location.search}</output>
}

const renderPage = (path = '/workspace') =>
  renderWithProviders(
    <>
      <MyGamesPage />
      <LocationProbe />
    </>,
    path,
  )

const GAMES = [
  makeGame(1, { title: 'Đếm số đến 10', subject: 'MATH', gradeLevel: 'GRADE_1', status: 'DRAFT' }),
  makeGame(2, {
    title: 'Nhận biết chữ cái A Ă Â',
    subject: 'VIETNAMESE',
    gradeLevel: 'KINDERGARTEN',
    status: 'PUBLISHED',
    shareCode: 'A3F9K2',
  }),
  makeGame(3, { title: 'Từ vựng về con vật', subject: 'ENGLISH', gradeLevel: 'GRADE_2', status: 'DRAFT' }),
  makeGame(4, {
    title: 'Phép cộng trong phạm vi 20',
    subject: 'MATH',
    gradeLevel: 'GRADE_1',
    status: 'PUBLISHED',
    shareCode: 'K7P2QM',
  }),
]

const titles = () => screen.queryAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)

describe('Trò chơi của tôi', () => {
  beforeEach(() => {
    loginAsTeacher()
    mockClipboard()
    mockedGetGames.mockResolvedValue(GAMES)
  })
  afterEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('tải đúng một lần rồi hiện đủ game kèm số đếm theo trạng thái', async () => {
    renderPage()

    expect(await screen.findByText('4 trò chơi')).toBeInTheDocument()
    expect(titles()).toHaveLength(4)
    expect(screen.getByRole('radio', { name: /Tất cả/ })).toHaveAccessibleName('Tất cả 4')
    expect(screen.getByRole('radio', { name: /Bản nháp/ })).toHaveAccessibleName('Bản nháp 2')
    expect(screen.getByRole('radio', { name: /Đã đăng/ })).toHaveAccessibleName('Đã đăng 2')
    expect(mockedGetGames).toHaveBeenCalledTimes(1)
  })

  it('đổi tab trạng thái lọc ngay ở máy (không gọi lại API) và ghi lên địa chỉ', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('4 trò chơi')

    await user.click(screen.getByRole('radio', { name: /Đã đăng/ }))

    expect(await screen.findByText('Hiển thị 2 trên 4 trò chơi')).toBeInTheDocument()
    expect(titles()).toEqual(['Nhận biết chữ cái A Ă Â', 'Phép cộng trong phạm vi 20'])
    expect(screen.getByTestId('url')).toHaveTextContent('/workspace?status=PUBLISHED')
    expect(mockedGetGames).toHaveBeenCalledTimes(1)
  })

  it('mở trang với ?status=DRAFT thì tab Bản nháp đã chọn sẵn (từ nút thống kê ở Trang chủ)', async () => {
    renderPage('/workspace?status=DRAFT')

    expect(await screen.findByText('Hiển thị 2 trên 4 trò chơi')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Bản nháp/ })).toBeChecked()
  })

  it('tìm theo tên không cần gõ dấu và giữ từ khóa trên địa chỉ', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('4 trò chơi')

    await user.type(screen.getByRole('searchbox', { name: 'Tìm theo tên trò chơi' }), 'dem so')

    expect(await screen.findByText('Hiển thị 1 trên 4 trò chơi')).toBeInTheDocument()
    expect(titles()).toEqual(['Đếm số đến 10'])
    expect(screen.getByTestId('url').textContent).toMatch(/q=dem(\+|%20)so/)
  })

  it('lọc theo môn và khối lớp, kết hợp được với nhau', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('4 trò chơi')

    await user.selectOptions(screen.getByLabelText('Môn học'), 'MATH')
    expect(await screen.findByText('Hiển thị 2 trên 4 trò chơi')).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Khối lớp'), 'GRADE_2')
    expect(await screen.findByText('Không có trò chơi nào khớp')).toBeInTheDocument()
    expect(screen.getByTestId('url')).toHaveTextContent('subject=MATH')
    expect(screen.getByTestId('url')).toHaveTextContent('grade=GRADE_2')
  })

  it('không khớp thì nói rõ và "Bỏ tìm kiếm và bộ lọc" trả lại đủ danh sách', async () => {
    const user = userEvent.setup()
    renderPage('/workspace?q=khong-co-game-nay&status=DRAFT')

    expect(await screen.findByText('Không có trò chơi nào khớp')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Bỏ tìm kiếm và bộ lọc' }))

    expect(await screen.findByText('4 trò chơi')).toBeInTheDocument()
    expect(titles()).toHaveLength(4)
    expect(screen.getByTestId('url')).toHaveTextContent(/^\/workspace$/)
  })

  it('sao chép mã chơi của game đã đăng', async () => {
    const user = userEvent.setup()
    const writeText = mockClipboard()
    renderPage('/workspace?status=PUBLISHED')
    await screen.findByText('Hiển thị 2 trên 4 trò chơi')

    await user.click(screen.getByRole('button', { name: 'Sao chép mã K7P2QM' }))

    expect(writeText).toHaveBeenCalledWith('K7P2QM')
  })

  it('chưa có game nào: trạng thái trống có nút tạo trò chơi đầu tiên', async () => {
    mockedGetGames.mockResolvedValue([])
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Bạn chưa có trò chơi nào' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Tạo trò chơi đầu tiên' })).toHaveAttribute('href', '/games/new')
    expect(screen.queryByRole('searchbox')).toBeNull()
  })

  it('lỗi tải: thông báo có nút Thử lại', async () => {
    const user = userEvent.setup()
    mockedGetGames.mockRejectedValue(new Error('lỗi'))
    renderPage()

    // Thử lại 1 lần (cách nhau khoảng 1 giây) rồi mới báo lỗi.
    const alert = await screen.findByRole('alert', {}, { timeout: 4000 })
    mockedGetGames.mockResolvedValue(GAMES)
    await user.click(within(alert).getByRole('button', { name: 'Thử lại' }))

    expect(await screen.findByText('4 trò chơi')).toBeInTheDocument()
  })

  it('nút Tạo game mới ở đầu trang dẫn tới trang tạo game', async () => {
    renderPage()
    await screen.findByText('4 trò chơi')

    expect(screen.getByRole('link', { name: 'Tạo game mới' })).toHaveAttribute('href', '/games/new')
  })
})
