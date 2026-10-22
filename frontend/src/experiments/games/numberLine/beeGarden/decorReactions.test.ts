import { describe, expect, it } from 'vitest'
import type { Ease } from './beeFlight'
import { DecorReactor, MAX_REACTION_SECONDS, reactionSeconds, reactionSteps, type ReactiveNode } from './decorReactions'
import { DECORATION_REACTIONS } from '../../../theme/themeTypes'

const kinds = DECORATION_REACTIONS.filter((kind) => kind !== 'none')

describe('reactionSteps', () => {
  it('mỗi phản ứng ngắn hơn 1,2 giây (dưới ngưỡng 1,5 giây của đề bài) và có ít nhất một bước', () => {
    for (const kind of kinds) {
      expect(reactionSteps(kind).length, kind).toBeGreaterThan(0)
      expect(reactionSeconds(kind), kind).toBeLessThanOrEqual(MAX_REACTION_SECONDS)
    }
    expect(MAX_REACTION_SECONDS).toBeLessThan(1.5)
  })

  it('none, bỏ trống hoặc loại lạ thì không có bước nào', () => {
    expect(reactionSteps('none')).toEqual([])
    expect(reactionSteps(undefined)).toEqual([])
    expect(reactionSteps('bay-lung-tung' as never)).toEqual([])
  })

  it('bước cuối luôn đưa các thuộc tính đã đổi về trạng thái nghỉ (cỡ 1, không nhấc, không nghiêng)', () => {
    const rest: Record<string, number> = { scaleX: 1, scaleY: 1, reactY: 0, reactRot: 0 }
    for (const kind of kinds) {
      const steps = reactionSteps(kind)
      // Giá trị cuối cùng của mỗi thuộc tính (lần nhắc đến sau cùng) phải là trạng thái nghỉ.
      const final: Record<string, number> = {}
      for (const item of steps) Object.assign(final, item.attrs)
      for (const [key, value] of Object.entries(final)) expect(value, `${kind}.${key}`).toBe(rest[key])
    }
  })

  it('co giãn gần như bảo toàn thể tích (rộng thì thấp, hẹp thì cao) và không phóng to bất thường', () => {
    for (const kind of kinds) {
      for (const item of reactionSteps(kind)) {
        const { scaleX, scaleY } = item.attrs
        if (scaleX === undefined || scaleY === undefined) continue
        expect(scaleX * scaleY, kind).toBeGreaterThan(0.85)
        expect(scaleX * scaleY, kind).toBeLessThan(1.1)
        expect(Math.max(scaleX, scaleY), kind).toBeLessThanOrEqual(1.35)
      }
    }
  })

  it('nhấc lên không quá 40 đơn vị thiết kế và nghiêng không quá 14° (nhẹ nhàng, không lắc mạnh)', () => {
    for (const kind of kinds) {
      for (const item of reactionSteps(kind)) {
        expect(Math.abs(item.attrs.reactY ?? 0), kind).toBeLessThanOrEqual(40)
        expect(Math.abs(item.attrs.reactRot ?? 0), kind).toBeLessThanOrEqual(14)
      }
    }
  })
})

function fakeNode(custom: Record<string, unknown> = {}) {
  const attrs: Record<string, unknown> = { y: 77, rotation: 5, scaleX: 3, scaleY: 3, reactY: 9, reactRot: 9, ...custom }
  const node: ReactiveNode & { attrs: Record<string, unknown> } = {
    attrs,
    getAttr: (name) => attrs[name],
    setAttr: (name, value) => void (attrs[name] = value),
    y: (value) => void (attrs.y = value),
    rotation: (value) => void (attrs.rotation = value),
    scaleX: (value) => void (attrs.scaleX = value),
    scaleY: (value) => void (attrs.scaleY = value),
  }
  return node
}

interface RecordedTween {
  attrs: Record<string, number>
  seconds: number
  ease: Ease
  destroyed: boolean
  done: boolean
  finish: () => void
}

