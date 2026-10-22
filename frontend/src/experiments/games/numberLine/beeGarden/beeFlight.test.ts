import { describe, expect, it, vi } from 'vitest'
import { BeeFlight, BOUNCE_DOWN_SECONDS, BOUNCE_UP_SECONDS, type Ease, type FlightPlan, type TweenNode } from './beeFlight'

interface FakeTween {
  node: unknown
  attrs: Record<string, number>
  seconds: number
  ease: Ease
  played: boolean
  destroyed: boolean
  /** Hoàn tất tween: đặt thuộc tính đích lên node rồi gọi onFinish (nếu chưa bị hủy). */
  finish: () => void
  /** Gọi onFinish bất chấp đã hủy (mô phỏng lệnh gọi muộn của thư viện). */
  fireAnyway: () => void
}

function setup() {
  const tweens: FakeTween[] = []
  const factory = (node: unknown, attrs: Readonly<Record<string, number>>, seconds: number, ease: Ease, onFinish: () => void): FakeTween => {
    const tween: FakeTween = {
      node,
      attrs: { ...attrs },
      seconds,
      ease,
      played: false,
      destroyed: false,
      finish: () => {
        if (tween.destroyed) return
        const target = node as Record<string, (value?: number) => number>
        for (const [key, value] of Object.entries(attrs)) target[key](value)
        onFinish()
      },
      fireAnyway: () => onFinish(),
    }
    return Object.assign(tween, {
      play: () => {
        tween.played = true
      },
      destroy: () => {
        tween.destroyed = true
      },
    })
  }
  tweens.length = 0
  const created: FakeTween[] = []
  const tracked = (...args: Parameters<typeof factory>) => {
    const tween = factory(...args)
    created.push(tween)
    return tween as unknown as ReturnType<typeof factory> & { play(): void; destroy(): void }
  }
  const state: Record<string, number> = { x: 100, y: 50, scaleX: 1, scaleY: 1 }
  const makeFn = (key: string) => (value?: number) => (value === undefined ? state[key] : (state[key] = value))
  const node = { x: makeFn('x'), y: makeFn('y'), scaleX: makeFn('scaleX'), scaleY: makeFn('scaleY') } as TweenNode & Record<string, unknown>
  const flight = new BeeFlight(tracked as never)
  const calls: string[] = []
  const callbacks = { onArrive: vi.fn((stop: number) => void calls.push(`arrive${stop}`)), onDone: vi.fn(() => void calls.push('done')) }
  const plan = (stops: number[], extra: Partial<FlightPlan> = {}): FlightPlan => ({ stops, restY: 50, arc: 40, hopSeconds: 0.2, ...extra })
  return { flight, node, state, created, calls, callbacks, plan }
}

/** Hoàn tất mọi tween đang chờ (lặp vì tween mới sinh ra khi tween cũ xong) cho tới khi hết. */
function finishAll(created: FakeTween[], limit = 200) {
  for (let i = 0; i < limit; i += 1) {
    const next = created.find((tween) => tween.played && !tween.destroyed && !(tween as unknown as { done?: boolean }).done)
    if (!next) return
    ;(next as unknown as { done?: boolean }).done = true
    next.finish()
  }
  throw new Error('quá nhiều tween')
}

describe('BeeFlight: một bước bay', () => {
  it('bước bay gồm tween x (êm hai đầu, cả bước), tween y lên đỉnh cung (nửa bước, chậm dần) rồi xuống (nửa bước, nhanh dần)', () => {
    const { flight, node, created, callbacks, plan } = setup()
    flight.start(node, plan([300]), callbacks)
    expect(created).toHaveLength(2)
    const [sideways, up] = created
    expect(sideways).toMatchObject({ attrs: { x: 300 }, seconds: 0.2, ease: 'inOut', played: true })
    expect(up).toMatchObject({ attrs: { y: 10 }, seconds: 0.1, ease: 'out', played: true })
    up.finish()
    expect(created).toHaveLength(3)
    expect(created[2]).toMatchObject({ attrs: { y: 50 }, seconds: 0.1, ease: 'in', played: true })
  })

  it('chỉ báo đã tới khi CẢ tween x và tween hạ xuống đều xong (thứ tự nào cũng được); báo đúng một lần rồi mới báo xong', () => {
    for (const sidewaysFirst of [true, false]) {
      const { flight, node, created, calls, callbacks, plan, state } = setup()
      flight.start(node, plan([300]), callbacks)
      const [sideways, up] = created
      up.finish()
      const down = created[2]
      if (sidewaysFirst) sideways.finish()
      else down.finish()
      expect(calls).toEqual([])
      expect(flight.flying).toBe(true)
      if (sidewaysFirst) down.finish()
      else sideways.finish()
      expect(calls).toEqual(['arrive0', 'done'])
      expect(state.y).toBe(50) // trả về độ cao nghỉ
      expect(state.x).toBe(300)
      expect(flight.flying).toBe(false)
    }
  })

  it('không có hoa nào để đi (stops rỗng): báo xong ngay, không tạo tween, không báo đã tới', () => {
    const { flight, node, created, calls, callbacks, plan } = setup()
    flight.start(node, plan([]), callbacks)
    expect(created).toHaveLength(0)
    expect(calls).toEqual(['done'])
    expect(flight.flying).toBe(false)
  })
})

