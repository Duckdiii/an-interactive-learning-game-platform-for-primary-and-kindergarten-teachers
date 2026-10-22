import { STAGE_WIDTH } from '../../../../games/common/mediaLayout'
import { AGE_PROFILES } from '../../../age/ageProfiles'
import type { AgeBand } from '../../../theme/themeTypes'

/**
 * Hình học và chuyển động thuần của game «Vườn hoa» (Trục số có chú ong). Tính bằng hàm thuần để test được trong jsdom
 * (không có Canvas) và để các phần xếp nối tiếp nhau, không phần nào đè lên phần khác. Toạ độ theo hệ thiết kế rộng 800.
 */

/** Đường thang là hàng bông hoa: hoa đầu và cuối nằm trong [GARDEN_LEFT, GARDEN_RIGHT]. */
export const GARDEN_LEFT = 72
export const GARDEN_RIGHT = STAGE_WIDTH - 72
export const GARDEN_X = 20
export const GARDEN_WIDTH = STAGE_WIDTH - 2 * GARDEN_X
/**
 * Cảnh vườn vẽ neo theo ĐÁY khung nên cao thấp tùy bố cục (xem `computeGardenLayout`): đầu hoa cách đáy 135, mặt cỏ cách đáy 40,
 * chú ong nghỉ cao hơn đầu hoa 105. Bầu trời (mặt trời, mây) neo theo đỉnh.
 */
export const FLOWER_HEAD_FROM_BOTTOM = 135
export const GRASS_FROM_BOTTOM = 40
export const BEE_ABOVE_FLOWER = 90
/** Chiều cao thiết kế gốc của phần đồi cỏ (các đường cong trong `BeeGardenArt` vẽ theo hệ này rồi dịch xuống đáy). */
export const HILL_DESIGN_HEIGHT = 340
/** Bán kính vùng bắt chạm của chú ong: 72 đơn vị (đường kính 144) để đạt 64px ở khung điện thoại 390px (sân co ×0,445). */
export const BEE_HIT_RADIUS = 72
/**
 * Chú ong vẽ nhỏ lại 0,9 (chỉ biến đổi, không vẽ lại): ở hoa đầu và hoa cuối, cánh (rộng khoảng 48 đơn vị mỗi bên) phải nằm TRỌN trong khung
 * cảnh, cách mép ít nhất `BEE_EDGE_MARGIN`. Vùng chạm giữ nguyên bán kính `BEE_HIT_RADIUS` (nhóm con của ong tự bù theo tỉ lệ).
 */
export const BEE_SCALE = 0.9
export const BEE_HALF_WIDTH = 48
export const BEE_EDGE_MARGIN = 8
/** Chữ đề bài nhỏ hơn số trên hoa (cỡ 44) và nhỏ hơn con số trên huy hiệu (cỡ 76), để mắt trẻ rơi vào CON SỐ trước. */
export const QUESTION_FONT_SIZE = 24
export const BADGE_NUMBER_FONT_SIZE = 76
/** Hàng đề bài nằm trong cảnh: lề so với mép cảnh, huy hiệu số tròn, bảng gỗ (đệm chữ, cao tối thiểu). */
export const HUD_PAD = 14
export const BADGE_SIZE = 108
export const SIGN_PAD_X = 22
export const SIGN_PAD_Y = 16
export const SIGN_MIN_HEIGHT = 76

/** Cạnh nút (đơn vị thiết kế): 112 đạt 48px ở khung điện thoại 390px (sân co ×0,445); 144 đạt 64px, dùng cho Mầm non. */
export const TOUCH_SIZE_CONFIRM = 112
export const TOUCH_SIZE_TAP = 144
/** Hệ số co của sân khi khung điện thoại 390px (canvas 356px / sân 800): cỡ nút tính từ px màn hình tối thiểu của hồ sơ độ tuổi. */
export const PHONE_STAGE_SCALE = 356 / 800

/** Cạnh nút (đơn vị thiết kế) để đạt `minTouchTargetPx` của hồ sơ độ tuổi ở khung điện thoại 390px: Mầm non 144, lớp 1–2 126, lớp 3–5 108. */
export function touchSizeForBand(band: AgeBand): number {
  return Math.ceil(AGE_PROFILES[band].minTouchTargetPx / PHONE_STAGE_SCALE)
}

