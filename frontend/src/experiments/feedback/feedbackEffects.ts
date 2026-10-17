import { isHarshRed } from '../theme/contrast'
import type { ThemeColors } from '../theme/themeTypes'
import type { SoundName } from '../audio/tones'

/** Các loại phản hồi dùng chung; trùng tên với âm tương ứng của `AudioService`. */
export const FEEDBACK_KINDS = ['correct', 'tryAgain', 'complete'] as const
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number]

export const SOUND_OF_FEEDBACK: Readonly<Record<FeedbackKind, SoundName>> = {
  correct: 'correct',
  tryAgain: 'tryAgain',
  complete: 'complete',
}

// ---- Giới hạn an toàn (đề xuất của thử nghiệm; chưa được chuyên gia xác nhận) ----
/** WCAG 2.3.1: không quá 3 lần chớp trong một giây. */
export const MAX_FLASHES_PER_SECOND = 3
/** Thay đổi độ mờ tối thiểu được tính là một lần chợp sáng/tối. */
export const FLASH_MIN_DELTA = 0.1
/** "Rung nhẹ" khi cần thử lại: biên độ tối đa (px thiết kế) và tần số tối đa (chu kỳ/giây). */
export const MAX_OFFSET_PX = 6
export const MAX_SHAKE_HZ = 4
/** Nảy nhẹ, không phóng to đột ngột. */
export const MIN_SCALE = 0.9
export const MAX_SCALE = 1.15
export const MAX_EFFECT_SECONDS = 2
/**
 * Lấp lánh: số hạt tối đa và thời gian sống tối thiểu của mỗi hạt. Mỗi hạt chỉ sáng lên rồi tắt MỘT lần trong cả
 * hiệu ứng. HẠN CHẾ: phép đếm chớp (`maxFlashesPerSecond`) KHÔNG tính hạt; nhiều hạt nối đuôi nhau có thể tạo
 * hơn 3 lần sáng/tắt mỗi giây nói chung, được coi là chấp nhận được vì mỗi hạt rất nhỏ (12 đến 16px, xa ngưỡng 25%
 * diện tích của WCAG). Đó là giả định chưa kiểm chứng bằng chuyên gia hay thiết bị thật.
 */
export const MAX_SPARKLES = 12
export const MIN_SPARKLE_LIFE = 0.4
/**
 * Khoảng tối thiểu giữa hai lần KHỞI ĐỘNG hiệu ứng hình (giây). Giới hạn chớp ở `validatePlan` chỉ đúng trong một
 * lần phát; chạm trả lời dồn dập mà lần nào cũng reset vòng sáng về 0 sẽ chớp vượt 3 lần/giây. Với 0,5 giây thì tối
 * đa 2 lần khởi động mỗi giây, mỗi lần khoảng 1,5 lần chớp (kể cả bước reset đột ngột) ≈ 3. Âm thanh không bị giới hạn này.
 */
export const MIN_RETRIGGER_SECONDS = 0.5
/** Khi giảm chuyển động: giữ một vòng sáng tĩnh trong khoảng này, không chuyển động nào. */
export const STATIC_HIGHLIGHT_SECONDS = 0.8

export type TrackProperty = 'scale' | 'opacity' | 'offsetX'

export interface Keyframe {
  /** Giây từ lúc bắt đầu hiệu ứng. */
  t: number
  value: number
}

export interface EffectTrack {
  property: TrackProperty
  /** Nội suy tuyến tính giữa các khung; `t` tăng dần. */
  keyframes: readonly Keyframe[]
}

/** Một hạt lấp lánh, toạ độ chuẩn hóa so với khung mục tiêu (0..1; ngoài khoảng là bên ngoài khung). */
export interface SparkleSpec {
  x: number
  y: number
  delay: number
  life: number
  /** Cỡ (px thiết kế) lúc lớn nhất. */
  size: number
}

export interface FeedbackPlan {
  kind: FeedbackKind
  reducedMotion: boolean
  duration: number
  tracks: readonly EffectTrack[]
  sparkles: readonly SparkleSpec[]
  /** > 0 khi giảm chuyển động: vòng sáng tĩnh hiện trong từng này giây. */
  staticHighlightSeconds: number
}

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))

