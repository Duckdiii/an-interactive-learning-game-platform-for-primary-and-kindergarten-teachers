import type { QuestionDsl } from '../types/game-dsl.types'
import { QUESTION_LIMITS } from './questionSpecs'

// DSL chỉ có thời gian/điểm ở từng câu (contract đã freeze), nên "mặc định của game" được SUY RA từ các câu ở frontend:
// giá trị phổ biến nhất; câu nào khác giá trị đó là câu "đặt riêng".
export type DefaultField = 'timeLimitSeconds' | 'points'

/**
 * Giá trị xuất hiện nhiều nhất; chưa có câu thì `undefined`. Hòa thì ưu tiên mức chuẩn (30 giây, 10 điểm) nếu nằm trong nhóm hòa,
 * để đặt riêng MỘT câu trong game 2 câu không lật mặc định sang giá trị vừa gõ; không có thì lấy giá trị gặp trước.
 */
export function gameDefault(questions: ReadonlyArray<QuestionDsl>, field: DefaultField): number | undefined {
  const counts = new Map<number, number>()

  for (const question of questions) counts.set(question[field], (counts.get(question[field]) ?? 0) + 1)

  let best: number | undefined
  let bestCount = 0

  const standard = QUESTION_LIMITS[field].default

  for (const [value, count] of counts) {
    if (count > bestCount || (count === bestCount && value === standard)) {
      best = value
      bestCount = count
    }
  }

  return best
}

/** Đổi mặc định: chỉ các câu đang theo mặc định cũ được đổi theo; câu đặt riêng giữ nguyên. */
export function applyGameDefault<T extends QuestionDsl>(questions: ReadonlyArray<T>, field: DefaultField, value: number): T[] {
  const current = gameDefault(questions, field)

  return questions.map((question) => (question[field] === current ? { ...question, [field]: value } : question))
}
