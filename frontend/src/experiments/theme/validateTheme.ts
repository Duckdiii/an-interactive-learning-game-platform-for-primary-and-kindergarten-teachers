import { contrastRatio, isHarshRed, parseHex } from './contrast'
import {
  AGE_BANDS,
  ATMOSPHERE_LIMITS,
  CELESTIAL_BODIES,
  TIMES_OF_DAY,
  DECORATION_LAYERS,
  DECORATION_LIMITS,
  DECORATION_MOTIONS,
  DECORATION_REACTIONS,
  KNOWN_MECHANICS,
  MIN_LINK_COLORS,
  type ThemeColors,
  type ThemeDecoration,
  type ThemeManifest,
} from './themeTypes'

export type ThemeIssueCode =
  | 'ID_EMPTY'
  | 'NAME_EMPTY'
  | 'AGE_BANDS_EMPTY'
  | 'AGE_BAND_UNKNOWN'
  | 'AGE_BAND_DUPLICATE'
  | 'COLOR_INVALID'
  | 'LINK_COLORS_TOO_FEW'
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
  | 'BACKDROP_ASSET_MISSING'
  | 'BACKDROP_WITHOUT_BACKGROUND'
  | 'DECORATION_INVALID'
  | 'HUD_INVALID'
  | 'AMBIENCE_INVALID'
  | 'STROKES_INVALID'

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

/** Các vai trò màu đơn (mọi trường của `ThemeColors` trừ bảng `linkColors`). */
type ScalarColorKey = Exclude<keyof ThemeColors, 'linkColors'>

const COLOR_KEYS = [
  'background',
  'onBackground',
  'surface',
  'surfaceSelected',
  'surfaceCorrect',
  'surfaceTryAgain',
  'text',
  'border',
  'accent',
  'accentBorder',
  'onAccent',
  'disabledSurface',
  'disabledBorder',
  'onDisabled',
  'audioSurface',
  'audioBorder',
  'lineCorrect',
  'lineTryAgain',
] as const satisfies readonly ScalarColorKey[]