/** Hạt lấp lánh xếp quanh khung theo góc vàng: cố định (không ngẫu nhiên) nên test và chụp ảnh lặp lại được. */
export function sparkleLayout(count: number, firstDelay = 0, step = 0.05): SparkleSpec[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = i * GOLDEN_ANGLE
    const radius = 0.56 + 0.08 * (i % 3)
    return {
      x: 0.5 + radius * Math.cos(angle),
      y: 0.5 + radius * Math.sin(angle),
      delay: firstDelay + i * step,
      life: 0.5,
      size: 12 + 2 * (i % 3),
    }
  })
}

const track = (property: TrackProperty, ...frames: [number, number][]): EffectTrack => ({
  property,
  keyframes: frames.map(([t, value]) => ({ t, value })),
})

/** Kế hoạch hiệu ứng cho một loại phản hồi. `reducedMotion` thì chỉ còn vòng sáng tĩnh, không chuyển động. */
export function buildPlan(kind: FeedbackKind, { reducedMotion = false }: { reducedMotion?: boolean } = {}): FeedbackPlan {
  if (reducedMotion) {
    return { kind, reducedMotion: true, duration: STATIC_HIGHLIGHT_SECONDS, tracks: [], sparkles: [], staticHighlightSeconds: STATIC_HIGHLIGHT_SECONDS }
  }
  switch (kind) {
    case 'correct':
      return {
        kind,
        reducedMotion: false,
        duration: 0.9,
        // Nảy lên rồi về chỗ cũ; vòng sáng hiện rồi mờ dần (một lần chớp trong 0,9 giây).
        tracks: [track('scale', [0, 1], [0.18, 1.1], [0.4, 1], [0.9, 1]), track('opacity', [0, 0], [0.15, 1], [0.9, 0])],
        sparkles: sparkleLayout(6),
        staticHighlightSeconds: 0,
      }
    case 'tryAgain':
      return {
        kind,
        reducedMotion: false,
        duration: 0.7,
        // Rung nhẹ vài px (khoảng 2 chu kỳ/giây), không nảy, không lấp lánh: trung bình, không phạt.
        tracks: [track('offsetX', [0, 0], [0.15, -4], [0.3, 4], [0.45, -2], [0.6, 0], [0.7, 0]), track('opacity', [0, 0], [0.2, 0.8], [0.7, 0])],
        sparkles: [],
        staticHighlightSeconds: 0,
      }
    case 'complete':
      return {
        kind,
        reducedMotion: false,
        duration: 1.4,
        tracks: [track('scale', [0, 1], [0.25, 1.08], [0.5, 1], [1.4, 1]), track('opacity', [0, 0], [0.2, 1], [1.4, 0])],
        sparkles: sparkleLayout(10, 0, 0.06),
        staticHighlightSeconds: 0,
      }
  }
}

// ---- Lấy mẫu ----
/** Giá trị của một track tại thời điểm `t` (nội suy tuyến tính; ngoài khoảng thì giữ giá trị đầu/cuối). */
export function sampleTrack(frames: readonly Keyframe[], t: number): number {
  if (frames.length === 0) return 0
  if (t <= frames[0].t) return frames[0].value
  const last = frames[frames.length - 1]
  if (t >= last.t) return last.value
  for (let i = 1; i < frames.length; i += 1) {
    const b = frames[i]
    if (t <= b.t) {
      const a = frames[i - 1]
      const span = b.t - a.t
      return span === 0 ? b.value : a.value + ((b.value - a.value) * (t - a.t)) / span
    }
  }
  return last.value
}

export interface SparkleState {
  opacity: number
  scale: number
}

export interface FeedbackSample {
  active: boolean
  scale: number
  opacity: number
  offsetX: number
  sparkles: readonly SparkleState[]
}

const REST_SPARKLE: SparkleState = { opacity: 0, scale: 0.5 }

