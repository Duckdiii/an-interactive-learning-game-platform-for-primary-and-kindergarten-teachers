import type { AudioVisualMatchQuestion, ImageChoice } from '../../../types/game-dsl.types'
import { TYPE_LIMITS } from '../../../utils/questionSpecs'

// Các phép sửa câu AUDIO_VISUAL_MATCH (hàm thuần, trả về bản mới, không đổi bản cũ). Mỗi lựa chọn hình là một mô tả (`visualPrompt`) kèm ảnh tùy chọn (`imageUrl`):
// đổi mô tả KHÔNG xóa ảnh đang có (quyết định 2026-10-16: giáo viên tự quyết, form chỉ nhắc ảnh có thể không khớp). Số hình sai từ 1 đến 3.

export const DISTRACTOR_LIMITS = TYPE_LIMITS.AUDIO_VISUAL_MATCH.distractors

export const canAddDistractor = (count: number) => count < DISTRACTOR_LIMITS.max
export const canRemoveDistractor = (count: number) => count > DISTRACTOR_LIMITS.min

/** Lựa chọn đã có ảnh (đường dẫn không rỗng) chưa. */
export const hasImage = (choice: ImageChoice) => (choice.imageUrl ?? '').trim() !== ''

const withPrompt = (choice: ImageChoice, visualPrompt: string): ImageChoice => ({ ...choice, visualPrompt })

export const setCorrectPrompt = (question: AudioVisualMatchQuestion, visualPrompt: string): AudioVisualMatchQuestion => ({
  ...question,
  correct: withPrompt(question.correct, visualPrompt),
})

export function setDistractorPrompt(question: AudioVisualMatchQuestion, index: number, visualPrompt: string): AudioVisualMatchQuestion {
  if (index < 0 || index >= question.distractors.length) return question

  return { ...question, distractors: question.distractors.map((choice, position) => (position === index ? withPrompt(choice, visualPrompt) : choice)) }
}

/** Thêm một hình sai trống ở cuối; không thêm khi đã đủ số tối đa (trả lại nguyên bản). */
export function addDistractor(question: AudioVisualMatchQuestion): AudioVisualMatchQuestion {
  if (!canAddDistractor(question.distractors.length)) return question

  return { ...question, distractors: [...question.distractors, { visualPrompt: '' }] }
}

/** Xóa hình sai ở vị trí `index`; không xóa khi chỉ còn số tối thiểu hoặc vị trí không có. */
export function removeDistractor(question: AudioVisualMatchQuestion, index: number): AudioVisualMatchQuestion {
  if (!canRemoveDistractor(question.distractors.length) || index < 0 || index >= question.distractors.length) return question

  return { ...question, distractors: question.distractors.filter((_, position) => position !== index) }
}