/** Cặp (chữ, nền) phải đạt tương phản. Nút khóa (`onDisabled`) cố ý không có mặt (WCAG miễn trừ). */
export const CONTRAST_PAIRS = [
  ['onBackground', 'background'],
  ['text', 'surface'],
  ['text', 'surfaceSelected'],
  ['text', 'surfaceCorrect'],
  ['text', 'surfaceTryAgain'],
  ['text', 'audioSurface'],
  ['onAccent', 'accent'],
] as const satisfies readonly (readonly [ScalarColorKey, ScalarColorKey])[]

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
  const validColors = new Set<ScalarColorKey>()
  for (const key of COLOR_KEYS) {
    if (parseHex(theme.colors[key])) validColors.add(key)
    else add('COLOR_INVALID', `colors.${key}`, `Màu "${theme.colors[key]}" không đúng dạng #RGB hoặc #RRGGBB.`)
  }
  if (theme.colors.linkColors.length < MIN_LINK_COLORS) {
    add('LINK_COLORS_TOO_FEW', 'colors.linkColors', `Cần ít nhất ${MIN_LINK_COLORS} màu đường nối.`)
  }
  theme.colors.linkColors.forEach((color, index) => {
    if (!parseHex(color)) {
      add('COLOR_INVALID', `colors.linkColors[${index}]`, `Màu "${color}" không đúng dạng #RGB hoặc #RRGGBB.`)
    }
  })

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
  for (const key of ['surfaceCorrect', 'surfaceTryAgain', 'lineCorrect', 'lineTryAgain'] as const) {
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

  // Họa tiết nền: phải trỏ tới một tài nguyên có thật và chỉ có nghĩa khi theme vẽ nền sân
  if (theme.backdropAssetId !== undefined) {
    if (!theme.assets.some((asset) => asset.id === theme.backdropAssetId)) {
      add('BACKDROP_ASSET_MISSING', 'backdropAssetId', `Họa tiết nền "${theme.backdropAssetId}" không có trong assets.`)
    }
    if (!theme.paintStageBackground) {
      add('BACKDROP_WITHOUT_BACKGROUND', 'backdropAssetId', 'Có họa tiết nền nhưng paintStageBackground đang tắt nên sẽ không được vẽ.')
    }
  }

  // Vật trang trí: dữ liệu hợp lệ và nằm ngoài tầng chữ số (bầu trời phía trên, mặt cỏ phía dưới hàng hoa)
  const checkDecorations = (decorations: readonly ThemeDecoration[], base: string) => {
  if (decorations.length > DECORATION_LIMITS.maxCount) {
    add('DECORATION_INVALID', base, `Tối đa ${DECORATION_LIMITS.maxCount} vật trang trí (đang có ${decorations.length}).`)
  }
  decorations.forEach((item, index) => {
    const path = `${base}[${index}]`
    const bad = (field: string, message: string) => add('DECORATION_INVALID', `${path}.${field}`, message)
    const inRange = (value: number, min: number, max: number) => Number.isFinite(value) && value >= min && value <= max
    if (typeof item.keyword !== 'string' || !item.keyword.trim()) bad('keyword', 'Thiếu từ khóa hình.')
    if (!(DECORATION_LAYERS as readonly string[]).includes(item.layer)) bad('layer', `Tầng "${item.layer}" không hợp lệ.`)
    if (!(DECORATION_MOTIONS as readonly string[]).includes(item.motion)) bad('motion', `Kiểu chuyển động "${item.motion}" không hợp lệ.`)
    if (!inRange(item.x, 0, 1)) bad('x', 'x phải là tỉ lệ từ 0 đến 1.')
    if (!inRange(item.y, 0, 1)) bad('y', 'y phải là tỉ lệ từ 0 đến 1.')
    if (!inRange(item.size, DECORATION_LIMITS.minSize, DECORATION_LIMITS.maxSize)) {
      bad('size', `Cỡ phải từ ${DECORATION_LIMITS.minSize} đến ${DECORATION_LIMITS.maxSize}.`)
    }
    if (!inRange(item.amplitude, 0, DECORATION_LIMITS.maxAmplitude)) bad('amplitude', `Biên độ phải từ 0 đến ${DECORATION_LIMITS.maxAmplitude}.`)
    if (!inRange(item.speed, 0, DECORATION_LIMITS.maxSpeed)) bad('speed', `Tốc độ phải từ 0 đến ${DECORATION_LIMITS.maxSpeed}.`)
    if (item.phase !== undefined && !Number.isFinite(item.phase)) bad('phase', 'Lệch pha phải là số.')
    if (item.reaction !== undefined && !(DECORATION_REACTIONS as readonly string[]).includes(item.reaction)) bad('reaction', `Phản ứng "${item.reaction}" không hợp lệ.`)
    if (item.depth !== undefined && !inRange(item.depth, 0, 1)) bad('depth', 'Độ sâu phải từ 0 (xa) đến 1 (gần).')
    if (item.layer === 'sky' && Number.isFinite(item.y) && item.y > DECORATION_LIMITS.skyMaxY) {
      bad('y', `Vật ở bầu trời phải có y ≤ ${DECORATION_LIMITS.skyMaxY} (không che hàng hoa và chữ số).`)
    }
    if (item.layer === 'ground' && Number.isFinite(item.y) && item.y < DECORATION_LIMITS.groundMinY) {
      bad('y', `Vật trên cỏ phải có y ≥ ${DECORATION_LIMITS.groundMinY} (nằm trong dải cỏ, dưới hàng hoa, không che chữ số).`)
    }
    if (item.layer === 'ground' && Number.isFinite(item.size) && item.size > DECORATION_LIMITS.groundMaxSize) {
      bad('size', `Vật trên cỏ có cỡ tối đa ${DECORATION_LIMITS.groundMaxSize} (để không chạm dải chữ số).`)
    }
  })
  }
  checkDecorations(theme.decorations ?? [], 'decorations')

  // Biến thể thời điểm trong ngày: màu hợp lệ, lớp phủ không quá đậm, số hạt trong giới hạn, đủ ba biến thể, bộ trang trí riêng cũng hợp lệ
  if (theme.ambience) {
    const { ambience } = theme
    if (!(TIMES_OF_DAY as readonly string[]).includes(ambience.default)) add('AMBIENCE_INVALID', 'ambience.default', `Biến thể mặc định "${ambience.default}" không hợp lệ.`)
    for (const time of TIMES_OF_DAY) {
      const variant = ambience.variants[time]
      const path = `ambience.variants.${time}`
      if (!variant) {
        add('AMBIENCE_INVALID', path, `Thiếu biến thể "${time}".`)
        continue
      }
      const color = (value: string, field: string) => {
        if (!parseHex(value)) add('AMBIENCE_INVALID', `${path}.${field}`, `Màu "${value}" không đúng dạng #RGB hoặc #RRGGBB.`)
      }
      if (!variant.label.trim()) add('AMBIENCE_INVALID', `${path}.label`, 'Thiếu tên hiển thị.')
      color(variant.sky[0], 'sky[0]')
      color(variant.sky[1], 'sky[1]')
      color(variant.tint.color, 'tint.color')
      color(variant.cloud.color, 'cloud.color')
      if (!(Number.isFinite(variant.tint.opacity) && variant.tint.opacity >= 0 && variant.tint.opacity <= ATMOSPHERE_LIMITS.maxTintOpacity)) {
        add('AMBIENCE_INVALID', `${path}.tint.opacity`, `Độ đục lớp phủ phải từ 0 đến ${ATMOSPHERE_LIMITS.maxTintOpacity} (không che mất cảnh).`)
      }
      if (!(Number.isFinite(variant.cloud.opacity) && variant.cloud.opacity >= 0 && variant.cloud.opacity <= 1)) add('AMBIENCE_INVALID', `${path}.cloud.opacity`, 'Độ đục của mây phải từ 0 đến 1.')
      if (!(CELESTIAL_BODIES as readonly string[]).includes(variant.celestial)) add('AMBIENCE_INVALID', `${path}.celestial`, `Thiên thể "${variant.celestial}" không hợp lệ.`)
      if (!(Number.isFinite(variant.celestialDrop) && variant.celestialDrop >= 0 && variant.celestialDrop <= ATMOSPHERE_LIMITS.maxCelestialDrop)) {
        add('AMBIENCE_INVALID', `${path}.celestialDrop`, `Độ hạ thiên thể phải từ 0 đến ${ATMOSPHERE_LIMITS.maxCelestialDrop}.`)
      }
      for (const [field, max] of [['pollen', ATMOSPHERE_LIMITS.maxPollen], ['stars', ATMOSPHERE_LIMITS.maxStars], ['fireflies', ATMOSPHERE_LIMITS.maxFireflies]] as const) {
        const value = variant[field]
        if (!(Number.isInteger(value) && value >= 0 && value <= max)) add('AMBIENCE_INVALID', `${path}.${field}`, `Số ${field} phải là số nguyên từ 0 đến ${max}.`)
      }
      if (variant.decorations) checkDecorations(variant.decorations, `${path}.decorations`)
    }
  }

  // Giao diện trong cảnh: màu hợp lệ, chữ đọc được trên mặt bảng/huy hiệu; nét viền trong giới hạn và cảnh mảnh hơn giao diện
  if (theme.hud) {
    for (const key of ['signFace', 'signBorder', 'signInk', 'badgeFace', 'badgeBorder', 'badgeInk'] as const) {
      if (!parseHex(theme.hud[key])) add('HUD_INVALID', `hud.${key}`, `Màu "${theme.hud[key]}" không đúng dạng #RGB hoặc #RRGGBB.`)
    }
    for (const [ink, face] of [['signInk', 'signFace'], ['badgeInk', 'badgeFace']] as const) {
      const ratio = contrastRatio(theme.hud[ink], theme.hud[face])
      if (ratio !== null && ratio < MIN_CONTRAST_TEXT) {
        add('HUD_INVALID', `hud.${ink}`, `Chữ "${ink}" trên "${face}" chỉ đạt ${ratio.toFixed(2)}:1, cần ít nhất ${MIN_CONTRAST_TEXT}:1.`)
      }
    }
  }
  if (theme.strokes) {
    const { ui, uiShadow, scene } = theme.strokes
    const inRange = (value: number, min: number, max: number) => Number.isFinite(value) && value >= min && value <= max
    if (!inRange(ui, 2, 8)) add('STROKES_INVALID', 'strokes.ui', 'Nét viền giao diện phải từ 2 đến 8.')
    if (!inRange(uiShadow, 0, 10)) add('STROKES_INVALID', 'strokes.uiShadow', 'Bóng nổi phải từ 0 đến 10.')
    if (!inRange(scene, 1, 4)) add('STROKES_INVALID', 'strokes.scene', 'Nét viền cảnh phải từ 1 đến 4.')
    if (Number.isFinite(scene) && Number.isFinite(ui) && scene >= ui) add('STROKES_INVALID', 'strokes.scene', 'Nét viền cảnh phải mảnh hơn nét viền giao diện.')
  }

  return issues
}