/** Trạng thái hiệu ứng tại `t` giây. Ngoài [0, duration) là trạng thái nghỉ (không hiện gì). */
export function sampleFeedback(plan: FeedbackPlan, t: number): FeedbackSample {
  const rest: FeedbackSample = { active: false, scale: 1, opacity: 0, offsetX: 0, sparkles: plan.sparkles.map(() => REST_SPARKLE) }
  if (!(t >= 0) || t >= plan.duration) return rest
  if (plan.reducedMotion) return { ...rest, active: true, opacity: t < plan.staticHighlightSeconds ? 1 : 0 }

  const sample: FeedbackSample = { ...rest, active: true }
  for (const { property, keyframes } of plan.tracks) sample[property] = sampleTrack(keyframes, t)
  const sparkles = plan.sparkles.map((spec): SparkleState => {
    const local = t - spec.delay
    if (local < 0 || local > spec.life) return REST_SPARKLE
    const opacity = 1 - Math.abs((2 * local) / spec.life - 1) // lên rồi xuống một lần
    return { opacity, scale: 0.5 + 0.5 * opacity }
  })
  return { ...sample, sparkles }
}

// ---- Phân tích an toàn ----
export interface Run {
  start: number
  end: number
  /** Độ lớn thay đổi (luôn dương). */
  delta: number
}

/**
 * Tách track thành các đoạn đơn điệu (lên hoặc xuống liên tiếp). Chỉ giữ đoạn có thay đổi ≥ `minDelta`.
 * Các đoạn xen kẽ lên/xuống; một lần chớp = một cặp đoạn ngược chiều.
 */
export function trackRuns(frames: readonly Keyframe[], minDelta: number): Run[] {
  const runs: Run[] = []
  let dir = 0
  let startIndex = 0
  let lastMoveIndex = 0
  const close = () => {
    if (dir === 0) return
    const delta = Math.abs(frames[lastMoveIndex].value - frames[startIndex].value)
    if (delta >= minDelta) runs.push({ start: frames[startIndex].t, end: frames[lastMoveIndex].t, delta })
  }
  for (let i = 1; i < frames.length; i += 1) {
    const d = Math.sign(frames[i].value - frames[i - 1].value)
    if (d === 0) continue
    if (dir === 0) {
      dir = d
      startIndex = i - 1
    } else if (d !== dir) {
      close()
      dir = d
      startIndex = lastMoveIndex
    }
    lastMoveIndex = i
  }
  close()
  return runs
}

/** Số đoạn lớn nhất có điểm bắt đầu nằm trong một cửa sổ 1 giây bất kỳ. */
function maxRunsPerSecond(runs: readonly Run[]): number {
  let max = 0
  for (const { start } of runs) {
    max = Math.max(max, runs.filter((run) => run.start >= start && run.start < start + 1).length)
  }
  return max
}

/** Số lần chớp lớn nhất trong một giây của track độ mờ (cặp đoạn ngược chiều; tính thừa nửa cặp). */
export function maxFlashesPerSecond(frames: readonly Keyframe[], minDelta = FLASH_MIN_DELTA): number {
  return Math.ceil(maxRunsPerSecond(trackRuns(frames, minDelta)) / 2)
}

/** Số chu kỳ lắc lớn nhất trong một giây của track dịch ngang (bỏ qua dao động dưới 1px). */
export function maxCyclesPerSecond(frames: readonly Keyframe[], minDelta = 1): number {
  return maxRunsPerSecond(trackRuns(frames, minDelta)) / 2
}

/** Số lần chớp lớn nhất trong một giây của cả kế hoạch (mọi track độ mờ). Hạt lấp lánh tính riêng, xem `MIN_SPARKLE_LIFE`. */
export function planFlashRate(plan: FeedbackPlan): number {
  return Math.max(0, ...plan.tracks.filter((t) => t.property === 'opacity').map((t) => maxFlashesPerSecond(t.keyframes)))
}

const valuesOf = (plan: FeedbackPlan, property: TrackProperty) =>
  plan.tracks.filter((t) => t.property === property).flatMap((t) => t.keyframes.map((k) => k.value))

export type PlanIssueCode =
  | 'TOO_MANY_FLASHES'
  | 'OFFSET_TOO_LARGE'
  | 'SHAKE_TOO_FAST'
  | 'SCALE_OUT_OF_RANGE'
  | 'TOO_LONG'
  | 'TOO_MANY_SPARKLES'
  | 'SPARKLE_TOO_SHORT'
  | 'REDUCED_MOTION_HAS_MOTION'
  | 'KEYFRAMES_NOT_ASCENDING'

