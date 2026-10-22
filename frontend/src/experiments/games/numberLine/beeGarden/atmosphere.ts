/**
 * Không khí của vườn: phấn hoa lơ lửng, sao nhấp nháy, đom đóm, tia nắng quét. Toàn hàm THUẦN theo (chỉ số hạt, thời gian): vị trí và độ đục của mỗi hạt tính thẳng từ
 * đó (không lưu trạng thái, không cấp phát mỗi khung hình), nên «bể đối tượng» chỉ là các node Konva có sẵn, đặt lại thuộc tính mỗi khung hình (xem `gardenMotion`).
 * Số hạt bị chặn bởi `ATMOSPHERE_LIMITS` của theme. Giảm chuyển động thì bộ chuyển động không chạy: hạt đứng yên ở dáng tại t = 0.
 */

/** Số giả ngẫu nhiên cố định trong [0, 1) từ chỉ số và «muối» (cùng chỉ số, cùng muối thì cùng số): bố cục hạt ổn định giữa các lần vẽ. */
export function unit(index: number, salt: number): number {
  const raw = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453
  return raw - Math.floor(raw)
}

/** Dải toạ độ (đơn vị cảnh) mà hạt được phép nằm trong: [trái, trên, rộng, cao]. */
export type Band = readonly [x: number, y: number, width: number, height: number]

export interface ParticlePose {
  x: number
  y: number
  opacity: number
  scale: number
}

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value))
const wrap = (value: number, size: number): number => ((value % size) + size) % size

/**
 * Phấn hoa: bay chậm lên trên và lắc ngang nhẹ, ra khỏi mép trên thì quay lại từ mép dưới (liên tục, không nhảy); mờ dần ở hai mép trên/dưới của dải để
 * lúc quay vòng không «bật» ra. Độ đục tối đa 0,7 (rất nhẹ), cỡ 0,7 đến 1,3.
 */
export function pollenPose(index: number, t: number, [bx, by, width, height]: Band): ParticlePose {
  const time = Number.isFinite(t) ? t : 0
  const rise = 5 + unit(index, 3) * 7
  const sway = 6 + unit(index, 4) * 14
  const phase = unit(index, 5) * Math.PI * 2
  const along = wrap(unit(index, 2) * height - rise * time, height) // 0 ở mép trên, `height` ở mép dưới
  const x = bx + unit(index, 1) * width + Math.sin(time * (0.4 + unit(index, 6) * 0.5) + phase) * sway
  const edge = Math.min(along, height - along) / 40 // mờ dần trong 40 đơn vị gần mép
  const glimmer = 0.75 + 0.25 * Math.sin(time * 1.3 + phase)
  return { x, y: by + along, opacity: clamp01(edge) * 0.7 * glimmer, scale: 0.7 + unit(index, 7) * 0.6 }
}

/** Sao: đứng yên ở chỗ cố định trong dải trời, nhấp nháy dịu (độ đục 0,35 đến 1) lệch pha nhau; cỡ 0,6 đến 1,2. */
export function starPose(index: number, t: number, [bx, by, width, height]: Band): ParticlePose {
  const time = Number.isFinite(t) ? t : 0
  const phase = unit(index, 5) * Math.PI * 2
  const speed = 0.8 + unit(index, 6) * 1.6
  return {
    x: bx + unit(index, 1) * width,
    y: by + unit(index, 2) * height,
    opacity: 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(time * speed + phase)),
    scale: 0.6 + unit(index, 7) * 0.6,
  }
}

/**
 * Đom đóm: lượn chậm quanh một chỗ (đường cong khép kín, không bay ra ngoài dải), sáng lên rồi tắt dần theo nhịp riêng (mỗi con một nhịp, chu kỳ 2 đến 4 giây);
 * lúc tắt vẫn còn le lói 0,1 để không biến mất đột ngột.
 */
export function fireflyPose(index: number, t: number, [bx, by, width, height]: Band): ParticlePose {
  const time = Number.isFinite(t) ? t : 0
  const phase = unit(index, 5) * Math.PI * 2
  const speed = 0.25 + unit(index, 6) * 0.3
  const radiusX = 18 + unit(index, 8) * 26
  const radiusY = 8 + unit(index, 9) * 14
  const centerX = bx + radiusX + unit(index, 1) * Math.max(0, width - 2 * radiusX)
  const centerY = by + radiusY + unit(index, 2) * Math.max(0, height - 2 * radiusY)
  const blinkSpeed = (Math.PI * 2) / (2 + unit(index, 10) * 2)
  const glow = 0.5 + 0.5 * Math.sin(time * blinkSpeed + phase * 3)
  return {
    x: centerX + Math.sin(time * speed + phase) * radiusX,
    y: centerY + Math.sin(time * speed * 1.7 + phase * 2) * radiusY,
    opacity: 0.1 + 0.9 * glow * glow,
    scale: 0.8 + unit(index, 7) * 0.5,
  }
}

/** Góc (độ) của chùm tia nắng thứ `index` lúc `t`: quét chậm quanh góc gốc, biên độ ±4°, mỗi chùm lệch pha (không quét đồng bộ). */
export function beamSweep(index: number, t: number): number {
  const time = Number.isFinite(t) ? t : 0
  return Math.sin(time * 0.35 + index * 1.7) * 4
}

/** Trộn một màu `#RRGGBB` với màu phủ `tint` ở độ đục `opacity` (chồng thường): màu nhìn thấy sau lớp phủ, để kiểm tương phản bằng test. Không đọc được màu thì trả nguyên. */
export function overlayColor(base: string, tint: string, opacity: number): string {
  const parse = (hex: string): [number, number, number] | null => {
    const match = /^#([0-9a-f]{6})$/i.exec(hex.trim())
    if (!match) return null
    const value = parseInt(match[1], 16)
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
  }
  const a = parse(base)
  const b = parse(tint)
  if (!a || !b) return base
  const k = clamp01(opacity)
  if (k === 0) return base // không phủ: giữ nguyên chuỗi gốc (không đổi hoa/thường)
  const mix = a.map((channel, i) => Math.round(channel * (1 - k) + b[i] * k))
  return `#${mix.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
}