function reactorWithFakeTweens() {
  const tweens: RecordedTween[] = []
  const reactor = new DecorReactor((_node, attrs, seconds, ease, onFinish) => {
    const tween: RecordedTween = { attrs: { ...attrs }, seconds, ease, destroyed: false, done: false, finish: onFinish }
    tweens.push(tween)
    return { play: () => undefined, destroy: () => void (tween.destroyed = true) }
  })
  const finishAll = () => {
    for (let i = 0; i < 50; i += 1) {
      const next = tweens.find((tween) => !tween.destroyed && !tween.done)
      if (!next) return
      next.done = true
      next.finish()
    }
  }
  return { reactor, tweens, finishAll }
}

describe('DecorReactor', () => {
  it('chạy lần lượt từng bước; xong thì trả vật về chỗ nghỉ (y gốc, góc 0, cỡ 1, hết nhấc/nghiêng)', () => {
    const { reactor, tweens, finishAll } = reactorWithFakeTweens()
    const node = fakeNode({ motionKind: 'drift', motionBaseY: 300 })
    expect(reactor.react(node, 'hop')).toBe(true)
    expect(tweens).toHaveLength(1) // chỉ bước đầu; các bước sau sinh ra khi bước trước xong
    expect(reactor.isBusy(node)).toBe(true)
    finishAll()
    expect(tweens).toHaveLength(reactionSteps('hop').length)
    expect(reactor.isBusy(node)).toBe(false)
    expect(node.attrs).toMatchObject({ y: 300, rotation: 0, scaleX: 1, scaleY: 1, reactY: 0, reactRot: 0 })
  })

  it('chạm dồn lúc đang phản ứng thì bỏ qua (không chồng hai chuỗi tween lên một vật)', () => {
    const { reactor, tweens } = reactorWithFakeTweens()
    const node = fakeNode()
    expect(reactor.react(node, 'boing')).toBe(true)
    expect(reactor.react(node, 'boing')).toBe(false)
    expect(tweens).toHaveLength(1)
  })

  it('hai vật khác nhau phản ứng độc lập', () => {
    const { reactor } = reactorWithFakeTweens()
    expect(reactor.react(fakeNode(), 'hop')).toBe(true)
    expect(reactor.react(fakeNode(), 'wiggle')).toBe(true)
  })

  it('none hoặc bỏ trống: không phản ứng, vật không bận', () => {
    const { reactor, tweens } = reactorWithFakeTweens()
    const node = fakeNode()
    expect(reactor.react(node, 'none')).toBe(false)
    expect(reactor.react(node, undefined)).toBe(false)
    expect(tweens).toHaveLength(0)
    expect(reactor.isBusy(node)).toBe(false)
  })

  it('vật float tự đặt y (bồng bềnh) và vật sway tự đặt góc (đung đưa): khi xong không ghi đè phần đó', () => {
    const { reactor, finishAll } = reactorWithFakeTweens()
    const floater = fakeNode({ motionKind: 'float', motionBaseY: 300 })
    reactor.react(floater, 'flutter')
    const swayer = fakeNode({ motionKind: 'sway', motionBaseY: 300 })
    reactor.react(swayer, 'boing')
    finishAll()
    expect(floater.attrs.y).toBe(77)
    expect(floater.attrs.rotation).toBe(0)
    expect(swayer.attrs.y).toBe(300)
    expect(swayer.attrs.rotation).toBe(5)
  })

  it('cancel() dừng tween đang chạy và trả mọi vật đang bận về chỗ nghỉ; sau đó vật phản ứng lại được', () => {
    const { reactor, tweens } = reactorWithFakeTweens()
    const node = fakeNode({ motionKind: 'drift', motionBaseY: 300 })
    reactor.react(node, 'hop')
    reactor.cancel()
    expect(tweens[0].destroyed).toBe(true)
    expect(node.attrs).toMatchObject({ y: 300, scaleX: 1, scaleY: 1, reactY: 0, reactRot: 0 })
    expect(reactor.isBusy(node)).toBe(false)
    tweens[0].finish() // lệnh gọi muộn của thư viện sau khi hủy: không làm gì
    expect(tweens).toHaveLength(1)
    expect(reactor.react(node, 'hop')).toBe(true)
  })
})
