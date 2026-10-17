import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { mockMatchingQuestion } from '../../games/matching/MatchingRenderer.fixtures'
import { mockQuizQuestion } from '../../games/quiz/QuizRenderer.fixtures'
import ThemeLab from './ThemeLab'
import { oceanTheme } from './themes/ocean'
import { spaceTheme } from './themes/space'

vi.mock('react-konva', () => ({
  Stage: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Layer: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Group: ({ children, onClick }: { children?: React.ReactNode; onClick?: () => void }) => (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div onClick={onClick}>{children}</div>
  ),
  Rect: ({ fill }: { fill?: string }) => <i data-testid="rect" data-fill={fill} />,
  Text: ({ text }: { text?: string }) => <span>{text}</span>,
  Image: () => null,
  Line: () => null,
}))
vi.mock('use-image', () => ({ default: () => [undefined, 'loading'] }))
vi.mock('howler', () => ({ Howl: class { play = vi.fn(); stop = vi.fn(); unload = vi.fn() } }))
vi.mock('../../games/common/measureText', () => ({ measureWrappedTextHeight: () => null }))
vi.mock('../../games/common/useFeedback', () => ({ useFeedback: () => ({ showFeedback: vi.fn() }) }))
vi.mock('../assets/useAssets', () => ({
  useAssets: () => ({ status: 'loading', progress: { settled: 0, loaded: 0, failed: 0, total: 0 }, result: null }),
}))

const cardFill = (text: string) =>
  within(screen.getByText(text).parentElement as HTMLElement)
    .getByTestId('rect')
    .getAttribute('data-fill')

describe('ThemeLab', () => {
  it('ban đầu: theme neutral, cơ chế MATCHING, báo hợp lệ', () => {
    render(<ThemeLab />)
    expect(screen.getByRole('button', { name: 'Trung tính' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'MATCHING' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('status')).toHaveTextContent('hợp lệ theo validateTheme')
    expect(screen.getByText('apple')).toBeInTheDocument()
  })

  it('neutral không có hình SVG nên không có thư viện hình', () => {
    render(<ThemeLab />)
    expect(screen.queryByRole('list', { name: 'Hình của theme' })).not.toBeInTheDocument()
  })

  it.each([
    ['Vũ trụ', spaceTheme],
    ['Đại dương', oceanTheme],
  ] as const)('chọn %s: báo hợp lệ, hiện đủ 3 hình có mô tả và đổi màu thẻ theo theme', (label, theme) => {
    render(<ThemeLab />)
    fireEvent.click(screen.getByRole('button', { name: label }))
    expect(screen.getByRole('status')).toHaveTextContent(`Theme "${label}" hợp lệ`)
    const gallery = screen.getByRole('list', { name: 'Hình của theme' })
    const images = within(gallery).getAllByRole('img')
    expect(images).toHaveLength(3)
    for (const [index, image] of images.entries()) {
      expect(image).toHaveAttribute('alt', theme.assets[index].alt)
      expect(image.getAttribute('src')).toMatch(/^data:image\/svg\+xml/)
    }
    expect(cardFill('apple')).toBe(theme.colors.surface)
  })

  it('bảng tương phản: neutral có hai hàng đồ họa "KHÔNG đạt", theme mới không có hàng nào', () => {
    render(<ThemeLab />)
    expect(screen.getAllByText('KHÔNG đạt')).toHaveLength(2)
    fireEvent.click(screen.getByRole('button', { name: 'Vũ trụ' }))
    expect(screen.queryAllByText('KHÔNG đạt')).toHaveLength(0)
    expect(screen.getAllByRole('row').length).toBe(1 + 16) // tiêu đề + 16 hàng
  })

  it('đổi sang QUIZ hiện câu hỏi của Quiz và bỏ câu dẫn của Matching', () => {
    render(<ThemeLab />)
    fireEvent.click(screen.getByRole('button', { name: 'QUIZ' }))
    expect(screen.getByRole('button', { name: 'QUIZ' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText(mockQuizQuestion.questionText)).toBeInTheDocument()
    expect(screen.queryByText(mockMatchingQuestion.audioText!)).not.toBeInTheDocument()
  })

  it('đổi theme dựng lại renderer: màu đáp án Quiz theo theme mới', () => {
    render(<ThemeLab />)
    fireEvent.click(screen.getByRole('button', { name: 'QUIZ' }))
    fireEvent.click(screen.getByRole('button', { name: 'Vũ trụ' }))
    expect(cardFill('2')).toBe(spaceTheme.colors.surface)
    fireEvent.click(screen.getByRole('button', { name: 'Trung tính' }))
    expect(cardFill('2')).toBe('#FFFFFF')
  })

  it('nút đủ lớn tối thiểu 44px (lớp min-h-11)', () => {
    render(<ThemeLab />)
    for (const name of ['Trung tính', 'Vũ trụ', 'Đại dương', 'MATCHING', 'QUIZ']) {
      expect(screen.getByRole('button', { name }).className).toContain('min-h-11')
    }
  })
})
