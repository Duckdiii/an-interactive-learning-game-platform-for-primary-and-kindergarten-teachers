import { describe, expect, it } from 'vitest'
import { SOUND_NAMES } from '../audio/tones'
import { neutralTheme } from '../theme/themes/neutral'
import {
  buildPlan,
  FEEDBACK_KINDS,
  feedbackColors,
  FLASH_MIN_DELTA,
  hasHarshRedColor,
  MAX_EFFECT_SECONDS,
  MAX_FLASHES_PER_SECOND,
  MAX_OFFSET_PX,
  MAX_SHAKE_HZ,
  MAX_SPARKLES,
  MIN_SPARKLE_LIFE,
  maxCyclesPerSecond,
  maxFlashesPerSecond,
  planFlashRate,
  sampleFeedback,
  sampleTrack,
  SOUND_OF_FEEDBACK,
  sparkleLayout,
  STATIC_HIGHLIGHT_SECONDS,
  trackRuns,
  validatePlan,
  type FeedbackPlan,
  type Keyframe,
} from './feedbackEffects'

const kf = (...frames: [number, number][]): Keyframe[] => frames.map(([t, value]) => ({ t, value }))

/** Track nhấp nháy: `count` đoạn xen kẽ 0 ↔ 1, mỗi đoạn dài `period` giây. */
const strobe = (count: number, period: number): Keyframe[] =>
  Array.from({ length: count + 1 }, (_, i) => ({ t: i * period, value: i % 2 }))

const planWith = (overrides: Partial<FeedbackPlan>): FeedbackPlan => ({ ...buildPlan('correct'), ...overrides })

describe('sampleTrack', () => {
  const frames = kf([0, 0], [1, 10], [2, 10], [3, 0])

  it.each([
    [0, 0],
    [0.5, 5],
    [1, 10],
    [1.5, 10],
    [2.5, 5],
    [3, 0],
  ])('t=%s → %s', (t, expected) => {
    expect(sampleTrack(frames, t)).toBeCloseTo(expected, 10)
  })

  it('ngoài khoảng thì giữ giá trị đầu/cuối', () => {
    expect(sampleTrack(frames, -5)).toBe(0)
    expect(sampleTrack(frames, 99)).toBe(0)
  })

  it('rỗng thì 0; một khung thì luôn là giá trị đó', () => {
    expect(sampleTrack([], 1)).toBe(0)
    expect(sampleTrack(kf([0.5, 7]), 0)).toBe(7)
    expect(sampleTrack(kf([0.5, 7]), 9)).toBe(7)
  })

  it('hai khung cùng thời điểm không chia cho 0', () => {
    expect(sampleTrack(kf([0, 0], [1, 5], [1, 9], [2, 9]), 1)).toBe(5)
    expect(sampleTrack(kf([0, 0], [1, 5], [1, 9], [2, 9]), 1.5)).toBe(9)
  })
})

describe('trackRuns', () => {
  it('đi lên rồi đi xuống là hai đoạn', () => {
    expect(trackRuns(kf([0, 0], [0.5, 1], [1, 0]), 0.1)).toEqual([
      { start: 0, end: 0.5, delta: 1 },
      { start: 0.5, end: 1, delta: 1 },
    ])
  })

  it('nhiều khung cùng chiều gộp thành một đoạn', () => {
    expect(trackRuns(kf([0, 0], [0.2, 0.3], [0.4, 0.9]), 0.1)).toEqual([{ start: 0, end: 0.4, delta: 0.9 }])
  })

  it('đoạn phẳng ở giữa không ngắt đoạn', () => {
    const runs = trackRuns(kf([0, 0], [0.2, 1], [0.6, 1], [1, 0]), 0.1)
    expect(runs).toHaveLength(2)
    expect(runs[0]).toMatchObject({ start: 0, end: 0.2 })
  })

  it('không chuyển động thì không có đoạn nào', () => {
    expect(trackRuns(kf([0, 0.5], [1, 0.5]), 0.1)).toEqual([])
    expect(trackRuns([], 0.1)).toEqual([])
    expect(trackRuns(kf([0, 1]), 0.1)).toEqual([])
  })

  it('bỏ đoạn nhỏ hơn ngưỡng', () => {
    expect(trackRuns(kf([0, 0], [0.5, 0.05], [1, 0]), 0.1)).toEqual([])
    expect(trackRuns(kf([0, 0], [0.5, 0.1], [1, 0]), 0.1)).toHaveLength(2) // đúng ngưỡng thì giữ
  })
})

