import { describe, expect, it } from 'vitest'
import { beamSweep, fireflyPose, pollenPose, starPose, type Band } from './atmosphere'
import { applyGardenMotion, MOTION_NAMES, type MotionHost, type MotionNode, type MotionState } from './gardenMotion'

class FakeNode implements MotionNode {
  attrs: Record<string, number> = { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, opacity: 1 }
  private readonly custom: Record<string, unknown>
  constructor(custom: Record<string, unknown> = {}) {
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

const host = (groups: Partial<Record<keyof typeof MOTION_NAMES, FakeNode[]>>): MotionHost => ({
  find: (selector) => {
    const name = selector.slice(1)
    const key = (Object.keys(MOTION_NAMES) as (keyof typeof MOTION_NAMES)[]).find((k) => MOTION_NAMES[k] === name)
    return (key ? groups[key] : undefined) ?? []
  },
})

const idle: MotionState = { answeredAt: null, correct: false, flying: false, confetti: [] }
const BAND: Band = [34, 210, 700, 260]
const particle = (index: number) => new FakeNode({ motionIndex: index, motionBand: [...BAND] })

describe('không khí: phấn hoa, sao, đom đóm, tia nắng', () => {
  it('phấn hoa: đặt vị trí, độ đục, cỡ theo hàm dáng (đúng bằng pollenPose); các hạt ở chỗ khác nhau', () => {
    const nodes = [0, 1, 2].map(particle)
    applyGardenMotion(host({ pollen: nodes }), 4.2, idle)
    nodes.forEach((node, index) => {
      const expected = pollenPose(index, 4.2, BAND)
      expect(node.attrs.x).toBeCloseTo(expected.x, 8)
      expect(node.attrs.y).toBeCloseTo(expected.y, 8)
      expect(node.attrs.opacity).toBeCloseTo(expected.opacity, 8)
      expect(node.attrs.scaleX).toBeCloseTo(expected.scale, 8)
      expect(node.attrs.scaleY).toBeCloseTo(expected.scale, 8)
    })
    expect(new Set(nodes.map((node) => node.attrs.x.toFixed(2))).size).toBe(3)
  })
  it('sao và đom đóm theo hàm dáng của riêng chúng', () => {
    const star = particle(3)
    const firefly = particle(5)
    applyGardenMotion(host({ star: [star], firefly: [firefly] }), 7.7, idle)
    expect(star.attrs.opacity).toBeCloseTo(starPose(3, 7.7, BAND).opacity, 8)
    expect(firefly.attrs.x).toBeCloseTo(fireflyPose(5, 7.7, BAND).x, 8)
  })
  it('hạt không có dải (thiếu hoặc sai kiểu) thì bỏ qua, không ném lỗi, không sinh NaN', () => {
    const none = new FakeNode({ motionIndex: 1 })
    const broken = new FakeNode({ motionIndex: 1, motionBand: [1, 2, 'x', 4] })
    expect(() => applyGardenMotion(host({ pollen: [none, broken] }), 1, idle)).not.toThrow()
    expect(none.attrs).toEqual({ x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, opacity: 1 })
    expect(broken.attrs.x).toBe(0)
  })
  it('tia nắng quét nhẹ, mỗi chùm lệch pha', () => {
    const beams = [0, 1, 2].map((index) => new FakeNode({ motionIndex: index }))
    applyGardenMotion(host({ beam: beams }), 3.1, idle)
    beams.forEach((beam, index) => expect(beam.attrs.rotation).toBeCloseTo(beamSweep(index, 3.1), 8))
    expect(new Set(beams.map((beam) => beam.attrs.rotation.toFixed(3))).size).toBe(3)
  })
})
