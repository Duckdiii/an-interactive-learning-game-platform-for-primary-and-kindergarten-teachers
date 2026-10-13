import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getGames } from '../api/gamesApi'
import App from '../App'
import LoadingSpinner from '../components/LoadingSpinner'
import { AuthProvider } from '../context/AuthContext'
import { storeSession } from '../utils/authStorage'

vi.mock('../api/gamesApi', () => ({ getGames: vi.fn() }))
// Sandbox Canvas (chỉ có ở bản dev) kéo theo react-konva, không cần cho test giao diện giáo viên.
vi.mock('./dev/CanvasSandbox', () => ({ default: () => null }))

// Từ tiếng Anh dành cho lập trình viên không được lọt ra giao diện giáo viên.
const ENGLISH_UI_TEXT =
  /Teacher Console|Teacher workspace|Teacher access|Sign out|Signed in|Workspace|Dashboard|Drafts|Published|Shared|Editor|Library|Placeholder|Welcome back|Page not found|Back to|Create workspace|Open editor|Loading|Frontend skeleton|\bLogin\b|\bRegister\b|\bAdd\b/

const mockedGetGames = vi.mocked(getGames)

// Render <App /> thật để bắt cả lỗi khai báo route và ProtectedRoute.
function renderApp(initialPath: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={[initialPath]}>
          <App />
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  )
}