describe('maxFlashesPerSecond (WCAG 2.3.1: tối đa 3 lần chớp mỗi giây)', () => {
  it('một lần sáng lên rồi tắt = 1 lần chớp', () => {
    expect(maxFlashesPerSecond(kf([0, 0], [0.15, 1], [0.9, 0]))).toBe(1)
  })

  it('chỉ sáng lên một lần (không tắt) vẫn tính thừa là 1', () => {
    expect(maxFlashesPerSecond(kf([0, 0], [0.5, 1]))).toBe(1)
  })

  it('không đổi thì 0', () => {
    expect(maxFlashesPerSecond(kf([0, 0.5], [2, 0.5]))).toBe(0)
  })

  it('đoạn đổi nhỏ hơn ngưỡng không được tính là chớp', () => {
    const wobble = strobe(20, 0.05).map((k) => ({ t: k.t, value: k.value * (FLASH_MIN_DELTA - 0.01) }))
    expect(maxFlashesPerSecond(wobble)).toBe(0)
  })

  it('đúng giới hạn: 3 lần chớp mỗi giây vẫn hợp lệ, 4 lần thì vượt', () => {
    // Chu kỳ 0,2s: mỗi cửa sổ 1s có 5 đoạn bắt đầu → ceil(5/2) = 3.
    expect(maxFlashesPerSecond(strobe(15, 0.2))).toBe(MAX_FLASHES_PER_SECOND)
    // Chu kỳ 0,15s: mỗi cửa sổ 1s có 7 đoạn → ceil(7/2) = 4.
    expect(maxFlashesPerSecond(strobe(15, 0.15))).toBe(4)
  })

  it('nhấp nháy dày thì vượt xa giới hạn', () => {
    expect(maxFlashesPerSecond(strobe(20, 0.05))).toBeGreaterThan(MAX_FLASHES_PER_SECOND)
  })

  it('cửa sổ trượt: một cụm nhấp nháy dày giữa hai đoạn yên vẫn bị bắt', () => {
    const frames = [...kf([0, 0], [3, 0]), ...strobe(12, 0.1).map((k) => ({ t: 3 + k.t, value: k.value })), ...kf([5, 0])]
    expect(maxFlashesPerSecond(frames)).toBeGreaterThan(MAX_FLASHES_PER_SECOND)
  })
})

describe('maxCyclesPerSecond (rung ngang)', () => {
  it('rung của âm thử lại không vượt giới hạn', () => {
    const offset = buildPlan('tryAgain').tracks.find((t) => t.property === 'offsetX')!
    expect(maxCyclesPerSecond(offset.keyframes)).toBeLessThanOrEqual(MAX_SHAKE_HZ)
  })

  it('rung quá nhanh thì vượt giới hạn', () => {
    const fast = Array.from({ length: 21 }, (_, i) => ({ t: i * 0.05, value: i % 2 ? 3 : -3 }))
    expect(maxCyclesPerSecond(fast)).toBeGreaterThan(MAX_SHAKE_HZ)
  })

  it('dao động dưới 1px không được tính', () => {
    const tiny = Array.from({ length: 21 }, (_, i) => ({ t: i * 0.05, value: i % 2 ? 0.4 : -0.4 }))
    expect(maxCyclesPerSecond(tiny)).toBe(0)
  })
})

