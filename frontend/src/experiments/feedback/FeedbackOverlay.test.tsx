import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ThemeProvider from '../theme/ThemeProvider'
import { neutralTheme } from '../theme/themes/neutral'
import type { ThemeManifest } from '../theme/themeTypes'
import FeedbackOverlay from './FeedbackOverlay'
import { buildPlan } from './feedbackEffects'
import { makeClock } from './fakeClock'

vi.mock('react-konva', () => ({
  Group: ({ children, x, y, scaleX, listening }: { children?: React.ReactNode; x?: number; y?: number; scaleX?: number; listening?: boolean }) => (
    <div data-testid="group" data-x={x} data-y={y} data-scale={scaleX} data-listening={String(listening)}>
      {children}
    </div>
  ),
  Rect: ({ stroke, opacity, width, height }: { stroke?: string; opacity?: number; width?: number; height?: number }) => (
    <i data-testid="ring" data-stroke={stroke} data-opacity={opacity} data-width={width} data-height={height} />
  ),
  Star: ({ fill, opacity, x, y }: { fill?: string; opacity?: number; x?: number; y?: number }) => (
    <i data-testid="star" data-fill={fill} data-opacity={opacity} data-x={x} data-y={y} />
  ),
}))

const RECT = { x: 100, y: 50, width: 300, height: 140 }
const c = neutralTheme.colors
const ring = () => screen.getByTestId('ring')
const outerGroup = () => screen.getAllByTestId('group')[0]
const innerGroup = () => screen.getAllByTestId('group')[1]

describe('FeedbackOverlay', () => {
  it('chưa có kế hoạch hoặc runId = 0: không vẽ gì', () => {
    const { clock } = makeClock()
    const { container, rerender } = render(<FeedbackOverlay plan={null} runId={1} {...RECT} clock={clock} />)
    expect(container).toBeEmptyDOMElement()
    rerender(<FeedbackOverlay plan={buildPlan('correct')} runId={0} {...RECT} clock={clock} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('không nhận chạm (listening=false) để không chắn thẻ bên dưới', () => {
    const { clock } = makeClock()
    render(<FeedbackOverlay plan={buildPlan('correct')} runId={1} {...RECT} clock={clock} />)
    expect(outerGroup()).toHaveAttribute('data-listening', 'false')
  })

  it('đúng: vòng sáng màu lineCorrect bao đúng khung, đặt ở giữa khung', () => {
    const { clock } = makeClock()
    render(<FeedbackOverlay plan={buildPlan('correct')} runId={1} {...RECT} clock={clock} />)
    expect(ring()).toHaveAttribute('data-stroke', c.lineCorrect)
    expect(ring()).toHaveAttribute('data-width', '300')
    expect(ring()).toHaveAttribute('data-height', '140')
    expect(innerGroup()).toHaveAttribute('data-x', String(100 + 150))
    expect(innerGroup()).toHaveAttribute('data-y', String(50 + 70))
  })

  it('đúng: vòng sáng hiện dần, nảy tới 1,1 rồi tắt hẳn khi hết hiệu ứng', () => {
    const { clock, advance } = makeClock()
    const { container } = render(<FeedbackOverlay plan={buildPlan('correct')} runId={1} {...RECT} clock={clock} />)
    expect(Number(ring().getAttribute('data-opacity'))).toBe(0)
    advance(150)
    expect(Number(ring().getAttribute('data-opacity'))).toBeCloseTo(1, 5)
    advance(30)
    expect(Number(innerGroup().getAttribute('data-scale'))).toBeCloseTo(1.1, 5)
    advance(2000)
    expect(container).toBeEmptyDOMElement()
  })

  it('đúng: hạt lấp lánh xuất hiện giữa chừng, dùng màu theme, nằm quanh khung', () => {
    const { clock, advance } = makeClock()
    render(<FeedbackOverlay plan={buildPlan('correct')} runId={1} {...RECT} clock={clock} />)
    expect(screen.queryAllByTestId('star')).toHaveLength(0) // đầu hiệu ứng chưa hạt nào sáng
    advance(300)
    const stars = screen.getAllByTestId('star')
    expect(stars.length).toBeGreaterThan(0)
    const palette = [c.lineCorrect, c.accent, c.surfaceTryAgain]
    for (const star of stars) {
      expect(palette).toContain(star.getAttribute('data-fill'))
      expect(Number(star.getAttribute('data-opacity'))).toBeGreaterThan(0)
    }
  })

  it('thử lại: màu lineTryAgain, rung ngang nhẹ quanh giữa khung, không hạt, không đổi tỉ lệ', () => {
    const { clock, advance } = makeClock()
    render(<FeedbackOverlay plan={buildPlan('tryAgain')} runId={1} {...RECT} clock={clock} />)
    expect(ring()).toHaveAttribute('data-stroke', c.lineTryAgain)
    advance(150) // offsetX = -4 theo kế hoạch
    expect(innerGroup()).toHaveAttribute('data-x', String(100 + 150 - 4))
    expect(innerGroup()).toHaveAttribute('data-scale', '1')
    advance(150)
    expect(innerGroup()).toHaveAttribute('data-x', String(100 + 150 + 4))
    expect(screen.queryAllByTestId('star')).toHaveLength(0)
  })

  it('hoàn thành: dùng màu accent cho vòng sáng', () => {
    const { clock } = makeClock()
    render(<FeedbackOverlay plan={buildPlan('complete')} runId={1} {...RECT} clock={clock} />)
    expect(ring()).toHaveAttribute('data-stroke', c.accent)
  })

  it('giảm chuyển động: vòng sáng tĩnh (độ mờ 1, không dịch, không nảy, không hạt) rồi biến mất', () => {
    const { clock, advance } = makeClock()
    const { container } = render(
      <FeedbackOverlay plan={buildPlan('complete', { reducedMotion: true })} runId={1} {...RECT} clock={clock} />,
    )
    for (const ms of [0, 300, 400]) {
      if (ms) advance(ms === 300 ? 300 : 100)
      expect(Number(ring().getAttribute('data-opacity'))).toBe(1)
      expect(innerGroup()).toHaveAttribute('data-x', String(250))
      expect(innerGroup()).toHaveAttribute('data-scale', '1')
      expect(screen.queryAllByTestId('star')).toHaveLength(0)
    }
    advance(1000)
    expect(container).toBeEmptyDOMElement()
  })

  it('theo theme đang dùng: đổi màu theo ThemeProvider', () => {
    const custom: ThemeManifest = { ...neutralTheme, id: 'x', colors: { ...c, lineCorrect: '#123456' } }
    const { clock } = makeClock()
    render(
      <ThemeProvider theme={custom}>
        <FeedbackOverlay plan={buildPlan('correct')} runId={1} {...RECT} clock={clock} />
      </ThemeProvider>,
    )
    expect(ring()).toHaveAttribute('data-stroke', '#123456')
  })

  it('runId đổi thì chạy lại từ đầu (vòng sáng về độ mờ 0)', () => {
    const { clock, advance } = makeClock()
    const plan = buildPlan('correct')
    const { rerender } = render(<FeedbackOverlay plan={plan} runId={1} {...RECT} clock={clock} />)
    advance(150)
    expect(Number(ring().getAttribute('data-opacity'))).toBeCloseTo(1, 5)
    rerender(<FeedbackOverlay plan={plan} runId={2} {...RECT} clock={clock} />)
    expect(Number(ring().getAttribute('data-opacity'))).toBe(0)
  })
})
