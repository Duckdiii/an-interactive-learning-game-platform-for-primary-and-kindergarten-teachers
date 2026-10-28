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
    const filters = within(screen.getByRole('group', { name: 'Lọc trò chơi theo môn và trạng thái' }))
    expect(filters.getByRole('button', { name: 'Tất cả 4' })).toHaveAttribute('aria-pressed', 'true')
    expect(filters.getByRole('button', { name: 'Toán 2' })).toHaveAttribute('aria-pressed', 'false')
    expect(filters.getByRole('button', { name: 'Tiếng Việt 1' })).toBeInTheDocument()
    expect(filters.getByRole('button', { name: 'Tiếng Anh 1' })).toBeInTheDocument()
    expect(filters.getByRole('button', { name: 'Bản nháp 2' })).toHaveAttribute('aria-pressed', 'false')
    expect(mockedGetGames).toHaveBeenCalledTimes(1)
  })

  it('bấm chip môn lọc ngay ở máy (không gọi lại API), ghi lên địa chỉ; bấm lần nữa thì bỏ lọc', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('4 trò chơi')

    await user.click(screen.getByRole('button', { name: 'Toán 2' }))

    expect(await screen.findByText('Hiển thị 2 trên 4 trò chơi')).toBeInTheDocument()
    expect(titles()).toEqual(['Đếm số đến 10', 'Phép cộng trong phạm vi 20'])
    expect(screen.getByRole('button', { name: 'Toán 2' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('url')).toHaveTextContent('/workspace?subject=MATH')
    expect(mockedGetGames).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: 'Toán 2' }))
    expect(await screen.findByText('4 trò chơi')).toBeInTheDocument()
  })

  it('chip "Bản nháp" bật/tắt lọc bản nháp', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('4 trò chơi')

    await user.click(screen.getByRole('button', { name: 'Bản nháp 2' }))

    expect(await screen.findByText('Hiển thị 2 trên 4 trò chơi')).toBeInTheDocument()
    expect(titles()).toEqual(['Đếm số đến 10', 'Từ vựng về con vật'])
    expect(screen.getByRole('button', { name: 'Bản nháp 2' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('url')).toHaveTextContent('/workspace?status=DRAFT')

    await user.click(screen.getByRole('button', { name: 'Bản nháp 2' }))
    expect(await screen.findByText('4 trò chơi')).toBeInTheDocument()
  })

  it('mở trang với ?status=DRAFT thì chip Bản nháp đã bật sẵn (từ nút thống kê ở Trang chủ)', async () => {
    renderPage('/workspace?status=DRAFT')

    expect(await screen.findByText('Hiển thị 2 trên 4 trò chơi')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Bản nháp 2' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('tìm theo tên không cần gõ dấu và giữ từ khóa trên địa chỉ', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('4 trò chơi')

    await user.type(screen.getByRole('searchbox', { name: 'Tìm trò chơi' }), 'dem so')

    expect(await screen.findByText('Hiển thị 1 trên 4 trò chơi')).toBeInTheDocument()
    expect(titles()).toEqual(['Đếm số đến 10'])
    expect(screen.getByTestId('url').textContent).toMatch(/q=dem(\+|%20)so/)
  })

  it('lọc theo môn và khối lớp, kết hợp được với nhau', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('4 trò chơi')

    await user.click(screen.getByRole('button', { name: 'Toán 2' }))
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

  it('sao chép liên kết của game đã đăng qua menu "…"', async () => {
    const user = userEvent.setup()
    const writeText = mockClipboard()
    renderPage('/workspace?status=PUBLISHED')
    await screen.findByText('Hiển thị 2 trên 4 trò chơi')

    await user.click(screen.getByRole('button', { name: 'Thêm thao tác cho Phép cộng trong phạm vi 20' }))
    await user.click(screen.getByRole('button', { name: 'Sao chép liên kết' }))

    expect(writeText).toHaveBeenCalledWith(expect.stringMatching(/\/play\/K7P2QM$/))
  })

  it('đường dẫn ?status=PUBLISHED: chip "Đã đăng" bật, "Tất cả" không bật; bấm "Tất cả" thì bỏ cả lọc trạng thái', async () => {
    const user = userEvent.setup()
    renderPage('/workspace?status=PUBLISHED')
    await screen.findByText('Hiển thị 2 trên 4 trò chơi')
    const filters = within(screen.getByRole('group', { name: /lọc/i }))

    expect(filters.getByRole('button', { name: 'Đã đăng 2' })).toHaveAttribute('aria-pressed', 'true')
    expect(filters.getByRole('button', { name: 'Tất cả 4' })).toHaveAttribute('aria-pressed', 'false')

    await user.click(filters.getByRole('button', { name: 'Tất cả 4' }))

    expect(await screen.findByText('4 trò chơi')).toBeInTheDocument()
    expect(screen.getByTestId('url')).toHaveTextContent(/^\/workspace$/)
  })

  it('game đã đăng có nút Trình chiếu, bản nháp có nút Soạn tiếp', async () => {
    renderPage()
    await screen.findByText('4 trò chơi')

    expect(screen.getAllByRole('link', { name: /Trình chiếu/ })).toHaveLength(2)
    expect(screen.getAllByRole('link', { name: 'Soạn tiếp' })).toHaveLength(2)
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

  it('nút "+ Tạo trò chơi" ở đầu trang dẫn tới trang tạo game', async () => {
    renderPage()
    await screen.findByText('4 trò chơi')

    expect(screen.getByRole('link', { name: '+ Tạo trò chơi' })).toHaveAttribute('href', '/games/new')
  })
})