describe('kế hoạch hiệu ứng: giới hạn an toàn cho mọi loại phản hồi', () => {
  describe.each(FEEDBACK_KINDS)('%s', (kind) => {
    it.each([false, true])('reducedMotion=%s: qua validatePlan', (reducedMotion) => {
      expect(validatePlan(buildPlan(kind, { reducedMotion }))).toEqual([])
    })

    it('không dài quá giới hạn; hạt lấp lánh kết thúc trước khi hiệu ứng kết thúc', () => {
      const plan = buildPlan(kind)
      expect(plan.duration).toBeLessThanOrEqual(MAX_EFFECT_SECONDS)
      for (const sparkle of plan.sparkles) expect(sparkle.delay + sparkle.life).toBeLessThanOrEqual(plan.duration)
    })

    it('mọi track kết thúc ở trạng thái nghỉ (về chỗ cũ, tắt hẳn) để không bỏ lại dấu vết', () => {
      const plan = buildPlan(kind)
      for (const { property, keyframes } of plan.tracks) {
        const last = keyframes[keyframes.length - 1].value
        expect(last).toBe(property === 'scale' ? 1 : 0)
        expect(keyframes[0].value).toBe(property === 'scale' ? 1 : 0)
      }
    })

    it('chế độ giảm chuyển động: không track, không hạt, chỉ vòng sáng tĩnh', () => {
      const plan = buildPlan(kind, { reducedMotion: true })
      expect(plan).toMatchObject({ reducedMotion: true, tracks: [], sparkles: [], staticHighlightSeconds: STATIC_HIGHLIGHT_SECONDS })
      expect(planFlashRate(plan)).toBe(0)
    })

    it('âm thanh tương ứng là một âm có thật', () => {
      expect(SOUND_NAMES).toContain(SOUND_OF_FEEDBACK[kind])
    })
  })

  it('đúng: một lần chớp, có lấp lánh; nảy nhẹ', () => {
    const plan = buildPlan('correct')
    expect(planFlashRate(plan)).toBe(1)
    expect(plan.sparkles.length).toBeGreaterThan(0)
    expect(plan.tracks.some((t) => t.property === 'scale')).toBe(true)
  })

  it('thử lại: nhẹ nhàng hơn đúng (không nảy, không lấp lánh, vòng sáng mờ hơn, rung ≤ ngưỡng)', () => {
    const tryAgain = buildPlan('tryAgain')
    const correct = buildPlan('correct')
    expect(tryAgain.sparkles).toEqual([])
    expect(tryAgain.tracks.some((t) => t.property === 'scale')).toBe(false)
    const peak = (plan: FeedbackPlan) => Math.max(...plan.tracks.find((t) => t.property === 'opacity')!.keyframes.map((k) => k.value))
    expect(peak(tryAgain)).toBeLessThan(peak(correct))
    const offsets = tryAgain.tracks.find((t) => t.property === 'offsetX')!.keyframes.map((k) => Math.abs(k.value))
    expect(Math.max(...offsets)).toBeLessThanOrEqual(MAX_OFFSET_PX)
    expect(Math.max(...offsets)).toBeGreaterThan(0)
  })

  it('hoàn thành: nhiều hạt hơn đúng và dài hơn đúng', () => {
    expect(buildPlan('complete').sparkles.length).toBeGreaterThan(buildPlan('correct').sparkles.length)
    expect(buildPlan('complete').duration).toBeGreaterThan(buildPlan('correct').duration)
  })
})

describe('sparkleLayout', () => {
  it('cố định: cùng tham số cho cùng kết quả (không ngẫu nhiên)', () => {
    expect(sparkleLayout(8)).toEqual(sparkleLayout(8))
  })

  it('đúng số hạt, độ trễ tăng dần, sống đủ lâu, nằm quanh khung', () => {
    const sparkles = sparkleLayout(10, 0.1, 0.06)
    expect(sparkles).toHaveLength(10)
    expect(sparkles[0].delay).toBeCloseTo(0.1, 10)
    sparkles.forEach((s, i) => {
      if (i > 0) expect(s.delay).toBeGreaterThan(sparkles[i - 1].delay)
      expect(s.life).toBeGreaterThanOrEqual(MIN_SPARKLE_LIFE)
      expect(Math.hypot(s.x - 0.5, s.y - 0.5)).toBeGreaterThanOrEqual(0.55)
      expect(Math.hypot(s.x - 0.5, s.y - 0.5)).toBeLessThanOrEqual(0.73)
    })
  })

  it('0 hạt thì rỗng', () => {
    expect(sparkleLayout(0)).toEqual([])
  })
})

