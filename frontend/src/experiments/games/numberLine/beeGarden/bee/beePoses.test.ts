import { describe, expect, it } from 'vitest'
import { wingScale } from '../beeGardenGeometry'
import {
  antennaAngle,
  BEE_POSES,
  BEE_STATES,
  beeShadow,
  BLINK_MIN,
  BLINK_PERIOD,
  BLINK_SECONDS,
  blinkOpenness,
  SHADOW_BASE_OPACITY,
  SHADOW_FULL_LIFT,
  SHADOW_MIN_OPACITY,
  SHADOW_MIN_SCALE,
  wingFlapScale,
} from './beePoses'

describe('BEE_POSES', () => {
  it('đủ sáu trạng thái và mỗi trạng thái có đủ mắt, miệng, râu, cánh', () => {
    expect([...BEE_STATES].sort()).toEqual(['blink', 'fly', 'happy', 'idle', 'oops', 'think'])
    for (const state of BEE_STATES) {
      const pose = BEE_POSES[state]
      expect(['open', 'closed', 'happy']).toContain(pose.eyes)
      expect(['smile', 'grin', 'o', 'flat']).toContain(pose.mouth)
      expect(pose.wing.min).toBeGreaterThan(0)
      expect(pose.wing.min).toBeLessThan(1)
      expect(pose.antenna.speed).toBeGreaterThan(0)
    }
  })
  it('đổi hình mắt/miệng theo cảm xúc: bình thường mỉm cười, vui mắt cười + cười to, ngơ ngác miệng «o», nghĩ mắt nhìn lên miệng thẳng', () => {
    expect(BEE_POSES.idle).toMatchObject({ eyes: 'open', mouth: 'smile' })
    expect(BEE_POSES.happy).toMatchObject({ eyes: 'happy', mouth: 'grin' })
    expect(BEE_POSES.oops).toMatchObject({ eyes: 'open', mouth: 'o' })
    expect(BEE_POSES.think.mouth).toBe('flat')
    expect(BEE_POSES.think.pupil.left.y).toBeLessThan(BEE_POSES.idle.pupil.left.y) // nhìn lên
    expect(BEE_POSES.oops.pupil.left.y).toBeGreaterThan(BEE_POSES.think.pupil.left.y)
    expect(BEE_POSES.blink.eyes).toBe('closed')
  })
  it('chỉ chớp mắt định kỳ khi mắt đang mở bình thường (không chớp lúc mắt cười, ngơ ngác hay đang nhắm)', () => {
    expect(BEE_POSES.idle.blinks).toBe(true)
    expect(BEE_POSES.fly.blinks).toBe(true)
    expect(BEE_POSES.think.blinks).toBe(true)
    for (const state of ['happy', 'oops', 'blink'] as const) expect(BEE_POSES[state].blinks).toBe(false)
  })
})

describe('blinkOpenness (chớp mắt định kỳ)', () => {
  const samples = Array.from({ length: 4000 }, (_, i) => i * 0.01)
  it('luôn trong [BLINK_MIN, 1]; mỗi chu kỳ nhắm đúng một lần, ngắn đúng BLINK_SECONDS; phần lớn thời gian mắt mở', () => {
    for (const t of samples) {
      const value = blinkOpenness(t)
      expect(value).toBeGreaterThanOrEqual(BLINK_MIN - 1e-9)
      expect(value).toBeLessThanOrEqual(1)
    }
    const closedRuns = (from: number, to: number) => {
      let runs = 0
      let inside = false
      for (let t = from; t < to; t += 0.005) {
        const closed = blinkOpenness(t) < 1
        if (closed && !inside) runs += 1
        inside = closed
      }
      return runs
    }
    for (let cycle = 0; cycle < 8; cycle += 1) expect(closedRuns(cycle * BLINK_PERIOD, (cycle + 1) * BLINK_PERIOD)).toBe(1)
    const open = samples.filter((t) => blinkOpenness(t) === 1).length
    expect(open / samples.length).toBeGreaterThan(0.9)
    expect(Math.min(...samples.map(blinkOpenness))).toBeLessThan(0.2) // nhắm gần kín
    expect(BLINK_SECONDS).toBeLessThan(0.3) // chớp nhanh, không làm trẻ giật mình
  })
  it('các lần chớp không đều tăm tắp (khoảng cách giữa hai lần thay đổi) nhưng cố định theo thời gian', () => {
    const startOf = (cycle: number) => {
      for (let t = cycle * BLINK_PERIOD; t < (cycle + 1) * BLINK_PERIOD; t += 0.005) if (blinkOpenness(t) < 1) return t - cycle * BLINK_PERIOD
      return -1
    }
    const offsets = Array.from({ length: 8 }, (_, cycle) => startOf(cycle))
    expect(new Set(offsets.map((offset) => offset.toFixed(2))).size).toBeGreaterThan(2)
    expect(Array.from({ length: 8 }, (_, cycle) => startOf(cycle))).toEqual(offsets)
  })
  it('thời gian âm hoặc không hợp lệ thì mắt mở', () => {
    expect(blinkOpenness(-1)).toBe(1)
    expect(blinkOpenness(Number.NaN)).toBe(1)
  })
})

