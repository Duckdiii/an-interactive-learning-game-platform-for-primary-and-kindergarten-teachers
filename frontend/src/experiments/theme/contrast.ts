export interface Rgb {
  r: number
  g: number
  b: number
}

/** Đọc `#RGB` hoặc `#RRGGBB` (không phân biệt hoa thường); trả `null` nếu không hợp lệ. */
export function parseHex(color: string): Rgb | null {
  const match = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(color)
  if (!match) return null
  const hex =
    match[1].length === 3
      ? match[1]
          .split('')
          .map((ch) => ch + ch)
          .join('')
      : match[1]
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
  }
}

/** Độ sáng tương đối theo WCAG 2.x (0 đen, 1 trắng). */
export function relativeLuminance({ r, g, b }: Rgb): number {
  const channel = (value: number) => {
    const s = value / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

/** Tỉ lệ tương phản WCAG (1 đến 21); `null` nếu một trong hai màu không hợp lệ. */
export function contrastRatio(foreground: string, background: string): number | null {
  const fg = parseHex(foreground)
  const bg = parseHex(background)
  if (!fg || !bg) return null
  const a = relativeLuminance(fg)
  const b = relativeLuminance(bg)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

/** Sắc độ (0–360), độ bão hòa và độ sáng (0–1) của một màu. */
export function toHsl({ r, g, b }: Rgb): { h: number; s: number; l: number } {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  const delta = max - min
  if (delta === 0) return { h: 0, s: 0, l }
  const s = delta / (1 - Math.abs(2 * l - 1))
  let h: number
  if (max === rn) h = ((gn - bn) / delta) % 6
  else if (max === gn) h = (bn - rn) / delta + 2
  else h = (rn - gn) / delta + 4
  return { h: (h * 60 + 360) % 360, s, l }
}

/** Ngưỡng của `isHarshRed`: đề xuất của thử nghiệm, CHƯA được chuyên gia xác nhận. */
export const HARSH_RED = { maxHueBelow: 20, minHueAbove: 345, minSaturation: 0.6, minLightness: 0.2, maxLightness: 0.7 }

/**
 * Đỏ gắt: sắc độ đỏ đến đỏ cam (≤ 20° hoặc ≥ 345°), bão hòa cao (≥ 0,6), độ sáng vừa (0,2 đến 0,7).
 * Đỏ nhạt/hồng (sáng hơn 0,7) và đỏ rất tối (dưới 0,2) được chấp nhận; san hô sáng như #FF6B6B lọt qua,
 * trong khi đỏ dịu kiểu #E57373 (l ≈ 0,64) bị chặn. Ranh giới độ sáng dễ vỡ, cần chốt khi có chuyên gia.
 */
export function isHarshRed(color: string): boolean {
  const rgb = parseHex(color)
  if (!rgb) return false
  const { h, s, l } = toHsl(rgb)
  const redHue = h <= HARSH_RED.maxHueBelow || h >= HARSH_RED.minHueAbove
  return redHue && s >= HARSH_RED.minSaturation && l >= HARSH_RED.minLightness && l <= HARSH_RED.maxLightness
}
