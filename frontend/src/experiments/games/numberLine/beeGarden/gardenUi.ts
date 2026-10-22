import { parseHex } from '../../../theme/contrast'
import { DEFAULT_STROKES, type ThemeHud, type ThemeManifest, type ThemeStrokes } from '../../../theme/themeTypes'

/** Một bộ màu cho kiểu nút «mặt phẳng + viền + bóng đổ phía dưới» (phong cách Kenney UI, vẽ vector). */
export interface ButtonTone {
  face: string
  border: string
  /** Bóng đổ phía dưới nút: viền tối hơn một bậc. */
  shadow: string
  /** Chữ hoặc biểu tượng trên mặt nút. */
  ink: string
  /** Khi bị khóa. */
  faceOff: string
  borderOff: string
  inkOff: string
}

export interface GardenUi {
  primary: ButtonTone
  secondary: ButtonTone
  audio: ButtonTone
  panel: { fill: string; border: string; ink: string }
  /** Thanh tiến độ: nền rãnh, viền, phần đã đầy. */
  progress: { track: string; border: string; fill: string }
  /** Bảng đề bài và huy hiệu số trong cảnh. */
  hud: ThemeHud
  /** Quy tắc nét viền (giao diện dày có bóng nổi, cảnh mảnh). */
  strokes: ThemeStrokes
}

/** Làm tối màu `#RRGGBB` đi `amount` (0 đến 1); không phải màu hợp lệ thì trả nguyên. */
export function shade(color: string, amount: number): string {
  const rgb = parseHex(color)
  if (!rgb) return color
  const k = 1 - Math.min(1, Math.max(0, amount))
  const hex = (value: number) => Math.round(value * k).toString(16).padStart(2, '0')
  return `#${hex(rgb.r)}${hex(rgb.g)}${hex(rgb.b)}`
}

/** Bảng màu giao diện của trò, suy ra hoàn toàn từ token của theme: đổi theme là đổi màu nút, khung, thanh tiến độ. */
export function gardenUi(theme: ThemeManifest): GardenUi {
  const c = theme.colors
  const tone = (face: string, border: string, ink: string): ButtonTone => ({
    face,
    border,
    shadow: shade(border, 0.25),
    ink,
    faceOff: c.disabledSurface,
    borderOff: c.disabledBorder,
    inkOff: c.onDisabled,
  })
  return {
    primary: tone(c.accent, c.accentBorder, c.onAccent),
    secondary: tone(c.surfaceSelected, c.border, c.text),
    audio: tone(c.audioSurface, c.audioBorder, c.text),
    panel: { fill: c.surface, border: c.border, ink: c.text },
    progress: { track: c.surfaceSelected, border: c.border, fill: c.accent },
    // Theme không khai báo thì suy từ token chung: bảng = khung đề, huy hiệu = nút chính.
    hud: theme.hud ?? { signFace: c.surface, signBorder: c.border, signInk: c.text, badgeFace: c.accent, badgeBorder: c.accentBorder, badgeInk: c.onAccent },
    strokes: theme.strokes ?? DEFAULT_STROKES,
  }
}
