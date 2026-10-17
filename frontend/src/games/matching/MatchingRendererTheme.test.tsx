import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ThemeProvider from '../../experiments/theme/ThemeProvider'
import { neutralTheme } from '../../experiments/theme/themes/neutral'
import type { ThemeManifest } from '../../experiments/theme/themeTypes'
import MatchingRenderer from './MatchingRenderer'
import { mockMatchingQuestion } from './MatchingRenderer.fixtures'
import { matchingCardFill, matchingLinkColor } from './matchingTheme'

// Giống MatchingRenderer.test.tsx nhưng lộ màu (fill/stroke) ra data-attribute để kiểm ánh xạ theme.
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
  Line: ({ stroke, dash }: { stroke?: string; dash?: number[] }) => (
    <i data-testid="line" data-dashed={dash ? 'yes' : 'no'} data-stroke={stroke} />
  ),
}))
vi.mock('use-image', () => ({ default: () => [undefined, 'loading'] }))
vi.mock('howler', () => ({
  Howl: class {
    play = vi.fn()
    stop = vi.fn()
    unload = vi.fn()
  },
}))
vi.mock('../common/useFeedback', () => ({ useFeedback: () => ({ showFeedback: vi.fn() }) }))
vi.mock('../common/sound', () => ({ playSound: vi.fn() }))
vi.mock('../common/measureText', () => ({ measureWrappedTextHeight: () => null }))

/** Theme có mọi vai trò màu khác nhau và khác neutral, để thấy đúng vai trò nào được dùng ở đâu. */
const themed: ThemeManifest = {
  ...neutralTheme,
  id: 'themed',
  name: 'Theme thử',
  colors: {
    background: '#010101',
    surface: '#020202',
    surfaceSelected: '#030303',
    surfaceCorrect: '#040404',
    surfaceTryAgain: '#050505',
    text: '#060606',
    border: '#070707',
    accent: '#080808',
    accentBorder: '#090909',
    onAccent: '#0A0A0A',
    disabledSurface: '#0B0B0B',
    disabledBorder: '#0C0C0C',
    onDisabled: '#0D0D0D',
    audioSurface: '#0E0E0E',
    audioBorder: '#0F0F0F',
    lineCorrect: '#101010',
    lineTryAgain: '#111111',
    linkColors: ['#A1A1A1', '#A2A2A2', '#A3A3A3', '#A4A4A4', '#A5A5A5', '#A6A6A6'],
  },
}
const c = themed.colors

const renderThemed = () =>
  render(
    <ThemeProvider theme={themed}>
      <MatchingRenderer mode="preview" question={mockMatchingQuestion} />
    </ThemeProvider>,
  )

const group = (text: string) => screen.getByText(text).parentElement as HTMLElement
const rectOf = (text: string) => within(group(text)).getByTestId('rect')
const fillOf = (text: string) => rectOf(text).getAttribute('data-fill')
const strokeOf = (text: string) => rectOf(text).getAttribute('data-stroke')
const textFill = (text: string) => screen.getByText(text).getAttribute('data-fill')
const tap = (text: string) => fireEvent.click(screen.getByText(text))
const link = (left: string, right: string) => {
  tap(left)
  tap(right)
}
const lineStrokes = (dashed: 'yes' | 'no') =>
  screen
    .queryAllByTestId('line')
    .filter((el) => el.getAttribute('data-dashed') === dashed)
    .map((el) => el.getAttribute('data-stroke'))
const CONFIRM = 'Xong rồi!'
const AUDIO = '🔊 Nghe lại'

