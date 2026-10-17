import { contrastRatio, isHarshRed, parseHex } from './contrast'
import { AGE_BANDS, KNOWN_MECHANICS, type ThemeColors, type ThemeManifest } from './themeTypes'

export type ThemeIssueCode =
  | 'ID_EMPTY'
  | 'NAME_EMPTY'
  | 'AGE_BANDS_EMPTY'
  | 'AGE_BAND_UNKNOWN'
  | 'AGE_BAND_DUPLICATE'
  | 'COLOR_INVALID'
  | 'CONTRAST_LOW'
  | 'FEEDBACK_HARSH_RED'
  | 'FONT_FAMILY_EMPTY'
  | 'FONT_SIZE_INVALID'
  | 'MECHANICS_EMPTY'
  | 'MECHANIC_UNKNOWN'
  | 'MECHANIC_DUPLICATE'
  | 'SAFETY_FLAG_OFF'
  | 'ASSET_ID_EMPTY'
  | 'ASSET_ID_DUPLICATE'
  | 'ASSET_EXTERNAL'
  | 'ASSET_UNSAFE'
  | 'ASSET_ALT_EMPTY'

export interface ThemeIssue {
  code: ThemeIssueCode
  /** Đường dẫn trường lỗi, ví dụ `colors.text` hoặc `assets[1].src`. */
  path: string
  message: string
}

/** Tương phản tối thiểu cho chữ thường (WCAG AA) và chữ lớn. */
export const MIN_CONTRAST_TEXT = 4.5
export const MIN_CONTRAST_LARGE_TEXT = 3
/** Từ cỡ này (px thiết kế) trở lên coi là chữ lớn (WCAG: 18pt = 24px). Chữ đậm 14pt chưa tính. */
export const LARGE_TEXT_SIZE = 24

export const MIN_FONT_SIZE = 12
export const MAX_FONT_SIZE = 72

const SVG_DATA_URI = /^data:image\/svg\+xml[;,]/

/** SVG nhúng không được chứa mã chạy được (script, trình xử lý sự kiện, `javascript:`); kiểm cả bản đã giải mã %XX. */
function hasActiveSvgContent(src: string): boolean {
  let decoded = src
  try {
    decoded = decodeURIComponent(src)
  } catch {
    // Chuỗi %XX hỏng: kiểm trên bản gốc.
  }
  return /<script|\son[a-z]+\s*=|javascript:/i.test(decoded)
}

const COLOR_KEYS = [
  'background',
  'surface',
  'surfaceSelected',
  'surfaceCorrect',
  'surfaceTryAgain',
  'text',
  'border',
  'accent',
  'onAccent',
] as const satisfies readonly (keyof ThemeColors)[]

/** Cặp (chữ, nền) phải đạt tương phản. */
const CONTRAST_PAIRS = [
  ['text', 'background'],
  ['text', 'surface'],
  ['text', 'surfaceSelected'],
  ['text', 'surfaceCorrect'],
  ['text', 'surfaceTryAgain'],
  ['onAccent', 'accent'],
] as const satisfies readonly (readonly [keyof ThemeColors, keyof ThemeColors])[]

/**
 * Kiểm một theme; trả danh sách lỗi (rỗng nếu hợp lệ). Hàm thuần, không đọc môi trường.
 *
 * Giả định: `theme` là hằng số có kiểu TypeScript (do chúng ta viết), KHÔNG phải dữ liệu không tin cậy. Thiếu
 * trường cha (`colors`, `font`, `assets`...) sẽ ném TypeError chứ không trả lỗi; nếu sau này nạp theme từ JSON hoặc
 * đầu ra AI thì phải thêm bước kiểm cấu trúc trước. Chữ lớn (≥ 24px) tính theo `font.baseSize` cho mọi chữ của theme;
 * chữ phụ nhỏ hơn cỡ cơ sở vẫn được hưởng ngưỡng 3:1 (hạn chế đã biết). Viền không kiểm tương phản phi-chữ.
 */
