import confetti, { type Options } from 'canvas-confetti'
import { CONFETTI_COLORS } from './beeGardenGeometry'

export type ConfettiKind = 'correct' | 'complete'

/** Tâm bắn pháo giấy theo tỉ lệ của cửa sổ trình duyệt (0 đến 1). */
export interface ConfettiOrigin {
  x: number
  y: number
}

/** Hàm bắn (mặc định là `canvas-confetti`); thay được trong test. */
export type FireConfetti = (options: Options) => unknown

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value))

/** Mẫu pháo giấy: nhỏ gọn khi trả lời đúng một câu, rộng hơn (hai bên) khi hoàn thành. Cùng bảng màu với sao rải trong cảnh. */
export function confettiBursts(kind: ConfettiKind, origin?: ConfettiOrigin): Options[] {
  const common: Options = { colors: [...CONFETTI_COLORS], disableForReducedMotion: true, zIndex: 1000 }
  if (kind === 'correct') {
    const at = origin ? { x: clamp01(origin.x), y: clamp01(origin.y) } : { x: 0.5, y: 0.6 }
    // Hai đợt từ chỗ hoa được chọn: đợt chính đặc và đợt rộng hơn tỏa ra hai bên (dày hơn bản đầu, mỗi đợt vẫn ≤ 50 hạt).
    return [
      { ...common, particleCount: 40, spread: 65, startVelocity: 26, scalar: 0.8, ticks: 110, origin: at },
      { ...common, particleCount: 24, spread: 110, startVelocity: 18, scalar: 0.7, ticks: 90, origin: at },
    ]
  }
  return [
    { ...common, particleCount: 70, angle: 60, spread: 70, startVelocity: 45, origin: { x: 0.05, y: 0.75 } },
    { ...common, particleCount: 70, angle: 120, spread: 70, startVelocity: 45, origin: { x: 0.95, y: 0.75 } },
    { ...common, particleCount: 60, spread: 100, startVelocity: 35, origin: { x: 0.5, y: 0.6 } },
  ]
}

interface LaunchOptions {
  /** Người dùng đã chọn giảm chuyển động: không bắn gì. */
  reducedMotion: boolean
  origin?: ConfettiOrigin
  fire?: FireConfetti
}

/**
 * Bắn pháo giấy bằng `canvas-confetti` (một canvas phủ trang, không nhận chạm). Trả `true` nếu đã bắn.
 * Giảm chuyển động thì không bắn (đã kiểm ở đây, và thư viện còn tự kiểm lần nữa nhờ `disableForReducedMotion`).
 * Lỗi của thư viện (trình duyệt không có canvas...) bị nuốt: pháo giấy chỉ là trang trí, không được làm hỏng màn chơi.
 */
export function launchConfetti(kind: ConfettiKind, { reducedMotion, origin, fire = confetti }: LaunchOptions): boolean {
  if (reducedMotion) return false
  try {
    for (const burst of confettiBursts(kind, origin)) fire(burst)
    return true
  } catch {
    return false
  }
}

/** Tâm của một node Konva (hoặc phần tử DOM) theo tỉ lệ cửa sổ; `undefined` nếu không tính được. */
export function originOfRect(rect: { left: number; top: number; width: number; height: number } | undefined, offset?: { x: number; y: number }): ConfettiOrigin | undefined {
  if (!rect || typeof window === 'undefined' || window.innerWidth <= 0 || window.innerHeight <= 0) return undefined
  const x = rect.left + (offset ? offset.x : rect.width / 2)
  const y = rect.top + (offset ? offset.y : rect.height / 2)
  if (!Number.isFinite(x) || !Number.isFinite(y)) return undefined
  return { x: x / window.innerWidth, y: y / window.innerHeight }
}
