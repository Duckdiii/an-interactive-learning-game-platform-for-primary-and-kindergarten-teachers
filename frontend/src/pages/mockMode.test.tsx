import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loginTeacher } from '../api/authApi'
import { getGames } from '../api/gamesApi'
import App from '../App'
import MockBadge from '../components/ui/MockBadge'
import MockBanner from '../components/ui/MockBanner'
import { resetMockGames } from '../services/mock/mockGames'
import { setMockScenario } from '../services/mock/mockRuntime'
import { loginAsTeacher, renderWithProviders } from '../test/renderWithApp'

vi.mock('../api/gamesApi', () => ({ getGames: vi.fn() }))
vi.mock('../api/authApi', () => ({ loginTeacher: vi.fn(), registerTeacher: vi.fn() }))
// Sandbox Canvas (chỉ có ở bản dev) kéo theo react-konva, không cần cho các test này.
vi.mock('./dev/CanvasSandbox', () => ({ default: () => null }))

const mockedGetGames = vi.mocked(getGames)
const mockedLogin = vi.mocked(loginTeacher)

beforeEach(() => {
  loginAsTeacher()
  resetMockGames()
})
afterEach(() => {
  vi.stubEnv('VITE_USE_MOCK', 'none')
  setMockScenario('normal')
  localStorage.clear()
  vi.clearAllMocks()
})

describe('MockBadge', () => {
  it('ghi đúng chữ "Dữ liệu mô phỏng"', () => {
    renderWithProviders(<MockBadge />)

    expect(screen.getByText('Dữ liệu mô phỏng')).toBeInTheDocument()
  })
})

describe('MockBanner', () => {
  it('không hiện khi không nhóm nào mô phỏng', () => {
    vi.stubEnv('VITE_USE_MOCK', 'none')
    renderWithProviders(<MockBanner />)

    expect(screen.queryByRole('note')).toBeNull()
  })

  it('hiện "Đang dùng dữ liệu mô phỏng" kèm tên các nhóm đang mô phỏng bằng tiếng Việt', () => {
    vi.stubEnv('VITE_USE_MOCK', 'games,ai')
    renderWithProviders(<MockBanner />)
    const banner = within(screen.getByRole('note'))

    expect(banner.getByText('Đang dùng dữ liệu mô phỏng')).toBeInTheDocument()
    expect(screen.getByRole('note')).toHaveTextContent('danh sách trò chơi, kết quả AI')
  })
})

describe('trang giáo viên ở chế độ mô phỏng (nhóm games)', () => {
  beforeEach(() => vi.stubEnv('VITE_USE_MOCK', 'games'))

  it('Trò chơi của tôi hiện game mẫu có tên có nghĩa và banner mô phỏng, không gọi API thật', async () => {
    renderWithProviders(<App />, '/workspace')

    expect(await screen.findByText('Đếm số đến 10', {}, { timeout: 5000 })).toBeInTheDocument()
    expect(screen.getByText('Nhận biết chữ cái A Ă Â')).toBeInTheDocument()
    expect(screen.getByRole('note')).toHaveTextContent('Đang dùng dữ liệu mô phỏng')
    expect(mockedGetGames).not.toHaveBeenCalled()
  })

  it('kịch bản trống: hiện trạng thái chưa có trò chơi nào', async () => {
    setMockScenario('empty')
    renderWithProviders(<App />, '/workspace')

    expect(await screen.findByText('Bạn chưa có trò chơi nào', {}, { timeout: 5000 })).toBeInTheDocument()
  })

  it('kịch bản lỗi: báo kiểm tra mạng và nút Thử lại tải được dữ liệu sau khi hết lỗi', async () => {
    const user = userEvent.setup()
    setMockScenario('error')
    renderWithProviders(<App />, '/workspace')

    const alert = await screen.findByRole('alert', {}, { timeout: 8000 })
    expect(alert).toHaveTextContent('kiểm tra mạng')

    setMockScenario('normal')
    await user.click(screen.getByRole('button', { name: 'Thử lại' }))

    expect(await screen.findByText('Đếm số đến 10', {}, { timeout: 5000 })).toBeInTheDocument()
  })

  it('đăng nhập luôn gọi API thật dù bật mô phỏng mọi nhóm: loginTeacher được gọi với đúng email và mật khẩu', async () => {
    const user = userEvent.setup()
    vi.stubEnv('VITE_USE_MOCK', 'all')
    localStorage.clear()
    mockedLogin.mockResolvedValue({
      teacher: { teacherId: 't1', fullName: 'Nguyễn Thị Lan', email: 'lan@truong.edu.vn' },
      accessToken: 'a',
      refreshToken: 'r',
    } as Awaited<ReturnType<typeof loginTeacher>>)
    renderWithProviders(<App />, '/login')

    await user.type(await screen.findByLabelText('Email', {}, { timeout: 5000 }), 'lan@truong.edu.vn')
    await user.type(screen.getByLabelText('Mật khẩu'), 'matkhau123')
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }))

    expect(mockedLogin).toHaveBeenCalledWith({ email: 'lan@truong.edu.vn', password: 'matkhau123' })
    expect(await screen.findByRole('heading', { level: 1, name: /Xin chào/ }, { timeout: 5000 })).toBeInTheDocument()
    expect(screen.getByRole('note')).toHaveTextContent('Đang dùng dữ liệu mô phỏng')
  })
})

describe('trang giáo viên khi nhóm games KHÔNG mô phỏng', () => {
  it('gọi API thật và không hiện banner', async () => {
    vi.stubEnv('VITE_USE_MOCK', 'ai')
    mockedGetGames.mockResolvedValue([])
    renderWithProviders(<App />, '/workspace')

    expect(await screen.findByText('Bạn chưa có trò chơi nào', {}, { timeout: 5000 })).toBeInTheDocument()
    expect(mockedGetGames).toHaveBeenCalled()
    expect(screen.getByRole('note')).toHaveTextContent('kết quả AI')
  })
})