export const VALUE_BOX_WIDTH = 140
export const GO_BUTTON_WIDTH = 252

/** Mép trên của cảnh trong sân (hàng đề bài nay nằm trong cảnh nên không còn hàng đầu ở trên cảnh). */
export const SCENE_TOP = 16
const BOTTOM_PADDING = 20
export const GAP = 14
export const CONTROL_GAP = 16
const MIN_QUESTION_HEIGHT = 40
/** Chữ đề tối đa hai dòng: đề dài hơn thì bị cắt bằng dấu «…» thay vì làm hàng đề tràn xuống dải hoa. */
export const MAX_QUESTION_HEIGHT = 72
/**
 * Chiều cao khung cảnh CỐ ĐỊNH (đơn vị thiết kế), không phụ thuộc chế độ chơi, cỡ nút hay chữ đề: cảnh không còn nhảy kích thước khi đổi giữa
 * Mầm non và Tiểu học. Nút điều khiển nằm bên dưới cảnh và chỉ làm khung ngoài dài thêm. Cảnh co giãn theo bề rộng (xem `SCENE_MAX_SCALE`).
 */
export const SCENE_HEIGHT = 520
/**
 * Hàng tiến độ (vườn nở hoa) nằm TRONG cảnh, ở trên cùng, thẳng hàng với mép của hàng đề bài; bảng gỗ treo từ đáy hàng này. Cảnh cao thêm để dải trời giữa
 * hàng đề bài và hàng hoa vẫn đủ chỗ cho chú ong bay mà không chạm bảng.
 */
export const PROGRESS_ROW_HEIGHT = 36
export const PROGRESS_ROW_TOP = 10
/** Khoảng trống giữa đáy hàng đề bài và đỉnh chú ong (kể cả lúc nhún nhảy và vươn khi cất cánh). */
export const BEE_CEILING_GAP = 8
/** Chú ong cao tới đâu phía trên tâm: râu và cánh ~58, vươn 1,14 lần khi cất cánh ≈ 66 (đơn vị thiết kế, đã nhân BEE_SCALE). */
export const BEE_TOP_EXTENT = 66
/** Biên độ nhún khi chờ (khớp `beeBob`). */
export const BEE_BOB_AMPLITUDE = 6
/** Cảnh được phóng to tối đa bấy nhiêu lần khi khung chứa rộng hơn sân 800 (màn lớn không bỏ trống hai bên); khung nhỏ hơn thì co lại như cũ. */
export const SCENE_MAX_SCALE = 1.2
/**
 * Màn bắt đầu và màn kết thúc (HTML) phải cùng kích thước khung cảnh để vào chơi không nhảy bố cục: lề hai bên bằng lề của cảnh trong sân (`GARDEN_X` trên bề rộng sân)
 * và tỉ lệ rộng : cao bằng khung cảnh. Tỉ lệ chỉ là mức tối thiểu: nội dung dài hơn (màn điện thoại hẹp) thì khung cao thêm.
 */
export const FRAME_INSET_PERCENT = (GARDEN_X / STAGE_WIDTH) * 100
export const FRAME_ASPECT = GARDEN_WIDTH / SCENE_HEIGHT

export interface GardenLayoutInput {
  /** Có nút nghe lại (có giọng đọc) ở bên phải bảng đề bài. */
  hasAudio: boolean
  /** Có huy hiệu số lớn (con số đích) ở bên trái bảng đề bài: chế độ Mầm non, vì trẻ chưa đọc được chữ. */
  hasBadge?: boolean
  /** Chiều cao chữ câu hỏi đã đo (hoặc ước lượng) với bề rộng `questionTextWidth(hasBadge, hasAudio, touchSize)`; nhỏ hơn mức tối thiểu thì dùng mức tối thiểu. */
  questionHeight: number
  /** Có nút «Xong rồi!» trong hàng điều khiển (không có khi xem lại bài). */
  showConfirm: boolean
  /** Hàng số và mũi tên dưới vườn. Mặc định có; chế độ chạm (Mầm non) bỏ cả hàng này để khung gọn lại. */
  showControls?: boolean
  /** Cạnh nút nghe lại, mũi tên và chiều cao nút «Xong rồi!». Mặc định `TOUCH_SIZE_CONFIRM`. */
  touchSize?: number
}