describe('BeeFlight: nhiều hoa liên tiếp', () => {
  it('đi qua từng hoa theo thứ tự: bước sau chỉ bắt đầu khi bước trước đã xong; báo đã tới từng hoa rồi báo xong đúng một lần', () => {
    const { flight, node, created, calls, callbacks, plan, state } = setup()
    flight.start(node, plan([150, 200, 250]), callbacks)
    expect(created.filter((tween) => 'x' in tween.attrs).map((tween) => tween.attrs.x)).toEqual([150]) // mới bước đầu
    // hoàn tất từng bước một và kiểm tra tại mỗi bước
    const xs: number[] = []
    for (let hop = 0; hop < 3; hop += 1) {
      const before = calls.length
      for (let i = 0; i < 6 && calls.length === before; i += 1) {
        const pending = created.find((tween) => tween.played && !tween.destroyed && !(tween as unknown as { done?: boolean }).done)
        if (!pending) break
        ;(pending as unknown as { done?: boolean }).done = true
        pending.finish()
      }
      xs.push(state.x)
    }
    expect(calls).toEqual(['arrive0', 'arrive1', 'arrive2', 'done'])
    expect(xs).toEqual([150, 200, 250])
    expect(callbacks.onDone).toHaveBeenCalledTimes(1)
    expect(created.filter((tween) => 'x' in tween.attrs).map((tween) => tween.attrs.x)).toEqual([150, 200, 250])
  })

  it('mỗi bước cùng có cung nhảy: có đủ một tween lên và một tween xuống cho từng hoa', () => {
    const { flight, node, created, callbacks, plan } = setup()
    flight.start(node, plan([150, 200]), callbacks)
    finishAll(created)
    expect(created.filter((tween) => tween.attrs.y === 10)).toHaveLength(2)
    expect(created.filter((tween) => tween.attrs.y === 50)).toHaveLength(2)
  })
})

describe('BeeFlight: hủy và bay lại', () => {
  it('hủy giữa chừng: hủy mọi tween, không báo gì nữa (kể cả khi thư viện gọi onFinish muộn), flying về false', () => {
    const { flight, node, created, calls, callbacks, plan } = setup()
    flight.start(node, plan([150, 200]), callbacks)
    flight.cancel()
    expect(created.every((tween) => tween.destroyed)).toBe(true)
    for (const tween of created) tween.fireAnyway()
    expect(calls).toEqual([])
    expect(flight.flying).toBe(false)
  })

  it('bắt đầu chuyến mới khi chuyến cũ đang bay: chuyến cũ bị hủy và không báo gì; chuyến mới chạy bình thường', () => {
    const { flight, node, created, calls, callbacks, plan } = setup()
    const oldCalls = { onArrive: vi.fn(), onDone: vi.fn() }
    flight.start(node, plan([150, 200]), oldCalls)
    const oldTweens = [...created]
    flight.start(node, plan([120]), callbacks)
    expect(oldTweens.every((tween) => tween.destroyed)).toBe(true)
    for (const tween of oldTweens) tween.fireAnyway()
    finishAll(created)
    expect(oldCalls.onArrive).not.toHaveBeenCalled()
    expect(oldCalls.onDone).not.toHaveBeenCalled()
    expect(calls).toEqual(['arrive0', 'done'])
  })

  it('hủy rồi bay lại với cùng đối tượng gọi lại: hoạt động bình thường', () => {
    const { flight, node, created, calls, callbacks, plan } = setup()
    flight.start(node, plan([150]), callbacks)
    flight.cancel()
    flight.start(node, plan([180]), callbacks)
    finishAll(created)
    expect(calls).toEqual(['arrive0', 'done'])
  })
})

