import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetMockGames } from '../services/mock/mockGames'
import { setMockScenario } from '../services/mock/mockRuntime'
import { loginAsTeacher, renderWithProviders } from '../test/renderWithApp'
import WorkspaceEditor from './WorkspaceEditor'

// Trang soạn thảo chạy trên kho game mô phỏng (nhóm `editor`), không cần máy chủ.
const open = (query: string) => renderWithProviders(<WorkspaceEditor />, `/workspace/editor${query}`)

beforeEach(() => {
  vi.stubEnv('VITE_USE_MOCK', 'editor')
  loginAsTeacher()
  resetMockGames()
})
afterEach(() => {
  vi.stubEnv('VITE_USE_MOCK', 'none')
  setMockScenario('normal')
  localStorage.clear()
})

describe('trang soạn thảo: mở game', () => {
  it('thiếu gameId: nói rõ chưa chọn game và cho đường về', () => {
    open('')

    expect(screen.getByRole('heading', { level: 1, name: 'Chưa chọn trò chơi để soạn' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Về Trò chơi của tôi' })).toHaveAttribute('href', '/workspace')
  })

  it('đang tải: hiện trạng thái đang mở rồi hiện game', async () => {
    open('?gameId=mock-game-1')

    expect(screen.getByRole('status')).toHaveTextContent('Đang mở trò chơi')
    expect(await screen.findByRole('heading', { level: 1, name: 'Đếm số đến 10' })).toBeInTheDocument()
    expect(screen.queryByText('Đang mở trò chơi')).not.toBeInTheDocument()
  })

  it('hiện tiêu đề, trạng thái, nhãn mô phỏng và đủ số câu hỏi kèm tóm tắt', async () => {
    open('?gameId=mock-game-1')

    await screen.findByRole('heading', { level: 1, name: 'Đếm số đến 10' })
    const list = screen.getByRole('list', { name: 'Danh sách câu hỏi' })

    expect(within(list).getAllByRole('button')).toHaveLength(3)
    expect(screen.getAllByText('Dữ liệu mô phỏng').length).toBeGreaterThan(0)
    expect(screen.getByText('3 câu hỏi', { exact: false })).toBeInTheDocument()
  })

  it('chọn câu thì làm nổi bật (aria-current) và vùng xem đổi theo câu đó', async () => {
    const user = userEvent.setup()

    open('?gameId=mock-game-1')
    await screen.findByRole('heading', { level: 1, name: 'Đếm số đến 10' })
    const buttons = within(screen.getByRole('list', { name: 'Danh sách câu hỏi' })).getAllByRole('button')

    expect(buttons[0]).toHaveAttribute('aria-current', 'true')
    expect(buttons[1]).not.toHaveAttribute('aria-current')

    await user.click(buttons[1])

    expect(buttons[1]).toHaveAttribute('aria-current', 'true')
    expect(buttons[0]).not.toHaveAttribute('aria-current')
    expect(screen.getByText('Câu 2', { selector: 'p' })).toBeInTheDocument()
  })

  it('điện thoại: hai tab, chọn câu thì tự chuyển sang tab xem câu', async () => {
    const user = userEvent.setup()

    open('?gameId=mock-game-1')
    await screen.findByRole('heading', { level: 1, name: 'Đếm số đến 10' })

    const questionsTab = screen.getByRole('tab', { name: /Câu hỏi/ })
    const previewTab = screen.getByRole('tab', { name: 'Sửa câu' })

    expect(questionsTab).toHaveAttribute('aria-selected', 'true')
    expect(previewTab).toHaveAttribute('aria-selected', 'false')

    await user.click(within(screen.getByRole('list', { name: 'Danh sách câu hỏi' })).getAllByRole('button')[2])

    expect(previewTab).toHaveAttribute('aria-selected', 'true')

    await user.click(questionsTab)

    expect(questionsTab).toHaveAttribute('aria-selected', 'true')
  })

  it('không tìm thấy game (404): thông báo rõ, không có nút thử lại', async () => {
    open('?gameId=khong-co')

    expect(await screen.findByRole('heading', { level: 1, name: 'Không tìm thấy trò chơi này' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Thử lại' })).not.toBeInTheDocument()
  })

  it('lỗi kết nối: hiện lỗi kèm nút Thử lại, bấm thì mở được game', async () => {
    const user = userEvent.setup()

    setMockScenario('error')
    open('?gameId=mock-game-1')

    // Lỗi mạng được thử lại một lần (có chờ) trước khi báo lỗi.
    const alert = await screen.findByRole('alert', {}, { timeout: 5000 })

    expect(alert).toHaveTextContent('Chưa mở được trò chơi')

    setMockScenario('normal')
    await user.click(screen.getByRole('button', { name: 'Thử lại' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Đếm số đến 10' })).toBeInTheDocument()
  })

  it('tải lại nền thất bại thì vẫn giữ game đang xem, không thay bằng màn lỗi', async () => {
    const { queryClient } = open('?gameId=mock-game-1')

    await screen.findByRole('heading', { level: 1, name: 'Đếm số đến 10' })

    // Giáo viên đổi tab rồi quay lại: react-query tải lại nền, lần này mất mạng (lỗi mạng được thử lại một lần).
    setMockScenario('error')
    await act(async () => {
      await queryClient.refetchQueries({ queryKey: ['game'] })
      // react-query báo thay đổi bằng setTimeout(0): đợi một nhịp để giao diện kịp vẽ lại trước khi kiểm.
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    expect(queryClient.getQueryState(['game', 't1', 'mock-game-1'])?.status).toBe('error')

    expect(screen.getByRole('heading', { level: 1, name: 'Đếm số đến 10' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('kịch bản trống: mở thẳng địa chỉ game cũng báo không tìm thấy', async () => {
    setMockScenario('empty')
    open('?gameId=mock-game-1')

    expect(await screen.findByRole('heading', { level: 1, name: 'Không tìm thấy trò chơi này' })).toBeInTheDocument()
  })

  it('mọi loại game mẫu mở được (10 loại)', async () => {
    for (let id = 1; id <= 10; id += 1) {
      const view = open(`?gameId=mock-game-${id}`)

      await waitFor(() => expect(screen.getByRole('list', { name: 'Danh sách câu hỏi' })).toBeInTheDocument())
      expect(within(screen.getByRole('list', { name: 'Danh sách câu hỏi' })).getAllByRole('button')).toHaveLength(3)
      view.unmount()
    }
  })
})