export interface PlanIssue {
  code: PlanIssueCode
  message: string
}

/** Kiểm một kế hoạch hiệu ứng theo các giới hạn an toàn; trả danh sách lỗi (rỗng nếu hợp lệ). */
export function validatePlan(plan: FeedbackPlan): PlanIssue[] {
  const issues: PlanIssue[] = []
  const add = (code: PlanIssueCode, message: string) => issues.push({ code, message })

  if (plan.duration > MAX_EFFECT_SECONDS) add('TOO_LONG', `Hiệu ứng dài ${plan.duration}s, tối đa ${MAX_EFFECT_SECONDS}s.`)
  if (plan.reducedMotion && (plan.tracks.length > 0 || plan.sparkles.length > 0)) {
    add('REDUCED_MOTION_HAS_MOTION', 'Chế độ giảm chuyển động không được có track hay hạt lấp lánh.')
  }
  for (const { property, keyframes } of plan.tracks) {
    if (keyframes.some((k, i) => i > 0 && k.t < keyframes[i - 1].t)) {
      add('KEYFRAMES_NOT_ASCENDING', `Track ${property} có khung thời gian không tăng dần.`)
    }
    if (property === 'opacity') {
      const flashes = maxFlashesPerSecond(keyframes)
      if (flashes > MAX_FLASHES_PER_SECOND) add('TOO_MANY_FLASHES', `Track độ mờ chớp ${flashes} lần/giây, tối đa ${MAX_FLASHES_PER_SECOND}.`)
    }
    if (property === 'offsetX') {
      const cycles = maxCyclesPerSecond(keyframes)
      if (cycles > MAX_SHAKE_HZ) add('SHAKE_TOO_FAST', `Rung ${cycles} chu kỳ/giây, tối đa ${MAX_SHAKE_HZ}.`)
    }
  }
  const offsets = valuesOf(plan, 'offsetX')
  if (offsets.some((v) => Math.abs(v) > MAX_OFFSET_PX)) add('OFFSET_TOO_LARGE', `Dịch ngang vượt ${MAX_OFFSET_PX}px.`)
  const scales = valuesOf(plan, 'scale')
  if (scales.some((v) => v < MIN_SCALE || v > MAX_SCALE)) add('SCALE_OUT_OF_RANGE', `Tỉ lệ ngoài [${MIN_SCALE}, ${MAX_SCALE}].`)
  if (plan.sparkles.length > MAX_SPARKLES) add('TOO_MANY_SPARKLES', `${plan.sparkles.length} hạt, tối đa ${MAX_SPARKLES}.`)
  if (plan.sparkles.some((s) => s.life < MIN_SPARKLE_LIFE)) add('SPARKLE_TOO_SHORT', `Hạt sống dưới ${MIN_SPARKLE_LIFE}s sẽ chớp quá nhanh.`)
  return issues
}

/** Màu vòng sáng và hạt lấp lánh theo loại phản hồi, lấy từ theme (đã được `validateTheme` kiểm không đỏ gắt). */
export function feedbackColors(kind: FeedbackKind, colors: ThemeColors): { ring: string; sparkles: readonly string[] } {
  switch (kind) {
    case 'correct':
      return { ring: colors.lineCorrect, sparkles: [colors.lineCorrect, colors.accent, colors.surfaceTryAgain] }
    case 'tryAgain':
      return { ring: colors.lineTryAgain, sparkles: [] }
    case 'complete':
      return { ring: colors.accent, sparkles: [colors.lineCorrect, colors.accent, colors.lineTryAgain] }
  }
}

/** Màu phản hồi có đỏ gắt không (kiểm lại ở mức hiệu ứng, phòng theme chưa qua `validateTheme`). */
export function hasHarshRedColor(kind: FeedbackKind, colors: ThemeColors): boolean {
  const { ring, sparkles } = feedbackColors(kind, colors)
  return [ring, ...sparkles].some(isHarshRed)
}
