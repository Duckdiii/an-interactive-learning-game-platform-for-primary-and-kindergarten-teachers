import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SharePanel from '../components/editor/SharePanel'
import { getMockGame, resetMockGames, setMockGameLocked } from '../services/mock/mockGames'
import { getMockPublishCalls, resetMockPublish, setMockPublishFailure } from '../services/mock/mockPublish'
import { setMockScenario } from '../services/mock/mockRuntime'
import { loginAsTeacher, renderWithProviders } from '../test/renderWithApp'
import WorkspaceEditor from './WorkspaceEditor'

// B1.3: nút Xuất bản, hộp chia sẻ (mã, liên kết, sao chép kèm phương án dự phòng) và các lỗi 2a/2b/2c/409 (UC-07).
// mock-game-2 là bản nháp, mock-game-1 là game đã xuất bản (mã A3F9K2).
const DRAFT_ID = 'mock-game-2'
const PUBLISHED_ID = 'mock-game-1'

const open = (gameId: string) => renderWithProviders(<WorkspaceEditor />, `/workspace/editor?gameId=${gameId}`)
const titleBox = () => screen.getByRole('textbox', { name: /Tên trò chơi/ })
const publishButton = () => screen.getByRole('button', { name: /^Xuất bản/ })

async function openLoaded(gameId: string) {
  const view = open(gameId)

  await screen.findByRole('textbox', { name: /Tên trò chơi/ })

  return view
}

const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard')

const stubClipboard = (writeText: () => Promise<void>) => {
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
}

beforeEach(() => {
  vi.stubEnv('VITE_USE_MOCK', 'editor,games')
  loginAsTeacher()
  resetMockGames()
  resetMockPublish()
})
afterEach(() => {
  if (originalClipboard) Object.defineProperty(navigator, 'clipboard', originalClipboard)
  else Reflect.deleteProperty(navigator, 'clipboard')
  vi.restoreAllMocks()
  vi.stubEnv('VITE_USE_MOCK', 'none')
  vi.stubEnv('VITE_MOCK_LATENCY_MS', '0')
  setMockScenario('normal')
  localStorage.clear()
})

