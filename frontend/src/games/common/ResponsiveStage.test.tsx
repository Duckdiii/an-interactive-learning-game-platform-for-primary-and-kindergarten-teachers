import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ThemeProvider from '../../experiments/theme/ThemeProvider'
import { neutralTheme } from '../../experiments/theme/themes/neutral'
import type { ThemeManifest } from '../../experiments/theme/themeTypes'
import ResponsiveStage from './ResponsiveStage'

vi.mock('react-konva', () => ({
  Stage: ({ children }: { children?: React.ReactNode }) => <div data-testid="stage">{children}</div>,
  Layer: ({ children }: { children?: React.ReactNode }) => <div data-testid="layer">{children}</div>,
  Rect: ({ fill, width, height }: { fill?: string; width?: number; height?: number }) => (
    <i data-testid="background" data-fill={fill} data-width={width} data-height={height} />
  ),
}))

const withBackground: ThemeManifest = {
  ...neutralTheme,
  id: 'bg',
  paintStageBackground: true,
  colors: { ...neutralTheme.colors, background: '#123456' },
}

describe('ResponsiveStage nền sân', () => {
  it('theme neutral (không vẽ nền): không có lớp nền, nội dung vẫn hiện', () => {
    render(
      <ResponsiveStage width={800} height={300}>
        <span>nội dung</span>
      </ResponsiveStage>,
    )
    expect(screen.queryByTestId('background')).not.toBeInTheDocument()
    expect(screen.queryAllByTestId('layer')).toHaveLength(0)
    expect(screen.getByText('nội dung')).toBeInTheDocument()
  })

  it('theme bật paintStageBackground: một ô nền đúng màu và đúng kích thước thiết kế, vẽ trước nội dung', () => {
    render(
      <ThemeProvider theme={withBackground}>
        <ResponsiveStage width={800} height={300}>
          <span>nội dung</span>
        </ResponsiveStage>
      </ThemeProvider>,
    )
    const background = screen.getByTestId('background')
    expect(background).toHaveAttribute('data-fill', '#123456')
    expect(background).toHaveAttribute('data-width', '800')
    expect(background).toHaveAttribute('data-height', '300')
    const stage = screen.getByTestId('stage')
    expect(stage.children[0]).toContainElement(background)
    expect(stage.lastElementChild).toHaveTextContent('nội dung')
  })

  it('theme có màu nền nhưng paintStageBackground tắt: không vẽ', () => {
    render(
      <ThemeProvider theme={{ ...withBackground, paintStageBackground: false }}>
        <ResponsiveStage width={800} height={300}>
          <span>x</span>
        </ResponsiveStage>
      </ThemeProvider>,
    )
    expect(screen.queryByTestId('background')).not.toBeInTheDocument()
  })
})