/** Hộp [x, y, rộng, cao] của một phần. */
export type LayoutBox = readonly [x: number, y: number, width: number, height: number]

export interface ControlsLayout {
  y: number
  size: number
  minusX: number
  valueX: number
  plusX: number
  /** `null` khi không có nút «Xong rồi!». */
  goX: number | null
}

export interface GardenLayout {
  /** Bảng đề bài (gỗ) nằm TRONG cảnh, ở hàng trên cùng của bầu trời, cao tối đa bằng `touchSize` nên không bao giờ chạm dải hoa. */
  sign: LayoutBox
  /** Huy hiệu số lớn bên trái bảng (hình tròn nội tiếp hộp này); `null` nếu không có. */
  badge: LayoutBox | null
  /** Nút nghe lại bên phải bảng; `null` nếu không có giọng đọc. */
  speaker: LayoutBox | null
  /** Hàng tiến độ trong cảnh, ở trên cùng: bảng gỗ treo từ đáy hàng này. */
  progress: LayoutBox
  /** Cả hàng đề bài (huy hiệu, bảng, nút nghe lại): vùng mà ngôi sao bay và vật khác phải tránh. */
  hudRow: LayoutBox
  questionTextX: number
  questionTextY: number
  questionTextWidth: number
  questionTextHeight: number
  gardenY: number
  gardenHeight: number
  /** Toạ độ y tuyệt đối của đầu hoa, mặt cỏ và của chú ong lúc nghỉ. */
  flowerY: number
  groundY: number
  beeY: number
  /** Chú ong luôn nằm dưới trần này (toạ độ y của ĐỈNH ong): đáy hàng đề bài cộng `BEE_CEILING_GAP`. */
  beeCeilingY: number
  /** Số đơn vị ong được nâng lên khỏi độ cao nghỉ (cung bay, nhảy cẫng) mà đỉnh vẫn dưới trần, đã trừ biên độ nhún. Có thể là 0. */
  beeMaxLift: number
  controls: ControlsLayout | null
  stageHeight: number
}

/** Bề rộng của hàng đề bài bên trong cảnh (trừ hai lề `HUD_PAD`). */
const HUD_INNER_WIDTH = GARDEN_WIDTH - 2 * HUD_PAD

/** Bề rộng bảng đề bài: phần còn lại của hàng sau khi trừ huy hiệu và nút nghe lại (mỗi thứ kèm một khoảng cách). */
export function signWidth(hasBadge: boolean, hasAudio: boolean, touchSize: number): number {
  return HUD_INNER_WIDTH - (hasBadge ? BADGE_SIZE + GAP : 0) - (hasAudio ? touchSize + GAP : 0)
}

/** Bề rộng chữ trong bảng đề bài. */
export function questionTextWidth(hasBadge: boolean, hasAudio: boolean, touchSize: number): number {
  return signWidth(hasBadge, hasAudio, touchSize) - 2 * SIGN_PAD_X
}

/** Hàng điều khiển (− số +, và «Xong rồi!» nếu có), căn giữa sân. */
function controlsRow(y: number, size: number, withGo: boolean): ControlsLayout {
  const total = size * 2 + VALUE_BOX_WIDTH + CONTROL_GAP * 2 + (withGo ? CONTROL_GAP + GO_BUTTON_WIDTH : 0)
  const minusX = (STAGE_WIDTH - total) / 2
  const valueX = minusX + size + CONTROL_GAP
  const plusX = valueX + VALUE_BOX_WIDTH + CONTROL_GAP
  return { y, size, minusX, valueX, plusX, goX: withGo ? plusX + size + CONTROL_GAP : null }
}

