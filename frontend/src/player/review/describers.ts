import { viText } from '../../constants/viText'
import type { GameType, PairSide } from '../../types/game-dsl.types'
import type { AnswerByType, AnswerPayload, NoAnswer, StudentQuestionByType } from '../../types/game-student.types'

const text = viText.player.review

type Matches = { leftPairId: string; rightPairId: string }[]

/** Cách mô tả một câu ở màn xem lại, theo loại game. `correctAnswer` là hình dạng máy chủ trả (đã kiểm ở chỗ gọi: có thể null/sai hình dạng). */
export interface ReviewDescriber<T extends GameType> {
  prompt: (question: StudentQuestionByType[T]) => string
  chosen: (question: StudentQuestionByType[T], answer: AnswerByType[T], correctAnswer: Record<string, unknown> | null) => string
  /** null = không dựng được đáp án đúng (thiếu hoặc sai hình dạng): không hiện vế "Đáp án đúng". */
  correct: (question: StudentQuestionByType[T], correctAnswer: Record<string, unknown> | null) => string | null
}

export type AnyReviewDescriber = {
  prompt: (question: never) => string
  chosen: (question: never, answer: never, correctAnswer: Record<string, unknown> | null) => string
  correct: (question: never, correctAnswer: Record<string, unknown> | null) => string | null
}

const label = (side: PairSide | undefined) => side?.text ?? side?.visualPrompt ?? text.unknownOption

const readMatches = (correctAnswer: Record<string, unknown> | null): Matches | null => {
  const value = correctAnswer?.matches

  if (!Array.isArray(value)) return null

  const valid = value.every((m) => typeof m?.leftPairId === 'string' && typeof m?.rightPairId === 'string')

  return valid ? (value as Matches) : null
}

const QUIZ: ReviewDescriber<'QUIZ'> = {
  prompt: (q) => q.questionText,
  chosen: (q, a) => q.options.find((o) => o.id === a.selectedOptionId)?.text ?? text.unknownOption,
  correct: (q, correctAnswer) => {
    const id = correctAnswer?.selectedOptionId

    return typeof id === 'string' ? (q.options.find((o) => o.id === id)?.text ?? text.unknownOption) : null
  },
}

const MATCHING: ReviewDescriber<'MATCHING'> = {
  prompt: () => text.matchingPrompt,
  chosen: (_q, a, correctAnswer) => {
    const expected = readMatches(correctAnswer)

    // Không có đáp án đúng để so: chỉ nói đã nối bao nhiêu cặp, không khẳng định đúng.
    if (!expected) return text.matchedCount(a.matches.length)

    const key = (m: Matches[number]) => `${m.leftPairId}\u0000${m.rightPairId}`
    const wanted = new Set(expected.map(key))
    const hit = new Set(a.matches.map(key).filter((k) => wanted.has(k))).size

    return hit >= expected.length ? text.matchedAll(expected.length) : text.matchedSome(hit, expected.length)
  },
  correct: (q, correctAnswer) => {
    const matches = readMatches(correctAnswer)

    if (!matches) return null

    return matches
      .map((m) => `${label(q.leftItems.find((i) => i.id === m.leftPairId))} – ${label(q.rightItems.find((i) => i.id === m.rightPairId))}`)
      .join('; ')
  },
}

const ODD_ONE_OUT: ReviewDescriber<'ODD_ONE_OUT'> = {
  prompt: () => viText.player.oddOneOutPrompt,
  chosen: (q, a) => q.items.find((i) => i.id === a.selectedItemId)?.text ?? text.unknownOption,
  correct: (q, correctAnswer) => {
    const id = correctAnswer?.selectedItemId

    return typeof id === 'string' ? (q.items.find((i) => i.id === id)?.text ?? text.unknownOption) : null
  },
}

const VISUAL_CLOZE: ReviewDescriber<'VISUAL_CLOZE'> = {
  prompt: (q) => q.sentenceTemplate,
  chosen: (_q, a) => a.answer,
  correct: (_q, correctAnswer) => (typeof correctAnswer?.answer === 'string' ? correctAnswer.answer : null),
}

// Điểm xóa kiểu duy nhất, như `renderers/index.ts`: mỗi describer ràng buộc đúng loại game khi đăng ký.
const define = <T extends GameType>(describer: ReviewDescriber<T>) => describer as unknown as AnyReviewDescriber

/** Loại chưa có describer: màn xem lại hiện "Câu {i}" và không có dòng chi tiết. */
export const REVIEW_DESCRIBERS: Partial<Record<GameType, AnyReviewDescriber>> = {
  QUIZ: define(QUIZ),
  MATCHING: define(MATCHING),
  ODD_ONE_OUT: define(ODD_ONE_OUT),
  VISUAL_CLOZE: define(VISUAL_CLOZE),
}

export const isNoAnswer = (answer: AnswerPayload): answer is NoAnswer => 'outcome' in answer

export const noAnswerLabel = (answer: NoAnswer) => (answer.outcome === 'TIMEOUT' ? text.timeout : text.skipped)
