import { describe, expect, it, vi } from 'vitest'
import { BeeFlight, type Ease, type TweenFactory } from './beeFlight'
import {
  BEE_ENTER_FROM_X,
  correctScript,
  ENTER_SECONDS,
  enterDuration,
  enterScript,
  EXIT_SECONDS,
  exitDuration,
  exitScript,
  MAX_TRANSITION_SECONDS,
  prepareEnter,
  PROGRESS_FLY_DELAY,
  settleScene,
  SIGN_DROP,
  wrongScript,
  type SceneNode,
  type SceneNodes,
} from './sceneScripts'
import type { Scheduler } from './timeline'

function clock() {
  let now = 0
  let nextId = 1
  const pending = new Map<number, { at: number; callback: () => void }>()
  const scheduler: Scheduler = {
    setTimer: (callback, ms) => {
      const id = nextId++
      pending.set(id, { at: now + ms, callback })
      return id
    },
    clearTimer: (handle) => void pending.delete(handle as number),
  }
  return {
    scheduler,
    get pending() {
      return pending.size
    },
    advance(ms: number) {
      const target = now + ms
      for (;;) {
        const due = [...pending.entries()].filter(([, timer]) => timer.at <= target).sort((a, b) => a[1].at - b[1].at)[0]
        if (!due) break
        pending.delete(due[0])
        now = due[1].at
        due[1].callback()
      }
      now = target
    },
  }
}

interface Made {
  node: unknown
  attrs: Record<string, number>
  seconds: number
  ease: Ease
  played: boolean
  destroyed: boolean
  finish: () => void
}
function fakeTweens() {
  const made: Made[] = []
  const factory: TweenFactory = (node, attrs, seconds, ease, onFinish) => {
    const record: Made = { node, attrs: { ...attrs }, seconds, ease, played: false, destroyed: false, finish: onFinish }
    made.push(record)
    return { play: () => void (record.played = true), destroy: () => void (record.destroyed = true) }
  }
  const finishAll = () => {
    for (let i = 0; i < 100; i += 1) {
      const next = made.find((tween) => tween.played && !tween.destroyed && !(tween as unknown as { done?: boolean }).done)
      if (!next) return
      ;(next as unknown as { done?: boolean }).done = true
      const target = next.node as Record<string, (value?: number) => number>
      for (const [key, value] of Object.entries(next.attrs)) target[key]?.(value)
      next.finish()
    }
  }
  return { factory, made, finishAll }
}

function fakeNode(initial: Record<string, number> = {}) {
  const attrs: Record<string, number> = { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, ...initial }
  const accessor = (key: string) => (value?: number) => (value === undefined ? attrs[key] : (attrs[key] = value))
  return { attrs, x: accessor('x'), y: accessor('y'), rotation: accessor('rotation'), scaleX: accessor('scaleX'), scaleY: accessor('scaleY'), opacity: accessor('opacity') }
}

const sceneNodes = () => {
  const sign = fakeNode()
  const badge = fakeNode()
  const bee = fakeNode({ x: 300, y: 316 })
  return { sign, badge, bee, nodes: { sign, badge, bee } as unknown as SceneNodes }
}

describe('chuyển cảnh ngắn', () => {
  it('mỗi lần vào hoặc rời câu dưới MAX_TRANSITION_SECONDS (1,5 giây) để không chặn thao tác của trẻ', () => {
    expect(enterDuration()).toBeLessThanOrEqual(MAX_TRANSITION_SECONDS)
    expect(exitDuration()).toBeLessThanOrEqual(MAX_TRANSITION_SECONDS)
    expect(exitDuration()).toBeLessThan(enterDuration()) // rời nhanh hơn vào
    expect(enterDuration()).toBe(Math.max(ENTER_SECONDS.sign, ENTER_SECONDS.badgeDelay + ENTER_SECONDS.badge, ENTER_SECONDS.bee))
    expect(exitDuration()).toBe(Math.max(EXIT_SECONDS.bee, EXIT_SECONDS.sign, EXIT_SECONDS.badge))
  })
})