export function computeGardenLayout({ hasAudio, hasBadge = false, questionHeight, showConfirm, showControls = true, touchSize = TOUCH_SIZE_CONFIRM }: GardenLayoutInput): GardenLayout {
  const textHeight = Math.min(MAX_QUESTION_HEIGHT, Math.max(MIN_QUESTION_HEIGHT, Number.isFinite(questionHeight) ? questionHeight : MIN_QUESTION_HEIGHT))
  const gardenY = SCENE_TOP
  const gardenHeight = SCENE_HEIGHT

  // Hàng đề bài: [huy hiệu][bảng][nút nghe lại], căn giữa theo chiều dọc trong một hàng cao `touchSize` (hoặc cao hơn nếu chữ dài).
  const width = signWidth(hasBadge, hasAudio, touchSize)
  const signHeight = Math.max(SIGN_MIN_HEIGHT, textHeight + 2 * SIGN_PAD_Y)
  const rowHeight = Math.max(touchSize, signHeight)
  const progressY = gardenY + PROGRESS_ROW_TOP
  const rowY = progressY + PROGRESS_ROW_HEIGHT + HUD_PAD
  const left = GARDEN_X + HUD_PAD
  const badge: LayoutBox | null = hasBadge ? [left, rowY + (rowHeight - BADGE_SIZE) / 2, BADGE_SIZE, BADGE_SIZE] : null
  const signX = left + (hasBadge ? BADGE_SIZE + GAP : 0)
  const speaker: LayoutBox | null = hasAudio ? [GARDEN_X + GARDEN_WIDTH - HUD_PAD - touchSize, rowY + (rowHeight - touchSize) / 2, touchSize, touchSize] : null
  const sign: LayoutBox = [signX, rowY + (rowHeight - signHeight) / 2, width, signHeight]

  const controlsY = gardenY + gardenHeight + GAP
  const flowerY = gardenY + gardenHeight - FLOWER_HEAD_FROM_BOTTOM
  const beeY = flowerY - BEE_ABOVE_FLOWER
  const beeCeilingY = rowY + rowHeight + BEE_CEILING_GAP
  return {
    sign,
    progress: [left, progressY, HUD_INNER_WIDTH, PROGRESS_ROW_HEIGHT],
    badge,
    speaker,
    hudRow: [left, rowY, GARDEN_WIDTH - 2 * HUD_PAD, rowHeight],
    questionTextX: signX + SIGN_PAD_X,
    questionTextY: sign[1] + (signHeight - textHeight) / 2,
    questionTextWidth: width - 2 * SIGN_PAD_X,
    questionTextHeight: textHeight,
    gardenY,
    gardenHeight,
    flowerY,
    groundY: gardenY + gardenHeight - GRASS_FROM_BOTTOM,
    beeY,
    beeCeilingY,
    beeMaxLift: Math.max(0, beeY - BEE_TOP_EXTENT - BEE_BOB_AMPLITUDE - beeCeilingY),
    controls: showControls ? controlsRow(controlsY, touchSize, showConfirm) : null,
    stageHeight: (showControls ? controlsY + touchSize : gardenY + gardenHeight) + BOTTOM_PADDING,
  }
}

// ---- cách chơi theo nhóm tuổi ----

/**
 * Cách trả lời: `tap` (Mầm non): chạm một bông hoa là chú ong bay tới đó rồi chấm luôn, không có mũi tên và nút «Xong rồi»;
 * `confirm` (Tiểu học, mặc định): chọn số bằng mũi tên hoặc chạm hoa, rồi bấm «Xong rồi!» mới chấm.
 */
export type InteractionMode = 'tap' | 'confirm'
export const DEFAULT_INTERACTION_MODE: InteractionMode = 'confirm'

/** Nhóm tuổi → cách chơi. Chỉ Mầm non chạm là chấm; các nhóm khác giữ cách cũ. */
export function interactionModeForBand(band: AgeBand): InteractionMode {
  return band === 'PRESCHOOL' ? 'tap' : 'confirm'
}

// ---- chuyến bay ----

export const HOP_ARC = 40
export const BOUNCE_PEAK = 1.22
const MAX_HOP_SECONDS = 0.26
const MIN_HOP_SECONDS = 0.12
const MAX_FLIGHT_SECONDS = 1.6

/** Thời gian một bước bay: bay xa thì mỗi bước ngắn lại để cả chuyến không quá ~1,6 giây, nhưng không nhanh hơn 0,12 giây (vẫn thấy được từng hoa). */
export function hopSeconds(hops: number): number {
  if (!Number.isFinite(hops) || hops <= 1) return MAX_HOP_SECONDS
  return Math.min(MAX_HOP_SECONDS, Math.max(MIN_HOP_SECONDS, MAX_FLIGHT_SECONDS / hops))
}

