import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { GameSummary } from '../types/game-summary.types'
import { clearNewGames, markNewGames, unmarkNewGame } from '../utils/newGames'
import GameCard from './GameCard'

const NOW = Date.parse('2026-10-13T12:00:00.000Z')

const base: GameSummary = {
  gameId: 'g/1',
  title: 'Đếm số đến 10',
  gameType: 'QUIZ',
  subject: 'MATH',
  gradeLevel: 'GRADE_1',
  status: 'DRAFT',
  shareCode: null,
  shareUrl: null,
  thumbnailUrl: null,
  updatedAt: new Date(NOW - 2 * 60 * 60 * 1000).toISOString(),
}

const renderCard = (game: Partial<GameSummary> = {}) =>
  render(
    <MemoryRouter>
      <GameCard game={{ ...base, ...game }} />
    </MemoryRouter>,
  )

const openMenu = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: 'Thêm thao tác cho Đếm số đến 10' }))
}

describe('GameCard', () => {
  const writeText = vi.fn()

  beforeEach(() => {
    writeText.mockResolvedValue(undefined)
  })

  afterEach(() => vi.clearAllMocks())

  it('hiện môn, khối lớp · kiểu chơi, nhãn trạng thái và tên game', () => {
    renderCard()
    const card = within(screen.getByRole('article'))

    expect(card.getByRole('heading', { name: 'Đếm số đến 10' })).toBeInTheDocument()
    expect(card.getByText('Toán')).toBeInTheDocument()
    expect(card.getByText('Bản nháp')).toBeInTheDocument()
    expect(card.getByText('Lớp 1 · Trắc nghiệm')).toBeInTheDocument()
  })

  it('nhãn "Đã đăng" cho game đã đăng', () => {
    renderCard({ status: 'PUBLISHED' })

    expect(screen.getByText('Đã đăng')).toBeInTheDocument()
  })

  it('menu "…" có "Xem kết quả" cho game đã đăng, bản nháp thì không', async () => {
    const user = userEvent.setup()
    const { unmount } = renderCard({ status: 'PUBLISHED' })
    await openMenu(user)

    expect(screen.getByRole('link', { name: 'Xem kết quả' })).toHaveAttribute('href', '/results?gameId=g%2F1')

    unmount()
    renderCard()
    await openMenu(user)

    expect(screen.queryByRole('link', { name: 'Xem kết quả' })).toBeNull()
  })

  it('bản nháp: nút chính "Soạn tiếp" tới trình soạn với gameId được mã hóa', () => {
    renderCard()

    expect(screen.getByRole('link', { name: 'Soạn tiếp' })).toHaveAttribute(
      'href',
      '/workspace/editor?gameId=g%2F1',
    )
    expect(screen.queryByRole('link', { name: /Trình chiếu/ })).toBeNull()
  })

  it('đã đăng có mã: "Trình chiếu" mở trang chơi trong thẻ mới', () => {
    renderCard({ status: 'PUBLISHED', shareCode: 'A3F9K2' })

    const link = screen.getByRole('link', { name: /Trình chiếu/ })
    // Cùng địa chỉ với "Sao chép liên kết" (resolveShareUrl).
    expect(link.getAttribute('href')).toMatch(/\/play\/A3F9K2$/)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(link).toHaveAccessibleName('Trình chiếu (mở trang chơi trong thẻ mới)')
  })

  it('đã đăng có mã: hiện mã chơi để cô đọc cho học sinh; bản nháp thì không', () => {
    const { unmount } = renderCard({ status: 'PUBLISHED', shareCode: 'A3F9K2' })

    expect(screen.getByText('A3F9K2')).toBeInTheDocument()
    expect(screen.getByText(/Mã chơi:/)).toBeInTheDocument()
    unmount()
    renderCard({ status: 'DRAFT', shareCode: 'A3F9K2' })
    expect(screen.queryByText('A3F9K2')).toBeNull()
  })

  it('đã đăng nhưng thiếu mã: nút chính là "Sửa" (không bịa mã)', () => {
    renderCard({ status: 'PUBLISHED', shareCode: null })

    expect(screen.getByRole('link', { name: 'Sửa' })).toHaveAttribute('href', '/workspace/editor?gameId=g%2F1')
    expect(screen.queryByRole('link', { name: /Trình chiếu/ })).toBeNull()
  })

  it('menu "…": mở có aria-expanded, Esc đóng và trả focus về nút', async () => {
    const user = userEvent.setup()
    renderCard()
    const more = screen.getByRole('button', { name: 'Thêm thao tác cho Đếm số đến 10' })
    expect(more).toHaveAttribute('aria-controls', 'more-g/1')
    expect(more).toHaveAttribute('aria-expanded', 'false')

    await user.click(more)
    expect(more).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('link', { name: 'Sửa' })).toHaveAttribute('href', '/workspace/editor?gameId=g%2F1')

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('link', { name: 'Sửa' })).toBeNull()
    expect(more).toHaveFocus()
  })

  it('menu đóng khi bấm ra ngoài và khi chọn mục', async () => {
    const user = userEvent.setup()
    renderCard()

    await openMenu(user)
    await user.click(document.body)
    expect(screen.queryByRole('link', { name: 'Sửa' })).toBeNull()

    await openMenu(user)
    await user.click(screen.getByRole('link', { name: 'Sửa' }))
    expect(screen.queryByRole('link', { name: 'Sửa' })).toBeNull()
  })

  it('"Sao chép liên kết" chỉ có khi có link chia sẻ', async () => {
    const user = userEvent.setup()
    renderCard()
    await openMenu(user)

    expect(screen.queryByRole('button', { name: 'Sao chép liên kết' })).toBeNull()
  })

  it('sao chép liên kết (shareUrl) và báo "Đã sao chép liên kết"', async () => {
    const user = userEvent.setup()
    // user-event gắn clipboard giả của nó khi setup(), nên phải đặt clipboard của test SAU setup().
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    renderCard({ status: 'PUBLISHED', shareCode: 'A3F9K2', shareUrl: 'https://x.test/play/A3F9K2' })
    await openMenu(user)

    await user.click(screen.getByRole('button', { name: 'Sao chép liên kết' }))

    expect(writeText).toHaveBeenCalledWith('https://x.test/play/A3F9K2')
    expect(await screen.findByRole('status')).toHaveTextContent('Đã sao chép liên kết')
    expect(screen.queryByRole('link', { name: 'Sửa' })).toBeNull()
  })

  it('thiếu shareUrl thì dựng liên kết từ mã chơi', async () => {
    const user = userEvent.setup()
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    renderCard({ status: 'PUBLISHED', shareCode: 'A3F9K2' })
    await openMenu(user)

    await user.click(screen.getByRole('button', { name: 'Sao chép liên kết' }))

    expect(writeText).toHaveBeenCalledWith(expect.stringMatching(/^https?:\/\/[^/]+\/play\/A3F9K2$/))
  })

  it('trình duyệt chặn clipboard thì báo cho giáo viên và không báo đã sao chép', async () => {
    const user = userEvent.setup()
    writeText.mockRejectedValue(new Error('blocked'))
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    renderCard({ status: 'PUBLISHED', shareCode: 'A3F9K2' })
    await openMenu(user)

    await user.click(screen.getByRole('button', { name: 'Sao chép liên kết' }))

    expect(await screen.findByText(/Không sao chép được/)).toBeInTheDocument()
    expect(screen.queryByText('Đã sao chép liên kết')).toBeNull()
  })

  it('máy chủ bỏ hẳn các trường tùy chọn (shareCode, shareUrl, thumbnailUrl) thì thẻ vẫn hiển thị bình thường', () => {
    const { shareCode, shareUrl, thumbnailUrl, ...required } = base

    void shareCode
    void shareUrl
    void thumbnailUrl
    render(
      <MemoryRouter>
        <GameCard game={required} />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Đếm số đến 10' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Soạn tiếp' })).toBeInTheDocument()
  })

  it('có ảnh bìa thì dùng ảnh thật, chưa có thì hiện hai ô chữ theo môn', () => {
    const { container, unmount } = renderCard({ thumbnailUrl: 'https://example.com/a.png' })
    expect(container.querySelector('img')).toHaveAttribute('src', 'https://example.com/a.png')
    unmount()

    const second = renderCard()
    expect(second.container.querySelector('img')).toBeNull()
    expect(second.container).toHaveTextContent('12')
  })

  it('giá trị enum lạ vẫn hiển thị được, không làm vỡ thẻ', () => {
    renderCard({ subject: 'SCIENCE', gradeLevel: 'GRADE_9', status: 'ARCHIVED', gameType: 'NEW_TYPE' })

    expect(screen.getByText('Science')).toBeInTheDocument()
    expect(screen.getByText('Archived')).toBeInTheDocument()
    expect(screen.getByText('Grade 9 · New Type')).toBeInTheDocument()
  })
})

describe('GameCard: dấu "Mới"', () => {
  afterEach(() => clearNewGames())

  it('game vừa tạo trong phiên có chip "Mới"; game khác thì không', () => {
    markNewGames(['g/1'])

    const { unmount } = renderCard()

    expect(screen.getByText('Mới')).toBeInTheDocument()
    unmount()

    renderCard({ gameId: 'g/2' })
    expect(screen.queryByText('Mới')).not.toBeInTheDocument()
  })

  it('hết "Mới" ngay khi tập đánh dấu đổi (mở game), không cần tải lại', () => {
    markNewGames(['g/1'])
    renderCard()

    expect(screen.getByText('Mới')).toBeInTheDocument()

    act(() => unmarkNewGame('g/1'))
    expect(screen.queryByText('Mới')).not.toBeInTheDocument()
  })
})
