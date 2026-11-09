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
  /** Nền xanh đêm của phòng thi đấu và các màu trên nền đó. */
  night: string
  nightPanel: string
  nightTrack: string
  nightSoft: string
  nightProgress: string
  dotYellow: string
  dotPink: string
  dotBlue: string
  dotGreen: string
  dotOrange: string
  dotPurple: string
  /** Màn sau mỗi câu trên máy học sinh; trả lời sai là cam dịu, không đỏ. */
  feedbackCorrect: string
  feedbackTry: string
  rankFill: string
  rankInk: string
  streakFill: string
  streakInk: string
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
  night: '#13306B',
  nightPanel: '#1F3F84',
  nightTrack: '#2A4C93',
  nightSoft: '#C9D8F5',
  nightProgress: '#5EEAD4',
  dotYellow: '#FFD43B',
  dotPink: '#FF9EBB',
  dotBlue: '#7CC8FF',
  dotGreen: '#8BD98B',
  dotOrange: '#FFB347',
  dotPurple: '#B79CFF',
  feedbackCorrect: '#15803D',
  feedbackTry: '#B45309',
  rankFill: '#FFF4E5',
  rankInk: '#5C3300',
  streakFill: '#EAF7EE',
  streakInk: '#14532D',
}

/** Màu sắc hoạt hình ngọt ngào dùng cho hiệu ứng pháo hoa giấy Confetti & Star Burst */
export const CELEBRATION_CONFETTI_COLORS: readonly string[] = [
  DEFAULT_PALETTE.dotYellow,
  DEFAULT_PALETTE.dotPink,
  DEFAULT_PALETTE.dotBlue,
  DEFAULT_PALETTE.dotGreen,
  DEFAULT_PALETTE.dotOrange,
  DEFAULT_PALETTE.dotPurple,
  DEFAULT_PALETTE.accent,
]

/** Màu nội dung khi đáp án là tên màu (vẽ vật đúng màu đó). Là nội dung bài học, không phải phản hồi đúng/sai, nên có cả đỏ. */
export type ColorWord = 'red' | 'blue' | 'green' | 'yellow' | 'orange' | 'purple' | 'pink' | 'brown' | 'black' | 'white'
export const COLOR_WORD_FILLS: Readonly<Record<ColorWord, string>> = {
  red: '#EF4444',
  blue: '#3B82F6',
  green: '#22C55E',
  yellow: '#FACC15',
  orange: '#FB923C',
  purple: '#A855F7',
  pink: '#F472B6',
  brown: '#A16207',
  black: '#1F2937',
  white: '#FFFFFF',
}

/** Màu vật lựa chọn khi không phải câu về màu: xoay vòng các màu kẹo, không có đỏ (đỏ dễ gợi "sai"). */
export const OPTION_OBJECT_FILLS: readonly string[] = [
  DEFAULT_PALETTE.dotPink,
  DEFAULT_PALETTE.dotBlue,
  DEFAULT_PALETTE.dotYellow,
  DEFAULT_PALETTE.dotGreen,
  DEFAULT_PALETTE.dotOrange,
  DEFAULT_PALETTE.dotPurple,
]

/** `fooBar` -> `foo-bar`, cho tên biến CSS. */
const kebab = (name: string) => name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)

/** Các màu đơn của bảng màu thành biến CSS `--play-<tên>` (bỏ `linkColors`, chỉ Konva dùng). */
export function paletteCssVars(palette: Palette): Record<string, string> {
  const vars: Record<string, string> = {}

  for (const [name, value] of Object.entries(palette)) if (typeof value === 'string') vars[`--play-${kebab(name)}`] = value

  return vars
}