/**
 * Các giá trị chú ong đi qua từ `from` tới `to` (mỗi vạch một bước, KHÔNG gồm `from`, gồm `to`). `from === to` hoặc bước không hợp lệ thì rỗng.
 * `from`, `to` phải nằm trên vạch (cùng `step`); lệch vạch thì dừng ở vạch cuối không vượt qua `to`.
 */
export function pathValues(from: number, to: number, step: number): number[] {
  if (!Number.isFinite(from) || !Number.isFinite(to) || !Number.isInteger(step) || step < 1 || from === to) return []
  const direction = to > from ? 1 : -1
  const values: number[] = []
  for (let value = from + direction * step; direction > 0 ? value <= to : value >= to; value += direction * step) values.push(value)
  return values
}

// ---- hoa ----

/** Bảng màu cánh hoa dịu, lặp theo thứ tự vạch (không có màu đỏ gắt: đỏ có nghĩa «sai» với nhiều trẻ). */
export const PETAL_COLORS = ['#FF8FB1', '#FFB347', '#B39DFF', '#6FD3FF', '#8EE07A', '#FFD166'] as const
export const PETAL_STROKE = 'rgba(60, 40, 90, 0.18)'
export const FLOWER_CENTER_FILL = '#FFE066'
export const FLOWER_CENTER_STROKE = '#D99A00'
/** Chữ số trên nhụy hoa: tối trên vàng nhạt, tương phản cao. */
export const FLOWER_NUMBER_FILL = '#1F2A44'
/** Bán kính nhụy và bề rộng cả bông hoa ở tỉ lệ 1 (đơn vị thiết kế). */
export const FLOWER_CENTER_RADIUS = 32
export const FLOWER_RADIUS = 51

export const petalColor = (index: number): string => PETAL_COLORS[((index % PETAL_COLORS.length) + PETAL_COLORS.length) % PETAL_COLORS.length]

/** Tỉ lệ bông hoa: cho phép cánh hai hoa kề nhau chạm nhẹ nhau (khóm hoa) nhưng nhụy không bao giờ đè nhau; tối đa 1, tối thiểu 0,5 (thang 21 vạch). */
export function flowerScale(ticks: number, left = GARDEN_LEFT, right = GARDEN_RIGHT): number {
  if (!Number.isFinite(ticks) || ticks < 2) return 1
  const spacing = (right - left) / (ticks - 1)
  return Math.min(1, Math.max(0.5, (spacing * 1.08) / (FLOWER_RADIUS * 2)))
}

// ---- chuyển động (hàm thuần của thời gian, đơn vị giây) ----

/** Chú ong nhấp nhô nhẹ khi chờ. */
export const beeBob = (t: number): number => Math.sin(t * 2.2) * 6

/** Cánh vỗ: tỉ lệ chiều dọc từ 0,72 đến 1. */
export const wingScale = (t: number): number => 0.72 + 0.28 * Math.abs(Math.sin(t * 18))

export const pulse = (t: number): number => 1 + 0.12 * Math.sin(t * 5)

/** Vầng sáng quanh mặt trời thở chậm (chu kỳ ~7 giây): tỉ lệ 0,94 đến 1,06, độ đục 0,45 đến 0,65. */
export const sunGlowScale = (t: number): number => 1 + 0.06 * Math.sin(t * 0.9)
export const sunGlowOpacity = (t: number): number => 0.55 + 0.1 * Math.sin(t * 0.9)

/**
 * Vật trang trí ở trời nhường chỗ cho chú ong: càng gần ong càng mờ (không che đầu ong, không «cướp» mắt trẻ). `distance` là khoảng cách (đơn vị thiết kế) giữa tâm vật
 * và tâm ong. Từ `DECOR_FADE_FAR` trở ra thì rõ hẳn (1); vào trong `DECOR_FADE_NEAR` thì chỉ còn `DECOR_FADE_MIN`; ở giữa nội suy đều.
 */
export const DECOR_FADE_NEAR = 60
export const DECOR_FADE_FAR = 120
export const DECOR_FADE_MIN = 0.2
export function decorFade(distance: number): number {
  if (!Number.isFinite(distance)) return 1
  const t = Math.min(1, Math.max(0, (distance - DECOR_FADE_NEAR) / (DECOR_FADE_FAR - DECOR_FADE_NEAR)))
  return DECOR_FADE_MIN + (1 - DECOR_FADE_MIN) * t
}

