import { describe, expect, it, vi } from 'vitest'
import { SparkleTrail } from './sparkleTrail'
import { DECOR_FADE_MIN, GARDEN_LEFT, GARDEN_RIGHT } from './beeGardenGeometry'
import { applyGardenMotion, MOTION_NAMES, type MotionHost, type MotionNode, type MotionState } from './gardenMotion'
import { beeBob, CONFETTI_SECONDS, happyHop, happySpin, HAPPY_SECONDS, makeConfetti, OOPS_SECONDS, oopsShake, pulse, sunGlowOpacity, sunGlowScale, wingScale } from './beeGardenGeometry'

class FakeNode implements MotionNode {
  attrs: Record<string, number> = { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, opacity: 1 }
  private readonly custom: Record<string, number | string>
  constructor(custom: Record<string, number | string> = {}) {
    this.custom = custom
  }
  private accessor(key: string, value: number) {
    this.attrs[key] = value
  }
  x(value: number) { this.accessor('x', value) }
  y(value: number) { this.accessor('y', value) }
  rotation(value: number) { this.accessor('rotation', value) }
  scaleX(value: number) { this.accessor('scaleX', value) }
  scaleY(value: number) { this.accessor('scaleY', value) }
  opacity(value: number) { this.accessor('opacity', value) }
  getAttr(name: string) { return this.custom[name] }
}

function host(groups: Partial<Record<keyof typeof MOTION_NAMES, FakeNode[]>>): MotionHost {
  return {
    find: (selector) => {
      const name = selector.slice(1)
      const key = (Object.keys(MOTION_NAMES) as (keyof typeof MOTION_NAMES)[]).find((k) => MOTION_NAMES[k] === name)
      return (key ? groups[key] : undefined) ?? []
    },
  }
}

const idle: MotionState = { answeredAt: null, correct: false, flying: false, confetti: [] }