describe('prepareEnter / settleScene', () => {
  it('trạng thái đầu: bảng ở trên và trong suốt, huy hiệu nhỏ xíu đang xoay ngược, ong ngoài mép trái; settleScene trả bảng và huy hiệu về nghỉ', () => {
    const { sign, badge, bee, nodes } = sceneNodes()
    prepareEnter(nodes)
    expect(sign.attrs).toMatchObject({ y: -SIGN_DROP, opacity: 0 })
    expect(badge.attrs.opacity).toBe(0)
    expect(badge.attrs.scaleX).toBeLessThan(0.1)
    expect(badge.attrs.rotation).toBeLessThan(0)
    expect(bee.attrs.x).toBe(BEE_ENTER_FROM_X)
    settleScene(nodes)
    expect(sign.attrs).toMatchObject({ y: 0, opacity: 1 })
    expect(badge.attrs).toMatchObject({ rotation: 0, scaleX: 1, scaleY: 1, opacity: 1 })
  })
  it('thiếu nút (không có huy hiệu ở Tiểu học, chưa có ong) thì bỏ qua không ném lỗi', () => {
    const nodes: SceneNodes = { sign: null, badge: null, bee: null }
    expect(() => prepareEnter(nodes)).not.toThrow()
    expect(() => settleScene(nodes)).not.toThrow()
  })
})

describe('enterScript', () => {
  const setup = () => {
    const tweens = fakeTweens()
    const c = clock()
    const scene = sceneNodes()
    const flight = new BeeFlight(tweens.factory)
    const done = vi.fn()
    return { ...tweens, c, scene, flight, done }
  }

  it('bảng rơi và nảy (bounce) về y = 0 và hiện rõ; huy hiệu xoay vào (back) sau một nhịp; ong bay vào đúng chỗ nghỉ — cùng lúc', () => {
    const s = setup()
    prepareEnter(s.scene.nodes)
    enterScript({ factory: s.factory, nodes: s.scene.nodes, flight: s.flight, bee: { x: 300, restY: 316, arc: 12, squash: 0.9 } })(s.done)
    const signTween = s.made.find((tween) => tween.node === s.scene.sign)!
    expect(signTween).toMatchObject({ attrs: { y: 0, opacity: 1 }, seconds: ENTER_SECONDS.sign, ease: 'bounce', played: true })
    const beeTween = s.made.find((tween) => tween.node === s.scene.bee && 'x' in tween.attrs)!
    expect(beeTween.attrs.x).toBe(300)
    expect(s.made.some((tween) => tween.node === s.scene.badge)).toBe(false) // huy hiệu chờ một nhịp
  })

  it('xong khi mọi phần xong (không sớm hơn), và ong dừng ở đúng chỗ nghỉ', () => {
    const s = setup()
    prepareEnter(s.scene.nodes)
    enterScript({ factory: s.factory, nodes: s.scene.nodes, flight: s.flight, bee: { x: 300, restY: 316, arc: 12, squash: 0.9 } })(s.done)
    s.c.advance(0)
    s.finishAll()
    expect(s.done).not.toHaveBeenCalled() // huy hiệu còn đang chờ hẹn giờ thật
  })

  it('không có nút nào thì xong ngay', () => {
    const tweens = fakeTweens()
    const done = vi.fn()
    enterScript({ factory: tweens.factory, nodes: { sign: null, badge: null, bee: null }, flight: new BeeFlight(tweens.factory), bee: { x: 0, restY: 0, arc: 0, squash: 1 } })(done)
    expect(done).toHaveBeenCalledTimes(1)
  })

  it('hủy giữa chừng dừng mọi tween (bảng, ong) và không báo xong', () => {
    const s = setup()
    prepareEnter(s.scene.nodes)
    const cancel = enterScript({ factory: s.factory, nodes: s.scene.nodes, flight: s.flight, bee: { x: 300, restY: 316, arc: 12, squash: 0.9 } })(s.done)!
    cancel()
    expect(s.made.every((tween) => tween.destroyed)).toBe(true)
    s.finishAll()
    expect(s.done).not.toHaveBeenCalled()
  })
})