describe('sampleFeedback', () => {
  const correct = buildPlan('correct')

  it('đầu hiệu ứng: đang hoạt động, vòng sáng chưa hiện, chưa nảy', () => {
    expect(sampleFeedback(correct, 0)).toMatchObject({ active: true, scale: 1, opacity: 0, offsetX: 0 })
  })

  it('đúng: nảy tới 1,1 lúc 0,18s; vòng sáng đạt 1 lúc 0,15s', () => {
    expect(sampleFeedback(correct, 0.18).scale).toBeCloseTo(1.1, 10)
    expect(sampleFeedback(correct, 0.15).opacity).toBeCloseTo(1, 10)
  })

  it.each([-1, Number.NaN, 0.9, 5, Number.POSITIVE_INFINITY])('t=%s ngoài [0, duration): trạng thái nghỉ', (t) => {
    const sample = sampleFeedback(correct, t)
    expect(sample.active).toBe(false)
    expect(sample.opacity).toBe(0)
    expect(sample.scale).toBe(1)
    expect(sample.offsetX).toBe(0)
    expect(sample.sparkles.every((s) => s.opacity === 0)).toBe(true)
  })

  it('thử lại: dịch ngang theo track, không đổi tỉ lệ', () => {
    const plan = buildPlan('tryAgain')
    expect(sampleFeedback(plan, 0.15).offsetX).toBeCloseTo(-4, 10)
    expect(sampleFeedback(plan, 0.3).offsetX).toBeCloseTo(4, 10)
    expect(sampleFeedback(plan, 0.3).scale).toBe(1)
  })

  it('lấp lánh: mỗi hạt sáng lên rồi tắt đúng một lần trong đời sống của nó', () => {
    const [first] = correct.sparkles
    const at = (local: number) => sampleFeedback(correct, first.delay + local).sparkles[0].opacity
    expect(at(0)).toBeCloseTo(0, 10)
    expect(at(first.life / 2)).toBeCloseTo(1, 10)
    expect(at(first.life)).toBeCloseTo(0, 10)
    expect(sampleFeedback(correct, first.delay + first.life + 0.01).sparkles[0].opacity).toBe(0)
  })

  it('hạt chưa tới lượt (delay) thì ẩn; số hạt trả về khớp kế hoạch', () => {
    const sample = sampleFeedback(correct, 0.01)
    expect(sample.sparkles).toHaveLength(correct.sparkles.length)
    expect(sample.sparkles[correct.sparkles.length - 1].opacity).toBe(0)
  })

  it('giảm chuyển động: vòng sáng tĩnh (độ mờ 1, không dịch, không nảy, không hạt) rồi tắt', () => {
    const plan = buildPlan('correct', { reducedMotion: true })
    for (const t of [0, 0.3, 0.79]) {
      expect(sampleFeedback(plan, t)).toMatchObject({ active: true, opacity: 1, scale: 1, offsetX: 0 })
    }
    expect(sampleFeedback(plan, 0.8).active).toBe(false)
  })
})

