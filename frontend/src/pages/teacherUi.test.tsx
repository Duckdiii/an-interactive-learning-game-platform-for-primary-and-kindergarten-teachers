import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getGames } from '../api/gamesApi'
import App from '../App'
import LoadingSpinner from '../components/LoadingSpinner'
import { loginAsTeacher, makeGame, renderWithProviders } from '../test/renderWithApp'

vi.mock('../api/gamesApi', () => ({ getGames: vi.fn() }))
// Sandbox Canvas (chỉ có ở bản dev) kéo theo react-konva, không cần cho test giao diện giáo viên.
vi.mock('./dev/CanvasSandbox', () => ({ default: () => null }))

// Từ tiếng Anh dành cho lập trình viên không được lọt ra giao diện giáo viên.
const ENGLISH_UI_TEXT =
  /Teacher Console|Teacher workspace|Teacher access|Sign out|Signed in|Workspace|Dashboard|Drafts|Published|Shared|Editor|Library|Placeholder|Welcome back|Page not found|Back to|Create workspace|Open editor|Loading|Frontend skeleton|\bLogin\b|\bRegister\b|\bAdd\b/

const mockedGetGames = vi.mocked(getGames)

const renderApp = (path: string) => renderWithProviders(<App />, path)

// Mỗi route lazy nên phải chờ tiêu đề trang chính (h1) hiện ra rồi mới kiểm.
const waitForPage = (name: RegExp | string) =>
  screen.findByRole('heading', { level: 1, name }, { timeout: 5000 })