describe('antennaAngle, wingFlapScale', () => {
  it('râu lắc quanh độ nghiêng cố định trong ±biên độ; hai râu đối xứng và lệch pha', () => {
    for (const state of BEE_STATES) {
      const pose = BEE_POSES[state]
      for (const t of [0, 0.4, 1.3, 2.9, 7]) {
        for (const side of [-1, 1] as const) {
          const angle = antennaAngle(t, pose, side)
          expect(Math.abs(angle * side - pose.antenna.tilt)).toBeLessThanOrEqual(pose.antenna.swing + 1e-9)
        }
      }
    }
    const pose = BEE_POSES.idle
    expect(antennaAngle(1, pose, 1)).not.toBeCloseTo(-antennaAngle(1, pose, -1), 3) // lệch pha: không phản chiếu hoàn toàn
  })
  it('râu rủ khi ngơ ngác (nghiêng vào trong), ngả ra khi bay và khi nghĩ', () => {
    expect(BEE_POSES.oops.antenna.tilt).toBeLessThan(0)
    expect(BEE_POSES.fly.antenna.tilt).toBeGreaterThan(0)
    expect(BEE_POSES.think.antenna.tilt).toBeGreaterThan(0)
  })
  it('cánh: với idle đúng bằng wingScale cũ; bay vỗ nhanh hơn chờ; luôn trong [min, 1]', () => {
    for (const t of [0, 0.03, 0.2, 1.1, 5]) expect(wingFlapScale(t, BEE_POSES.idle)).toBeCloseTo(wingScale(t), 10)
    expect(BEE_POSES.fly.wing.speed).toBeGreaterThan(BEE_POSES.idle.wing.speed)
    for (const state of BEE_STATES) {
      for (let t = 0; t < 3; t += 0.013) {
        const value = wingFlapScale(t, BEE_POSES[state])
        expect(value).toBeGreaterThanOrEqual(BEE_POSES[state].wing.min - 1e-9)
        expect(value).toBeLessThanOrEqual(1 + 1e-9)
      }
    }
  })
})

describe('beeShadow (bóng đổ dưới ong)', () => {
  it('lúc nghỉ bóng đầy đủ; càng bay cao càng nhỏ và mờ, tối đa tại SHADOW_FULL_LIFT rồi giữ nguyên', () => {
    expect(beeShadow(0)).toEqual({ scale: 1, opacity: SHADOW_BASE_OPACITY })
    const top = beeShadow(SHADOW_FULL_LIFT)
    expect(top.scale).toBeCloseTo(SHADOW_MIN_SCALE, 10)
    expect(top.opacity).toBeCloseTo(SHADOW_MIN_OPACITY, 10)
    expect(beeShadow(SHADOW_FULL_LIFT * 5)).toEqual(top)
    let previous = beeShadow(0)
    for (let lift = 5; lift <= SHADOW_FULL_LIFT; lift += 5) {
      const now = beeShadow(lift)
      expect(now.scale).toBeLessThan(previous.scale)
      expect(now.opacity).toBeLessThan(previous.opacity)
      previous = now
    }
  })
  it('hạ thấp hơn mức nghỉ (nhún xuống) hoặc giá trị lạ thì coi như nghỉ; bóng không bao giờ biến mất hẳn hay vượt mức ban đầu', () => {
    expect(beeShadow(-20)).toEqual(beeShadow(0))
    expect(beeShadow(Number.NaN)).toEqual(beeShadow(0))
    for (let lift = -50; lift < 200; lift += 7) {
      const { scale, opacity } = beeShadow(lift)
      expect(scale).toBeGreaterThan(0.5)
      expect(scale).toBeLessThanOrEqual(1)
      expect(opacity).toBeGreaterThan(0)
      expect(opacity).toBeLessThanOrEqual(SHADOW_BASE_OPACITY)
    }
  })
})
