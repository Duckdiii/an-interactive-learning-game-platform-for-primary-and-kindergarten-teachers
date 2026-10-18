import { describe, expect, it } from 'vitest'
import { MAX_EFFECT_SECONDS, MAX_OFFSET_PX } from '../../feedback/feedbackEffects'
import { isHarshRed } from '../../theme/contrast'
import { neutralTheme } from '../../theme/themes/neutral'
import { oceanTheme } from '../../theme/themes/ocean'
import { spaceTheme } from '../../theme/themes/space'
import {
  buildGentleNod,
  buildLottie,
  buildStarBounce,
  colorsIn,
  finalFrame,
  framesOf,
  LOTTIE_FRAME_RATE,
  LOTTIE_KINDS,
  maxFlashesPerSecond,
  sampleProperty,
  validateLottie,
  type LottieAnimation,
  type LottieIssueCode,
} from './lottieAnimations'

const themes = [neutralTheme, spaceTheme, oceanTheme]
const codes = (a: unknown): LottieIssueCode[] => validateLottie(a).map((i) => i.code)
const layers = (a: LottieAnimation) => a.layers as Array<Record<string, unknown>>
const ks = (layer: Record<string, unknown>) => layer.ks as Record<string, unknown>

describe('hoạt ảnh tự sinh', () => {
  it.each(themes.flatMap((theme) => LOTTIE_KINDS.map((kind) => [theme.id, kind, theme] as const)))('%s / %s: hợp lệ theo mọi giới hạn an toàn', (_id, kind, theme) => {
    expect(codes(buildLottie(kind, theme.colors))).toEqual([])
  })

  it('có cấu trúc Lottie tối thiểu: phiên bản, khung hình, kích thước, lớp hình', () => {
    for (const kind of LOTTIE_KINDS) {
      const a = buildLottie(kind, neutralTheme.colors)
      expect(a).toMatchObject({ v: '5.7.0', fr: LOTTIE_FRAME_RATE, ip: 0, w: 200, h: 200, ddd: 0, assets: [] })
      expect(layers(a).length).toBeGreaterThan(0)
      for (const l of layers(a)) expect(l).toMatchObject({ ty: 4, ip: 0, op: a.op })
    }
  })

  it('JSON thuần: đi qua stringify/parse không đổi (không hàm, không NaN)', () => {
    for (const kind of LOTTIE_KINDS) {
      const a = buildLottie(kind, spaceTheme.colors)
      expect(JSON.parse(JSON.stringify(a))).toEqual(a)
      expect(JSON.stringify(a)).not.toMatch(/null|NaN|undefined/)
    }
  })

  it('thời lượng: sao 1,2 giây, gật đầu 1,5 giây, đều trong giới hạn', () => {
    const star = buildStarBounce(neutralTheme.colors)
    const nod = buildGentleNod(neutralTheme.colors)
    expect((star.op as number) / LOTTIE_FRAME_RATE).toBeCloseTo(1.2, 6)
    expect((nod.op as number) / LOTTIE_FRAME_RATE).toBeCloseTo(1.5, 6)
    for (const a of [star, nod]) expect((a.op as number) / (a.fr as number)).toBeLessThanOrEqual(MAX_EFFECT_SECONDS)
  })

  it('màu lấy từ theme (đổi theme thì đổi màu) và không có màu đỏ gắt ở theme nào', () => {
    const neutral = colorsIn(buildStarBounce(neutralTheme.colors).layers)
    const space = colorsIn(buildStarBounce(spaceTheme.colors).layers)
    expect(neutral.length).toBeGreaterThan(2)
    expect(neutral).toContain(neutralTheme.colors.surfaceCorrect.toLowerCase())
    expect(space).toContain(spaceTheme.colors.lineCorrect.toLowerCase())
    expect(neutral).not.toEqual(space)
    for (const theme of themes) for (const kind of LOTTIE_KINDS) for (const hex of colorsIn(buildLottie(kind, theme.colors).layers)) expect([theme.id, kind, hex, isHarshRed(hex)]).toEqual([theme.id, kind, hex, false])
  })

  it('màu hỏng ở theme thì báo lỗi rõ thay vì sinh JSON sai', () => {
    expect(() => buildStarBounce({ ...neutralTheme.colors, surfaceCorrect: 'xanh' })).toThrow(/Màu không hợp lệ/)
  })
})

