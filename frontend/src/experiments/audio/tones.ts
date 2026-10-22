/** Các âm phản hồi dùng chung. Tên theo ý nghĩa, không theo cách phát. */
export const SOUND_NAMES = ['correct', 'tryAgain', 'complete'] as const
export type SoundName = (typeof SOUND_NAMES)[number]

/**
 * Các nốt «đếm»: chú ong bay qua từng bông hoa thì mỗi hoa kêu một nốt, đi lên dần (gam ngũ cung đô trưởng, 11 nốt từ C4 đến C6).
 * Tách khỏi `SOUND_NAMES` để công cụ nghe thử âm phản hồi (AudioLab) không phải thêm 11 nút; vẫn chịu cùng giới hạn an toàn (xem tones.test.ts).
 */
export const COUNT_SOUND_NAMES = ['count0', 'count1', 'count2', 'count3', 'count4', 'count5', 'count6', 'count7', 'count8', 'count9', 'count10'] as const
export type CountSoundName = (typeof COUNT_SOUND_NAMES)[number]
/** Mọi tên âm `AudioService.play` nhận. */
export type PlayableSound = SoundName | CountSoundName

/** Nốt MIDI của từng nốt đếm: đô, rê, mi, sol, la, đô, rê, mi, sol, la, đô. */
export const COUNT_NOTES_MIDI: readonly number[] = [60, 62, 64, 67, 69, 72, 74, 76, 79, 81, 84]

/**
 * Nốt đếm của vạch thứ `index` (từ 0) trên thang có `ticks` vạch. Thang tối đa 11 vạch dùng nốt cùng số thứ tự (vạch 0 là nốt thấp nhất);
 * thang dài hơn thì dàn đều lên 11 nốt để giai điệu vẫn đi lên từ đầu đến cuối thang. Chỉ số ngoài thang được kẹp.
 */
export function countSoundName(index: number, ticks: number): CountSoundName {
  const last = COUNT_SOUND_NAMES.length - 1
  if (!Number.isFinite(index) || !Number.isFinite(ticks) || ticks < 2) return COUNT_SOUND_NAMES[0]
  const clamped = Math.min(ticks - 1, Math.max(0, Math.round(index)))
  const position = ticks - 1 <= last ? clamped : Math.round((clamped * last) / (ticks - 1))
  return COUNT_SOUND_NAMES[Math.min(last, position)]
}

/** Một nốt trong kế hoạch phát. Thời gian tính bằng giây từ lúc bắt đầu phát âm. */
export interface ToneStep {
  freq: number
  start: number
  duration: number
  /** Biên độ đỉnh (0 đến 1) trước khi nhân âm lượng chung. */
  peak: number
  type: OscillatorType
  /**
   * Dạng đường biên độ: `hold` (mặc định) lên nhanh, giữ tới hết `duration` rồi tắt dần trong `RELEASE_SECONDS`; `pluck` lên nhanh rồi tắt dần đều tới hết `duration` (gõ phím
   * xylophone/chuông nhỏ: không giữ, không kéo đuôi).
   */
  shape?: 'hold' | 'pluck'
}

/** Thời gian lên và tắt của mỗi nốt (giây): tránh tiếng "tách" khi bật/tắt đột ngột. */
export const ATTACK_SECONDS = 0.015
export const RELEASE_SECONDS = 0.12

// Giới hạn an toàn cho tai trẻ nhỏ (quy ước UX trong CLAUDE.md: không âm phạt, không chói). Là đề xuất của
// thử nghiệm, chưa được chuyên gia xác nhận; nghe thử bằng loa/tai nghe thật là việc của người dùng.
export const MAX_PEAK = 0.25
export const MAX_SOUND_SECONDS = 1.5
export const MIN_FREQ = 200
export const MAX_FREQ = 2100

/** Tần số (Hz) của nốt MIDI (69 = A4 = 440Hz). */
export function midiToFreq(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12)
}

const note = (midi: number, start: number, duration: number, peak: number, type: OscillatorType = 'sine'): ToneStep => ({
  freq: midiToFreq(midi),
  start,
  duration,
  peak,
  type,
})

/**
 * Phím gõ mềm kiểu xylophone/kalimba cho nốt đếm: sóng tam giác (ít họa âm lẻ, nghe «tính» hơn sine thuần nhưng vẫn dịu, không chói như răng cưa) với đường biên độ `pluck`
 * (lên nhanh rồi tắt dần đều, không giữ). Vẫn một bộ dao động cho mỗi nốt nên giới hạn đồng thời của `AudioService` không đổi.
 */
const bell = (midi: number, start: number, duration: number, peak: number): ToneStep => ({ ...note(midi, start, duration, peak, 'triangle'), shape: 'pluck' })

const SOUND_PLANS: Readonly<Record<SoundName, readonly ToneStep[]>> = {
  // Đúng: ba nốt đi lên (đô, mi, sol) vui nhưng không chói.
  correct: [note(72, 0, 0.16, 0.22), note(76, 0.11, 0.16, 0.22), note(79, 0.22, 0.24, 0.22)],
  // Cần thử lại: hai nốt mềm đi xuống nhẹ, nhỏ hơn âm đúng; trung tính, không phạt.
  tryAgain: [note(67, 0, 0.18, 0.12), note(64, 0.14, 0.24, 0.1)],
  // Hoàn thành: bốn nốt đi lên, nốt cuối kéo dài.
  complete: [note(72, 0, 0.14, 0.2), note(76, 0.12, 0.14, 0.2), note(79, 0.24, 0.14, 0.2), note(84, 0.36, 0.4, 0.2)],
}

const COUNT_PLANS = Object.fromEntries(
  COUNT_SOUND_NAMES.map((name, index) => [name, [bell(COUNT_NOTES_MIDI[index], 0, 0.34, 0.18)] as readonly ToneStep[]]),
) as Readonly<Record<CountSoundName, readonly ToneStep[]>>

export function soundPlan(name: PlayableSound): readonly ToneStep[] {
  return name in SOUND_PLANS ? SOUND_PLANS[name as SoundName] : COUNT_PLANS[name as CountSoundName]
}

/** Tổng thời gian phát (giây), gồm cả đoạn tắt của nốt cuối. */
export function soundDuration(plan: readonly ToneStep[]): number {
  return Math.max(0, ...plan.map((step) => step.start + step.duration)) + RELEASE_SECONDS
}
