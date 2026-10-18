import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ThemeProvider from '../../theme/ThemeProvider'
import { spaceTheme } from '../../theme/themes/space'
import { resetDotLottie, state as dotState } from './fakeDotLottie'
import { created, resetLottieWeb } from './fakeLottieWeb'
import type { FakeAnimation } from './fakeLottieWeb'
import FeedbackLottieOverlay from './FeedbackLottieOverlay'
import { buildLottie, finalFrame } from './lottieAnimations'
import type { LottieEngine } from './playerTypes'
import type { LottieKind } from './lottieAnimations'

vi.mock('lottie-web', () => import('./fakeLottieWeb'))
vi.mock('@lottiefiles/dotlottie-web', () => import('./fakeDotLottie'))
vi.mock('@lottiefiles/dotlottie-web/dotlottie-player.wasm?url', () => ({ default: '/assets/dotlottie-player-abc123.wasm' }))

beforeEach(() => {
  resetLottieWeb()
  resetDotLottie()
  readied.clear()
  // Chỉ giả bộ hẹn giờ: nạp lười (import động) vẫn chạy bằng vi tính thật.
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const readied = new Set<unknown>()
/** Báo «đã nạp xong» cho mọi bộ phát đang sống chưa báo (lottie-web: DOMLoaded; dotlottie: load). */
const becomeReady = () =>
  act(() => {
    for (const a of created) {
      if (a.destroyed || readied.has(a)) continue
      readied.add(a)
      ;(a as FakeAnimation).emit('DOMLoaded')
    }
    for (const d of dotState.instances) {
      if (d.destroyed || readied.has(d)) continue
      readied.add(d)
      d.emit('load')
    }
  })

async function mount(props: { engine?: LottieEngine; kind?: LottieKind; runId: number; forceReducedMotion?: boolean }, autoReady = true) {
  const ui = (p: typeof props) => (
    <FeedbackLottieOverlay engine={p.engine ?? 'lottie-svg'} kind={p.kind ?? 'correct'} runId={p.runId} forceReducedMotion={p.forceReducedMotion}>
      <p>màn chơi</p>
    </FeedbackLottieOverlay>
  )
  const result = render(ui(props))
  await settle()
  if (autoReady) becomeReady()
  return {
    ...result,
    update: async (next: typeof props, ready = true) => {
      result.rerender(ui(next))
      await settle()
      if (ready) becomeReady()
    },
  }
}
const settle = async () => {
  await act(async () => {
    await vi.dynamicImportSettled()
  })
}
const overlay = () => screen.queryByTestId('lottie-overlay')
const advance = (ms: number) => act(() => void vi.advanceTimersByTime(ms))

describe('hiện và ẩn', () => {
  it('luôn hiện phần con; chưa có phản hồi (runId 0) thì không có lớp phủ và không dựng hoạt ảnh', async () => {
    await mount({ runId: 0 })
    expect(screen.getByText('màn chơi')).toBeTruthy()
    expect(overlay()).toBeNull()
    expect(created).toHaveLength(0)
  })

  it('có phản hồi thì hiện lớp phủ: ẩn với trình đọc màn hình, không nhận chạm, phủ trọn vùng', async () => {
    await mount({ runId: 1 })
    const el = overlay()!
    expect(el.getAttribute('aria-hidden')).toBe('true')
    expect(el.style.pointerEvents).toBe('none')
    expect(el.style.position).toBe('absolute')
    expect(created).toHaveLength(1)
    expect(created[0].goToAndPlay).toHaveBeenCalledWith(0, true)
  })

  it('tự gỡ sau thời lượng hoạt ảnh + 0,3 giây (sao 1,2 giây → 1,5 giây)', async () => {
    await mount({ runId: 1 })
    advance(1499)
    expect(overlay()).not.toBeNull()
    advance(2)
    expect(overlay()).toBeNull()
    expect(created[0].destroyed).toBe(true)
  })

  it('gật đầu 1,5 giây → gỡ sau 1,8 giây', async () => {
    await mount({ runId: 1, kind: 'tryAgain' })
    advance(1799)
    expect(overlay()).not.toBeNull()
    advance(2)
    expect(overlay()).toBeNull()
  })

  it('giảm chuyển động: không phát, chỉ hiện khung cuối tĩnh 0,8 giây + 0,3 giây', async () => {
    const animation = buildLottie('correct', spaceTheme.colors)
    render(
      <ThemeProvider theme={spaceTheme}>
        <FeedbackLottieOverlay engine="lottie-svg" kind="correct" runId={1} forceReducedMotion>
          <p>x</p>
        </FeedbackLottieOverlay>
      </ThemeProvider>,
    )
    await settle()
    becomeReady()
    expect(created[0].goToAndPlay).not.toHaveBeenCalled()
    expect(created[0].goToAndStop).toHaveBeenCalledWith(finalFrame(animation), true)
    advance(1099)
    expect(overlay()).not.toBeNull()
    advance(2)
    expect(overlay()).toBeNull()
  })

  it('theo cài đặt hệ điều hành «giảm chuyển động» (không cần ép)', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce'), media: query, addEventListener: () => {}, removeEventListener: () => {} }))
    await mount({ runId: 1 })
    expect(created[0].goToAndPlay).not.toHaveBeenCalled()
    expect(created[0].goToAndStop).toHaveBeenCalled()
  })

  it('phản hồi mới khi đang hiện: phát lại từ đầu và tính lại thời gian gỡ', async () => {
    const view = await mount({ runId: 1 })
    advance(1000)
    await view.update({ runId: 2 })
    expect(created).toHaveLength(1) // cùng bộ phát, không dựng lại
    expect(created[0].goToAndPlay).toHaveBeenCalledTimes(2)
    advance(1000) // đã qua 2 giây từ lần đầu nhưng mới 1 giây từ lần hai
    expect(overlay()).not.toBeNull()
    advance(600)
    expect(overlay()).toBeNull()
  })

  it('sau khi đã gỡ, phản hồi mới (runId lớn hơn) hiện lại', async () => {
    const view = await mount({ runId: 1 })
    advance(2000)
    expect(overlay()).toBeNull()
    await view.update({ runId: 2 })
    expect(overlay()).not.toBeNull()
    expect(created).toHaveLength(2)
  })

  it('cùng runId sau khi đã hết hạn thì không hiện lại', async () => {
    const view = await mount({ runId: 1 })
    advance(2000)
    await view.update({ runId: 1, kind: 'tryAgain' })
    expect(overlay()).toBeNull()
  })

  it('gỡ cả lớp phủ khi unmount, không còn hẹn giờ treo', async () => {
    const { unmount } = await mount({ runId: 1 })
    unmount()
    expect(created[0].destroyed).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })
})

describe('thời gian hiển thị tính từ lúc bộ phát sẵn sàng', () => {
  it('chưa sẵn sàng (đang nạp thư viện/WASM) thì KHÔNG bị gỡ dù đã quá thời lượng hoạt ảnh', async () => {
    await mount({ runId: 1 }, false)
    advance(4000) // quá xa 1,5 giây
    expect(overlay()).not.toBeNull()
  })

  it('nạp chậm 3 giây rồi sẵn sàng: hiển thị đủ 1,5 giây KỂ TỪ LÚC SẴN SÀNG', async () => {
    await mount({ runId: 1 }, false)
    advance(3000)
    becomeReady()
    advance(1499)
    expect(overlay()).not.toBeNull()
    advance(2)
    expect(overlay()).toBeNull()
  })

  it('không bao giờ sẵn sàng: gỡ ở hạn chờ tối đa 5 giây (không treo lớp phủ trống)', async () => {
    await mount({ runId: 1 }, false)
    advance(4999)
    expect(overlay()).not.toBeNull()
    advance(2)
    expect(overlay()).toBeNull()
  })

  it('dotlottie: sẵn sàng khi có sự kiện load', async () => {
    await mount({ engine: 'dotlottie', runId: 1 }, false)
    advance(2000)
    expect(overlay()).not.toBeNull()
    becomeReady()
    advance(1600)
    expect(overlay()).toBeNull()
  })
})

describe('chọn engine và nội dung', () => {
  it.each([
    ['lottie-svg', 'svg'],
    ['lottie-canvas', 'canvas'],
  ] as const)('%s dùng lottie-web với bộ vẽ %s', async (engine, renderer) => {
    await mount({ engine, runId: 1 })
    expect(created[0].config.renderer).toBe(renderer)
    expect(dotState.instances).toHaveLength(0)
  })

  it('dotlottie dùng dotlottie-web, không dựng lottie-web', async () => {
    await mount({ engine: 'dotlottie', runId: 1 })
    expect(dotState.instances).toHaveLength(1)
    expect(created).toHaveLength(0)
  })

  it('đúng → sao nảy; thử lại → gương mặt gật đầu', async () => {
    const { unmount } = await mount({ runId: 1, kind: 'correct' })
    expect((created[0].config.animationData as { nm: string }).nm).toBe('star-bounce')
    unmount()
    await mount({ runId: 1, kind: 'tryAgain' })
    expect((created[1].config.animationData as { nm: string }).nm).toBe('gentle-nod')
  })

  it('màu hoạt ảnh theo theme của lớp bao quanh', async () => {
    render(
      <ThemeProvider theme={spaceTheme}>
        <FeedbackLottieOverlay engine="lottie-svg" kind="correct" runId={1}>
          <p>x</p>
        </FeedbackLottieOverlay>
      </ThemeProvider>,
    )
    await settle()
    expect(created[0].config.animationData).toEqual(buildLottie('correct', spaceTheme.colors))
  })
})
