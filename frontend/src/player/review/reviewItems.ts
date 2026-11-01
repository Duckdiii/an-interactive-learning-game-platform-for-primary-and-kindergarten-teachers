import type { GameType } from '../../types/game-dsl.types'
import type { StudentGame, StudentQuestionByType } from '../../types/game-student.types'
import { viText } from '../../constants/viText'
import type { ReviewEntry } from '../play/playReducer'
import { REVIEW_DESCRIBERS, isNoAnswer, noAnswerLabel } from './describers'

export type ReviewFilter = 'all' | 'wrong'

export interface ReviewItem {
  no: number
  questionId: string
  /** `missing`: câu không có trong lịch sử (đã trả lời trước khi tải lại trang). */
  status: 'correct' | 'wrong' | 'missing'
  prompt: string
  chosen: string | null
  correct: string | null
}

/** Dựng danh sách xem lại theo thứ tự câu của game. Hàm thuần: không đọc gì ngoài tham số. */
export function buildReviewItems(game: StudentGame, history: ReviewEntry[]): ReviewItem[] {
  const describer = REVIEW_DESCRIBERS[game.gameType]
  const questions = game.questions as StudentQuestionByType[GameType][]

  return questions.map((question, index): ReviewItem => {
    const no = index + 1
    const entry = history.find((h) => h.questionId === question.id)
    const prompt = describer?.prompt(question as never) ?? viText.player.review.questionFallback(no)

    if (!entry) return { no, questionId: question.id, status: 'missing', prompt, chosen: null, correct: null }

    const { answer, result } = entry
    const chosen = isNoAnswer(answer) ? noAnswerLabel(answer) : (describer?.chosen(question as never, answer as never, result.correctAnswer) ?? null)

    return {
      no,
      questionId: question.id,
      status: result.isCorrect ? 'correct' : 'wrong',
      prompt,
      chosen,
      correct: describer?.correct(question as never, result.correctAnswer) ?? null,
    }
  })
}

/** `wrong` gồm sai, hết giờ, bỏ qua; không gồm `missing`. */
export const filterReview = (items: ReviewItem[], filter: ReviewFilter) => (filter === 'all' ? items : items.filter((item) => item.status === 'wrong'))

/** Dòng trả lời của thẻ; null = không có gì để hiện. */
export function describeAnswerLine(item: ReviewItem): string | null {
  const text = viText.player.review

  if (item.status === 'missing') return text.missing
  if (item.chosen === null) return null

  const chosen = `${text.chosen}: ${item.chosen}`

  return item.status === 'wrong' && item.correct !== null ? `${chosen} · ${text.correctAnswer}: ${item.correct}` : chosen
}
