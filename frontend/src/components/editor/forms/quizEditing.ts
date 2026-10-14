import type { QuizQuestion, TextChoice } from '../../../types/game-dsl.types'
import { TYPE_LIMITS } from '../../../utils/questionSpecs'

// Các phép sửa câu QUIZ (hàm thuần, trả về bản mới, không đổi bản cũ). Mã đáp án luôn theo VỊ TRÍ a, b, c, d (luật Lớp 2 của DSL),
// nên thêm hay xóa đáp án đều đánh lại mã và giữ đúng đáp án đúng.

const POSITION_IDS = ['a', 'b', 'c', 'd'] as const
const LIMITS = TYPE_LIMITS.QUIZ.options

export const positionId = (index: number) => POSITION_IDS[index] ?? ''

/** Thứ tự (từ 0) của đáp án đúng, hoặc -1 khi chưa có/không khớp đáp án nào. */
export const correctIndexOf = (question: QuizQuestion) => question.options.findIndex((option) => option.id === question.correctOptionId)

export const canAddOption = (question: QuizQuestion) => question.options.length < LIMITS.max
export const canRemoveOption = (question: QuizQuestion) => question.options.length > LIMITS.min

const withOptions = (question: QuizQuestion, texts: ReadonlyArray<string>, correctIndex: number): QuizQuestion => ({
  ...question,
  options: texts.map((text, index): TextChoice => ({ id: positionId(index), text })),
  correctOptionId: correctIndex >= 0 && correctIndex < texts.length ? positionId(correctIndex) : '',
})

export const setQuestionText = (question: QuizQuestion, questionText: string): QuizQuestion => ({ ...question, questionText })

export function setOptionText(question: QuizQuestion, index: number, text: string): QuizQuestion {
  return withOptions(
    question,
    question.options.map((option, position) => (position === index ? text : option.text)),
    correctIndexOf(question),
  )
}

/** Thêm một đáp án trống ở cuối; không thêm khi đã đủ số tối đa (trả lại nguyên bản). */
export function addOption(question: QuizQuestion): QuizQuestion {
  if (!canAddOption(question)) return question

  return withOptions(question, [...question.options.map((option) => option.text), ''], correctIndexOf(question))
}

/** Xóa một đáp án và đánh lại mã; không xóa khi chỉ còn số tối thiểu. Xóa đúng đáp án đúng thì phải chọn lại (mã đáp án đúng để trống). */
export function removeOption(question: QuizQuestion, index: number): QuizQuestion {
  if (!canRemoveOption(question) || index < 0 || index >= question.options.length) return question

  const correct = correctIndexOf(question)
  const nextCorrect = correct === index ? -1 : correct > index ? correct - 1 : correct

  return withOptions(
    question,
    question.options.filter((_, position) => position !== index).map((option) => option.text),
    nextCorrect,
  )
}

export function setCorrectOption(question: QuizQuestion, index: number): QuizQuestion {
  return withOptions(question, question.options.map((option) => option.text), index)
}

