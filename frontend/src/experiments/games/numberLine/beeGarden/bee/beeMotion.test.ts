import { describe, expect, it } from 'vitest'
import type { MotionHost, MotionNode } from '../gardenMotion'
import { applyBeeMotion, BEE_NAMES } from './beeMotion'
import { antennaAngle, BEE_POSES, beeShadow, blinkOpenness, wingFlapScale } from './beePoses'

class FakeNode implements MotionNode {
  attrs: Record<string, number> = { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, opacity: 1 }
  private readonly custom: Record<string, number | string>
  constructor(custom: Record<string, number | string> = {}) {
    this.custom = custom
  }
  x(v: number) { this.attrs.x = v }
  y(v: number) { this.attrs.y = v }
  rotation(v: number) { this.attrs.rotation = v }
  scaleX(v: number) { this.attrs.scaleX = v }
  scaleY(v: number) { this.attrs.scaleY = v }
  opacity(v: number) { this.attrs.opacity = v }
  getAttr(name: string) { return this.custom[name] }
}

const host = (groups: Partial<Record<keyof typeof BEE_NAMES, FakeNode[]>>): MotionHost => ({
  find: (selector) => {
    const name = selector.slice(1)
    const key = (Object.keys(BEE_NAMES) as (keyof typeof BEE_NAMES)[]).find((k) => BEE_NAMES[k] === name)
    return (key ? groups[key] : undefined) ?? []
  },
})

describe('applyBeeMotion', () => {
  it('cánh vỗ theo tư thế: bay nhanh hơn chờ', () => {
    const wing = new FakeNode()
    applyBeeMotion(host({ wing: [wing] }), 0.05, 'idle')
    expect(wing.attrs.scaleY).toBeCloseTo(wingFlapScale(0.05, BEE_POSES.idle), 10)
    applyBeeMotion(host({ wing: [wing] }), 0.05, 'fly')
    expect(wing.attrs.scaleY).toBeCloseTo(wingFlapScale(0.05, BEE_POSES.fly), 10)
  })
  it('râu: mỗi râu quay theo bên của mình (motionSide), hai râu lệch nhau', () => {
    const left = new FakeNode({ motionSide: -1 })
    const right = new FakeNode({ motionSide: 1 })
    applyBeeMotion(host({ antenna: [left, right] }), 1.7, 'think')
    expect(left.attrs.rotation).toBeCloseTo(antennaAngle(1.7, BEE_POSES.think, -1), 10)
    expect(right.attrs.rotation).toBeCloseTo(antennaAngle(1.7, BEE_POSES.think, 1), 10)
    expect(left.attrs.rotation).not.toBeCloseTo(right.attrs.rotation, 3)
  })
  it('chớp mắt: co dọc đôi mắt trong lúc chớp; trạng thái không chớp (vui, ngơ ngác, đang nhắm) thì mắt luôn mở', () => {
    const eyes = new FakeNode()
    // tìm một thời điểm đang chớp
    let blinkAt = -1
    for (let t = 0; t < 4; t += 0.005) if (blinkOpenness(t) < 0.3) { blinkAt = t; break }
    expect(blinkAt).toBeGreaterThan(0)
    applyBeeMotion(host({ eyes: [eyes] }), blinkAt, 'idle')
    expect(eyes.attrs.scaleY).toBeLessThan(0.3)
    for (const state of ['happy', 'oops', 'blink'] as const) {
      applyBeeMotion(host({ eyes: [eyes] }), blinkAt, state)
      expect(eyes.attrs.scaleY).toBe(1)
    }
    applyBeeMotion(host({ eyes: [eyes] }), 0, 'idle')
    expect(eyes.attrs.scaleY).toBe(1)
  })
  it('bóng đổ trượt ngang theo ong; ong bay cao thì bóng nhỏ và mờ hơn lúc nghỉ', () => {
    const root = new FakeNode({ x: 300, y: 320, motionRestY: 320 })
    const shadow = new FakeNode()
    applyBeeMotion(host({ root: [root], shadow: [shadow] }), 1, 'idle')
    const resting = { ...shadow.attrs }
    expect(resting.x).toBe(300)
    expect(resting.scaleX).toBe(beeShadow(0).scale)
    const high = new FakeNode({ x: 450, y: 320 - 40, motionRestY: 320 })
    applyBeeMotion(host({ root: [high], shadow: [shadow] }), 1, 'fly')
    expect(shadow.attrs.x).toBe(450)
    expect(shadow.attrs.scaleX).toBeLessThan(resting.scaleX)
    expect(shadow.attrs.opacity).toBeLessThan(resting.opacity)
  })
  it('không có ong thì bóng ẩn; không có bóng thì không tìm ong (không ném lỗi)', () => {
    const shadow = new FakeNode()
    applyBeeMotion(host({ shadow: [shadow] }), 1, 'idle')
    expect(shadow.attrs.opacity).toBe(0)
    expect(() => applyBeeMotion(host({}), 1, 'idle')).not.toThrow()
  })
  it('thiếu thuộc tính (node trống) không sinh NaN', () => {
    const root = new FakeNode()
    const shadow = new FakeNode()
    applyBeeMotion(host({ root: [root], shadow: [shadow] }), 2, 'idle')
    for (const value of Object.values(shadow.attrs)) expect(Number.isFinite(value)).toBe(true)
  })
})
