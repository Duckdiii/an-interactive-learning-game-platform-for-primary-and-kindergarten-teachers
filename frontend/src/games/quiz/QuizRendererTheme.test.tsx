import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ThemeProvider from '../../experiments/theme/ThemeProvider'
import { neutralTheme } from '../../experiments/theme/themes/neutral'
import type { ThemeManifest } from '../../experiments/theme/themeTypes'
import { optionFill } from '../common/optionTheme'
import QuizRenderer from './QuizRenderer'
import { mockQuizQuestion } from './QuizRenderer.fixtures'

// Giống QuizRenderer.test.tsx nhưng lộ màu (fill/stroke) ra data-attribute để kiểm ánh xạ theme.
vi.mock('react-konva', () => ({
  Stage: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Layer: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Group: ({ children, onClick }: { children?: React.ReactNode; onClick?: () => void }) => (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div onClick={onClick}>{children}</div>
  ),
  Rect: ({ fill, stroke }: { fill?: string; stroke?: string }) => (
    <i data-testid="rect" data-fill={fill} data-stroke={stroke} />
  ),
  Text: ({ text, fill }: { text?: string; fill?: string }) => <span data-fill={fill}>{text}</span>,
  Image: () => null,
}))
vi.mock('use-image', () => ({ default: () => [undefined] }))
vi.mock('howler', () => ({
  Howl: class {
    play = vi.fn()
    stop = vi.fn()
    unload = vi.fn()
  },
}))
vi.mock('../common/measureText', () => ({ measureWrappedTextHeight: () => null }))
vi.mock('../common/useFeedback', () => ({ useFeedback: () => ({ showFeedback: vi.fn() }) }))

const themed: ThemeManifest = {
  ...neutralTheme,
  id: 'themed',
  name: 'Theme thử',
  colors: {
    ...neutralTheme.colors,
    onBackground: '#121212',
    surface: '#020202',
    surfaceCorrect: '#040404',
    surfaceTryAgain: '#050505',
    text: '#060606',
    border: '#070707',
    audioSurface: '#0E0E0E',
    audioBorder: '#0F0F0F',
  },
}
const c = themed.colors

const renderThemed = () =>
  render(
    <ThemeProvider theme={themed}>
      <QuizRenderer question={mockQuizQuestion} mode="preview" />
    </ThemeProvider>,
  )

const group = (text: string) => screen.getByText(text).parentElement as HTMLElement
const rectOf = (text: string) => within(group(text)).getByTestId('rect')
const fillOf = (text: string) => rectOf(text).getAttribute('data-fill')
const strokeOf = (text: string) => rectOf(text).getAttribute('data-stroke')
const textFill = (text: string) => screen.getByText(text).getAttribute('data-fill')
const QUESTION = mockQuizQuestion.questionText
const AUDIO = '🔊 Nghe lại'

describe('QuizRenderer với theme', () => {
  describe('không có provider (theme neutral): giữ đúng giá trị viết cứng trước đây', () => {
    it('ban đầu: đáp án trắng viền #334155, chữ đen; câu hỏi đen; nút nghe lại xanh nhạt', () => {
      render(<QuizRenderer question={mockQuizQuestion} mode="preview" />)
      for (const text of ['2', '3', '4']) {
        expect(fillOf(text)).toBe('#FFFFFF')
        expect(strokeOf(text)).toBe('#334155')
        expect(textFill(text)).toBe('#000000')
      }
      expect(textFill(QUESTION)).toBe('#000000')
      expect(fillOf(AUDIO)).toBe('#E0F2FE')
      expect(strokeOf(AUDIO)).toBe('#0284C7')
    })

    it('chọn sai: ô chọn vàng nhẹ (không đỏ), đáp án đúng xanh lá, ô còn lại giữ trắng', () => {
      render(<QuizRenderer question={mockQuizQuestion} mode="preview" />)
      fireEvent.click(screen.getByText('2'))
      expect(fillOf('2')).toBe('#FFE082')
      expect(fillOf('3')).toBe('#A5D6A7')
      expect(fillOf('4')).toBe('#FFFFFF')
    })

    it('chọn đúng: ô đúng xanh lá', () => {
      render(<QuizRenderer question={mockQuizQuestion} mode="preview" />)
      fireEvent.click(screen.getByText('3'))
      expect(fillOf('3')).toBe('#A5D6A7')
      expect(fillOf('2')).toBe('#FFFFFF')
    })
  })

  describe('có provider: mỗi vai trò đi theo đúng màu của theme', () => {
    it('trạng thái ban đầu', () => {
      renderThemed()
      for (const text of ['2', '3', '4']) {
        expect(fillOf(text)).toBe(c.surface)
        expect(strokeOf(text)).toBe(c.border)
        expect(textFill(text)).toBe(c.text)
      }
      // Câu hỏi vẽ thẳng lên nền sân nên dùng onBackground, không phải text của thẻ.
      expect(textFill(QUESTION)).toBe(c.onBackground)
      expect(fillOf(AUDIO)).toBe(c.audioSurface)
      expect(strokeOf(AUDIO)).toBe(c.audioBorder)
    })

    it('chọn sai: surfaceTryAgain cho ô chọn, surfaceCorrect cho đáp án đúng', () => {
      renderThemed()
      fireEvent.click(screen.getByText('2'))
      expect(fillOf('2')).toBe(c.surfaceTryAgain)
      expect(fillOf('3')).toBe(c.surfaceCorrect)
      expect(fillOf('4')).toBe(c.surface)
      expect(textFill('2')).toBe(c.text) // chữ không đổi màu khi chấm
    })

    it('chọn đúng', () => {
      renderThemed()
      fireEvent.click(screen.getByText('3'))
      expect(fillOf('3')).toBe(c.surfaceCorrect)
    })

    it('xem lại (review) bài sai: tô đúng theo theme', () => {
      render(
        <ThemeProvider theme={themed}>
          <QuizRenderer question={mockQuizQuestion} mode="review" selectedOptionId="a" />
        </ThemeProvider>,
      )
      expect(fillOf('2')).toBe(c.surfaceTryAgain)
      expect(fillOf('3')).toBe(c.surfaceCorrect)
    })
  })

  it('đổi theme giữa chừng thì màu đổi theo', () => {
    const { rerender } = render(
      <ThemeProvider theme={neutralTheme}>
        <QuizRenderer question={mockQuizQuestion} mode="preview" />
      </ThemeProvider>,
    )
    expect(fillOf('2')).toBe('#FFFFFF')
    rerender(
      <ThemeProvider theme={themed}>
        <QuizRenderer question={mockQuizQuestion} mode="preview" />
      </ThemeProvider>,
    )
    expect(fillOf('2')).toBe(c.surface)
  })
})

describe('optionFill', () => {
  const state = (locked: boolean, isCorrect: boolean, isSelected: boolean) => ({ locked, isCorrect, isSelected })

  it.each([
    [state(false, false, false), c.surface],
    [state(false, true, true), c.surface], // chưa khoá thì chưa tô gì dù là đáp án đúng/đang chọn
    [state(true, false, false), c.surface],
    [state(true, true, false), c.surfaceCorrect], // đáp án đúng luôn được tô để trẻ học được
    [state(true, true, true), c.surfaceCorrect], // vừa đúng vừa chọn: ưu tiên "đúng"
    [state(true, false, true), c.surfaceTryAgain],
  ])('%j', (input, expected) => {
    expect(optionFill(c, input)).toBe(expected)
  })
})