describe('BeeFlight: không chuyển động (giảm chuyển động)', () => {
  it('nhảy thẳng tới hoa cuối, đặt độ cao nghỉ, chỉ báo đã tới hoa cuối rồi báo xong; không tạo tween', () => {
    const { flight, node, created, calls, callbacks, plan, state } = setup()
    state.y = 20
    flight.start(node, plan([150, 200, 250], { instant: true }), callbacks)
    expect(created).toHaveLength(0)
    expect(state.x).toBe(250)
    expect(state.y).toBe(50)
    expect(calls).toEqual(['arrive2', 'done'])
    expect(flight.flying).toBe(false)
  })
})

describe('BeeFlight: hoa nảy', () => {
  it('nảy lên cỡ gốc × đỉnh trong thời gian ngắn rồi về cỡ gốc', () => {
    const { flight, node, created } = setup()
    flight.bounce(node, 0.8, 1.25)
    expect(created).toHaveLength(1)
    expect(created[0]).toMatchObject({ attrs: { scaleX: 1, scaleY: 1 }, seconds: BOUNCE_UP_SECONDS, ease: 'out', played: true })
    created[0].finish()
    expect(created[1]).toMatchObject({ attrs: { scaleX: 0.8, scaleY: 0.8 }, seconds: BOUNCE_DOWN_SECONDS, ease: 'in', played: true })
  })

  it('hủy chuyến bay cũng hủy các hoa đang nảy', () => {
    const { flight, node, created } = setup()
    flight.bounce(node, 1, 1.2)
    flight.cancel()
    expect(created.every((tween) => tween.destroyed)).toBe(true)
  })

  it('nảy không làm flying đổi và không cần chuyến bay', () => {
    const { flight, node } = setup()
    flight.bounce(node, 1, 1.2)
    expect(flight.flying).toBe(false)
  })
})

describe('BeeFlight: co giãn khi bay (squash & stretch)', () => {
  const squashTweens = <T extends { attrs: Record<string, number> }>(created: T[]) => created.filter((tween) => 'scaleX' in tween.attrs)

  it('không khai squash thì không có tween co giãn nào', () => {
    const { flight, node, created, callbacks, plan } = setup()
    flight.start(node, plan([200]), callbacks)
    expect(squashTweens(created)).toHaveLength(0)
  })

  it('cất cánh: vươn dài (hẹp, cao) quanh tỉ lệ gốc, rồi trở về tỉ lệ gốc', () => {
    const { flight, node, created, callbacks, plan } = setup()
    flight.start(node, plan([200], { squash: 0.9 }), callbacks)
    const [stretch] = squashTweens(created)
    expect(stretch.attrs.scaleX).toBeLessThan(0.9)
    expect(stretch.attrs.scaleY).toBeGreaterThan(0.9)
    stretch.finish()
    const recover = squashTweens(created)[1]
    expect(recover.attrs).toEqual({ scaleX: 0.9, scaleY: 0.9 })
  })

  it('hạ cánh: bẹp (rộng, thấp); các bước co giãn không làm đổi thứ tự báo tới nơi', () => {
    const { flight, node, created, callbacks, plan, calls } = setup()
    flight.start(node, plan([200], { squash: 1 }), callbacks)
    for (let round = 0; round < 4; round += 1) for (const tween of created.slice()) if (!('scaleX' in tween.attrs)) tween.finish()
    expect(calls).toEqual(['arrive0', 'done'])
    const landing = squashTweens(created).find((tween) => tween.attrs.scaleX > 1)!
    expect(landing.attrs.scaleX).toBeGreaterThan(1)
    expect(landing.attrs.scaleY).toBeLessThan(1)
  })

  it('hủy giữa chừng thì trả ong về đúng tỉ lệ gốc (không để méo) và hủy các tween co giãn', () => {
    const { flight, node, state, created, callbacks, plan } = setup()
    flight.start(node, plan([200], { squash: 0.9 }), callbacks)
    state.scaleX = 0.8
    state.scaleY = 1.2
    flight.cancel()
    expect(state.scaleX).toBe(0.9)
    expect(state.scaleY).toBe(0.9)
    expect(squashTweens(created).every((tween) => tween.destroyed)).toBe(true)
  })

  it('giảm chuyển động (instant) thì không co giãn', () => {
    const { flight, node, created, callbacks, plan } = setup()
    flight.start(node, plan([200], { squash: 0.9, instant: true }), callbacks)
    expect(created).toHaveLength(0)
  })
})