describe('exitScript', () => {
  it('bảng bay lên và mờ, huy hiệu thu nhỏ, ong bay ra ngoài mép phải; xong thì báo một lần', () => {
    const tweens = fakeTweens()
    const scene = sceneNodes()
    const flight = new BeeFlight(tweens.factory)
    const done = vi.fn()
    exitScript({ factory: tweens.factory, nodes: scene.nodes, flight, bee: { x: 300, restY: 316, arc: 12, squash: 0.9 }, beeExitX: 890 })(done)
    const sign = tweens.made.find((tween) => tween.node === scene.sign)!
    expect(sign.attrs).toEqual({ y: -SIGN_DROP, opacity: 0 })
    expect(sign.ease).toBe('in')
    const badge = tweens.made.find((tween) => tween.node === scene.badge)!
    expect(badge.attrs.opacity).toBe(0)
    expect(badge.attrs.scaleX).toBeLessThan(0.1)
    expect(tweens.made.find((tween) => tween.node === scene.bee && 'x' in tween.attrs)!.attrs.x).toBe(890)
    tweens.finishAll()
    expect(done).toHaveBeenCalledTimes(1)
  })
})

describe('correctScript', () => {
  it('hoa nở và pháo cùng lúc ngay; bông hoa nhỏ chỉ bay lên thanh sau PROGRESS_FLY_DELAY giây', () => {
    const c = clock()
    const log: string[] = []
    const done = vi.fn()
    correctScript({ bloom: () => log.push('nở'), confetti: () => log.push('pháo'), flyToProgress: () => log.push('bay'), scheduler: c.scheduler })(done)
    expect(log).toEqual(['nở', 'pháo'])
    c.advance(PROGRESS_FLY_DELAY * 1000 - 1)
    expect(log).toEqual(['nở', 'pháo'])
    c.advance(2)
    expect(log).toEqual(['nở', 'pháo', 'bay'])
    expect(done).toHaveBeenCalledTimes(1)
  })
  it('hủy thì hoa nhỏ không bay nữa', () => {
    const c = clock()
    const fly = vi.fn()
    const cancel = correctScript({ bloom: vi.fn(), confetti: vi.fn(), flyToProgress: fly, scheduler: c.scheduler })(vi.fn())!
    cancel()
    c.advance(5000)
    expect(fly).not.toHaveBeenCalled()
    expect(c.pending).toBe(0)
  })
})

describe('wrongScript', () => {
  const deps = (c: ReturnType<typeof clock>, log: string[], countAgain: (() => void) | null) => ({
    oopsSeconds: 2.1,
    blinkSeconds: 0.3,
    pauseSeconds: 0.25,
    startBlink: () => log.push('chớp bắt đầu'),
    endBlink: () => log.push('chớp xong'),
    countAgain,
    scheduler: c.scheduler,
  })

  it('lắc đầu + mặt «o» → chớp mắt → nghỉ một nhịp → đếm lại, đúng thứ tự và đúng mốc thời gian (không đếm lại ngay)', () => {
    const c = clock()
    const log: string[] = []
    wrongScript(deps(c, log, () => log.push('đếm lại')))(vi.fn())
    c.advance(2099)
    expect(log).toEqual([])
    c.advance(2)
    expect(log).toEqual(['chớp bắt đầu'])
    c.advance(300)
    expect(log).toEqual(['chớp bắt đầu', 'chớp xong'])
    c.advance(248)
    expect(log).toEqual(['chớp bắt đầu', 'chớp xong']) // vẫn chờ: không quay về 0 ngay
    c.advance(2)
    expect(log).toEqual(['chớp bắt đầu', 'chớp xong', 'đếm lại'])
  })
  it('không biết số đúng (countAgain = null) thì dừng sau khi chớp mắt', () => {
    const c = clock()
    const log: string[] = []
    const done = vi.fn()
    wrongScript(deps(c, log, null))(done)
    c.advance(10_000)
    expect(log).toEqual(['chớp bắt đầu', 'chớp xong'])
    expect(done).toHaveBeenCalledTimes(1)
  })
  it('hủy giữa chừng (đổi câu, đóng màn): không chớp thêm, không đếm lại', () => {
    const c = clock()
    const log: string[] = []
    const cancel = wrongScript(deps(c, log, () => log.push('đếm lại')))(vi.fn())!
    c.advance(1000)
    cancel()
    c.advance(10_000)
    expect(log).toEqual([])
    expect(c.pending).toBe(0)
  })
})

describe('SceneNode (kiểu)', () => {
  it('fakeNode đủ để làm SceneNode', () => {
    const node: SceneNode = fakeNode()
    node.y(5)
    expect(node.opacity(0.5)).toBeDefined()
  })
})