/**
 * Camera nhẹ: khi ong ở lệch sang một bên, các lớp nền trượt NGƯỢC chiều ong một chút (xa trượt ít, gần trượt nhiều; lớp tiền cảnh trượt cùng chiều ong cho cảm giác sâu).
 * Đơn vị thiết kế, nhỏ (≤ 10) nên không lộ mép: đồi vẽ rộng thêm `HILL_PAD` mỗi bên. Tắt khi giảm chuyển động (bộ chuyển động không chạy).
 */
export const PARALLAX_NAME = 'motion-parallax'
export const HILL_PAD = 24
export const PARALLAX = { farHill: 5, backHill: 9, frontHill: -9, sun: 3, cloud: 6 } as const
/** Độ lệch chuẩn hóa của ong so với giữa hàng hoa: -1 (mép trái) đến +1 (mép phải); mỗi lớp nhân với hệ số của nó rồi đổi dấu để trượt ngược chiều ong. */
export function parallaxOffset(beeX: number): number {
  if (!Number.isFinite(beeX)) return 0
  const half = (GARDEN_RIGHT - GARDEN_LEFT) / 2
  const t = Math.min(1, Math.max(-1, (beeX - (GARDEN_LEFT + half)) / half))
  return -t
}

/**
 * Mây theo lớp (thị sai): mây xa nhỏ, mờ, trôi chậm và hẹp; mây gần to, rõ, trôi nhanh và rộng hơn. `x`, `y` theo toạ độ cảnh (gốc ở góc trên trái);
 * mây chỉ trôi ngang quanh `x` (biên độ `amplitude`), nên luôn nằm ngoài dải hoa ở mọi chiều cao cảnh như trước.
 */
export interface CloudSpec {
  x: number
  y: number
  scale: number
  amplitude: number
  speed: number
  opacity: number
}
export const GARDEN_CLOUDS: readonly CloudSpec[] = [
  { x: 330, y: 306, scale: 0.5, amplitude: 14, speed: 0.16, opacity: 0.75 },
  { x: 470, y: 290, scale: 0.75, amplitude: 22, speed: 0.26, opacity: 0.88 },
  { x: 150, y: 258, scale: 1, amplitude: 30, speed: 0.35, opacity: 0.95 },
]

/**
 * Mặt trời nằm DƯỚI nút nghe lại (không chồng lên nút): tâm ở y này thì tia trên cùng (cách tâm 64) chạm đáy hàng đề bài và tia dưới cùng vừa tới ngọn cánh hoa.
 * Quầng sáng bán kính `SUN_GLOW_RADIUS` mờ dần ra rìa nên không che nút.
 */
export const SUN_X = GARDEN_WIDTH - 90
export const SUN_Y = 270
export const SUN_GLOW_RADIUS = 84

/**
 * Bụi cây tiền cảnh ở mép dưới khung, vẽ SAU hàng hoa. Cao tối đa `BUSH_MAX_HEIGHT`: thấp hơn đáy của bông hoa (kể cả lúc nở to 1,5 lần) nên không
 * bao giờ che hoa và chữ số, chỉ che gốc cuống. `x` là tâm (toạ độ cảnh), tránh chỗ của bọ rùa, ốc sên và nấm trong dữ liệu trang trí.
 */
export interface BushSpec {
  x: number
  width: number
  height: number
}
export const BUSH_MAX_HEIGHT = 34
export const GARDEN_BUSHES: readonly BushSpec[] = [
  { x: 14, width: 84, height: 34 },
  { x: 236, width: 70, height: 26 },
  { x: 548, width: 76, height: 30 },
  { x: 748, width: 84, height: 34 },
]

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value))
export const easeOutCubic = (value: number): number => 1 - (1 - clamp01(value)) ** 3

/** Thời gian ăn mừng/lắc đầu (giây). Hết thời gian thì chú ong về trạng thái nghỉ. */
export const HAPPY_SECONDS = 2.4
export const OOPS_SECONDS = 1.1
export const SPIN_SECONDS = 1