describe('chuyển động nền', () => {
  it('mây trôi quanh vị trí gốc, mặt trời quay, hoa đung đưa ±4° lệch pha theo chỉ số, cánh vỗ, vòng gợi ý phập phồng', () => {
    const cloud = new FakeNode({ motionBaseX: 150, motionAmplitude: 18, motionSpeed: 0.35 })
    const rays = new FakeNode()
    const swayA = new FakeNode({ motionIndex: 0 })
    const swayB = new FakeNode({ motionIndex: 3 })
    const wing = new FakeNode()
    const glow = new FakeNode()
    const t = 2.5
    applyGardenMotion(host({ cloud: [cloud], sunRays: [rays], sway: [swayA, swayB], wing: [wing], hintGlow: [glow] }), t, idle)
    expect(cloud.attrs.x).toBeCloseTo(150 + Math.sin(t * 0.35) * 18, 8)
    expect(rays.attrs.rotation).toBeCloseTo(t * 8, 8)
    expect(swayA.attrs.rotation).toBeCloseTo(Math.sin(t * 1.3) * 4, 8)
    expect(swayB.attrs.rotation).toBeCloseTo(Math.sin(t * 1.3 + 3 * 0.9) * 4, 8)
    expect(swayA.attrs.rotation).not.toBeCloseTo(swayB.attrs.rotation, 3) // lệch pha: không cùng lắc một nhịp
    for (const time of [0, 0.7, 1.9, 3.3, 10]) {
      applyGardenMotion(host({ sway: [swayA] }), time, idle)
      expect(Math.abs(swayA.attrs.rotation)).toBeLessThanOrEqual(4) // đung đưa nhẹ, không lắc mạnh
    }
    expect(wing.attrs.scaleY).toBeCloseTo(wingScale(t), 8)
    expect(glow.attrs.scaleX).toBeCloseTo(pulse(t), 8)
    expect(glow.attrs.scaleY).toBeCloseTo(pulse(t), 8)
  })

  it('chưa trả lời: ong nhún nhẹ quanh độ cao nghỉ, không xoay', () => {
    const bee = new FakeNode({ motionRestY: 300 })
    applyGardenMotion(host({ bee: [bee] }), 4, idle)
    expect(bee.attrs.y).toBeCloseTo(300 + beeBob(4), 8)
    expect(bee.attrs.rotation).toBe(0)
  })

  it('đang bay: không đụng vào ong (chuyến bay tự điều khiển y)', () => {
    const bee = new FakeNode({ motionRestY: 300 })
    bee.attrs.y = 123
    bee.attrs.rotation = 7
    applyGardenMotion(host({ bee: [bee] }), 4, { ...idle, flying: true })
    expect(bee.attrs.y).toBe(123)
    expect(bee.attrs.rotation).toBe(7)
  })

  it('đúng: nhảy cẫng (lên cao, không nhún) và xoay một vòng; sau thời gian ăn mừng thì về độ cao nghỉ, hết xoay', () => {
    const bee = new FakeNode({ motionRestY: 300 })
    const state: MotionState = { ...idle, answeredAt: 10, correct: true }
    applyGardenMotion(host({ bee: [bee] }), 10.3, state)
    expect(bee.attrs.y).toBeCloseTo(300 + happyHop(0.3), 8)
    expect(bee.attrs.y).toBeLessThan(300) // lên cao
    expect(bee.attrs.rotation).toBeCloseTo(happySpin(0.3), 8)
    expect(bee.attrs.rotation).toBeGreaterThan(0)
    applyGardenMotion(host({ bee: [bee] }), 10 + HAPPY_SECONDS + 0.1, state)
    expect(bee.attrs.y).toBe(300)
    expect(bee.attrs.rotation).toBe(0)
  })

  it('sai: chỉ lắc đầu nhẹ (không nhảy, không xoay vòng, ≤ 9°); lắc xong thì đứng yên rồi nhún lại sau một lúc', () => {
    const bee = new FakeNode({ motionRestY: 300 })
    const state: MotionState = { ...idle, answeredAt: 10, correct: false }
    applyGardenMotion(host({ bee: [bee] }), 10.05, state)
    expect(bee.attrs.rotation).toBeCloseTo(oopsShake(0.05), 8)
    expect(Math.abs(bee.attrs.rotation)).toBeGreaterThan(0.5)
    expect(Math.abs(bee.attrs.rotation)).toBeLessThanOrEqual(9)
    expect(bee.attrs.y).toBe(300) // không nhảy, không nhún trong lúc lắc
    applyGardenMotion(host({ bee: [bee] }), 10 + OOPS_SECONDS + 0.2, state)
    expect(bee.attrs.rotation).toBe(0)
    expect(bee.attrs.y).toBe(300)
    applyGardenMotion(host({ bee: [bee] }), 10 + OOPS_SECONDS + 1.5, state)
    expect(bee.attrs.y).toBeCloseTo(300 + beeBob(10 + OOPS_SECONDS + 1.5), 8)
  })

  it('sao rải: đúng thì từng hạt bay theo thời gian rồi tắt sau CONFETTI_SECONDS; sai hoặc chưa trả lời thì luôn vô hình', () => {
    const particles = makeConfetti(7, 4)
    const stars = particles.map((_, index) => new FakeNode({ motionIndex: index }))
    const right: MotionState = { ...idle, answeredAt: 5, correct: true, confetti: particles }
    applyGardenMotion(host({ confetti: stars }), 5.4, right)
    for (const star of stars) {
      expect(star.attrs.opacity).toBeGreaterThan(0)
      expect(star.attrs.opacity).toBeLessThanOrEqual(1)
    }
    expect(new Set(stars.map((star) => star.attrs.x)).size).toBeGreaterThan(1) // mỗi hạt bay một hướng
    applyGardenMotion(host({ confetti: stars }), 5 + CONFETTI_SECONDS + 0.01, right)
    expect(stars.every((star) => star.attrs.opacity === 0)).toBe(true)
    applyGardenMotion(host({ confetti: stars }), 5.4, { ...right, correct: false })
    expect(stars.every((star) => star.attrs.opacity === 0)).toBe(true)
    applyGardenMotion(host({ confetti: stars }), 5.4, { ...idle, confetti: particles })
    expect(stars.every((star) => star.attrs.opacity === 0)).toBe(true)
  })

  it('hạt có chỉ số lạ (không có trong danh sách) thì vô hình, không ném lỗi', () => {
    const star = new FakeNode({ motionIndex: 99 })
    expect(() => applyGardenMotion(host({ confetti: [star] }), 5.4, { ...idle, answeredAt: 5, correct: true, confetti: makeConfetti(1, 3) })).not.toThrow()
    expect(star.attrs.opacity).toBe(0)
  })
})

