/** Màu fallback khi chuỗi màu hỏng: tím sáng, cố ý chói để lỗi theme lộ ra ngay khi nhìn thấy. */
export const INVALID_COLOR = 0xff00ff

/** `#RGB` hoặc `#RRGGBB` (không phân biệt hoa thường) → số 0xRRGGBB cho Pixi; hỏng thì `INVALID_COLOR`. */
export function hexToNumber(color: string): number {
  const match = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(color.trim())
  if (!match) return INVALID_COLOR
  const hex = match[1].length === 3 ? [...match[1]].map((c) => c + c).join('') : match[1]
  return Number.parseInt(hex, 16)
}

/**
 * Các cung của một vòng tròn nét đứt: Pixi Graphics không có nét đứt sẵn nên vẽ từng nét bằng \`arc\`. Chia đều sao cho
 * số nét nguyên và vừa khít chu vi; mỗi nét dài ≈ \`dash\`, khoảng hở ≈ \`gap\` (đơn vị px dọc theo chu vi). Góc tính bằng radian.
 */
export function dashedArcs(radius: number, dash = 10, gap = 8): Array<[start: number, end: number]> {
  if (!(radius > 0) || !(dash > 0) || !(gap >= 0)) return []
  const circumference = 2 * Math.PI * radius
  const count = Math.max(1, Math.floor(circumference / (dash + gap)))
  const step = (2 * Math.PI) / count
  const dashAngle = Math.min(step, (dash / (dash + gap)) * step)
  return Array.from({ length: count }, (_, i) => [i * step, i * step + dashAngle] as [number, number])
}
