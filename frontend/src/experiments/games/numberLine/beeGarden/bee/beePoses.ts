/**
 * Chú ong dạng cutout (rig): dữ liệu tư thế và các hàm thuần theo thời gian, KHÔNG biết gì về Konva hay React nên test được và game khác dùng lại được.
 * Các bộ phận (thân, cánh, râu, mắt, miệng, má) là node Konva riêng có tên (xem `BeeRig.tsx`); `beeMotion.ts` đặt cánh, râu, chớp mắt, bóng mỗi khung hình theo
 * `BeeState`. Không vẽ lại ong: chỉ làm cho các hình sẵn có sống động.
 *
 * Trạng thái:
 * - `idle`: lơ lửng chờ, mắt mở, mỉm cười, chớp mắt định kỳ, râu lắc nhẹ.
 * - `fly`: đang bay, cánh vỗ nhanh, mắt nhìn về phía trước, râu rung nhanh hơn.
 * - `happy`: trả lời đúng, mắt cười, miệng cười to, râu nảy.
 * - `oops`: trả lời chưa đúng, ngơ ngác (mắt tròn nhìn xuống, miệng «o»), râu rủ.
 * - `blink`: một nhịp nhắm mắt sau khi ngơ ngác.
 * - `think`: chờ lâu, mắt nhìn lên, miệng thẳng nhỏ, râu nghiêng.
 */
export const BEE_STATES = ['idle', 'fly', 'happy', 'oops', 'blink', 'think'] as const
export type BeeState = (typeof BEE_STATES)[number]

export type EyeShape = 'open' | 'closed' | 'happy'
export type MouthShape = 'smile' | 'grin' | 'o' | 'flat'

export interface BeePose {
  eyes: EyeShape
  mouth: MouthShape
  /** Lệch tròng đen so với giữa mắt (đơn vị thiết kế); chỉ có nghĩa khi `eyes = 'open'`. */
  pupil: { left: { x: number; y: number }; right: { x: number; y: number } }
  /** Chớp mắt định kỳ (chỉ khi mắt đang mở). */
  blinks: boolean
  /** Biên độ (độ), tốc độ (rad/giây) và độ nghiêng cố định (độ, dương = ngả ra ngoài) của râu. */
  antenna: { swing: number; speed: number; tilt: number }
  /** Tốc độ vỗ cánh (rad/giây) và tỉ lệ dọc nhỏ nhất của cánh lúc khép. */
  wing: { speed: number; min: number }
}

export const BEE_POSES: Readonly<Record<BeeState, BeePose>> = {
  idle: { eyes: 'open', mouth: 'smile', pupil: { left: { x: -14, y: -4 }, right: { x: 18, y: -4 } }, blinks: true, antenna: { swing: 5, speed: 2.2, tilt: 0 }, wing: { speed: 18, min: 0.72 } },
  fly: { eyes: 'open', mouth: 'smile', pupil: { left: { x: -11, y: -5 }, right: { x: 21, y: -5 } }, blinks: true, antenna: { swing: 9, speed: 7, tilt: 8 }, wing: { speed: 32, min: 0.6 } },
  happy: { eyes: 'happy', mouth: 'grin', pupil: { left: { x: -14, y: -4 }, right: { x: 18, y: -4 } }, blinks: false, antenna: { swing: 12, speed: 9, tilt: 0 }, wing: { speed: 26, min: 0.65 } },
  oops: { eyes: 'open', mouth: 'o', pupil: { left: { x: -16, y: -3 }, right: { x: 16, y: -3 } }, blinks: false, antenna: { swing: 2, speed: 3, tilt: -10 }, wing: { speed: 12, min: 0.8 } },
  blink: { eyes: 'closed', mouth: 'smile', pupil: { left: { x: -14, y: -4 }, right: { x: 18, y: -4 } }, blinks: false, antenna: { swing: 3, speed: 3, tilt: -6 }, wing: { speed: 14, min: 0.78 } },
  think: { eyes: 'open', mouth: 'flat', pupil: { left: { x: -10, y: -10 }, right: { x: 22, y: -10 } }, blinks: true, antenna: { swing: 6, speed: 1.6, tilt: 10 }, wing: { speed: 14, min: 0.78 } },
}