describe('phản ứng khi chạm vật trang trí cộng vào chuyển động nền', () => {
  it('reactY nhấc vật lên (kể cả vật chỉ đứng yên hay trôi ngang) và reactRot nghiêng nó; bằng 0 thì không đụng tới y và góc', () => {
    const drifter = new FakeNode({ motionKind: 'drift', motionBaseX: 100, motionBaseY: 300, motionAmplitude: 8, motionSpeed: 1, reactY: -20, reactRot: 10 })
    applyGardenMotion(host({ decoration: [drifter] }), 1, idle)
    expect(drifter.attrs.y).toBe(280)
    expect(drifter.attrs.rotation).toBe(10)
    const calm = new FakeNode({ motionKind: 'drift', motionBaseX: 100, motionBaseY: 300, motionAmplitude: 8, motionSpeed: 1, reactY: 0, reactRot: 0 })
    applyGardenMotion(host({ decoration: [calm] }), 1, idle)
    expect(calm.attrs.y).toBe(0)
    expect(calm.attrs.rotation).toBe(0)
  })
  it('vật float cộng reactY vào bồng bềnh; vật sway cộng reactRot vào đung đưa', () => {
    const floater = new FakeNode({ motionKind: 'float', motionBaseX: 100, motionBaseY: 50, motionAmplitude: 10, motionSpeed: 1, motionPhase: 0, reactY: -30 })
    applyGardenMotion(host({ decoration: [floater] }), 2, idle)
    expect(floater.attrs.y).toBeCloseTo(50 + Math.sin(2) * 10 - 30, 8)
    const swayer = new FakeNode({ motionKind: 'sway', motionAmplitude: 4, motionSpeed: 1, reactRot: 9 })
    applyGardenMotion(host({ decoration: [swayer] }), 2, idle)
    expect(swayer.attrs.rotation).toBeCloseTo(Math.sin(2) * 4 + 9, 8)
  })
})

describe('vệt lấp lánh sau ong', () => {
  it('đang bay: thả hạt tại chỗ ong rồi hiện sao nhỏ; không bay thì vô hình', () => {
    const bee = new FakeNode({ x: 120, y: 200 })
    const star = new FakeNode({ motionIndex: 0 })
    const trail = new SparkleTrail()
    const state: MotionState = { ...idle, flying: true, trail }
    applyGardenMotion(host({ bee: [bee], trail: [star] }), 1, state)
    expect(star.attrs.opacity).toBeGreaterThan(0)
    expect(star.attrs.x).toBe(120)
    applyGardenMotion(host({ bee: [bee], trail: [star] }), 3, { ...state, flying: false })
    expect(star.attrs.opacity).toBe(0)
  })
  it('không có trail trong state thì không đụng vào sao', () => {
    const star = new FakeNode({ motionIndex: 0 })
    applyGardenMotion(host({ trail: [star] }), 1, idle)
    expect(star.attrs.opacity).toBe(1)
  })
})

describe('vầng sáng mặt trời', () => {
  it('thở chậm theo thời gian: đặt tỉ lệ đều hai chiều và độ đục theo hàm thuần', () => {
    const glow = new FakeNode()
    applyGardenMotion(host({ sunGlow: [glow] }), 2.4, idle)
    expect(glow.attrs.scaleX).toBeCloseTo(sunGlowScale(2.4), 8)
    expect(glow.attrs.scaleY).toBeCloseTo(sunGlowScale(2.4), 8)
    expect(glow.attrs.opacity).toBeCloseTo(sunGlowOpacity(2.4), 8)
  })
})

