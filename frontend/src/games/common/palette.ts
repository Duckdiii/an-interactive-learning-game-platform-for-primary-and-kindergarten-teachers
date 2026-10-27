/**
 * Bảng màu của phần chơi: NGUỒN DUY NHẤT cho cả DOM (biến CSS `--play-*`, xem `player/theme/usePlayerRootStyle.ts`) lẫn Konva (đọc qua
 * `useGamePalette`). Muốn đổi màu phía học sinh (SPEC mục 1: sẽ chuyển sang hệ màu giáo viên) chỉ sửa ở đây.
 * Quy ước UX: không dùng đỏ cho trả lời sai (`wrongFill`, `wrongLine` là vàng nhẹ); xanh lá dành cho «đúng».
 */
export interface Palette {
  page: string
  surface: string
  ink: string
  inkSoft: string
  outline: string
  primary: string
  primaryStrong: string
  primaryInk: string
  accent: string
  disabledFill: string
  disabledStroke: string
  disabledInk: string
  selectedFill: string
  correctFill: string
  wrongFill: string
  audioFill: string
  audioStroke: string
  /** Màu đường nối theo thứ tự cặp; không có đỏ và xanh lá. */
  linkColors: readonly string[]
  correctLine: string
  wrongLine: string
}

// Màu tạm theo wireframe phía học sinh (xanh dương và cam); các màu của Konva giữ nguyên giá trị đang dùng.
export const DEFAULT_PALETTE: Palette = {
  page: '#F4F7FB',
  surface: '#FFFFFF',
  ink: '#1B2333',
  inkSoft: '#4A5568',
  outline: '#334155',
  primary: '#1F5BD8',
  primaryStrong: '#1E40AF',
  primaryInk: '#FFFFFF',
  accent: '#FF9F1C',
  disabledFill: '#E2E8F0',
  disabledStroke: '#CBD5E1',
  disabledInk: '#94A3B8',
  selectedFill: '#DBEAFE',
  correctFill: '#A5D6A7',
  wrongFill: '#FFE082',
  audioFill: '#E0F2FE',
  audioStroke: '#0284C7',
  linkColors: ['#3B82F6', '#8B5CF6', '#EC4899', '#06B6D4', '#92400E', '#64748B'],
  correctLine: '#43A047',
  wrongLine: '#F59E0B',
}

/** `fooBar` -> `foo-bar`, cho tên biến CSS. */
const kebab = (name: string) => name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)

/** Các màu đơn của bảng màu thành biến CSS `--play-<tên>` (bỏ `linkColors`, chỉ Konva dùng). */
export function paletteCssVars(palette: Palette): Record<string, string> {
  const vars: Record<string, string> = {}

  for (const [name, value] of Object.entries(palette)) if (typeof value === 'string') vars[`--play-${kebab(name)}`] = value

  return vars
}
