import { describe, expect, it } from 'vitest'
import { contrastRatio } from '../../../theme/contrast'
import { ATMOSPHERE_LIMITS, TIMES_OF_DAY, type AmbienceVariant, type ThemeManifest } from '../../../theme/themeTypes'
import { validateTheme } from '../../../theme/validateTheme'
import { overlayColor } from './atmosphere'
import { GARDEN_COLORS } from './beeGardenColors'
import { FLOWER_CENTER_FILL, FLOWER_NUMBER_FILL } from './beeGardenGeometry'
import { beeGardenTheme } from './beeGardenTheme'

const ambience = beeGardenTheme.ambience!
const variantOf = (time: (typeof TIMES_OF_DAY)[number]) => ambience.variants[time]
const issues = (patch: (variant: AmbienceVariant) => AmbienceVariant, time: (typeof TIMES_OF_DAY)[number] = 'night') => {
  const theme: ThemeManifest = { ...beeGardenTheme, ambience: { ...ambience, variants: { ...ambience.variants, [time]: patch({ ...ambience.variants[time] }) } } }
  return validateTheme(theme).map((issue) => `${issue.code}:${issue.path}`)
}

describe('theme Vườn hoa: biến thể thời điểm trong ngày', () => {
  it('hợp lệ theo bộ kiểm của theme; đủ ba biến thể sáng/hoàng hôn/đêm; mặc định là sáng', () => {
    expect(validateTheme(beeGardenTheme)).toEqual([])
    expect(Object.keys(ambience.variants).sort()).toEqual([...TIMES_OF_DAY].sort())
    expect(ambience.default).toBe('morning')
  })

  it('sáng: không phủ màu, mặt trời, có tia nắng và phấn hoa, không sao/đom đóm — đúng như cảnh gốc', () => {
    const morning = variantOf('morning')
    expect(morning.tint.opacity).toBe(0)
    expect(morning.celestial).toBe('sun')
    expect(morning.beams).toBe(true)
    expect(morning.pollen).toBeGreaterThan(0)
    expect(morning.stars + morning.fireflies).toBe(0)
    expect(morning.sky).toEqual([GARDEN_COLORS.skyTop, GARDEN_COLORS.skyBottom]) // trùng màu trời cũ nên mặc định không đổi diện mạo
    expect(morning.decorations).toBeUndefined() // dùng bộ trang trí chung
  })

  it('hoàng hôn: ráng chiều (phủ cam ấm), mặt trời thấp sát đồi, còn tia nắng, vắng sao', () => {
    const sunset = variantOf('sunset')
    expect(sunset.tint.opacity).toBeGreaterThan(0)
    expect(sunset.celestial).toBe('sun')
    expect(sunset.celestialDrop).toBeGreaterThan(0)
    expect(sunset.beams).toBe(true)
    expect(sunset.stars).toBe(0)
  })

  it('đêm: trăng, sao, đom đóm, không tia nắng, không phấn hoa, mây mờ; bộ trang trí riêng không có vật bay ở trời', () => {
    const night = variantOf('night')
    expect(night.celestial).toBe('moon')
    expect(night.stars).toBeGreaterThan(0)
    expect(night.fireflies).toBeGreaterThan(0)
    expect(night.beams).toBe(false)
    expect(night.pollen).toBe(0)
    expect(night.cloud.opacity).toBeLessThan(variantOf('morning').cloud.opacity)
    expect(night.decorations).toBeDefined()
    expect(night.decorations!.every((item) => item.layer === 'ground')).toBe(true)
  })

  it('số hạt và độ đục lớp phủ trong giới hạn của theme (nhẹ cho máy yếu, không che mất cảnh)', () => {
    for (const time of TIMES_OF_DAY) {
      const v = variantOf(time)
      expect(v.pollen).toBeLessThanOrEqual(ATMOSPHERE_LIMITS.maxPollen)
      expect(v.stars).toBeLessThanOrEqual(ATMOSPHERE_LIMITS.maxStars)
      expect(v.fireflies).toBeLessThanOrEqual(ATMOSPHERE_LIMITS.maxFireflies)
      expect(v.tint.opacity).toBeLessThanOrEqual(ATMOSPHERE_LIMITS.maxTintOpacity)
      expect(v.celestialDrop).toBeLessThanOrEqual(ATMOSPHERE_LIMITS.maxCelestialDrop)
    }
    // tổng số hạt đang chuyển động mỗi khung hình ở mỗi biến thể không quá 30 (ngân sách hiệu năng)
    for (const time of TIMES_OF_DAY) {
      const v = variantOf(time)
      expect(v.pollen + v.stars + v.fireflies).toBeLessThanOrEqual(30)
    }
  })

  describe('tương phản ở mọi biến thể (hoa, số và chú ong vẫn rõ)', () => {
    it('số trên hoa đọc rõ (≥ 4,5:1) và KHÔNG phụ thuộc biến thể: lớp phủ chỉ phủ trời, mây, đồi — không phủ hoa', () => {
      expect(contrastRatio(FLOWER_NUMBER_FILL, FLOWER_CENTER_FILL)).toBeGreaterThanOrEqual(4.5)
    })
    it.each(TIMES_OF_DAY)('%s: hình dáng chú ong (thân vàng hoặc viền nâu đậm) nổi ≥ 3:1 trên cả hai màu trời, trước và sau lớp phủ', (time) => {
      const v = variantOf(time)
      for (const sky of v.sky) {
        for (const background of [sky, overlayColor(sky, v.tint.color, v.tint.opacity)]) {
          const body = contrastRatio(GARDEN_COLORS.beeBody, background)!
          const outline = contrastRatio(GARDEN_COLORS.beeStroke, background)!
          expect(Math.max(body, outline), `${time} ${background}`).toBeGreaterThanOrEqual(3)
        }
      }
    })
    it.each(TIMES_OF_DAY)('%s: vòng gợi ý đậm (ringHint) nổi ≥ 3:1 trên màu trời đã phủ ở dải hoa (màu dưới của trời)', (time) => {
      const v = variantOf(time)
      const background = overlayColor(v.sky[1], v.tint.color, v.tint.opacity)
      const ring = contrastRatio(GARDEN_COLORS.ringHint, background)!
      const glow = contrastRatio('#FFF3B0', background)! // hạt lấp lánh sáng (đêm nổi trên nền tối)
      expect(Math.max(ring, glow), time).toBeGreaterThanOrEqual(3)
    })
  })
})

