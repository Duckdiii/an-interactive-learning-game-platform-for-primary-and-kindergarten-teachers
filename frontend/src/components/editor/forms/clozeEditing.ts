import type { VisualClozeQuestion } from '../../../types/game-dsl.types'
import { CLOZE_BLANK, TYPE_LIMITS } from '../../../utils/questionSpecs'

// Các phép sửa câu VISUAL_CLOZE (hàm thuần, trả về bản mới, không đổi bản cũ). Câu có ĐÚNG MỘT chỗ trống "___" (luật Lớp 2 của DSL); từ nhiễu là
// danh sách chữ 1 đến 3 phần tử. Thêm hay xóa từ nhiễu không đụng tới câu hay từ đúng.

const LIMITS = TYPE_LIMITS.VISUAL_CLOZE.distractors

export const canAddDistractor = (question: VisualClozeQuestion) => question.distractors.length < LIMITS.max
export const canRemoveDistractor = (question: VisualClozeQuestion) => question.distractors.length > LIMITS.min

export const setSentence = (question: VisualClozeQuestion, sentenceTemplate: string): VisualClozeQuestion => ({ ...question, sentenceTemplate })

export const setCorrectAnswer = (question: VisualClozeQuestion, correctAnswer: string): VisualClozeQuestion => ({ ...question, correctAnswer })

export function setDistractor(question: VisualClozeQuestion, index: number, text: string): VisualClozeQuestion {
  if (index < 0 || index >= question.distractors.length) return question

  return { ...question, distractors: question.distractors.map((word, position) => (position === index ? text : word)) }
}

/** Thêm một từ nhiễu trống ở cuối; không thêm khi đã đủ số tối đa (trả lại nguyên bản). */
export function addDistractor(question: VisualClozeQuestion): VisualClozeQuestion {
  if (!canAddDistractor(question)) return question

  return { ...question, distractors: [...question.distractors, ''] }
}

/** Xóa từ nhiễu ở vị trí `index`; không xóa khi chỉ còn số tối thiểu hoặc vị trí không có. */
export function removeDistractor(question: VisualClozeQuestion, index: number): VisualClozeQuestion {
  if (!canRemoveDistractor(question) || index < 0 || index >= question.distractors.length) return question

  return { ...question, distractors: question.distractors.filter((_, position) => position !== index) }
}

/** Câu đã có chỗ trống (một cụm gạch dưới liền nhau, bất kể dài bao nhiêu) chưa. */
export const hasBlank = (sentence: string) => /_+/.test(sentence)

const NO_SPACE_AFTER = /[\s.,!?;:)]/

/**
 * Chèn chỗ trống "___" thay cho đoạn đang chọn (từ `start` đến `end`; trùng nhau là con trỏ). Thêm dấu cách ở hai bên khi chữ dính liền (trừ trước dấu
 * câu) và trả về vị trí con trỏ ngay sau chỗ trống. Câu đã có chỗ trống thì KHÔNG chèn (trả `null`): luật là đúng một chỗ trống.
 */
export function insertBlank(sentence: string, start: number, end: number): { text: string; caret: number } | null {
  if (hasBlank(sentence)) return null

  const from = Math.max(0, Math.min(start, end, sentence.length))
  const to = Math.min(sentence.length, Math.max(start, end))
  const before = sentence.slice(0, from)
  const after = sentence.slice(to)
  const left = before !== '' && !/\s$/.test(before) ? ' ' : ''
  const right = after !== '' && !NO_SPACE_AFTER.test(after[0]) ? ' ' : ''
  const text = `${before}${left}${CLOZE_BLANK}${right}${after}`

  return { text, caret: before.length + left.length + CLOZE_BLANK.length }
}
