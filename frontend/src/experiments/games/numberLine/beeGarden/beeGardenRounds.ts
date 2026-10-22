import type { NumberLineQuestion } from '../numberLineTypes'

/** Cách đọc số bằng chữ (để giọng đọc nói «bảy» chứ không đọc chữ số); chỉ dùng cho thang 0 đến 10. */
export const NUMBER_WORDS: readonly string[] = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín', 'mười']

/** Các số của năm câu đầu «Vườn hoa». */
export const ROUND_TARGETS: readonly number[] = [3, 7, 5, 9, 10]

/** Dữ liệu mẫu cục bộ (không gọi mạng): thang 0 đến 10, phải đặt đúng vạch. */
export function makeRound(target: number): NumberLineQuestion {
  return {
    id: `bee-garden-${target}`,
    questionText: `Đặt chú ong vào số ${target}`,
    audioText: `Đặt chú ong vào số ${NUMBER_WORDS[target]}.`,
    min: 0,
    max: 10,
    step: 1,
    target,
    tolerance: 0,
  }
}

/** Số câu mặc định của một lượt chơi; nơi gọi đổi bằng `roundCount` (dữ liệu, không cố định trong mã giao diện). */
export const DEFAULT_ROUND_COUNT = 5
export const MAX_ROUND_COUNT = 20

/**
 * Các số đích của một lượt `count` câu (làm tròn, kẹp trong [1, MAX_ROUND_COUNT]; không hợp lệ thì dùng mặc định). Năm câu đầu là `ROUND_TARGETS`;
 * câu thêm lấy số 0 đến 10 theo dãy giả ngẫu nhiên CỐ ĐỊNH (cùng `count` thì cùng dãy), không trùng số của câu liền trước.
 */
export function roundTargets(count: number = DEFAULT_ROUND_COUNT): number[] {
  const total = Number.isFinite(count) ? Math.min(MAX_ROUND_COUNT, Math.max(1, Math.round(count))) : DEFAULT_ROUND_COUNT
  const targets = ROUND_TARGETS.slice(0, total)
  let seed = 7
  while (targets.length < total) {
    seed = (Math.imul(seed, 1103515245) + 12345) >>> 0
    const candidate = (seed >>> 16) % 11
    if (candidate !== targets[targets.length - 1]) targets.push(candidate)
  }
  return targets
}

/**
 * Các câu của một lượt. Số đích lặp lại ở câu xa nhau thì id phải khác (thêm hậu tố theo thứ tự câu): renderer gắn lại theo id nên cùng id thì câu sau
 * giữ nguyên trạng thái câu trước. Lần xuất hiện đầu của mỗi số giữ id gốc (tên tệp giọng đọc mẫu).
 */
export function makeRounds(count: number = DEFAULT_ROUND_COUNT): NumberLineQuestion[] {
  const seen = new Set<string>()
  return roundTargets(count).map((target, index) => {
    const round = makeRound(target)
    const id = seen.has(round.id) ? `${round.id}-q${index + 1}` : round.id
    seen.add(round.id)
    return { ...round, id }
  })
}

export const BEE_GARDEN_ROUNDS: readonly NumberLineQuestion[] = makeRounds()

/** Địa chỉ tệp giọng đọc mẫu của một câu (có thể chưa có: người chạy tự sinh bằng VieNeu, xem README của thử nghiệm). */
export const demoAudioUrl = (question: Pick<NumberLineQuestion, 'id'>): string => `/experiments-demo-audio/${question.id}.wav`

/** Tệp nhạc nền lặp (tùy chọn, gitignore cùng thư mục giọng đọc mẫu): có thì Phòng chơi hiện nút bật/tắt nhạc, không có thì im lặng. Nguồn đề xuất: Kenney (CC0), xem ASSETS.md. */
export const BEE_GARDEN_MUSIC_URL = '/experiments-demo-audio/bee-garden-music.mp3'