export function validateTheme(theme: ThemeManifest): ThemeIssue[] {
  const issues: ThemeIssue[] = []
  const add = (code: ThemeIssueCode, path: string, message: string) => issues.push({ code, path, message })

  if (!theme.id.trim()) add('ID_EMPTY', 'id', 'Theme thiếu mã.')
  if (!theme.name.trim()) add('NAME_EMPTY', 'name', 'Theme thiếu tên.')

  // Nhóm tuổi
  if (theme.ageBands.length === 0) add('AGE_BANDS_EMPTY', 'ageBands', 'Theme phải khai báo ít nhất một nhóm tuổi.')
  const seenBands = new Set<string>()
  theme.ageBands.forEach((band, index) => {
    const path = `ageBands[${index}]`
    if (!(AGE_BANDS as readonly string[]).includes(band)) {
      add('AGE_BAND_UNKNOWN', path, `Nhóm tuổi "${band}" không hợp lệ.`)
    } else if (seenBands.has(band)) {
      add('AGE_BAND_DUPLICATE', path, `Nhóm tuổi "${band}" bị khai báo hai lần.`)
    }
    seenBands.add(band)
  })

  // Màu: định dạng
  const validColors = new Set<keyof ThemeColors>()
  for (const key of COLOR_KEYS) {
    if (parseHex(theme.colors[key])) validColors.add(key)
    else add('COLOR_INVALID', `colors.${key}`, `Màu "${theme.colors[key]}" không đúng dạng #RGB hoặc #RRGGBB.`)
  }

  // Font
  if (!theme.font.family.trim()) add('FONT_FAMILY_EMPTY', 'font.family', 'Theme thiếu họ phông chữ.')
  const sizeOk =
    Number.isFinite(theme.font.baseSize) && theme.font.baseSize >= MIN_FONT_SIZE && theme.font.baseSize <= MAX_FONT_SIZE
  if (!sizeOk) {
    add('FONT_SIZE_INVALID', 'font.baseSize', `Cỡ chữ cơ sở phải từ ${MIN_FONT_SIZE} đến ${MAX_FONT_SIZE}.`)
  }

  // Tương phản chữ/nền: chữ lớn được ngưỡng thấp hơn. Cỡ chữ sai thì dùng ngưỡng chữ thường (chặt hơn).
  const minContrast = sizeOk && theme.font.baseSize >= LARGE_TEXT_SIZE ? MIN_CONTRAST_LARGE_TEXT : MIN_CONTRAST_TEXT
  for (const [fgKey, bgKey] of CONTRAST_PAIRS) {
    if (!validColors.has(fgKey) || !validColors.has(bgKey)) continue
    const ratio = contrastRatio(theme.colors[fgKey], theme.colors[bgKey])
    if (ratio !== null && ratio < minContrast) {
      add(
        'CONTRAST_LOW',
        `colors.${fgKey}`,
        `Chữ "${fgKey}" trên "${bgKey}" chỉ đạt ${ratio.toFixed(2)}:1, cần ít nhất ${minContrast}:1.`,
      )
    }
  }

  // Phản hồi: không đỏ gắt (CLAUDE.md, quy ước UX cho trẻ mầm non/lớp 1)
  for (const key of ['surfaceCorrect', 'surfaceTryAgain'] as const) {
    if (validColors.has(key) && isHarshRed(theme.colors[key])) {
      add('FEEDBACK_HARSH_RED', `colors.${key}`, `Màu phản hồi "${key}" là đỏ gắt; dùng màu dịu hơn.`)
    }
  }

  // Cơ chế
  if (theme.compatibleMechanics.length === 0) {
    add('MECHANICS_EMPTY', 'compatibleMechanics', 'Theme phải khai báo ít nhất một cơ chế chơi tương thích.')
  }
  const seenMechanics = new Set<string>()
  theme.compatibleMechanics.forEach((mechanic, index) => {
    const path = `compatibleMechanics[${index}]`
    if (!(KNOWN_MECHANICS as readonly string[]).includes(mechanic)) {
      add('MECHANIC_UNKNOWN', path, `Cơ chế "${mechanic}" không nằm trong danh sách biết.`)
    } else if (seenMechanics.has(mechanic)) {
      add('MECHANIC_DUPLICATE', path, `Cơ chế "${mechanic}" bị khai báo hai lần.`)
    }
    seenMechanics.add(mechanic)
  })

  // An toàn nội dung
  if (theme.contentSafety.noViolence !== true) {
    add('SAFETY_FLAG_OFF', 'contentSafety.noViolence', 'Theme phải cam kết không có nội dung bạo lực.')
  }

  // Tài nguyên: chỉ SVG nhúng sẵn, không tải từ bên ngoài
  const seenAssets = new Set<string>()
  theme.assets.forEach((asset, index) => {
    const base = `assets[${index}]`
    if (!asset.id.trim()) add('ASSET_ID_EMPTY', `${base}.id`, 'Tài nguyên thiếu mã.')
    else if (seenAssets.has(asset.id)) add('ASSET_ID_DUPLICATE', `${base}.id`, `Mã tài nguyên "${asset.id}" bị trùng.`)
    seenAssets.add(asset.id)
    if (!SVG_DATA_URI.test(asset.src)) {
      add('ASSET_EXTERNAL', `${base}.src`, 'Tài nguyên phải là SVG nhúng sẵn (data:image/svg+xml), không tải từ ngoài.')
    } else if (hasActiveSvgContent(asset.src)) {
      add('ASSET_UNSAFE', `${base}.src`, 'SVG chứa mã chạy được (script, sự kiện on…, javascript:).')
    }
    if (!asset.alt.trim()) add('ASSET_ALT_EMPTY', `${base}.alt`, 'Tài nguyên thiếu mô tả (alt).')
  })

  return issues
}
