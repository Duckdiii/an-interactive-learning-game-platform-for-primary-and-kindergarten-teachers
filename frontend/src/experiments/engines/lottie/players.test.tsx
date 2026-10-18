import { act, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { neutralTheme } from '../../theme/themes/neutral'
import DotLottiePlayer from './DotLottiePlayer'
import { DotLottie, resetDotLottie, state as dotState } from './fakeDotLottie'
import lottie, { created, FakeAnimation, resetLottieWeb } from './fakeLottieWeb'
import LottieWebPlayer from './LottieWebPlayer'
import { buildStarBounce, finalFrame, type LottieAnimation } from './lottieAnimations'
import type { LottiePlayerProps } from './playerTypes'

vi.mock('lottie-web', () => import('./fakeLottieWeb'))
vi.mock('@lottiefiles/dotlottie-web', () => import('./fakeDotLottie'))
// Tệp WASM đi kèm gói được nhập bằng `?url` (Vite đổi thành đường dẫn tài nguyên cục bộ); giả một đường dẫn rõ ràng.
vi.mock('@lottiefiles/dotlottie-web/dotlottie-player.wasm?url', () => ({ default: '/assets/dotlottie-player-abc123.wasm' }))

const animation: LottieAnimation = buildStarBounce(neutralTheme.colors)
const base: LottiePlayerProps = { animation, replayKey: 0, reducedMotion: false, size: 200 }

beforeEach(() => {
  resetLottieWeb()
  resetDotLottie()
  vi.mocked(lottie.loadAnimation).mockClear()
  delete window.__lottieHarness
})

const last = () => created[created.length - 1] as FakeAnimation

describe('LottieWebPlayer', () => {
  it('dựng hoạt ảnh không lặp, không tự phát, từ BẢN SAO của dữ liệu (thư viện có thể sửa dữ liệu)', () => {
    render(<LottieWebPlayer {...base} renderer="svg" />)
    const config = last().config
    expect(config).toMatchObject({ renderer: 'svg', loop: false, autoplay: false })
    expect(config.animationData).toEqual(animation)
    expect(config.animationData).not.toBe(animation)
    expect(config.container).toBeInstanceOf(HTMLElement)
  })

  it('canvas thì truyền độ phân giải màn hình và xóa canvas mỗi khung; SVG thì giữ tỉ lệ', () => {
    const { unmount } = render(<LottieWebPlayer {...base} renderer="canvas" />)
    expect(last().config.rendererSettings).toMatchObject({ clearCanvas: true, dpr: window.devicePixelRatio || 1 })
    unmount()
    render(<LottieWebPlayer {...base} renderer="svg" />)
    expect(last().config.rendererSettings).toMatchObject({ preserveAspectRatio: 'xMidYMid meet' })
  })

  it('hộp có đúng kích thước yêu cầu và ghi tên engine', () => {
    const { container } = render(<LottieWebPlayer {...base} size={150} renderer="canvas" />)
    const host = container.firstChild as HTMLElement
    expect(host.style.width).toBe('150px')
    expect(host.style.height).toBe('150px')
    expect(host.dataset.lottieEngine).toBe('lottie-canvas')
  })

  it('chưa bấm phát (replayKey 0) thì không phát; bấm thì phát từ khung 0, bấm lại thì phát lại', () => {
    const { rerender } = render(<LottieWebPlayer {...base} renderer="svg" />)
    expect(last().goToAndPlay).not.toHaveBeenCalled()
    rerender(<LottieWebPlayer {...base} replayKey={1} renderer="svg" />)
    expect(last().goToAndPlay).toHaveBeenCalledWith(0, true)
    rerender(<LottieWebPlayer {...base} replayKey={2} renderer="svg" />)
    expect(last().goToAndPlay).toHaveBeenCalledTimes(2)
    expect(created).toHaveLength(1) // không dựng lại hoạt ảnh khi chỉ phát lại
  })

  it('giảm chuyển động: chỉ hiện khung cuối, không phát', () => {
    render(<LottieWebPlayer {...base} replayKey={1} reducedMotion playOnMount renderer="svg" />)
    expect(last().goToAndStop).toHaveBeenCalledWith(finalFrame(animation), true)
    expect(last().goToAndPlay).not.toHaveBeenCalled()
    expect(window.__lottieHarness!.plays()).toBe(0)
    expect(window.__lottieHarness!.completed()).toBe(true)
  })

  it('gỡ thì hủy hoạt ảnh và dọn tín hiệu đo', () => {
    const { unmount } = render(<LottieWebPlayer {...base} renderer="svg" />)
    const anim = last()
    expect(window.__lottieHarness).toBeDefined()
    unmount()
    expect(anim.destroyed).toBe(true)
    expect(window.__lottieHarness).toBeUndefined()
  })

  it('đổi hoạt ảnh hoặc bộ vẽ thì hủy cái cũ và dựng cái mới', () => {
    const { rerender } = render(<LottieWebPlayer {...base} renderer="svg" />)
    const first = last()
    rerender(<LottieWebPlayer {...base} renderer="canvas" />)
    expect(first.destroyed).toBe(true)
    expect(created).toHaveLength(2)
    expect(last().config.renderer).toBe('canvas')
  })

  it('tín hiệu đo: đếm khung hình, số lần phát, hoàn thành và số nút DOM', () => {
    const { rerender } = render(<LottieWebPlayer {...base} renderer="svg" />)
    const harness = window.__lottieHarness!
    expect(harness.engine).toBe('lottie-svg')
    expect(harness.count).toBe(1)
    expect(harness.domNodes()).toBe(1)
    expect(harness.ready()).toBe(false)
    act(() => last().emit('DOMLoaded'))
    expect(harness.ready()).toBe(true)
    act(() => {
      last().emit('enterFrame')
      last().emit('enterFrame')
    })
    expect(harness.frames()).toBe(2)
    rerender(<LottieWebPlayer {...base} replayKey={1} renderer="svg" />)
    expect(harness.plays()).toBe(1)
    expect(harness.completed()).toBe(false)
    act(() => last().emit('complete'))
    expect(harness.completed()).toBe(true)
    rerender(<LottieWebPlayer {...base} replayKey={2} renderer="svg" />)
    expect(harness.completed()).toBe(false) // phát lại thì chưa hoàn thành
  })
})

describe('DotLottiePlayer', () => {
  const mounted = () => dotState.instances[dotState.instances.length - 1] as DotLottie

  it('ép dùng tệp WASM cục bộ (không để thư viện tải từ CDN bên ngoài)', () => {
    render(<DotLottiePlayer {...base} />)
    expect(dotState.wasmUrl).toBe('/assets/dotlottie-player-abc123.wasm')
    expect(dotState.wasmUrl).not.toMatch(/^https?:/) // đường dẫn cục bộ, không phải CDN
  })

  it('dựng với canvas, dữ liệu là BẢN SAO, không tự phát, không lặp', () => {
    render(<DotLottiePlayer {...base} />)
    const config = mounted().config
    expect(config).toMatchObject({ autoplay: false, loop: false })
    expect(config.canvas).toBeInstanceOf(HTMLCanvasElement)
    expect(config.data).toEqual(animation)
    expect(config.data).not.toBe(animation)
    expect(config.renderConfig).toMatchObject({ autoResize: false })
  })

  it('canvas có kích thước vật lý theo độ phân giải màn hình và kích thước hiển thị theo size', () => {
    const { container } = render(<DotLottiePlayer {...base} size={120} />)
    const canvas = container.querySelector('canvas')!
    const dpr = window.devicePixelRatio || 1
    expect(canvas.width).toBe(Math.round(120 * dpr))
    expect(canvas.height).toBe(Math.round(120 * dpr))
    expect(canvas.style.width).toBe('120px')
  })

  it('chưa nạp xong (chưa có sự kiện load) thì chưa phát; nạp xong thì dừng rồi phát', () => {
    const { rerender } = render(<DotLottiePlayer {...base} replayKey={1} playOnMount />)
    expect(mounted().play).not.toHaveBeenCalled()
    act(() => mounted().emit('load'))
    expect(mounted().stop).toHaveBeenCalledTimes(1)
    expect(mounted().play).toHaveBeenCalledTimes(1)
    rerender(<DotLottiePlayer {...base} replayKey={2} playOnMount />)
    expect(mounted().play).toHaveBeenCalledTimes(2)
    expect(dotState.instances).toHaveLength(1)
  })

  it('replayKey 0: nạp xong cũng không phát', () => {
    render(<DotLottiePlayer {...base} />)
    act(() => mounted().emit('load'))
    expect(mounted().play).not.toHaveBeenCalled()
  })

  it('giảm chuyển động: đặt khung cuối, không phát', () => {
    render(<DotLottiePlayer {...base} replayKey={1} reducedMotion playOnMount />)
    act(() => mounted().emit('load'))
    expect(mounted().setFrame).toHaveBeenCalledWith(finalFrame(animation))
    expect(mounted().play).not.toHaveBeenCalled()
    expect(window.__lottieHarness!.completed()).toBe(true)
  })

  it('gỡ thì hủy bộ phát và dọn tín hiệu đo; gỡ trước khi nạp xong không đặt state sau khi gỡ', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { unmount } = render(<DotLottiePlayer {...base} replayKey={1} playOnMount />)
    const player = mounted()
    unmount()
    expect(player.destroyed).toBe(true)
    expect(window.__lottieHarness).toBeUndefined()
    act(() => player.emit('load')) // sự kiện đến muộn
    expect(error).not.toHaveBeenCalled()
    expect(window.__lottieHarness).toBeUndefined() // sự kiện muộn không dựng lại tín hiệu
    error.mockRestore()
  })

  it('tín hiệu đo: khung hình, số lần phát, hoàn thành, một nút DOM', () => {
    const { rerender } = render(<DotLottiePlayer {...base} />)
    act(() => mounted().emit('load'))
    const harness = window.__lottieHarness!
    expect(harness.engine).toBe('dotlottie')
    expect(harness.domNodes()).toBe(1)
    expect(harness.ready()).toBe(true) // đã phát sự kiện load ở trên
    act(() => {
      mounted().emit('frame')
      mounted().emit('frame')
      mounted().emit('frame')
    })
    expect(harness.frames()).toBe(3)
    rerender(<DotLottiePlayer {...base} replayKey={1} />)
    expect(harness.plays()).toBe(1)
    act(() => mounted().emit('complete'))
    expect(harness.completed()).toBe(true)
  })
})

