/** Các âm phản hồi dùng chung. Tên theo ý nghĩa, không theo cách phát. */
export const SOUND_NAMES = ['correct', 'tryAgain', 'complete'] as const
export type SoundName = (typeof SOUND_NAMES)[number]

/** Một nốt trong kế hoạch phát. Thời gian tính bằng giây từ lúc bắt đầu phát âm. */
export interface ToneStep {
  freq: number
  start: number
  duration: number
  /** Biên độ đỉnh (0 đến 1) trước khi nhân âm lượng chung. */
  peak: number
  type: OscillatorType
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

const PLANS: Readonly<Record<SoundName, readonly ToneStep[]>> = {
  // Đúng: ba nốt đi lên (đô, mi, sol) vui nhưng không chói.
  correct: [note(72, 0, 0.16, 0.22), note(76, 0.11, 0.16, 0.22), note(79, 0.22, 0.24, 0.22)],
  // Cần thử lại: hai nốt mềm đi xuống nhẹ, nhỏ hơn âm đúng; trung tính, không phạt.
  tryAgain: [note(67, 0, 0.18, 0.12), note(64, 0.14, 0.24, 0.1)],
  // Hoàn thành: bốn nốt đi lên, nốt cuối kéo dài.
  complete: [note(72, 0, 0.14, 0.2), note(76, 0.12, 0.14, 0.2), note(79, 0.24, 0.14, 0.2), note(84, 0.36, 0.4, 0.2)],
}

export function soundPlan(name: SoundName): readonly ToneStep[] {
  return PLANS[name]
}

/** Tổng thời gian phát (giây), gồm cả đoạn tắt của nốt cuối. */
export function soundDuration(plan: readonly ToneStep[]): number {
  return Math.max(0, ...plan.map((step) => step.start + step.duration)) + RELEASE_SECONDS
}
