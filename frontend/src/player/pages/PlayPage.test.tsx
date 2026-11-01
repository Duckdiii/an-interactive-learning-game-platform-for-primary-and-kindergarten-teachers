import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { configure, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../App'
import { setMockScenario } from '../../services/mock/mockRuntime'

// Render qua App để kiểm cả việc /play/:shareCode là route công khai (không bị đẩy sang trang đăng nhập).
function openPlay(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

// Không dùng vi.unstubAllEnvs(): nó gỡ cả độ trễ 0 của test-setup.
// Trang chơi tải lười (Canvas, renderer): lần đầu trong file test có thể chậm hơn 1 giây mặc định của findBy.
configure({ asyncUtilTimeout: 10_000 })

beforeEach(() => vi.stubEnv('VITE_PLAYER_API', 'mock'))
afterEach(() => {
  setMockScenario('normal')
  sessionStorage.clear()
  vi.stubEnv('VITE_PLAYER_API', '')
  // Khôi phục ở đây (không ở cuối test) để test hỏng giữa chừng không để lại độ trễ cho các test sau.
  vi.stubEnv('VITE_MOCK_LATENCY_MS', '0')
})

describe('PlayPage (/play/:shareCode)', () => {
  it('đang tải: hiện "Đang mở trò chơi…" (role status), rồi vào game', async () => {
    vi.stubEnv('VITE_MOCK_LATENCY_MS', '300')
    openPlay('/play/MOCK00')

    expect((await screen.findByText('Đang mở trò chơi…')).closest('[role="status"]')).not.toBeNull()
    expect(await screen.findByRole('heading', { name: /Đếm số đến 10/ })).toBeInTheDocument()
  })

  it('mã hợp lệ: không cần đăng nhập, hiện tên game, khung Bé cho Mầm non', async () => {
    const { container } = openPlay('/play/MOCK00')

    expect(await screen.findByRole('heading', { name: /Đếm số đến 10/ })).toBeInTheDocument()
    expect(container.querySelector('[data-band]')).toHaveAttribute('data-band', 'be')
  })

  it('giáo viên ghi đè sang Học sinh thì dùng khung Học sinh dù game là Mầm non', async () => {
    const { container } = openPlay('/play/MOCK10')

    await screen.findByRole('heading', { name: /Đếm số đến 10/ })
    expect(container.querySelector('[data-band]')).toHaveAttribute('data-band', 'hocSinh')
  })

  it('mã không có: hiện "Không tìm thấy trò chơi", không có nút thử lại', async () => {
    openPlay('/play/ZZZZZZ')

    expect(await screen.findByRole('heading', { name: 'Ôi, chưa mở được trò chơi' })).toBeInTheDocument()
    expect(screen.getByText(/Dành cho người lớn: Không tìm thấy trò chơi · mã lỗi SHARE_CODE_NOT_FOUND/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Thử lại' })).not.toBeInTheDocument()
  })

  it('mã hết hạn (MOCKEX): màn lỗi dịu cho người lớn kèm mã GAME_EXPIRED, không có nút thử lại', async () => {
    openPlay('/play/MOCKEX')

    expect(await screen.findByText(/Dành cho người lớn:.*GAME_EXPIRED/)).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Nhờ bố mẹ kiểm tra mạng và đường dẫn nhé.')
    expect(screen.queryByRole('button', { name: 'Thử lại' })).not.toBeInTheDocument()
  })

  it('mất mạng khi mở: có nút Thử lại; mạng về rồi bấm thì vào màn chào', async () => {
    setMockScenario('error')
    openPlay('/play/MOCK00')

    expect(await screen.findByText(/mã lỗi NET-01/)).toBeInTheDocument()

    setMockScenario('normal')
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))

    expect(await screen.findByRole('button', { name: 'Bắt đầu' })).toBeInTheDocument()
  })

  it('Backend chưa hỗ trợ (VITE_PLAYER_API=real): báo lỗi nhẹ nhàng và có nút thử lại', async () => {
    vi.stubEnv('VITE_PLAYER_API', 'real')
    openPlay('/play/MOCK00')

    expect(await screen.findByRole('heading', { name: 'Ôi, chưa mở được trò chơi' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeInTheDocument()
  })
})
