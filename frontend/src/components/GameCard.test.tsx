import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { GameSummary } from '../types/game-summary.types'
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
      <GameCard game={{ ...base, ...game }} now={NOW} />
    </MemoryRouter>,
  )

describe('GameCard', () => {
  const writeText = vi.fn()

  beforeEach(() => {
    writeText.mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
  })

  afterEach(() => vi.clearAllMocks())

  it('hiện môn, khối lớp, trạng thái, loại game và thời gian cập nhật bằng tiếng Việt', () => {
    renderCard()
    const card = within(screen.getByRole('article'))

    expect(card.getByRole('heading', { name: 'Đếm số đến 10' })).toBeInTheDocument()
    expect(card.getByText('Toán · Lớp 1')).toBeInTheDocument()
    expect(card.getByText('Bản nháp')).toBeInTheDocument()
    expect(card.getByText('Trắc nghiệm')).toBeInTheDocument()
    expect(card.getByText('Cập nhật 2 giờ trước')).toBeInTheDocument()
  })

  it('bản nháp chưa có mã chơi và không có nút sao chép', () => {
    renderCard()

    expect(screen.getByText('Chưa đăng, chưa có mã chơi')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Sao chép/ })).toBeNull()
  })

  it('game đã đăng hiện mã chơi và sao chép được, nút báo "Đã sao chép"', async () => {
    const user = userEvent.setup()
    // user-event gắn clipboard giả của nó khi setup(), nên phải đặt clipboard của test SAU setup().
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    renderCard({ status: 'PUBLISHED', shareCode: 'A3F9K2' })

    expect(screen.getByText('A3F9K2')).toBeInTheDocument()
    expect(screen.queryByText('Chưa đăng, chưa có mã chơi')).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Sao chép mã A3F9K2' }))

    expect(writeText).toHaveBeenCalledWith('A3F9K2')
    expect(await screen.findByText('Đã sao chép')).toBeInTheDocument()
  })

  it('trình duyệt chặn clipboard thì báo cho giáo viên và không hiện "Đã sao chép"', async () => {
    const user = userEvent.setup()
    writeText.mockRejectedValue(new Error('blocked'))
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    renderCard({ status: 'PUBLISHED', shareCode: 'A3F9K2' })

    await user.click(screen.getByRole('button', { name: 'Sao chép mã A3F9K2' }))

    expect(await screen.findByText(/Không sao chép được/)).toBeInTheDocument()
    expect(screen.queryByText('Đã sao chép')).toBeNull()
  })

  it('máy chủ bỏ hẳn các trường tùy chọn (shareCode, shareUrl, thumbnailUrl) thì thẻ vẫn hiển thị bình thường', () => {
    const { shareCode, shareUrl, thumbnailUrl, ...required } = base

    void shareCode
    void shareUrl
    void thumbnailUrl
    render(
      <MemoryRouter>
        <GameCard game={required} now={NOW} />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Đếm số đến 10' })).toBeInTheDocument()
    expect(screen.getByText('Chưa đăng, chưa có mã chơi')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Sao chép/ })).toBeNull()
  })

  it('đã đăng nhưng thiếu mã chơi thì không hiện ô mã (không bịa mã)', () => {
    renderCard({ status: 'PUBLISHED', shareCode: null })

    expect(screen.queryByRole('button', { name: /Sao chép/ })).toBeNull()
  })

  it('nút Chỉnh sửa dẫn tới trình soạn thảo với gameId được mã hóa và có tên game để phân biệt', () => {
    renderCard()

    const link = screen.getByRole('link', { name: 'Chỉnh sửa: Đếm số đến 10' })
    expect(link).toHaveAttribute('href', '/workspace/editor?gameId=g%2F1')
  })

  it('có ảnh bìa thì dùng ảnh thật, chưa có thì dùng hình mặc định theo môn', () => {
    const { container, unmount } = renderCard({ thumbnailUrl: 'https://example.com/a.png' })
    expect(container.querySelector('img')).toHaveAttribute('src', 'https://example.com/a.png')
    expect(container.querySelector('svg[role="presentation"]')).toBeNull()
    unmount()

    const second = renderCard()
    expect(second.container.querySelector('img')).toBeNull()
    expect(second.container.querySelector('svg[role="presentation"]')).not.toBeNull()
  })

  it('giá trị enum lạ vẫn hiển thị được, không làm vỡ thẻ', () => {
    renderCard({ subject: 'SCIENCE', gradeLevel: 'GRADE_9', status: 'ARCHIVED', gameType: 'NEW_TYPE' })

    expect(screen.getByText('Science · Grade 9')).toBeInTheDocument()
    expect(screen.getByText('Archived')).toBeInTheDocument()
    expect(screen.getByText('New Type')).toBeInTheDocument()
  })
})