/** Nhảy cẫng khi đúng (độ lệch y âm = lên cao), giảm dần. Chưa trả lời (`since < 0`) hoặc đã hết thì 0. */
export const HAPPY_HOP_HEIGHT = 34
/** `maxLift`: trần nâng của bố cục (`GardenLayout.beeMaxLift`); nhảy thấp lại để ong không chạm bảng. Bỏ trống thì dùng chiều cao đầy đủ. */
export function happyHop(since: number, maxLift: number = HAPPY_HOP_HEIGHT): number {
  if (!(since >= 0) || since >= HAPPY_SECONDS) return 0
  const height = Math.min(HAPPY_HOP_HEIGHT, Math.max(0, maxLift))
  return -Math.abs(Math.sin(since * 7)) * height * (1 - since / HAPPY_SECONDS)
}

/** Cung bay giữa hai hoa: `HOP_ARC` nhưng không vượt trần nâng của bố cục. */
export function hopArcFor(maxLift: number): number {
  return Math.min(HOP_ARC, Math.max(0, maxLift))
}

/** Xoay một vòng khi đúng (độ), xong thì 0 (không tích lũy). */
export function happySpin(since: number): number {
  if (!(since >= 0) || since >= SPIN_SECONDS) return 0
  return 360 * easeOutCubic(since / SPIN_SECONDS)
}

/** Lắc đầu nhẹ khi chưa đúng (độ), tắt dần; không rung mạnh (quy ước UX cho trẻ nhỏ). */
export function oopsShake(since: number): number {
  if (!(since >= 0) || since >= OOPS_SECONDS) return 0
  return Math.sin(since * 16) * 9 * (1 - since / OOPS_SECONDS)
}

/** `blink`: chớp mắt một nhịp sau khi lắc đầu (mắt nhắm, miệng bình thường). */
export type BeeMood = 'idle' | 'happy' | 'oops' | 'blink'

/** Tâm trạng của chú ong theo kết quả và thời gian từ lúc có kết quả: hết thời gian ăn mừng thì về bình thường (vẫn cười nếu đúng). */
export function beeMood(result: { isCorrect: boolean } | null, since: number): BeeMood {
  if (!result || !(since >= 0)) return 'idle'
  if (result.isCorrect) return 'happy'
  return since < OOPS_SECONDS + 1 ? 'oops' : 'idle'
}

// ---- hoa giấy (sao rải khi đúng) ----

export interface ConfettiParticle {
  /** Vận tốc ban đầu (đơn vị thiết kế mỗi giây). */
  vx: number
  vy: number
  /** Xoay (độ mỗi giây). */
  spin: number
  size: number
  color: string
}

export const CONFETTI_COLORS = ['#FFD166', '#FF8FB1', '#6FD3FF', '#8EE07A', '#B39DFF'] as const
export const CONFETTI_GRAVITY = 520
export const CONFETTI_SECONDS = 1.8

/** Bộ sinh số giả ngẫu nhiên có hạt giống (mulberry32): cùng hạt giống cho cùng kết quả, test được. */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function makeConfetti(seed: number, count: number): ConfettiParticle[] {
  const random = seededRandom(seed)
  const safeCount = Number.isFinite(count) ? Math.max(0, Math.min(40, Math.floor(count))) : 0
  return Array.from({ length: safeCount }, (_, index) => {
    // Rải đều theo góc quanh chú ong, hơi hướng lên trên.
    const angle = (index / Math.max(1, safeCount)) * Math.PI * 2 + random() * 0.4
    const speed = 160 + random() * 170
    return {
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 140,
      spin: (random() - 0.5) * 720,
      size: 9 + random() * 8,
      color: CONFETTI_COLORS[Math.floor(random() * CONFETTI_COLORS.length)],
    }
  })
}

export interface ConfettiPose {
  x: number
  y: number
  rotation: number
  opacity: number
}

/** Vị trí (so với chú ong), xoay và độ mờ của một hạt sau `since` giây; ngoài [0, CONFETTI_SECONDS) thì không hiện (opacity 0). */
export function confettiPose(particle: ConfettiParticle, since: number): ConfettiPose {
  if (!(since >= 0) || since >= CONFETTI_SECONDS) return { x: 0, y: 0, rotation: 0, opacity: 0 }
  return {
    x: particle.vx * since,
    y: particle.vy * since + 0.5 * CONFETTI_GRAVITY * since * since,
    rotation: particle.spin * since,
    opacity: clamp01(1 - since / CONFETTI_SECONDS) ** 0.7,
  }
}