describe('giao diện giáo viên bằng tiếng Việt', () => {
  beforeEach(() => {
    loginAsTeacher()
    mockedGetGames.mockResolvedValue([makeGame(1)])
  })
  afterEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it.each([
    ['/login', 'Đăng nhập'],
    ['/register', 'Tạo tài khoản'],
    ['/dashboard', /Xin chào/],
    ['/games/new', 'Tạo game mới'],
    ['/workspace', 'Trò chơi của tôi'],
    ['/workspace/editor', /Trình soạn thảo/],
    ['/khong-ton-tai', 'Không tìm thấy trang'],
  ])('trang %s không còn chữ tiếng Anh dành cho lập trình viên', async (path, heading) => {
    renderApp(path)
    await waitForPage(heading)
    if (path === '/dashboard' || path === '/workspace') await screen.findByText('Trò chơi 1')

    expect(document.body.textContent).not.toMatch(ENGLISH_UI_TEXT)
  })

  it.each([
    ['/login', 'Đăng nhập'],
    ['/register', 'Đăng ký'],
    ['/dashboard', 'Trang chủ'],
    ['/games/new', 'Tạo game mới'],
    ['/workspace', 'Trò chơi của tôi'],
    ['/workspace/editor', 'Soạn thảo'],
    ['/khong-ton-tai', 'Không tìm thấy trang'],
  ])('trang %s có tiêu đề tab riêng "%s · AI Game Platform"', async (path, title) => {
    renderApp(path)
    await screen.findByRole('heading', { level: 1 })

    await waitFor(() => expect(document.title).toBe(`${title} · AI Game Platform`))
  })

  it('cả thanh bên (máy tính) và thanh dưới (điện thoại) đều có đúng 3 mục', async () => {
    renderApp('/workspace')
    await waitForPage('Trò chơi của tôi')

    for (const name of ['Điều hướng chính', 'Điều hướng chính (thanh dưới)']) {
      const nav = screen.getByRole('navigation', { name })
      const links = within(nav).getAllByRole('link')

      expect(links.map((link) => link.textContent)).toEqual([
        'Trang chủ',
        'Trò chơi của tôi',
        'Tạo game mới',
      ])
      expect(links.map((link) => link.getAttribute('href'))).toEqual([
        '/dashboard',
        '/workspace',
        '/games/new',
      ])
    }
  })

  it('đang ở trình soạn thảo thì mục "Trò chơi của tôi" vẫn sáng ở cả hai thanh', async () => {
    renderApp('/workspace/editor')
    await waitForPage(/Trình soạn thảo/)

    for (const name of ['Điều hướng chính', 'Điều hướng chính (thanh dưới)']) {
      const nav = screen.getByRole('navigation', { name })

      expect(within(nav).getByRole('link', { name: 'Trò chơi của tôi' })).toHaveAttribute('aria-current', 'page')
      expect(within(nav).getByRole('link', { name: 'Trang chủ' })).not.toHaveAttribute('aria-current')
    }
  })

  it('thẻ người dùng hiện tên và email; Đăng xuất đưa về trang đăng nhập', async () => {
    const user = userEvent.setup()
    renderApp('/dashboard')
    await waitForPage(/Xin chào/)

    expect(screen.getAllByText('Nguyễn Thị Lan').length).toBeGreaterThan(0)
    expect(screen.getByText('lan@truong.edu.vn')).toBeInTheDocument()

    await user.click(screen.getAllByRole('button', { name: 'Đăng xuất' })[0])

    expect(await screen.findByRole('heading', { level: 1, name: 'Đăng nhập' })).toBeInTheDocument()
    expect(localStorage.getItem('accessToken')).toBeNull()
  })

  it('chưa đăng nhập mà vào trang giáo viên thì bị đưa về trang đăng nhập', async () => {
    localStorage.clear()
    renderApp('/workspace')

    expect(await screen.findByRole('heading', { level: 1, name: 'Đăng nhập' })).toBeInTheDocument()
  })

  it('có liên kết "Bỏ qua điều hướng" trỏ tới nội dung chính và nằm trước mọi liên kết khác', async () => {
    renderApp('/dashboard')
    await waitForPage(/Xin chào/)

    const skip = screen.getByRole('link', { name: /Bỏ qua điều hướng/ })
    expect(skip).toHaveAttribute('href', '#main')
    expect(document.getElementById('main')).toHaveAttribute('tabindex', '-1')
    expect(document.querySelector('a')).toBe(skip)
  })

  it('lúc vừa mở trang KHÔNG chuyển tiêu điểm; đổi trang trong ứng dụng thì tiêu điểm về nội dung chính', async () => {
    const user = userEvent.setup()
    renderApp('/dashboard')
    await waitForPage(/Xin chào/)
    expect(document.getElementById('main')).not.toHaveFocus()

    const nav = screen.getByRole('navigation', { name: 'Điều hướng chính' })
    await user.click(within(nav).getByRole('link', { name: 'Tạo game mới' }))
    await waitForPage('Tạo game mới')

    await waitFor(() => expect(document.getElementById('main')).toHaveFocus())
  })

  it('"Tạo ngẫu nhiên" từ Trang chủ: tiêu điểm ở lại ô khối lớp, không bị layout kéo về nội dung chính', async () => {
    const user = userEvent.setup()
    renderApp('/dashboard')
    await waitForPage(/Xin chào/)

    await user.click(screen.getByRole('link', { name: /Tạo ngẫu nhiên/ }))
    await waitForPage('Tạo game mới')

    const grade = screen.getByLabelText(/Khối lớp/)
    await waitFor(() => expect(grade).toHaveFocus())
    expect(document.getElementById('main')).not.toHaveFocus()
  })

  it('placeholder và tên trợ năng cũng bằng tiếng Việt', async () => {
    localStorage.clear()
    renderApp('/login')
    await waitForPage('Đăng nhập')

    expect(screen.getByPlaceholderText('giaovien@example.com')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Nhập mật khẩu')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Hiện mật khẩu' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Đăng nhập hoặc đăng ký' })).toBeInTheDocument()
  })

  it('trang đăng nhập có đúng một h1 và là tiêu đề của biểu mẫu', async () => {
    localStorage.clear()
    renderApp('/login')
    await waitForPage('Đăng nhập')

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })

  it('LoadingSpinner có nhãn mặc định tiếng Việt', () => {
    render(<LoadingSpinner />)

    expect(screen.getByText('Đang tải')).toBeInTheDocument()
  })
})