describe('giao diện giáo viên bằng tiếng Việt', () => {
  beforeEach(() => {
    localStorage.clear()
    storeSession({ id: 't1', email: 'giaovien@example.com' }, 'token', 'refresh')
    mockedGetGames.mockResolvedValue([])
  })

  afterEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it.each([
    '/login',
    '/register',
    '/dashboard',
    '/games/new',
    '/workspace',
    '/workspace/editor',
    '/khong-ton-tai',
  ])('trang %s không còn chữ tiếng Anh dành cho lập trình viên', async (path) => {
    renderApp(path)

    // Dashboard gọi API bất đồng bộ: chờ trạng thái trống hiện ra rồi mới kiểm.
    if (path === '/dashboard') {
      await screen.findByText('Chưa có trò chơi nào')
    }

    expect(document.body.textContent).not.toMatch(ENGLISH_UI_TEXT)
  })

  it('cả hai thanh điều hướng (máy tính và màn hình nhỏ) đều có đúng 3 mục', () => {
    renderApp('/workspace')

    const navs = screen.getAllByRole('navigation', { name: /Điều hướng chính/ })
    expect(navs).toHaveLength(2)

    for (const nav of navs) {
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

  it('đang ở trình soạn thảo thì mục "Trò chơi của tôi" vẫn được tô sáng', () => {
    renderApp('/workspace/editor')

    const nav = screen.getAllByRole('navigation', { name: /Điều hướng chính/ })[0]
    expect(within(nav).getByRole('link', { name: 'Trò chơi của tôi' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(within(nav).getByRole('link', { name: 'Trang chủ' })).not.toHaveAttribute(
      'aria-current',
    )
  })

  it('placeholder và nhãn trợ năng cũng bằng tiếng Việt', () => {
    const { unmount } = renderApp('/login')
    expect(screen.getByPlaceholderText('giaovien@example.com')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Nhập mật khẩu')).toBeInTheDocument()
    unmount()

    renderApp('/dashboard')
    expect(
      screen.getAllByRole('navigation', { name: 'Điều hướng chính' }),
    ).toHaveLength(1)
    expect(
      screen.getByRole('navigation', { name: 'Điều hướng chính (màn hình nhỏ)' }),
    ).toBeInTheDocument()
  })

  it('LoadingSpinner có nhãn mặc định tiếng Việt', () => {
    render(<LoadingSpinner />)

    expect(screen.getByText('Đang tải')).toBeInTheDocument()
  })

  it('header hiển thị nút Đăng xuất và trạng thái đã đăng nhập', () => {
    renderApp('/dashboard')

    expect(screen.getByRole('button', { name: 'Đăng xuất' })).toBeInTheDocument()
    expect(screen.getByText('Đã đăng nhập')).toBeInTheDocument()
    expect(screen.getByText('giaovien@example.com')).toBeInTheDocument()
  })

  it('trang Trò chơi của tôi vẫn dẫn tới trình soạn thảo qua nút hành động', () => {
    renderApp('/workspace')

    expect(
      screen.getByRole('link', { name: 'Soạn trò chơi mới' }),
    ).toHaveAttribute('href', '/workspace/editor')
    expect(
      screen.getByRole('link', { name: 'Mở trình soạn thảo' }),
    ).toHaveAttribute('href', '/workspace/editor')
  })

  it('trang Tạo game mới nói rõ tính năng sắp ra mắt và có lối về Trang chủ', () => {
    renderApp('/games/new')

    expect(screen.getByText('Tính năng sắp ra mắt')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Về Trang chủ' })).toHaveAttribute(
      'href',
      '/dashboard',
    )
  })
})

describe('Dashboard: nhãn tiếng Việt, giá trị gửi API giữ nguyên enum', () => {
  beforeEach(() => {
    localStorage.clear()
    storeSession({ id: 't1', email: 'giaovien@example.com' }, 'token', 'refresh')
    mockedGetGames.mockResolvedValue([
      {
        id: 'g1',
        title: 'Đếm số đến 10',
        subject: 'MATH',
        gradeLevel: 'GRADE_1',
        status: 'DRAFT',
        thumbnailUrl: null,
      },
    ])
  })

  afterEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('thẻ game hiển thị môn, khối lớp và trạng thái bằng tiếng Việt', async () => {
    renderApp('/dashboard')

    const card = (await screen.findByText('Đếm số đến 10')).closest('article')
    expect(card).not.toBeNull()
    expect(within(card as HTMLElement).getByText('Toán · Lớp 1')).toBeInTheDocument()
    expect(within(card as HTMLElement).getByText('Bản nháp')).toBeInTheDocument()
  })

  it('bộ lọc hiển thị nhãn Việt nhưng gửi giá trị enum gốc lên API', async () => {
    const user = userEvent.setup()
    renderApp('/dashboard')
    await screen.findByText('Đếm số đến 10')

    const statusSelect = screen.getByLabelText('Trạng thái')
    const draftOption = within(statusSelect).getByRole('option', {
      name: 'Bản nháp',
    })
    expect(draftOption).toHaveValue('DRAFT')
    expect(
      within(statusSelect).getByRole('option', { name: 'Đã đăng' }),
    ).toHaveValue('PUBLISHED')

    await user.selectOptions(statusSelect, 'DRAFT')

    await waitFor(() =>
      expect(mockedGetGames).toHaveBeenLastCalledWith({
        subject: '',
        gradeLevel: '',
        status: 'DRAFT',
      }),
    )
  })

  it('ô chọn Khối lớp xếp Mầm non trước Lớp 1, không theo thứ tự chữ cái của enum', async () => {
    mockedGetGames.mockResolvedValue([
      {
        id: 'g1',
        title: 'Trò chơi A',
        subject: 'MATH',
        gradeLevel: 'GRADE_2',
        status: 'PUBLISHED',
        thumbnailUrl: null,
      },
      {
        id: 'g2',
        title: 'Trò chơi B',
        subject: 'ENGLISH',
        gradeLevel: 'KINDERGARTEN',
        status: 'DRAFT',
        thumbnailUrl: null,
      },
      {
        id: 'g3',
        title: 'Trò chơi C',
        subject: 'VIETNAMESE',
        gradeLevel: 'GRADE_1',
        status: 'DRAFT',
        thumbnailUrl: null,
      },
    ])
    renderApp('/dashboard')
    await screen.findByText('Trò chơi A')

    const optionTexts = (labelText: string) =>
      within(screen.getByLabelText(labelText))
        .getAllByRole('option')
        .map((option) => option.textContent)

    expect(optionTexts('Khối lớp')).toEqual([
      'Tất cả',
      'Mầm non',
      'Lớp 1',
      'Lớp 2',
    ])
    expect(optionTexts('Môn học')).toEqual([
      'Tất cả',
      'Toán',
      'Tiếng Việt',
      'Tiếng Anh',
    ])
  })
})