/** Chu kỳ chớp mắt (giây) và thời gian nhắm. Mỗi lần chớp cách nhau không đều (đỡ máy móc) nhưng cố định theo thời gian. */
export const BLINK_PERIOD = 3.6
export const BLINK_SECONDS = 0.14

/** Độ mở nhỏ nhất của mắt lúc nhắm (không nhắm hẳn 0 để tránh scale 0 làm hỏng ma trận). */
export const BLINK_MIN = 0.08
/**
 * Độ mở của mắt lúc `t` giây: 1 là mở, xuống `BLINK_MIN` giữa lúc nhắm rồi mở lại. Mỗi chu kỳ `BLINK_PERIOD` chớp đúng một lần, ở thời điểm lệch đều theo số thứ tự chu kỳ
 * (trong khoảng 1,2 đến 3,0 giây của chu kỳ) nên không đều tăm tắp nhưng cố định, test được.
 */
export function blinkOpenness(t: number): number {
  if (!Number.isFinite(t) || t < 0) return 1
  const cycle = Math.floor(t / BLINK_PERIOD)
  const jitter = ((cycle * 37) % 11) / 11 // 0 đến dưới 1, cố định theo chu kỳ
  const start = cycle * BLINK_PERIOD + 1.2 + jitter * 1.8
  const local = t - start
  if (local < 0 || local > BLINK_SECONDS) return 1
  const half = BLINK_SECONDS / 2
  const depth = local < half ? local / half : (BLINK_SECONDS - local) / half // 0 → 1 → 0
  return 1 - (1 - BLINK_MIN) * depth
}

/** Góc (độ) của râu bên `side` (-1 trái, +1 phải) lúc `t`: lắc quanh độ nghiêng cố định, hai râu lệch pha nhau. Dương = ngả ra ngoài. */
export function antennaAngle(t: number, pose: BeePose, side: -1 | 1): number {
  const { swing, speed, tilt } = pose.antenna
  return side * (tilt + Math.sin(t * speed + (side === 1 ? 0.9 : 0)) * swing)
}

/** Tỉ lệ dọc của cánh lúc `t` (vỗ cánh): từ `wing.min` đến 1. Với tư thế `idle` đúng bằng `wingScale` cũ (0,72 + 0,28|sin 18t|). */
export function wingFlapScale(t: number, pose: BeePose): number {
  const { speed, min } = pose.wing
  return min + (1 - min) * Math.abs(Math.sin(t * speed))
}

export interface BeeShadowPose {
  scale: number
  opacity: number
}

export const SHADOW_BASE_OPACITY = 0.22
export const SHADOW_MIN_OPACITY = 0.06
export const SHADOW_MIN_SCALE = 0.65
/** Độ nâng (so với độ cao nghỉ, đơn vị thiết kế) mà tại đó bóng đạt nhỏ và mờ nhất. */
export const SHADOW_FULL_LIFT = 60

/** Bóng đổ dưới ong: càng bay cao (nâng so với độ cao nghỉ) bóng càng nhỏ và mờ. Hạ thấp hơn mức nghỉ (nhún xuống) thì coi như nghỉ. */
export function beeShadow(lift: number): BeeShadowPose {
  const t = !Number.isFinite(lift) ? 0 : Math.min(1, Math.max(0, lift / SHADOW_FULL_LIFT))
  return { scale: 1 - (1 - SHADOW_MIN_SCALE) * t, opacity: SHADOW_BASE_OPACITY - (SHADOW_BASE_OPACITY - SHADOW_MIN_OPACITY) * t }
}