describe('validatePlan: bắt kế hoạch vi phạm', () => {
  const codes = (plan: FeedbackPlan) => validatePlan(plan).map((issue) => issue.code)

  it('nhấp nháy quá 3 lần/giây', () => {
    expect(codes(planWith({ tracks: [{ property: 'opacity', keyframes: strobe(20, 0.05) }] }))).toContain('TOO_MANY_FLASHES')
  })

  it('đúng 3 lần/giây thì hợp lệ', () => {
    expect(codes(planWith({ tracks: [{ property: 'opacity', keyframes: strobe(15, 0.2) }], duration: 2 }))).not.toContain('TOO_MANY_FLASHES')
  })

  it('dịch ngang quá biên độ', () => {
    expect(codes(planWith({ tracks: [{ property: 'offsetX', keyframes: kf([0, 0], [0.2, MAX_OFFSET_PX + 1], [0.4, 0]) }] }))).toContain('OFFSET_TOO_LARGE')
    expect(codes(planWith({ tracks: [{ property: 'offsetX', keyframes: kf([0, 0], [0.2, MAX_OFFSET_PX], [0.4, 0]) }] }))).not.toContain('OFFSET_TOO_LARGE')
  })

  it('rung quá nhanh', () => {
    const fast = Array.from({ length: 21 }, (_, i) => ({ t: i * 0.05, value: i % 2 ? 3 : -3 }))
    expect(codes(planWith({ tracks: [{ property: 'offsetX', keyframes: fast }] }))).toContain('SHAKE_TOO_FAST')
  })

  it.each([0.85, 1.3])('tỉ lệ %s ngoài khoảng cho phép', (value) => {
    expect(codes(planWith({ tracks: [{ property: 'scale', keyframes: kf([0, 1], [0.2, value], [0.5, 1]) }] }))).toContain('SCALE_OUT_OF_RANGE')
  })

  it('quá dài', () => {
    expect(codes(planWith({ duration: MAX_EFFECT_SECONDS + 0.1 }))).toContain('TOO_LONG')
    expect(codes(planWith({ duration: MAX_EFFECT_SECONDS }))).not.toContain('TOO_LONG')
  })

  it('quá nhiều hạt', () => {
    expect(codes(planWith({ sparkles: sparkleLayout(MAX_SPARKLES + 1) }))).toContain('TOO_MANY_SPARKLES')
    expect(codes(planWith({ sparkles: sparkleLayout(MAX_SPARKLES) }))).not.toContain('TOO_MANY_SPARKLES')
  })

  it('hạt sống quá ngắn', () => {
    const sparkles = sparkleLayout(3).map((s) => ({ ...s, life: MIN_SPARKLE_LIFE - 0.01 }))
    expect(codes(planWith({ sparkles }))).toContain('SPARKLE_TOO_SHORT')
  })

  it('giảm chuyển động mà vẫn có chuyển động', () => {
    expect(codes(planWith({ reducedMotion: true }))).toContain('REDUCED_MOTION_HAS_MOTION')
  })

  it('khung thời gian không tăng dần', () => {
    expect(codes(planWith({ tracks: [{ property: 'opacity', keyframes: kf([0, 0], [0.5, 1], [0.2, 0]) }] }))).toContain('KEYFRAMES_NOT_ASCENDING')
  })
})

describe('màu phản hồi', () => {
  it.each(FEEDBACK_KINDS)('theme neutral: %s dùng màu của theme và không có đỏ gắt', (kind) => {
    expect(hasHarshRedColor(kind, neutralTheme.colors)).toBe(false)
  })

  it('đúng/thử lại/hoàn thành lấy vòng sáng từ vai trò màu tương ứng', () => {
    const c = neutralTheme.colors
    expect(feedbackColors('correct', c).ring).toBe(c.lineCorrect)
    expect(feedbackColors('tryAgain', c).ring).toBe(c.lineTryAgain)
    expect(feedbackColors('complete', c).ring).toBe(c.accent)
    expect(feedbackColors('tryAgain', c).sparkles).toEqual([])
  })

  it('theme có màu đỏ gắt ở vai trò phản hồi thì bị phát hiện', () => {
    expect(hasHarshRedColor('tryAgain', { ...neutralTheme.colors, lineTryAgain: '#DC2626' })).toBe(true)
    expect(hasHarshRedColor('correct', { ...neutralTheme.colors, lineCorrect: '#FF0000' })).toBe(true)
  })
})
