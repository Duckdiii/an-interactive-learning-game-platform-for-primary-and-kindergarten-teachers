import { describe, expect, it } from 'vitest'
import { buildMockInsights } from './mockInsights'

describe('buildMockInsights', () => {
  it('xác định, có câu cần ôn kèm lỗi hay gặp và số liệu nhất quán', () => {
    const insights = buildMockInsights('mock-game-1')

    expect(buildMockInsights('mock-game-1')).toEqual(insights)
    expect(insights.playCount).toBe(26)
    expect(insights.questions.length).toBeGreaterThan(0)
    const weak = insights.questions.filter((question) => question.needsReview)
    expect(weak.length).toBeGreaterThanOrEqual(1)
    expect(weak[0].commonWrong.length).toBeGreaterThan(0)
    for (const question of insights.questions) {
      expect(question.correctRate).toBeGreaterThanOrEqual(0)
      expect(question.correctRate).toBeLessThanOrEqual(1)
      expect(question.answeredCount).toBe(insights.playCount)
    }
  })

  it('sessionType đổi số lượt', () => {
    expect(buildMockInsights('mock-game-1', 'TEAM').playCount).toBeLessThan(buildMockInsights('mock-game-1').playCount)
    expect(buildMockInsights('mock-game-1', 'SELF').playCount).not.toBe(buildMockInsights('mock-game-1', 'TEAM').playCount)
  })

  it('game không có trong kho mô phỏng thì chưa có lượt chơi', () => {
    expect(buildMockInsights('khong-co')).toEqual({ playCount: 0, correctRate: 0, avgAttemptsPerQuestion: 0, questions: [] })
  })
})