describe('validateTheme: kiểm biến thể thời điểm', () => {
  it('theme không khai báo ambience vẫn hợp lệ (cảnh dùng màu cố định)', () => {
    expect(validateTheme({ ...beeGardenTheme, ambience: undefined })).toEqual([])
  })
  it('từ chối biến thể mặc định lạ và biến thể thiếu', () => {
    const bad = validateTheme({ ...beeGardenTheme, ambience: { ...ambience, default: 'trưa' as never } })
    expect(bad.map((issue) => issue.path)).toContain('ambience.default')
    const missing = { ...beeGardenTheme, ambience: { ...ambience, variants: { morning: ambience.variants.morning, sunset: ambience.variants.sunset } as never } }
    expect(validateTheme(missing).map((issue) => issue.path)).toContain('ambience.variants.night')
  })
  it.each([
    ['màu trời sai', (v: AmbienceVariant) => ({ ...v, sky: ['xanh', '#FFFFFF'] as const }), 'ambience.variants.night.sky[0]'],
    ['màu phủ sai', (v: AmbienceVariant) => ({ ...v, tint: { color: '#12', opacity: 0.2 } }), 'ambience.variants.night.tint.color'],
    ['lớp phủ quá đậm', (v: AmbienceVariant) => ({ ...v, tint: { ...v.tint, opacity: 0.8 } }), 'ambience.variants.night.tint.opacity'],
    ['lớp phủ âm', (v: AmbienceVariant) => ({ ...v, tint: { ...v.tint, opacity: -0.1 } }), 'ambience.variants.night.tint.opacity'],
    ['mây đục quá 1', (v: AmbienceVariant) => ({ ...v, cloud: { ...v.cloud, opacity: 2 } }), 'ambience.variants.night.cloud.opacity'],
    ['màu mây sai', (v: AmbienceVariant) => ({ ...v, cloud: { ...v.cloud, color: 'xám' } }), 'ambience.variants.night.cloud.color'],
    ['thiên thể lạ', (v: AmbienceVariant) => ({ ...v, celestial: 'sao chổi' as never }), 'ambience.variants.night.celestial'],
    ['hạ thiên thể quá sâu', (v: AmbienceVariant) => ({ ...v, celestialDrop: 500 }), 'ambience.variants.night.celestialDrop'],
    ['quá nhiều sao', (v: AmbienceVariant) => ({ ...v, stars: ATMOSPHERE_LIMITS.maxStars + 1 }), 'ambience.variants.night.stars'],
    ['số đom đóm lẻ', (v: AmbienceVariant) => ({ ...v, fireflies: 2.5 }), 'ambience.variants.night.fireflies'],
    ['quá nhiều phấn hoa', (v: AmbienceVariant) => ({ ...v, pollen: 99 }), 'ambience.variants.night.pollen'],
    ['thiếu tên', (v: AmbienceVariant) => ({ ...v, label: '  ' }), 'ambience.variants.night.label'],
  ])('từ chối: %s', (_name, patch, path) => {
    expect(issues(patch)).toContain(`AMBIENCE_INVALID:${path}`)
  })
  it('bộ trang trí riêng của biến thể cũng bị kiểm như bộ chung (vật ở trời quá thấp bị từ chối)', () => {
    const found = issues((v) => ({ ...v, decorations: [{ keyword: 'bướm', layer: 'sky', x: 0.5, y: 0.9, size: 40, motion: 'still', amplitude: 0, speed: 0 }] }), 'sunset')
    expect(found).toContain('DECORATION_INVALID:ambience.variants.sunset.decorations[0].y')
  })
})
