import { describe, expect, it } from 'vitest'
import type { AnswerResult, StudentGame } from '../../types/game-student.types'
import type { ReviewEntry } from '../play/playReducer'
import { buildReviewItems, describeAnswerLine, filterReview } from './reviewItems'

const game = {
  schemaVersion: '1.0.0',
  gameType: 'QUIZ',
  metadata: { title: 'Đếm', subject: 'MATH', gradeLevel: 'GRADE_1', topic: 'Đếm' },
  gameplaySettings: { hitboxScale: 1 },
  answeredQuestionIds: [],
  questions: ['q1', 'q2', 'q3', 'q4'].map((id) => ({
    id,
    timeLimitSeconds: 30,
    points: 10,
    questionText: `Hỏi ${id}`,
    options: [{ id: 'a', text: 'Một' }, { id: 'b', text: 'Hai' }],
  })),
} as StudentGame

const result = (isCorrect: boolean, correctAnswer: AnswerResult['correctAnswer'] = { selectedOptionId: 'a' }): AnswerResult => ({
  status: isCorrect ? 'CORRECT' : 'INCORRECT',
  isCorrect,
  pointsEarned: 0,
  totalScore: 0,
  correctAnswer,
})
// Cố ý không theo thứ tự câu: kết quả vẫn phải theo thứ tự của game.
const history: ReviewEntry[] = [
  { questionId: 'q3', answer: { outcome: 'TIMEOUT' }, result: { ...result(false), status: 'TIMEOUT' } },
  { questionId: 'q2', answer: { selectedOptionId: 'b' }, result: result(false) },
  { questionId: 'q1', answer: { selectedOptionId: 'a' }, result: result(true) },
]

describe('buildReviewItems', () => {
  const items = buildReviewItems(game, history)

  it('theo thứ tự câu của game; đúng, sai, hết giờ, thiếu', () => {
    expect(items.map((i) => [i.no, i.status])).toEqual([[1, 'correct'], [2, 'wrong'], [3, 'wrong'], [4, 'missing']])
    expect(items[1]).toMatchObject({ prompt: 'Hỏi q2', chosen: 'Hai', correct: 'Một' })
    expect(items[2].chosen).toBe('Hết giờ')
    expect(items[3]).toMatchObject({ chosen: null, correct: null })
  })

  it('correctAnswer null: không có phần đáp án đúng, không lỗi', () => {
    const [item] = buildReviewItems(game, [{ questionId: 'q1', answer: { selectedOptionId: 'b' }, result: result(false, null) }])

    expect(item).toMatchObject({ status: 'wrong', chosen: 'Hai', correct: null })
    expect(describeAnswerLine(item)).toBe('Bạn chọn: Hai')
  })

  it('loại chưa có describer: "Câu i", không dòng chi tiết', () => {
    const other = { ...game, gameType: 'DRAG_DROP' } as StudentGame
    const [item] = buildReviewItems(other, [{ questionId: 'q1', answer: { placements: [] }, result: result(false) }])

    expect(item).toMatchObject({ prompt: 'Câu 1', chosen: null, correct: null })
    expect(describeAnswerLine(item)).toBeNull()
  })
})

describe('filterReview', () => {
  const items = buildReviewItems(game, history)

  it('all giữ tất cả; wrong gồm sai và hết giờ, loại missing', () => {
    expect(filterReview(items, 'all')).toHaveLength(4)
    expect(filterReview(items, 'wrong').map((i) => i.no)).toEqual([2, 3])
  })
})

describe('describeAnswerLine', () => {
  const items = buildReviewItems(game, history)

  it('đúng, sai, thiếu', () => {
    expect(describeAnswerLine(items[0])).toBe('Bạn chọn: Một')
    expect(describeAnswerLine(items[1])).toBe('Bạn chọn: Hai · Đáp án đúng: Một')
    expect(describeAnswerLine(items[3])).toBe('Không có dữ liệu câu này (đã trả lời trước khi tải lại trang).')
  })
})