describe('sao nảy', () => {
  const star = buildStarBounce(neutralTheme.colors)
  const scale = ks(layers(star)[0]).s

  it('hiện ra từ 0, nảy tối đa 115% rồi ổn định ở 100%', () => {
    expect(sampleProperty(scale, 0)).toEqual([0, 0, 100])
    expect(sampleProperty(scale, 18)).toEqual([115, 115, 100])
    expect(sampleProperty(scale, 54)).toEqual([100, 100, 100])
    expect(sampleProperty(scale, 71)).toEqual([100, 100, 100]) // giữ nguyên đến hết
  })

  it('sau đỉnh nảy không co dưới 90% (nảy nhẹ, không giật)', () => {
    const after = framesOf(scale).filter((f) => f.t > 18)
    expect(Math.min(...after.map((f) => f.value[0]))).toBeGreaterThanOrEqual(90)
  })

  it('độ nghiêng tối đa 8 độ và kết thúc về 0', () => {
    const rotation = framesOf(ks(layers(star)[0]).r)
    expect(Math.max(...rotation.map((f) => Math.abs(f.value[0])))).toBe(8)
    expect(rotation[rotation.length - 1].value[0]).toBe(0)
  })

  it('không đổi độ mờ (không chớp)', () => {
    for (const l of layers(star)) expect(framesOf(ks(l).o)).toEqual([{ t: 0, value: [100] }])
  })

  it('ba chấm hiện dần ở ba chỗ khác nhau, đều trong khung', () => {
    const dots = layers(star).slice(1)
    expect(dots).toHaveLength(3)
    const positions = dots.map((d) => framesOf(ks(d).p)[0].value)
    expect(new Set(positions.map((p) => p.join(','))).size).toBe(3)
    for (const [x, y] of positions) {
      expect(x).toBeGreaterThan(0)
      expect(x).toBeLessThan(200)
      expect(y).toBeGreaterThan(0)
      expect(y).toBeLessThan(200)
    }
  })
})

describe('gương mặt gật đầu', () => {
  const nod = buildGentleNod(neutralTheme.colors)
  const face = layers(nod)[0]

  it('dịch lên xuống không quá MAX_OFFSET_PX và kết thúc về chỗ cũ', () => {
    const positions = framesOf(ks(face).p)
    const dy = positions.map((f) => f.value[1] - positions[0].value[1])
    expect(Math.max(...dy)).toBe(MAX_OFFSET_PX)
    expect(Math.min(...dy)).toBe(0)
    expect(positions[positions.length - 1].value).toEqual(positions[0].value)
  })

  it('nghiêng tối đa 10 độ, kết thúc về 0', () => {
    const rotation = framesOf(ks(face).r)
    expect(Math.max(...rotation.map((f) => Math.abs(f.value[0])))).toBe(10)
    expect(rotation[rotation.length - 1].value[0]).toBe(0)
  })

  it('dùng màu «thử lại» dịu của theme, không phải màu «đúng»', () => {
    const used = colorsIn(nod.layers)
    expect(used).toContain(neutralTheme.colors.surfaceTryAgain.toLowerCase())
    expect(used).not.toContain(neutralTheme.colors.surfaceCorrect.toLowerCase())
  })
})

describe('sampleProperty / framesOf / finalFrame', () => {
  const prop = { a: 1, k: [{ t: 0, s: [0] }, { t: 10, s: [100] }, { t: 20, s: [50] }] }

  it('nội suy tuyến tính giữa các khung và kẹp ở hai đầu', () => {
    expect(sampleProperty(prop, 5)).toEqual([50])
    expect(sampleProperty(prop, 15)).toEqual([75])
    expect(sampleProperty(prop, -3)).toEqual([0])
    expect(sampleProperty(prop, 99)).toEqual([50])
    expect(sampleProperty(prop, 10)).toEqual([100])
  })

  it('thuộc tính đứng yên: giá trị tại mọi khung; hỏng thì rỗng/null', () => {
    expect(sampleProperty({ a: 0, k: [1, 2] }, 7)).toEqual([1, 2])
    expect(sampleProperty({ a: 0, k: 5 }, 7)).toEqual([5])
    expect(sampleProperty(null, 0)).toBeNull()
    expect(framesOf(undefined)).toEqual([])
    expect(framesOf({ a: 1, k: 'x' })).toEqual([])
  })

  it('khung cuối = op − 1; thiếu op thì 0', () => {
    expect(finalFrame({ op: 72 })).toBe(71)
    expect(finalFrame({})).toBe(0)
    expect(finalFrame({ op: 0 })).toBe(0)
  })
})