describe('MatchingRenderer với theme', () => {
  describe('không có provider (theme neutral): giữ đúng giá trị viết cứng trước đây', () => {
    it('thẻ, chữ, nút nghe lại và nút xong rồi (đang khóa)', () => {
      render(<MatchingRenderer mode="preview" question={mockMatchingQuestion} />)
      expect(fillOf('apple')).toBe('#FFFFFF')
      expect(strokeOf('apple')).toBe('#334155')
      expect(textFill('apple')).toBe('#000000')
      expect(textFill('Nối từ với nghĩa')).toBe('#000000')
      expect(fillOf(AUDIO)).toBe('#E0F2FE')
      expect(strokeOf(AUDIO)).toBe('#0284C7')
      expect(fillOf(CONFIRM)).toBe('#E2E8F0')
      expect(strokeOf(CONFIRM)).toBe('#CBD5E1')
      expect(textFill(CONFIRM)).toBe('#94A3B8')
    })

    it('chọn thẻ trái: nền xanh nhạt, viền màu cặp đầu tiên; nối đủ thì nút xanh dương', () => {
      render(<MatchingRenderer mode="preview" question={mockMatchingQuestion} />)
      tap('apple')
      expect(fillOf('apple')).toBe('#DBEAFE')
      expect(strokeOf('apple')).toBe('#3B82F6')
      tap('táo')
      link('dog', 'chó')
      link('cat', 'mèo')
      expect(fillOf(CONFIRM)).toBe('#2563EB')
      expect(strokeOf(CONFIRM)).toBe('#1E40AF')
      expect(textFill(CONFIRM)).toBe('#FFFFFF')
      expect(lineStrokes('no')).toEqual(['#3B82F6', '#8B5CF6', '#EC4899'])
    })

    it('chấm xong: đúng xanh lá, sai vàng nhẹ (không đỏ), đường nối đúng #43A047 và sai #F59E0B', () => {
      render(<MatchingRenderer mode="preview" question={mockMatchingQuestion} />)
      link('apple', 'chó')
      link('dog', 'táo')
      link('cat', 'mèo')
      tap(CONFIRM)
      expect(fillOf('cat')).toBe('#A5D6A7')
      expect(fillOf('apple')).toBe('#FFE082')
      expect(lineStrokes('no')).toEqual(['#F59E0B', '#F59E0B', '#43A047'])
      expect(lineStrokes('yes')).toEqual(['#43A047', '#43A047'])
    })
  })

  describe('có provider: mỗi vai trò đi theo đúng màu của theme', () => {
    it('trạng thái ban đầu', () => {
      renderThemed()
      expect(fillOf('apple')).toBe(c.surface)
      expect(strokeOf('apple')).toBe(c.border)
      expect(textFill('apple')).toBe(c.text)
      expect(textFill('Nối từ với nghĩa')).toBe(c.text)
      expect(fillOf(AUDIO)).toBe(c.audioSurface)
      expect(strokeOf(AUDIO)).toBe(c.audioBorder)
      expect(textFill(AUDIO)).toBe(c.text)
      expect(fillOf(CONFIRM)).toBe(c.disabledSurface)
      expect(strokeOf(CONFIRM)).toBe(c.disabledBorder)
      expect(textFill(CONFIRM)).toBe(c.onDisabled)
    })

    it('chọn thẻ trái và nối: nền chọn, viền theo bảng màu nối của theme', () => {
      renderThemed()
      tap('apple')
      expect(fillOf('apple')).toBe(c.surfaceSelected)
      expect(strokeOf('apple')).toBe(c.linkColors[0])
      tap('táo')
      // Đã nối: nền thường, viền theo màu cặp ở cả hai thẻ.
      expect(fillOf('apple')).toBe(c.surface)
      expect(strokeOf('apple')).toBe(c.linkColors[0])
      expect(strokeOf('táo')).toBe(c.linkColors[0])
      link('dog', 'chó')
      expect(strokeOf('dog')).toBe(c.linkColors[1])
      expect(lineStrokes('no')).toEqual([c.linkColors[0], c.linkColors[1]])
    })

    it('nối đủ: nút xong rồi dùng accent, accentBorder và onAccent', () => {
      renderThemed()
      link('apple', 'táo')
      link('dog', 'chó')
      link('cat', 'mèo')
      expect(fillOf(CONFIRM)).toBe(c.accent)
      expect(strokeOf(CONFIRM)).toBe(c.accentBorder)
      expect(textFill(CONFIRM)).toBe(c.onAccent)
    })

    it('chấm đúng hết: nền đúng và đường nối đúng', () => {
      renderThemed()
      link('apple', 'táo')
      link('dog', 'chó')
      link('cat', 'mèo')
      tap(CONFIRM)
      for (const text of ['apple', 'dog', 'cat', 'táo', 'chó', 'mèo']) expect(fillOf(text)).toBe(c.surfaceCorrect)
      expect(lineStrokes('no')).toEqual([c.lineCorrect, c.lineCorrect, c.lineCorrect])
      expect(lineStrokes('yes')).toEqual([])
    })

    it('chấm sai hai cặp: thẻ sai dùng surfaceTryAgain, đường sai lineTryAgain, đáp án đúng nét đứt lineCorrect', () => {
      renderThemed()
      link('apple', 'chó')
      link('dog', 'táo')
      link('cat', 'mèo')
      tap(CONFIRM)
      expect(fillOf('apple')).toBe(c.surfaceTryAgain)
      expect(fillOf('chó')).toBe(c.surfaceTryAgain)
      expect(fillOf('cat')).toBe(c.surfaceCorrect)
      // Chữ trên thẻ đã chấm (đúng hoặc sai) vẫn dùng màu chữ của theme.
      expect(textFill('apple')).toBe(c.text)
      expect(textFill('cat')).toBe(c.text)
      expect(lineStrokes('no')).toEqual([c.lineTryAgain, c.lineTryAgain, c.lineCorrect])
      expect(lineStrokes('yes')).toEqual([c.lineCorrect, c.lineCorrect])
    })
  })

  it('đổi theme giữa chừng thì màu đổi theo (không nhớ màu cũ)', () => {
    const { rerender } = render(
      <ThemeProvider theme={neutralTheme}>
        <MatchingRenderer mode="preview" question={mockMatchingQuestion} />
      </ThemeProvider>,
    )
    expect(fillOf('apple')).toBe('#FFFFFF')
    rerender(
      <ThemeProvider theme={themed}>
        <MatchingRenderer mode="preview" question={mockMatchingQuestion} />
      </ThemeProvider>,
    )
    expect(fillOf('apple')).toBe(c.surface)
  })
})

describe('matchingTheme', () => {
  it.each([
    ['idle', c.surface],
    ['linked', c.surface],
    ['selected', c.surfaceSelected],
    ['correct', c.surfaceCorrect],
    ['wrong', c.surfaceTryAgain],
  ] as const)('matchingCardFill(%s)', (state, expected) => {
    expect(matchingCardFill(c, state)).toBe(expected)
  })

  it('matchingLinkColor quay vòng khi cặp nhiều hơn số màu', () => {
    expect(matchingLinkColor(c, 0)).toBe(c.linkColors[0])
    expect(matchingLinkColor(c, 5)).toBe(c.linkColors[5])
    expect(matchingLinkColor(c, 6)).toBe(c.linkColors[0])
    expect(matchingLinkColor(c, 13)).toBe(c.linkColors[1])
  })
})