describe('nút nghe lại (loa và sóng âm)', () => {
  it('đang đọc: loa rung nhẹ trong ±5° và sóng chớp lần lượt (lệch pha theo chỉ số); không đọc thì loa đứng yên, sóng ẩn', () => {
    const speaker = new FakeNode()
    const waves = [0, 1, 2].map((index) => new FakeNode({ motionIndex: index }))
    const hostOf = (): MotionHost => ({
      find: (selector) => (selector === `.${MOTION_NAMES.speaker}` ? [speaker] : selector === `.${MOTION_NAMES.wave}` ? waves : []),
    })
    const idle: MotionState = { answeredAt: null, correct: false, flying: false, confetti: [] }
    for (const t of [0, 0.31, 1.7, 5.2]) {
      applyGardenMotion(hostOf(), t, { ...idle, speaking: true })
      expect(Math.abs(speaker.attrs.rotation)).toBeLessThanOrEqual(5.000001)
      for (const wave of waves) {
        expect(wave.attrs.opacity).toBeGreaterThanOrEqual(0.25)
        expect(wave.attrs.opacity).toBeLessThanOrEqual(1.000001)
      }
    }
    applyGardenMotion(hostOf(), 0.4, { ...idle, speaking: true })
    expect(new Set(waves.map((wave) => wave.attrs.opacity.toFixed(4))).size).toBeGreaterThan(1) // ba vòng không chớp đồng bộ
    applyGardenMotion(hostOf(), 0.4, { ...idle, speaking: false })
    expect(speaker.attrs.rotation).toBe(0)
    for (const wave of waves) expect(wave.attrs.opacity).toBe(0)
    applyGardenMotion(hostOf(), 0.4, idle) // speaking bỏ trống = không đọc
    for (const wave of waves) expect(wave.attrs.opacity).toBe(0)
  })
})

describe('vật trang trí nhường chỗ cho ong, hạt lấp lánh quanh hoa gợi ý', () => {
  const sky = (extra: Record<string, number | string> = {}) =>
    new FakeNode({ motionKind: 'still', motionFade: 1, motionBaseOpacity: 0.9, motionOffX: 20, motionOffY: 16, x: 100, y: 100, ...extra })
  const bee = (x: number, y: number) => new FakeNode({ x, y })

  it('ong ở sát vật thì vật mờ tới mức tối thiểu; ong ở xa thì vật rõ như độ đục gốc; khoảng cách tính sau khi trừ độ lệch của nhóm trang trí', () => {
    const near = sky()
    applyGardenMotion(host({ decoration: [near], bee: [bee(120, 116)] }), 1, idle) // cùng chỗ với vật (100 + 20, 100 + 16)
    expect(near.attrs.opacity).toBeCloseTo(0.9 * DECOR_FADE_MIN, 8)
    const far = sky()
    applyGardenMotion(host({ decoration: [far], bee: [bee(120 + 500, 116)] }), 1, idle)
    expect(far.attrs.opacity).toBeCloseTo(0.9, 8)
  })
  it('mờ dần theo khoảng cách (đơn điệu)', () => {
    let previous = 0
    for (const distance of [0, 40, 70, 90, 110, 130, 300]) {
      const item = sky()
      applyGardenMotion(host({ decoration: [item], bee: [bee(120 + distance, 116)] }), 1, idle)
      expect(item.attrs.opacity).toBeGreaterThanOrEqual(previous - 1e-12)
      previous = item.attrs.opacity
    }
  })
  it('vật trên cỏ (motionFade = 0) và khi không có ong thì không bị đổi độ đục', () => {
    const ground = sky({ motionFade: 0 })
    applyGardenMotion(host({ decoration: [ground], bee: [bee(120, 116)] }), 1, idle)
    expect(ground.attrs.opacity).toBe(1)
    const alone = sky()
    applyGardenMotion(host({ decoration: [alone] }), 1, idle)
    expect(alone.attrs.opacity).toBe(1)
  })
  it('hạt lấp lánh quanh hoa gợi ý quay chậm theo thời gian', () => {
    const spark = new FakeNode()
    applyGardenMotion(host({ hintSpark: [spark] }), 0, idle)
    expect(spark.attrs.rotation).toBe(0)
    applyGardenMotion(host({ hintSpark: [spark] }), 2, idle)
    expect(spark.attrs.rotation).toBeCloseTo(80, 8)
  })
  it('nhảy cẫng bị chặn bởi trần nâng trong state; không có trần thì nhảy đầy đủ', () => {
    const state: MotionState = { ...idle, answeredAt: 10, correct: true }
    const full = new FakeNode({ motionRestY: 300 })
    applyGardenMotion(host({ bee: [full] }), 10.2, state)
    const capped = new FakeNode({ motionRestY: 300 })
    applyGardenMotion(host({ bee: [capped] }), 10.2, { ...state, maxLift: 5 })
    expect(Math.abs(capped.attrs.y - 300)).toBeLessThanOrEqual(5)
    expect(Math.abs(full.attrs.y - 300)).toBeGreaterThan(5)
  })
})

