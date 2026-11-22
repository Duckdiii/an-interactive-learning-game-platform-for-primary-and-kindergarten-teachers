import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MockPublishSettingsApi, resetMockPublishSettings } from '../../services/publishSettings/mockPublishSettingsApi'
import { loginAsTeacher, renderWithProviders } from '../../test/renderWithApp'
import type { GameType } from '../../types/game-dsl.types'
import PublishDialog from './PublishDialog'

const RESULT = { gameId: 'g1', status: 'PUBLISHED', shareCode: 'ABC123', shareUrl: 'https://x.test/play/ABC123' } as const

const open = (gradeLevel = 'GRADE_1', gameType: GameType = 'QUIZ') =>
  renderWithProviders(<PublishDialog gameTitle="Đếm số đến 10" gameType={gameType} gradeLevel={gradeLevel} result={RESULT} hasUnsavedAfter={false} onClose={() => undefined} />)

const card = (name: string) => screen.getByRole('region', { name })

beforeEach(() => {
  vi.stubEnv('VITE_USE_MOCK', 'editor')
  vi.stubEnv('VITE_MOCK_LATENCY_MS', '0')
  loginAsTeacher()
  resetMockPublishSettings()
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  localStorage.clear()
})

describe('PublishDialog: 3 cách chơi', () => {
  it('có tiêu đề hộp, lời chào tên game và 3 thẻ', () => {
    open()

    expect(screen.getByRole('dialog', { name: 'Xuất bản và chia sẻ' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('"Đếm số đến 10" đã sẵn sàng!')
    expect(screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)).toEqual(
      expect.arrayContaining(['Trình chiếu trên lớp', 'Mở phòng thi đấu', 'Giao về nhà']),
    )
    expect(screen.getByRole('textbox', { name: 'Mã chia sẻ' })).toHaveFocus()
  })

  it('"Bắt đầu trình chiếu" mở trang trình chiếu của game trong thẻ mới, kèm hướng dẫn đưa lên tivi', () => {
    open()

    const link = within(card('Trình chiếu trên lớp')).getByRole('link', { name: /Bắt đầu trình chiếu/ })

    expect(link).toHaveAttribute('href', '/present/g1')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(link).toHaveAccessibleDescription(/Toàn màn hình/)
  })

  it('"Mở phòng" là liên kết sang tab mới khi phòng chạy được và loại game có renderer', () => {
    open()

    const link = within(card('Mở phòng thi đấu')).getByRole('link', { name: /Mở phòng/ })

    expect(link).toHaveAttribute('href', '/rooms/host/g1')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAccessibleDescription(/tab khác/)
  })

  it('loại game chưa có renderer: khóa và nêu đúng lý do', () => {
    open('GRADE_1', 'UNSUPPORTED' as any)

    const button = within(card('Mở phòng thi đấu')).getByRole('button', { name: /Mở phòng/ })

    expect(button).toHaveAttribute('aria-disabled', 'true')
    expect(button).toHaveAccessibleDescription(/Kiểu trò chơi này/)
  })

  it('bản build thật: "Mở phòng" bị khóa, đọc được lý do và bấm không làm gì', async () => {
    vi.stubEnv('PROD', true)
    open()

    const button = within(card('Mở phòng thi đấu')).getByRole('button', { name: /Mở phòng/ })

    expect(button).toHaveAttribute('aria-disabled', 'true')
    expect(button).toHaveTextContent('Sắp có')
    expect(button).toHaveAccessibleDescription(/Phòng chơi nhiều máy/)
    await userEvent.setup().click(button)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('"In phiếu QR" gọi window.print; vùng in có tên game, mã và liên kết', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined)

    open()
    await userEvent.setup().click(within(card('Giao về nhà')).getByRole('button', { name: 'In phiếu QR' }))

    const sheet = document.querySelector('[data-print-sheet]') as HTMLElement

    expect(print).toHaveBeenCalledTimes(1)
    expect(sheet).toHaveTextContent('Đếm số đến 10')
    expect(sheet).toHaveTextContent('ABC123')
    expect(sheet).toHaveTextContent('https://x.test/play/ABC123')
    expect(sheet.querySelector('svg')).not.toBeNull()
  })

  it('thẻ nổi theo khối lớp (và theo giao diện giáo viên chọn)', async () => {
    const { unmount } = open('KINDERGARTEN')

    expect(within(card('Trình chiếu trên lớp')).getByText('Gợi ý cho lớp này')).toBeInTheDocument()
    expect(within(card('Mở phòng thi đấu')).queryByText('Gợi ý cho lớp này')).toBeNull()
    unmount()

    open('GRADE_4')
    expect(within(card('Mở phòng thi đấu')).getByText('Gợi ý cho lớp này')).toBeInTheDocument()
    expect(within(card('Trình chiếu trên lớp')).queryByText('Gợi ý cho lớp này')).toBeNull()
  })
})

describe('PublishDialog: hàng cài đặt (mô phỏng)', () => {
  const saved = () => new MockPublishSettingsApi().get('g1')

  it('đổi giao diện và chủ đề là lưu ngay đúng nội dung; giao diện Học sinh đổi thẻ nổi', async () => {
    const user = userEvent.setup()

    open('KINDERGARTEN')

    const ui = within(screen.getByRole('group', { name: 'Giao diện học sinh' }))

    await waitFor(() => expect(ui.getByRole('button', { name: 'Tự động' })).toBeEnabled())
    expect(ui.getByRole('button', { name: 'Tự động' })).toHaveAttribute('aria-pressed', 'true')

    await user.click(ui.getByRole('button', { name: 'Học sinh' }))
    await waitFor(async () => expect((await saved()).uiOverride).toBe('HOC_SINH'))
    expect(within(card('Mở phòng thi đấu')).getByText('Gợi ý cho lớp này')).toBeInTheDocument()
    expect(await screen.findByText('Đã lưu')).toBeInTheDocument()

    const themes = within(screen.getByRole('group', { name: 'Chủ đề hình ảnh' }))

    expect(themes.getByRole('button', { name: 'Theo môn học' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(themes.getByRole('button', { name: 'Ong vàng' }))
    await waitFor(async () => expect(await saved()).toEqual({ uiOverride: 'HOC_SINH', themeId: 'bee', enabled: true, expiresAt: null }))
    expect(themes.getByRole('button', { name: 'Ong vàng' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('đặt hạn và tắt mã', async () => {
    const user = userEvent.setup()

    open()
    expect(screen.getByText(/Mở không giới hạn/)).toBeInTheDocument()

    const toggle = screen.getByRole('button', { name: 'Đặt hạn hoặc tắt mã' })

    await waitFor(() => expect(toggle).toBeEnabled())
    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')

    // Ngày tính theo hôm nay để test không hỏng khi thời gian trôi qua (ngày đã qua bị từ chối).
    const future = new Date(Date.now() + 40 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const [year, month, day] = future.split('-')

    fireEvent.change(screen.getByLabelText(/Hạn dùng mã/), { target: { value: '2001-01-01' } })
    expect((await saved()).expiresAt).toBeNull()
    fireEvent.change(screen.getByLabelText(/Hạn dùng mã/), { target: { value: future } })
    await waitFor(async () => expect((await saved()).expiresAt).toBe(`${future}T16:59:59Z`))
    expect(await screen.findByText(`Có hạn tới ${day}/${month}/${year}`, { exact: false })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByLabelText(/Hạn dùng mã/)).toHaveValue(future))

    await user.click(screen.getByRole('checkbox', { name: /Tắt mã/ }))
    await waitFor(async () => expect((await saved()).enabled).toBe(false))
    expect(await screen.findByText(/Mã đang tắt/)).toBeInTheDocument()
  })

  it('Backend chưa hỗ trợ: hàng cài đặt khóa kèm "Sắp có"', async () => {
    vi.stubEnv('VITE_USE_MOCK', 'none')
    open()

    expect(await screen.findByText(/Sắp có: Backend chưa lưu được/)).toBeInTheDocument()
    expect(within(screen.getByRole('group', { name: 'Giao diện học sinh' })).getByRole('button', { name: 'Bé' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Đặt hạn hoặc tắt mã' })).toBeDisabled()
  })
})