describe('xuất bản từ trình soạn thảo', () => {
  it('bản nháp: xuất bản xong hiện hộp chia sẻ có mã và liên kết, tiêu đề chuyển "Đã xuất bản", nút thành "Xuất bản lại" và tiêu điểm về nút', async () => {
    const user = userEvent.setup()

    await openLoaded(DRAFT_ID)
    await user.click(publishButton())

    const dialog = await screen.findByRole('dialog', { name: 'Trò chơi đã xuất bản' })
    const code = within(dialog).getByRole('textbox', { name: 'Mã chia sẻ' }) as HTMLInputElement
    const link = within(dialog).getByRole('textbox', { name: 'Liên kết chia sẻ' }) as HTMLInputElement

    expect(code.value).toMatch(/^[A-Z0-9]{6}$/)
    expect(link.value).toMatch(/^https?:\/\/.+\/play\/[A-Z0-9]{6}$/)
    expect(within(dialog).getByText(/dữ liệu mô phỏng/i)).toBeInTheDocument()
    expect(getMockGame(DRAFT_ID).status).toBe('PUBLISHED')

    await user.click(within(dialog).getByRole('button', { name: 'Đóng' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Xuất bản lại' })).toHaveFocus())
    expect(screen.getByText('Đã đăng', { selector: 'span' })).toBeInTheDocument()
  })

  it('game đã xuất bản: "Xuất bản lại" giữ nguyên mã chia sẻ cũ', async () => {
    const user = userEvent.setup()

    await openLoaded(PUBLISHED_ID)
    await user.click(screen.getByRole('button', { name: 'Xuất bản lại' }))

    const dialog = await screen.findByRole('dialog')

    expect((within(dialog).getByRole('textbox', { name: 'Mã chia sẻ' }) as HTMLInputElement).value).toBe('A3F9K2')
  })

  it('sửa thêm trong lúc xuất bản: hộp chia sẻ nói phần sửa thêm chưa lưu và game vẫn "Chưa lưu"', async () => {
    const user = userEvent.setup()

    await openLoaded(DRAFT_ID)
    vi.stubEnv('VITE_MOCK_LATENCY_MS', '80')
    await user.click(publishButton())
    await user.type(titleBox(), ' thêm')

    const dialog = await screen.findByRole('dialog')

    expect(within(dialog).getByRole('note')).toHaveTextContent('chưa được lưu')
    expect(dialog).toHaveAccessibleDescription(/Học sinh dùng mã/)
  })

  it('đóng hộp bằng Esc', async () => {
    const user = userEvent.setup()

    await openLoaded(DRAFT_ID)
    await user.click(publishButton())
    await screen.findByRole('dialog')
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('2c: dữ liệu chưa đủ thì báo ngay, không gọi mạng, không mở hộp, có liên kết đi tới chỗ cần sửa', async () => {
    const user = userEvent.setup()

    await openLoaded(DRAFT_ID)
    await user.clear(titleBox())
    await user.click(publishButton())

    const alert = await screen.findByRole('alert')

    expect(alert).toHaveTextContent('Chưa xuất bản được')
    expect(alert).toHaveTextContent('Bạn hãy kiểm tra và điều chỉnh lại nội dung.')
    // Câu SRS chỉ xuất hiện một lần (từng bị lặp vì ghép thêm tóm tắt).
    expect(alert.textContent?.split('Bạn hãy kiểm tra').length).toBe(2)
    expect(within(alert).getByRole('button', { name: 'Đi tới thông tin trò chơi' })).toBeInTheDocument()
    expect(getMockPublishCalls()).toBe(0)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    // Điền lại thì lỗi tự hết.
    await user.type(titleBox(), 'Có tên rồi')
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
  })

  it('2a: không lưu được thì báo đúng câu SRS, giữ nguyên nội dung ("Chưa lưu"), thử lại được', async () => {
    const user = userEvent.setup()

    await openLoaded(DRAFT_ID)
    await user.type(titleBox(), ' (mới)')
    setMockPublishFailure('save')
    await user.click(publishButton())

    const alert = await screen.findByRole('alert')

    expect(alert).toHaveTextContent('Hệ thống chưa hoàn tất lưu trò chơi. Bạn hãy thử lại một lần nữa.')
    expect(alert).toHaveTextContent('Nội dung bạn đang soạn vẫn được giữ nguyên.')
    expect(screen.getByText('Chưa lưu')).toBeInTheDocument()
    expect(titleBox()).toHaveValue(`${getMockGame(DRAFT_ID).metadata.title} (mới)`)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    setMockPublishFailure(null)
    await user.click(within(alert).getByRole('button', { name: 'Thử lại' }))

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('2b: đã lưu nhưng chưa tạo được mã chia sẻ thì báo đúng câu SRS và vẫn cho thử lại', async () => {
    const user = userEvent.setup()

    await openLoaded(DRAFT_ID)
    await user.type(titleBox(), ' (mới)')
    setMockPublishFailure('share')
    await user.click(publishButton())

    const alert = await screen.findByRole('alert')

    expect(alert).toHaveTextContent('Trò chơi đã lưu nhưng chưa thể tạo mã chia sẻ. Vui lòng thử xuất bản lại.')
    expect(within(alert).getByRole('button', { name: 'Thử lại' })).toBeInTheDocument()
    expect(screen.getByText('Chưa lưu')).toBeInTheDocument()
  })

  it('409: có phòng chơi chưa kết thúc thì nói rõ lý do, giữ nội dung và không có nút Thử lại', async () => {
    const user = userEvent.setup()

    await openLoaded(DRAFT_ID)
    await user.type(titleBox(), ' (mới)')
    setMockGameLocked(DRAFT_ID, true)
    await user.click(publishButton())

    const alert = await screen.findByRole('alert')

    expect(alert).toHaveTextContent('phòng chơi chưa kết thúc')
    expect(within(alert).queryByRole('button', { name: 'Thử lại' })).not.toBeInTheDocument()
    expect(titleBox()).toHaveValue(`${getMockGame(DRAFT_ID).metadata.title} (mới)`)
  })

  it('đang xuất bản thì khóa Lưu, Chơi thử và chính nút Xuất bản', async () => {
    const user = userEvent.setup()

    await openLoaded(DRAFT_ID)
    await user.type(titleBox(), ' (mới)')
    vi.stubEnv('VITE_MOCK_LATENCY_MS', '100')
    await user.click(publishButton())

    await waitFor(() => expect(screen.getByRole('button', { name: 'Đang xuất bản...' })).toBeDisabled())
    expect(screen.getByRole('button', { name: 'Lưu bản nháp' })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Chơi thử/ })).toBeDisabled()

    await screen.findByRole('dialog')
  })
})

describe('sao chép mã và liên kết', () => {
  it('trình duyệt cho phép: báo "Đã sao chép"', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)

    await openLoaded(DRAFT_ID)
    stubClipboard(writeText)
    await user.click(publishButton())

    const dialog = await screen.findByRole('dialog')
    const code = (within(dialog).getByRole('textbox', { name: 'Mã chia sẻ' }) as HTMLInputElement).value

    await user.click(within(dialog).getByRole('button', { name: 'Sao chép mã chia sẻ' }))

    expect(writeText).toHaveBeenCalledWith(code)
    await waitFor(() => expect(within(dialog).getAllByText('Đã sao chép').length).toBeGreaterThan(0))
  })

  it('trình duyệt TỪ CHỐI (trang không an toàn, bị chặn quyền): chọn sẵn văn bản trong ô và báo cách tự nhấn Ctrl+C', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockRejectedValue(new Error('NotAllowedError'))

    await openLoaded(DRAFT_ID)
    stubClipboard(writeText)
    await user.click(publishButton())

    const dialog = await screen.findByRole('dialog')
    const link = within(dialog).getByRole('textbox', { name: 'Liên kết chia sẻ' }) as HTMLInputElement

    await user.click(within(dialog).getByRole('button', { name: 'Sao chép liên kết chia sẻ' }))

    await waitFor(() => expect(link).toHaveFocus())
    expect(link.selectionStart).toBe(0)
    expect(link.selectionEnd).toBe(link.value.length)
    expect(within(dialog).getByText(/hãy nhấn Ctrl\+C/)).toBeInTheDocument()
    expect(within(dialog).queryByText('Đã sao chép')).not.toBeInTheDocument()
    expect(link).toHaveAccessibleDescription(/Ctrl\+C/)
  })
})

describe('SharePanel: liên kết an toàn', () => {
  it('shareUrl không phải http/https (javascript:, data:) bị bỏ, chỉ dùng địa chỉ ghép từ mã', () => {
    for (const shareUrl of ['javascript:alert(1)', 'data:text/html,<script>1</script>', 'ftp://x.test/a']) {
      const { unmount } = renderWithProviders(
        <SharePanel result={{ gameId: 'g', status: 'PUBLISHED', shareCode: 'ABC123', shareUrl }} hasUnsavedAfter={false} onClose={() => undefined} />,
      )
      const link = screen.getByRole('textbox', { name: 'Liên kết chia sẻ' }) as HTMLInputElement

      expect(link.value).toMatch(/^https?:\/\//)
      expect(link.value).toContain('/play/ABC123')
      expect(link.value).not.toContain('alert')
      unmount()
    }
  })

  it('đã sửa thêm trong lúc xuất bản thì có ghi chú phần sửa thêm chưa lưu', () => {
    renderWithProviders(
      <SharePanel result={{ gameId: 'g', status: 'PUBLISHED', shareCode: 'ABC123', shareUrl: 'https://x.test/play/ABC123' }} hasUnsavedAfter onClose={() => undefined} />,
    )

    expect(screen.getByRole('note')).toHaveTextContent('chưa được lưu')
  })
})
