import { describe, expect, it } from 'vitest'
import { beamSweep, fireflyPose, overlayColor, pollenPose, starPose, unit, type Band } from './atmosphere'

const BAND: Band = [34, 210, 700, 260]
const TIMES = [0, 0.3, 1.7, 5, 13.5, 60, 600, 3600]

describe('unit', () => {
  it('cố định theo (chỉ số, muối), trong [0, 1), các chỉ số khác nhau cho số khác nhau', () => {
    for (let i = 0; i < 50; i += 1) {
      const value = unit(i, 3)
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
      expect(unit(i, 3)).toBe(value)
    }
    expect(new Set(Array.from({ length: 30 }, (_, i) => unit(i, 1).toFixed(6))).size).toBeGreaterThan(25)
    expect(unit(4, 1)).not.toBe(unit(4, 2))
  })
})

describe('pollenPose', () => {
  it('luôn nằm trong dải theo chiều dọc, độ đục ≤ 0,7, cỡ trong [0,7, 1,3] ở mọi hạt và mọi thời điểm', () => {
    for (let i = 0; i < 20; i += 1) {
      for (const t of TIMES) {
        const pose = pollenPose(i, t, BAND)
        expect(pose.y).toBeGreaterThanOrEqual(BAND[1])
        expect(pose.y).toBeLessThanOrEqual(BAND[1] + BAND[3])
        expect(pose.opacity).toBeGreaterThanOrEqual(0)
        expect(pose.opacity).toBeLessThanOrEqual(0.7 + 1e-9)
        expect(pose.scale).toBeGreaterThanOrEqual(0.7 - 1e-9)
        expect(pose.scale).toBeLessThanOrEqual(1.3 + 1e-9)
        expect(Number.isFinite(pose.x)).toBe(true)
      }
    }
  })
  it('bay LÊN theo thời gian (y giảm) rồi quay vòng từ mép dưới; mờ hẳn ở hai mép để quay vòng không «bật»', () => {
    const pose0 = pollenPose(2, 0, BAND)
    const pose1 = pollenPose(2, 1, BAND)
    expect(pose1.y).toBeLessThan(pose0.y)
    let wrapped = false
    let previous = pollenPose(2, 0, BAND)
    for (let t = 0.1; t < 120; t += 0.1) {
      const now = pollenPose(2, t, BAND)
      if (now.y > previous.y + 50) {
        wrapped = true
        expect(previous.opacity).toBeLessThan(0.15)
        expect(now.opacity).toBeLessThan(0.15)
      }
      previous = now
    }
    expect(wrapped).toBe(true)
  })
  it('hạt khác nhau ở chỗ khác nhau; cùng chỉ số và thời gian thì cùng dáng; thời gian lạ coi như 0', () => {
    expect(pollenPose(1, 3, BAND)).toEqual(pollenPose(1, 3, BAND))
    expect(pollenPose(1, 3, BAND).x).not.toBe(pollenPose(2, 3, BAND).x)
    expect(pollenPose(1, Number.NaN, BAND)).toEqual(pollenPose(1, 0, BAND))
  })
  it('lắc ngang nhẹ (không trôi xa quá bề rộng dải thêm 20 đơn vị)', () => {
    for (let i = 0; i < 20; i += 1) {
      for (const t of TIMES) {
        const { x } = pollenPose(i, t, BAND)
        expect(x).toBeGreaterThanOrEqual(BAND[0] - 20)
        expect(x).toBeLessThanOrEqual(BAND[0] + BAND[2] + 20)
      }
    }
  })
})

