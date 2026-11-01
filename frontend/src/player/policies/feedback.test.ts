import { describe, expect, it } from 'vitest'
import type { AnswerResult, InteractionStatus } from '../../types/game-student.types'
import { feedbackRules } from './feedback'

const result = (status: InteractionStatus, pointsEarned = 0): AnswerResult => ({ status, isCorrect: status === 'CORRECT', pointsEarned, totalScore: pointsEarned, correctAnswer: null })
const STATUSES: InteractionStatus[] = ['CORRECT', 'INCORRECT', 'TIMEOUT', 'SKIPPED']

describe('feedbackRules', () => {
  it('garden: không điểm, không "sai", không "thua", không chuỗi ở bất kỳ kết quả nào', () => {
    const { message, showScore } = feedbackRules('garden')

    expect(showScore).toBe(false)
    for (const status of STATUSES) {
      const text = message(result(status, 10), 5)

      expect(text).not.toMatch(/sai|thua|điểm|hết giờ|chuỗi/i)
      expect(text.length).toBeGreaterThan(0)
    }
    expect(message(result('CORRECT'), 0)).toBe('Giỏi quá!')
  })

  it('score: hiện điểm nhận được khi đúng, báo hết giờ khi quá giờ', () => {
    const { message, showScore } = feedbackRules('score')

    expect(showScore).toBe(true)
    expect(message(result('CORRECT', 8), 1)).toBe('Chính xác! +8 điểm')
    expect(message(result('INCORRECT'), 0)).toBe('Chưa đúng. Xem đáp án nhé.')
    expect(message(result('TIMEOUT'), 0)).toBe('Hết giờ.')
  })

  it('score: nhắc chuỗi đúng liên tiếp từ 2 câu, và chỉ khi trả lời đúng', () => {
    const { message } = feedbackRules('score')

    expect(message(result('CORRECT', 10), 2)).toBe('Chính xác! +10 điểm · chuỗi đúng 2 câu')
    expect(message(result('CORRECT', 10), 1)).not.toMatch(/chuỗi/)
    expect(message(result('INCORRECT'), 3)).not.toMatch(/chuỗi/)
  })
})