describe('validateLottie: từ chối hoạt ảnh vi phạm', () => {
  const ok = () => JSON.parse(JSON.stringify(buildStarBounce(neutralTheme.colors))) as LottieAnimation
  const base = ok()

  it.each([[null], [undefined], ['x'], [[]], [42]])('đầu vào %j không phải đối tượng', (input) => {
    expect(codes(input)).toEqual(['NOT_OBJECT'])
  })

  it('kích thước ngoài (0, 400] hoặc không phải số', () => {
    expect(codes({ ...base, w: 0 })).toContain('BAD_SIZE')
    expect(codes({ ...base, h: 401 })).toContain('BAD_SIZE')
    expect(codes({ ...base, w: '200' })).toContain('BAD_SIZE')
    expect(codes({ ...base, w: 400, h: 400 })).toEqual([])
  })

  it('tốc độ khung hình ngoài 24 đến 60', () => {
    expect(codes({ ...base, fr: 23 })).toContain('BAD_FRAME_RATE')
    expect(codes({ ...base, fr: 61 })).toContain('BAD_FRAME_RATE')
    expect(codes({ ...base, fr: 24 })).not.toContain('BAD_FRAME_RATE')
  })

  it('thời lượng: không dương, thiếu, hoặc quá 2 giây (biên đúng 2 giây thì đạt)', () => {
    expect(codes({ ...base, op: 0 })).toContain('DURATION_INVALID')
    expect(codes({ ...base, ip: 80, op: 70 })).toContain('DURATION_INVALID')
    expect(codes({ ...base, op: undefined })).toContain('DURATION_INVALID')
    expect(codes({ ...base, op: 121 })).toContain('DURATION_TOO_LONG')
    expect(codes({ ...base, op: 120 })).not.toContain('DURATION_TOO_LONG')
  })

  it('lớp: không có, hoặc quá 8', () => {
    expect(codes({ ...base, layers: [] })).toContain('NO_LAYERS')
    expect(codes({ ...base, layers: undefined })).toContain('NO_LAYERS')
    expect(codes({ ...base, layers: Array(9).fill(layers(base)[0]) })).toContain('TOO_MANY_LAYERS')
  })

  it('màu đỏ gắt bị chặn', () => {
    const red = buildStarBounce({ ...neutralTheme.colors, surfaceCorrect: '#FF0000' })
    expect(codes(red)).toEqual(['HARSH_RED'])
  })

  it('phóng quá 115% hoặc co dưới 90% sau đỉnh', () => {
    const big = ok()
    ;(ks(layers(big)[0]).s as { k: Array<{ s: number[] }> }).k[1].s = [116, 116, 100]
    expect(codes(big)).toContain('SCALE_TOO_LARGE')
    const deep = ok()
    ;(ks(layers(deep)[0]).s as { k: Array<{ s: number[] }> }).k[2].s = [80, 80, 100]
    expect(codes(deep)).toContain('SCALE_BOUNCE_TOO_DEEP')
  })

  it('dịch chuyển quá 6px và nghiêng quá 15 độ', () => {
    const nod = JSON.parse(JSON.stringify(buildGentleNod(neutralTheme.colors))) as LottieAnimation
    ;(ks(layers(nod)[0]).p as { k: Array<{ s: number[] }> }).k[1].s = [100, 108, 0]
    expect(codes(nod)).toContain('OFFSET_TOO_LARGE')
    const tilt = JSON.parse(JSON.stringify(buildGentleNod(neutralTheme.colors))) as LottieAnimation
    ;(ks(layers(tilt)[0]).r as { k: Array<{ s: number[] }> }).k[1].s = [16]
    expect(codes(tilt)).toContain('ROTATION_TOO_LARGE')
  })

  it('chớp độ mờ quá 3 lần mỗi giây bị chặn; mờ dần chậm thì đạt', () => {
    const flashing = ok()
    ks(layers(flashing)[0]).o = { a: 1, k: Array.from({ length: 10 }, (_, i) => ({ t: i * 6, s: [i % 2 === 0 ? 100 : 0] })) }
    expect(codes(flashing)).toContain('FLASHING')
    const fade = ok()
    ks(layers(fade)[0]).o = { a: 1, k: [{ t: 0, s: [0] }, { t: 36, s: [100] }, { t: 71, s: [100] }] }
    expect(codes(fade)).not.toContain('FLASHING')
  })

  it('màu đỏ gắt xuất hiện ở khung hình khóa SAU khung đầu (màu hoạt hình) cũng bị chặn', () => {
    const a = ok()
    const fillItem = (((layers(a)[0].shapes as Array<{ it: Array<Record<string, unknown>> }>)[0]).it).find((i) => i.ty === 'fl') as Record<string, unknown>
    fillItem.c = { a: 1, k: [{ t: 0, s: [0.6, 0.8, 0.6, 1] }, { t: 30, s: [1, 0, 0, 1] }] }
    expect(codes(a)).toContain('HARSH_RED')
  })

  it('tính năng không kiểm được thì báo: biểu thức, tài nguyên ngoài, precomp, lớp cha, gradient', () => {
    const withExpression = ok()
    ks(layers(withExpression)[0]).s = { a: 0, k: [100, 100, 100], x: 'time*10' }
    expect(codes(withExpression)).toContain('UNSUPPORTED_FEATURE')
    const withAssets = { ...ok(), assets: [{ id: 'img_0', u: 'https://x.test/', p: 'a.png' }] }
    expect(codes(withAssets)).toContain('UNSUPPORTED_FEATURE')
    const precomp = ok()
    layers(precomp)[0].ty = 0
    expect(validateLottie(precomp).some((i) => i.code === 'UNSUPPORTED_FEATURE' && /ty = 4/.test(i.message))).toBe(true)
    const parented = ok()
    layers(parented)[1].parent = 1
    expect(codes(parented)).toContain('UNSUPPORTED_FEATURE')
    const gradient = ok()
    ;(((layers(gradient)[0].shapes as Array<{ it: Array<Record<string, unknown>> }>)[0]).it).push({ ty: 'gf' })
    expect(codes(gradient)).toContain('UNSUPPORTED_FEATURE')
  })

  it('khung hình khóa hỏng: thời điểm không tăng dần, giá trị NaN hoặc thiếu', () => {
    const unordered = ok()
    ks(layers(unordered)[0]).s = { a: 1, k: [{ t: 10, s: [0, 0, 100] }, { t: 5, s: [100, 100, 100] }] }
    expect(codes(unordered)).toContain('KEYFRAME_INVALID')
    const duplicate = ok()
    ks(layers(duplicate)[0]).s = { a: 1, k: [{ t: 5, s: [0, 0, 100] }, { t: 5, s: [100, 100, 100] }] }
    expect(codes(duplicate)).toContain('KEYFRAME_INVALID') // hai khung cùng thời điểm
    const nan = ok()
    ks(layers(nan)[0]).r = { a: 1, k: [{ t: 0, s: [Number.NaN] }, { t: 10, s: [0] }] }
    expect(codes(nan)).toContain('KEYFRAME_INVALID')
    const missing = ok()
    ks(layers(missing)[0]).p = { a: 1, k: [{ t: 0 }, { t: 10, s: [1, 1, 0] }] }
    expect(codes(missing)).toContain('KEYFRAME_INVALID')
    expect(codes(ok())).not.toContain('KEYFRAME_INVALID')
  })

  it('thứ tự trong nhóm hình: nét viền đứng trước màu tô (phần tử đứng trước được vẽ trên)', () => {
    const items = ((layers(ok())[0].shapes as Array<{ it: Array<{ ty: string }> }>)[0]).it.map((i) => i.ty)
    expect(items.indexOf('st')).toBeLessThan(items.indexOf('fl'))
    expect(items[items.length - 1]).toBe('tr')
  })

  it('gom nhiều lỗi cùng lúc', () => {
    expect(codes({ ...base, w: 0, fr: 10, layers: [] }).sort()).toEqual(['BAD_FRAME_RATE', 'BAD_SIZE', 'DURATION_TOO_LONG', 'NO_LAYERS'].sort())
  })
})