describe('starPose', () => {
  it('đứng yên một chỗ (cố định theo chỉ số), nằm trong dải trời, nhấp nháy trong [0,35, 1], cỡ trong [0,6, 1,2]', () => {
    for (let i = 0; i < 20; i += 1) {
      const first = starPose(i, 0, BAND)
      for (const t of TIMES) {
        const pose = starPose(i, t, BAND)
        expect(pose.x).toBe(first.x)
        expect(pose.y).toBe(first.y)
        expect(pose.x).toBeGreaterThanOrEqual(BAND[0])
        expect(pose.x).toBeLessThanOrEqual(BAND[0] + BAND[2])
        expect(pose.y).toBeGreaterThanOrEqual(BAND[1])
        expect(pose.y).toBeLessThanOrEqual(BAND[1] + BAND[3])
        expect(pose.opacity).toBeGreaterThanOrEqual(0.35 - 1e-9)
        expect(pose.opacity).toBeLessThanOrEqual(1 + 1e-9)
        expect(pose.scale).toBeGreaterThanOrEqual(0.6 - 1e-9)
        expect(pose.scale).toBeLessThanOrEqual(1.2 + 1e-9)
      }
    }
  })
  it('các sao nhấp nháy lệch pha nhau (không đồng loạt chớp)', () => {
    const opacities = Array.from({ length: 10 }, (_, i) => starPose(i, 2.2, BAND).opacity.toFixed(3))
    expect(new Set(opacities).size).toBeGreaterThan(5)
  })
})

describe('fireflyPose', () => {
  it('không bao giờ ra ngoài dải; sáng nhất 1, tối nhất còn le lói ≥ 0,1', () => {
    for (let i = 0; i < 10; i += 1) {
      for (let t = 0; t < 600; t += 0.7) {
        const pose = fireflyPose(i, t, BAND)
        expect(pose.x).toBeGreaterThanOrEqual(BAND[0] - 1e-6)
        expect(pose.x).toBeLessThanOrEqual(BAND[0] + BAND[2] + 1e-6)
        expect(pose.y).toBeGreaterThanOrEqual(BAND[1] - 1e-6)
        expect(pose.y).toBeLessThanOrEqual(BAND[1] + BAND[3] + 1e-6)
        expect(pose.opacity).toBeGreaterThanOrEqual(0.1 - 1e-9)
        expect(pose.opacity).toBeLessThanOrEqual(1 + 1e-9)
      }
    }
  })
  it('mỗi con có nhịp sáng riêng và có lúc sáng, có lúc tắt (không sáng liên tục)', () => {
    for (let i = 0; i < 10; i += 1) {
      const values = Array.from({ length: 400 }, (_, k) => fireflyPose(i, k * 0.05, BAND).opacity)
      expect(Math.max(...values)).toBeGreaterThan(0.8)
      expect(Math.min(...values)).toBeLessThan(0.3)
    }
    const at = Array.from({ length: 10 }, (_, i) => fireflyPose(i, 3, BAND).opacity.toFixed(3))
    expect(new Set(at).size).toBeGreaterThan(5)
  })
  it('chuyển động chậm: giữa hai khung hình cách 1/60 giây một con đom đóm không dịch quá 2 đơn vị', () => {
    for (let i = 0; i < 10; i += 1) {
      for (let t = 0; t < 60; t += 1.3) {
        const a = fireflyPose(i, t, BAND)
        const b = fireflyPose(i, t + 1 / 60, BAND)
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeLessThan(2)
      }
    }
  })
})

describe('beamSweep', () => {
  it('quét nhẹ trong ±4°, mỗi chùm lệch pha', () => {
    for (let i = 0; i < 4; i += 1) for (const t of TIMES) expect(Math.abs(beamSweep(i, t))).toBeLessThanOrEqual(4 + 1e-9)
    expect(beamSweep(0, 1)).not.toBeCloseTo(beamSweep(1, 1), 3)
  })
})

describe('overlayColor', () => {
  it('độ đục 0 giữ nguyên, 1 ra màu phủ, giữa thì trộn đều; màu lạ thì trả nguyên', () => {
    expect(overlayColor('#102030', '#FFFFFF', 0)).toBe('#102030')
    expect(overlayColor('#102030', '#FFFFFF', 1)).toBe('#ffffff')
    expect(overlayColor('#000000', '#FFFFFF', 0.5)).toBe('#808080')
    expect(overlayColor('abc', '#FFFFFF', 0.5)).toBe('abc')
    expect(overlayColor('#102030', 'đỏ', 0.5)).toBe('#102030')
  })
})