describe('chỉ phát khi bấm (replayKey đổi), không tự phát lại', () => {
  it('lottie-web: mở khi replayKey đã lớn hơn 0 mà không có playOnMount thì không phát; đổi hoạt ảnh, bộ vẽ hay giảm chuyển động cũng không phát lại', () => {
    const { rerender } = render(<LottieWebPlayer {...base} replayKey={3} renderer="svg" />)
    expect(last().goToAndPlay).not.toHaveBeenCalled()
    rerender(<LottieWebPlayer {...base} replayKey={3} reducedMotion renderer="svg" />)
    expect(last().goToAndStop).not.toHaveBeenCalled()
    rerender(<LottieWebPlayer {...base} replayKey={3} renderer="canvas" />)
    const canvas = last()
    expect(canvas.goToAndPlay).not.toHaveBeenCalled()
    const other = { ...animation, nm: 'khác' } // giữ nguyên danh tính đối tượng giữa các lần dựng
    rerender(<LottieWebPlayer {...base} animation={other} replayKey={3} renderer="canvas" />)
    expect(last().goToAndPlay).not.toHaveBeenCalled()
    rerender(<LottieWebPlayer {...base} animation={other} replayKey={4} renderer="canvas" />)
    expect(last().goToAndPlay).toHaveBeenCalledTimes(1) // chỉ khi replayKey đổi
  })

  it('dotlottie: cùng nguyên tắc; đổi replayKey sau khi nạp xong mới phát', () => {
    const { rerender } = render(<DotLottiePlayer {...base} replayKey={2} />)
    act(() => mounted2().emit('load'))
    expect(mounted2().play).not.toHaveBeenCalled()
    rerender(<DotLottiePlayer {...base} replayKey={2} reducedMotion />)
    expect(mounted2().setFrame).not.toHaveBeenCalled()
    rerender(<DotLottiePlayer {...base} replayKey={3} />)
    expect(mounted2().play).toHaveBeenCalledTimes(1)
  })

  it('onReady được gọi một lần khi thư viện nạp xong (lottie-web: DOMLoaded; dotlottie: load)', () => {
    const onReadyWeb = vi.fn()
    render(<LottieWebPlayer {...base} renderer="svg" onReady={onReadyWeb} />)
    expect(onReadyWeb).not.toHaveBeenCalled()
    act(() => last().emit('DOMLoaded'))
    expect(onReadyWeb).toHaveBeenCalledTimes(1)
    const onReadyDot = vi.fn()
    render(<DotLottiePlayer {...base} onReady={onReadyDot} />)
    act(() => mounted2().emit('load'))
    expect(onReadyDot).toHaveBeenCalledTimes(1)
  })

  it('sự kiện muộn của bộ phát cũ đã hủy không làm bộ phát mới tưởng đã sẵn sàng hay đếm khung', () => {
    const { rerender } = render(<LottieWebPlayer {...base} renderer="svg" />)
    const old = last()
    rerender(<LottieWebPlayer {...base} renderer="canvas" />)
    act(() => {
      old.emit('DOMLoaded')
      old.emit('enterFrame')
      old.emit('complete')
    })
    expect(window.__lottieHarness!.ready()).toBe(false)
    expect(window.__lottieHarness!.frames()).toBe(0)
    expect(window.__lottieHarness!.completed()).toBe(false)
  })

  it('nhiều bộ phát cùng lúc: tín hiệu là tổng hợp; «sẵn sàng» và «xong» chỉ khi TẤT CẢ đã xong', () => {
    render(
      <>
        <LottieWebPlayer {...base} renderer="svg" />
        <LottieWebPlayer {...base} renderer="svg" />
        <LottieWebPlayer {...base} renderer="svg" />
      </>,
    )
    const [a, b, c] = created
    const harness = () => window.__lottieHarness!
    expect(harness().count).toBe(3)
    act(() => {
      a.emit('DOMLoaded')
      b.emit('DOMLoaded')
    })
    expect(harness().ready()).toBe(false)
    act(() => c.emit('DOMLoaded'))
    expect(harness().ready()).toBe(true)
    act(() => {
      a.emit('enterFrame')
      b.emit('enterFrame')
      b.emit('enterFrame')
    })
    expect(harness().frames()).toBe(3)
    act(() => {
      a.emit('complete')
      b.emit('complete')
    })
    expect(harness().completed()).toBe(false)
    act(() => c.emit('complete'))
    expect(harness().completed()).toBe(true)
  })

  it('gỡ từng bộ phát: tín hiệu chỉ biến mất khi bộ phát cuối cùng gỡ', () => {
    const one = render(<LottieWebPlayer {...base} renderer="svg" />)
    const two = render(<LottieWebPlayer {...base} renderer="svg" />)
    expect(window.__lottieHarness!.count).toBe(2)
    one.unmount()
    expect(window.__lottieHarness!.count).toBe(1)
    two.unmount()
    expect(window.__lottieHarness).toBeUndefined()
  })
})

const mounted2 = () => dotState.instances[dotState.instances.length - 1] as DotLottie