describe('maxFlashesPerSecond', () => {
  const frames = (values: number[], step: number) => values.map((v, i) => ({ t: i * step, value: [v] }))

  it('đảo chiều lớn liên tiếp nhanh thì đếm; thay đổi nhỏ dưới 10 điểm thì không', () => {
    expect(maxFlashesPerSecond(frames([100, 0, 100, 0, 100], 6), 60)).toBe(3)
    expect(maxFlashesPerSecond(frames([100, 95, 100, 95, 100], 6), 60)).toBe(0)
  })

  it('ngưỡng đúng 10 điểm phần trăm: giảm 10 tính là chớp, giảm 9 thì không (nửa chừng vẫn đếm)', () => {
    expect(maxFlashesPerSecond(frames([100, 50, 100, 50, 100], 6), 60)).toBe(3)
    expect(maxFlashesPerSecond(frames([100, 90, 100, 90, 100], 6), 60)).toBe(3)
    expect(maxFlashesPerSecond(frames([100, 91, 100, 91, 100], 6), 60)).toBe(0)
  })

  it('đảo chiều rải ra nhiều giây thì mỗi giây chỉ có ít lần (cách nhau hơn một giây: 1; cách 40 khung: 2 trong một cửa sổ)', () => {
    expect(maxFlashesPerSecond(frames([100, 0, 100, 0, 100], 70), 60)).toBe(1)
    expect(maxFlashesPerSecond(frames([100, 0, 100, 0, 100], 40), 60)).toBe(2)
  })

  it('không đảo chiều (mờ dần một chiều) hoặc ít khung thì 0', () => {
    expect(maxFlashesPerSecond(frames([100, 70, 40, 10], 6), 60)).toBe(0)
    expect(maxFlashesPerSecond([], 60)).toBe(0)
    expect(maxFlashesPerSecond(frames([50], 6), 60)).toBe(0)
  })
})
