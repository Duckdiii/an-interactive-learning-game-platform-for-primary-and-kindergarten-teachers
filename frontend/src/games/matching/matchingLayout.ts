import { AUDIO_BUTTON_HEIGHT, ILLUSTRATION_SIZE, STAGE_WIDTH } from '../common/mediaLayout'

/**
 * Bố cục màn MATCHING theo hệ toạ độ thiết kế của `ResponsiveStage` (canvas rộng 800). Tính bằng hàm thuần
 * để test được trong jsdom: ảnh → tiêu đề → nút nghe lại → các hàng thẻ → nút «Xong rồi!» xếp nối tiếp
 * nhau, nên không phần nào đè lên phần phía trên (bài học từ lỗi nút loa bị đè ở Quiz).
 */

/** Thẻ 280 để chừa khoảng 160px giữa hai cột cho các đường nối (đường chéo nhau vẫn phân biệt được). */
export const CARD_WIDTH = 280
export const LEFT_X = 40
export const RIGHT_X = STAGE_WIDTH - LEFT_X - CARD_WIDTH
/** Chiều cao tối thiểu của thẻ, lớn hơn nhiều so với vùng chạm tối thiểu 64px của dự án. */
export const CARD_MIN_HEIGHT = 110
export const CARD_PADDING = 16
export const CARD_IMAGE_SIZE = 80
export const CARD_FONT_SIZE = 26
export const ROW_GAP = 24

export const HEADING_FONT_SIZE = 30
export const HEADING_WIDTH = STAGE_WIDTH - 80

export const CONFIRM_BUTTON_WIDTH = 300
export const CONFIRM_BUTTON_HEIGHT = 96

const TOP_PADDING = 20
const BOTTOM_PADDING = 40
const SECTION_GAP = 16
const AUDIO_GAP_BELOW = 24
const CONFIRM_GAP_ABOVE = 32

/**
 * Ước lượng chiều cao chữ khi không đo thật được (môi trường không có Canvas). Thiên về dư: coi mỗi ký tự
 * rộng khoảng 0,65 cỡ chữ (chữ đậm tiếng Việt có dấu) và mỗi dòng cao đúng bằng cỡ chữ (Konva mặc định).
 */
export function estimateTextHeight(text: string, fontSize: number, width: number): number {
  const charsPerLine = Math.max(1, Math.floor(width / (fontSize * 0.65)))
  return Math.max(1, Math.ceil(text.length / charsPerLine)) * fontSize
}

/** Độ rộng khung chữ trong thẻ: thẻ có ảnh thì ảnh chiếm bên trái nên chữ hẹp hơn. */
export function cardTextWidth(hasImage: boolean): number {
  return CARD_WIDTH - 2 * CARD_PADDING - (hasImage ? CARD_IMAGE_SIZE + CARD_PADDING : 0)
}

/** Chiều cao cần cho nội dung một thẻ (ảnh và chữ nằm cạnh nhau nên lấy cái cao hơn). */
export function cardContentHeight({ hasImage, textHeight }: { hasImage: boolean; textHeight: number }): number {
  return Math.max(hasImage ? CARD_IMAGE_SIZE : 0, textHeight) + 2 * CARD_PADDING
}

export interface MatchingLayoutInput {
  hasIllustration: boolean
  hasAudio: boolean
  /** Chiều cao khung tiêu đề (câu dẫn `audioText`); 0 nếu không có. */
  headingHeight: number
  pairCount: number
  /** Chiều cao nội dung cần của từng thẻ ở cả hai cột (xem `cardContentHeight`); mọi hàng dùng số lớn nhất. */
  cardContentHeights: readonly number[]
  /** Hiện nút «Xong rồi!» (preview, play); chế độ xem lại thì không. */
  showConfirmButton: boolean
}

export interface MatchingLayout {
  illustrationY: number | null
  headingY: number | null
  audioButtonY: number | null
  rowsOriginY: number
  /** Chiều cao mọi hàng bằng nhau để hai cột thẳng hàng và đường nối nằm ngang. */
  rowHeight: number
  confirmButtonY: number | null
  stageHeight: number
}

export function computeMatchingLayout({
  hasIllustration,
  hasAudio,
  headingHeight,
  pairCount,
  cardContentHeights,
  showConfirmButton,
}: MatchingLayoutInput): MatchingLayout {
  let y = TOP_PADDING

  let illustrationY: number | null = null
  if (hasIllustration) {
    illustrationY = y
    y += ILLUSTRATION_SIZE + SECTION_GAP
  }

  let headingY: number | null = null
  if (headingHeight > 0) {
    headingY = y
    y += headingHeight + SECTION_GAP
  }

  let audioButtonY: number | null = null
  if (hasAudio) {
    audioButtonY = y
    y += AUDIO_BUTTON_HEIGHT + AUDIO_GAP_BELOW
  }

  const rowsOriginY = y
  const rowHeight = Math.max(CARD_MIN_HEIGHT, ...cardContentHeights.map(Math.ceil))
  const rowsHeight = pairCount > 0 ? pairCount * rowHeight + (pairCount - 1) * ROW_GAP : 0
  y += rowsHeight

  let confirmButtonY: number | null = null
  if (showConfirmButton) {
    confirmButtonY = y + CONFIRM_GAP_ABOVE
    y = confirmButtonY + CONFIRM_BUTTON_HEIGHT
  }

  return {
    illustrationY,
    headingY,
    audioButtonY,
    rowsOriginY,
    rowHeight,
    confirmButtonY,
    stageHeight: y + BOTTOM_PADDING,
  }
}

export type MatchingSide = 'left' | 'right'

/** Hình chữ nhật của thẻ ở cột `side`, hàng `index`. */
export function cardRect(layout: MatchingLayout, side: MatchingSide, index: number) {
  return {
    x: side === 'left' ? LEFT_X : RIGHT_X,
    y: layout.rowsOriginY + index * (layout.rowHeight + ROW_GAP),
    width: CARD_WIDTH,
    height: layout.rowHeight,
  }
}

/**
 * Điểm đường nối bám vào thẻ: giữa cạnh phía trong (cạnh phải của thẻ trái, cạnh trái của thẻ phải), nên
 * đường nối luôn nằm giữa hai cột và không đè lên chữ trong thẻ.
 */
export function lineAnchor(layout: MatchingLayout, side: MatchingSide, index: number) {
  const rect = cardRect(layout, side, index)
  return { x: side === 'left' ? rect.x + rect.width : rect.x, y: rect.y + rect.height / 2 }
}
