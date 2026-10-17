import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AssetLoadResult, LoadedAsset } from '../assets/assetLoader'
import StageBackdrop from './StageBackdrop'
import ThemeProvider from './ThemeProvider'
import { neutralTheme } from './themes/neutral'
import { spaceTheme } from './themes/space'
import type { ThemeManifest } from './themeTypes'

vi.mock('react-konva', () => ({
  Layer: ({ children, listening }: { children?: React.ReactNode; listening?: boolean }) => (
    <div data-testid="layer" data-listening={String(listening)}>
      {children}
    </div>
  ),
  Rect: (props: { fill?: string; width?: number; height?: number; fillPatternImage?: unknown; fillPatternRepeat?: string }) => (
    <i
      data-testid="rect"
      data-fill={props.fill}
      data-width={props.width}
      data-height={props.height}
      data-pattern={props.fillPatternImage ? 'yes' : 'no'}
      data-repeat={props.fillPatternRepeat}
    />
  ),
}))

// Kết quả tải tài nguyên do test điều khiển (jsdom không tải ảnh thật).
const loaded = vi.hoisted(() => ({ result: null as AssetLoadResult | null, calls: [] as unknown[][] }))
vi.mock('../assets/useAssets', () => ({
  useAssets: (assets: unknown[]) => {
    loaded.calls.push(assets)
    return { status: loaded.result ? 'done' : 'loading', progress: { settled: 0, loaded: 0, failed: 0, total: 0 }, result: loaded.result }
  },
}))

const resultWith = (entries: LoadedAsset[]): AssetLoadResult => ({
  assets: new Map(entries.map((entry) => [entry.id, entry])),
  failedIds: entries.filter((entry) => entry.status === 'failed').map((entry) => entry.id),
})
// Ảnh thật của jsdom (HTMLImageElement): họa tiết chỉ được dùng khi là HTMLImageElement.
const readyTile = (id: string): LoadedAsset => ({ id, status: 'ready', src: 'x', image: new Image() })
const failedTile = (id: string): LoadedAsset => ({ id, status: 'failed', src: 'fallback', image: null })

const renderWith = (theme: ThemeManifest) =>
  render(
    <ThemeProvider theme={theme}>
      <StageBackdrop width={800} height={300} />
    </ThemeProvider>,
  )

describe('StageBackdrop', () => {
  beforeEach(() => {
    loaded.result = null
    loaded.calls.length = 0
  })

  it('theme neutral (không vẽ nền): không vẽ gì', () => {
    const { container } = renderWith(neutralTheme)
    expect(container).toBeEmptyDOMElement()
  })

  it('theme không vẽ nền: không nạp tài nguyên nào (không chạy useAssets)', () => {
    renderWith(neutralTheme)
    renderWith({ ...spaceTheme, paintStageBackground: false })
    expect(loaded.calls).toHaveLength(0)
  })

  it('chỉ nạp ĐÚNG tài nguyên họa tiết nền, không nạp các hình minh họa khác của theme', () => {
    renderWith(spaceTheme)
    expect(loaded.calls.length).toBeGreaterThan(0)
    for (const call of loaded.calls) {
      expect((call as { id: string }[]).map((asset) => asset.id)).toEqual(['backdrop'])
    }
  })

  it('theme có nền nhưng không có họa tiết thì không nạp gì', () => {
    renderWith({ ...spaceTheme, backdropAssetId: undefined })
    expect(loaded.calls).toHaveLength(0)
  })

  it('ảnh đã nạp nhưng không phải HTMLImageElement (đối tượng lạ) thì bỏ họa tiết, không vẽ sai', () => {
    loaded.result = resultWith([{ id: 'backdrop', status: 'ready', src: 'x', image: { onload: null, onerror: null, src: 'x' } }])
    renderWith(spaceTheme)
    expect(screen.getAllByTestId('rect')).toHaveLength(1)
  })

  it('không có provider (mặc định neutral): không vẽ gì', () => {
    const { container } = render(<StageBackdrop width={800} height={300} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('theme có nền: một lớp không nhận chạm, ô nền đặc đúng màu và đúng kích thước thiết kế', () => {
    renderWith(spaceTheme)
    expect(screen.getByTestId('layer')).toHaveAttribute('data-listening', 'false')
    const [background] = screen.getAllByTestId('rect')
    expect(background).toHaveAttribute('data-fill', spaceTheme.colors.background)
    expect(background).toHaveAttribute('data-width', '800')
    expect(background).toHaveAttribute('data-height', '300')
    expect(background).toHaveAttribute('data-pattern', 'no')
  })

  it('họa tiết chưa nạp xong: chỉ có màu đặc (nền không chặn việc chơi)', () => {
    loaded.result = null
    renderWith(spaceTheme)
    expect(screen.getAllByTestId('rect')).toHaveLength(1)
  })

  it('họa tiết nạp xong: thêm một ô phủ lặp lại, vẽ sau (trên) màu đặc', () => {
    loaded.result = resultWith([readyTile('backdrop')])
    renderWith(spaceTheme)
    const rects = screen.getAllByTestId('rect')
    expect(rects).toHaveLength(2)
    expect(rects[0]).toHaveAttribute('data-pattern', 'no')
    expect(rects[1]).toHaveAttribute('data-pattern', 'yes')
    expect(rects[1]).toHaveAttribute('data-repeat', 'repeat')
    expect(rects[1]).toHaveAttribute('data-width', '800')
  })

  it('họa tiết nạp LỖI: chỉ còn màu đặc', () => {
    loaded.result = resultWith([failedTile('backdrop')])
    renderWith(spaceTheme)
    expect(screen.getAllByTestId('rect')).toHaveLength(1)
  })

  it('họa tiết khai báo mã không có trong kết quả tải: chỉ còn màu đặc', () => {
    loaded.result = resultWith([readyTile('other')])
    renderWith(spaceTheme)
    expect(screen.getAllByTestId('rect')).toHaveLength(1)
  })

  it('theme có nền nhưng không khai báo họa tiết: chỉ màu đặc dù có tài nguyên khác đã nạp', () => {
    loaded.result = resultWith([readyTile('backdrop')])
    renderWith({ ...spaceTheme, backdropAssetId: undefined })
    expect(screen.getAllByTestId('rect')).toHaveLength(1)
  })

  it('theme tắt paintStageBackground thì không vẽ dù có họa tiết đã nạp', () => {
    loaded.result = resultWith([readyTile('backdrop')])
    const { container } = renderWith({ ...spaceTheme, paintStageBackground: false })
    expect(container).toBeEmptyDOMElement()
  })
})