describe('tiếng ong vo ve theo vị trí', () => {
  it('có ong và có bộ âm nền: báo đang bay hay không và vị trí trái/phải mỗi khung hình (-0,8 ở mép trái, +0,8 ở mép phải)', () => {
    const calls: [boolean, number][] = []
    const ambience = { follow: (flying: boolean, pan: number) => void calls.push([flying, pan]) }
    const left = new FakeNode({ x: GARDEN_LEFT })
    applyGardenMotion(host({ bee: [left] }), 1, { ...idle, flying: true, ambience })
    const right = new FakeNode({ x: GARDEN_RIGHT })
    applyGardenMotion(host({ bee: [right] }), 2, { ...idle, flying: false, ambience })
    expect(calls[0][0]).toBe(true)
    expect(calls[0][1]).toBeCloseTo(-0.8, 8)
    expect(calls[1][0]).toBe(false)
    expect(calls[1][1]).toBeCloseTo(0.8, 8)
  })
  it('không có ong hoặc không có bộ âm nền thì không báo gì và không ném lỗi', () => {
    const follow = vi.fn()
    applyGardenMotion(host({}), 1, { ...idle, flying: true, ambience: { follow } })
    expect(follow).not.toHaveBeenCalled()
    expect(() => applyGardenMotion(host({ bee: [new FakeNode({ x: 100 })] }), 1, { ...idle, flying: true })).not.toThrow()
  })
})

describe('camera nhẹ: lớp nền trượt ngược chiều ong', () => {
  const layer = (k: number, base = 0) => new FakeNode({ parallaxK: k, parallaxBaseX: base })
  it('ong ở mép trái thì lớp xa trượt sang phải, ở mép phải thì sang trái; ở giữa thì đứng ở chỗ gốc; tỉ lệ theo hệ số của lớp', () => {
    const far = layer(5, 10)
    const near = layer(-9, 0)
    applyGardenMotion(host({ parallax: [far, near], bee: [new FakeNode({ x: GARDEN_LEFT })] }), 1, idle)
    expect(far.attrs.x).toBeCloseTo(10 + 5, 8)
    expect(near.attrs.x).toBeCloseTo(-9, 8)
    applyGardenMotion(host({ parallax: [far, near], bee: [new FakeNode({ x: GARDEN_RIGHT })] }), 1, idle)
    expect(far.attrs.x).toBeCloseTo(10 - 5, 8)
    expect(near.attrs.x).toBeCloseTo(9, 8)
    applyGardenMotion(host({ parallax: [far], bee: [new FakeNode({ x: (GARDEN_LEFT + GARDEN_RIGHT) / 2 })] }), 1, idle)
    expect(far.attrs.x).toBeCloseTo(10, 8)
  })
  it('mây cộng độ lệch thị sai vào chuyển động trôi của chính nó', () => {
    const cloud = new FakeNode({ motionBaseX: 150, motionAmplitude: 0, motionSpeed: 0, parallaxK: 6 })
    applyGardenMotion(host({ cloud: [cloud], bee: [new FakeNode({ x: GARDEN_LEFT })] }), 1, idle)
    expect(cloud.attrs.x).toBeCloseTo(156, 8)
  })
  it('không có ong (hoặc ong chưa có toạ độ) thì các lớp ở chỗ gốc; không ném lỗi', () => {
    const far = layer(5, 10)
    applyGardenMotion(host({ parallax: [far] }), 1, idle)
    expect(far.attrs.x).toBe(10)
    applyGardenMotion(host({ parallax: [far], bee: [new FakeNode()] }), 1, idle)
    expect(far.attrs.x).toBe(10)
  })
})
