import { optionGridHeight } from '../common/optionGrid'

export const STAGE_WIDTH = 800
export const ILLUSTRATION_SIZE = 140
/** Nút nghe lại cao 96 (>= 64px quy ước); trên màn nhỏ canvas thu nhỏ nên cần dư để còn dễ chạm. */
export const AUDIO_BUTTON_WIDTH = 300
export const AUDIO_BUTTON_HEIGHT = 96

export const QUESTION_FONT_SIZE = 32
export const QUESTION_TEXT_WIDTH = STAGE_WIDTH - 80
const QUESTION_LINE_HEIGHT = 40
/** Ước lượng số ký tự tiếng Việt vừa một dòng chữ 32px rộng 720px (thiên về dư để không bị đè). */
const QUESTION_CHARS_PER_LINE = 30
const QUESTION_MAX_LINES = 6

const TOP_PADDING = 20
const BOTTOM_PADDING = 40
const SECTION_GAP = 16
const AUDIO_GAP_BELOW = 24

export interface QuizLayoutInput {
  hasIllustration: boolean
  hasAudio: boolean
  optionCount: number
  questionLength: number
}

export interface QuizLayout {
  illustrationY: number | null
  questionY: number
  questionHeight: number
  audioButtonY: number | null
  optionsOriginY: number
  stageHeight: number
}

/**
 * Xếp các phần của màn Quiz nối tiếp nhau từ trên xuống: ảnh → câu hỏi → nút nghe lại → ô đáp án.
 * Mỗi phần bắt đầu ngay sau khi phần trước kết thúc nên không thể chồng lên nhau; chiều cao canvas
 * tính theo nội dung thay vì hằng số (lỗi cũ: nút loa bị ô đáp án đè vì mỗi vị trí là một số cố định).
 */
export function computeQuizLayout({
  hasIllustration,
  hasAudio,
  optionCount,
  questionLength,
}: QuizLayoutInput): QuizLayout {
  let y = TOP_PADDING

  let illustrationY: number | null = null
  if (hasIllustration) {
    illustrationY = y
    y += ILLUSTRATION_SIZE + SECTION_GAP
  }

  const lines = Math.min(QUESTION_MAX_LINES, Math.max(1, Math.ceil(questionLength / QUESTION_CHARS_PER_LINE)))
  const questionHeight = lines * QUESTION_LINE_HEIGHT
  const questionY = y
  y += questionHeight + SECTION_GAP

  let audioButtonY: number | null = null
  if (hasAudio) {
    audioButtonY = y
    y += AUDIO_BUTTON_HEIGHT + AUDIO_GAP_BELOW
  }

  const optionsOriginY = y
  const stageHeight = optionsOriginY + optionGridHeight(optionCount) + BOTTOM_PADDING

  return { illustrationY, questionY, questionHeight, audioButtonY, optionsOriginY, stageHeight }
}
