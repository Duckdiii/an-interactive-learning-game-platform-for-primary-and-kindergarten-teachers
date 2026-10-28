import { summarizeQuestion } from '../../utils/questionSummary'
import { getMockGame } from '../mock/mockGames'
import type { GameInsights, InsightsSessionType, QuestionInsight } from './HomeApi'

// Số liệu mẫu xác định (không ngẫu nhiên) dựng từ câu hỏi của game mô phỏng. Tỉ lệ đúng theo thứ tự câu; câu thứ 4 (hoặc
// câu cuối nếu game ngắn hơn) luôn yếu để màn hình có câu "cần ôn lại". Game không có trong kho mô phỏng thì chưa có lượt chơi.

const BASE_RATES = [0.92, 0.85, 0.78, 0.88, 0.66, 0.73, 0.95]
const WEAK_RATE = 0.41
// Ngưỡng đề xuất ở API-CONTRACT 2.8.
const REVIEW_BELOW = 0.6
const REVIEW_MIN_ANSWERS = 5

const PLAYS: Record<InsightsSessionType | 'ALL', number> = { ALL: 26, SOLO: 12, TEAM: 18, SELF: 8 }
// Phòng thi đấu khó hơn một chút, chơi ở nhà dễ hơn một chút; câu yếu vẫn yếu.
const RATE_SHIFT: Record<InsightsSessionType | 'ALL', number> = { ALL: 0, SOLO: 0.02, TEAM: -0.04, SELF: 0.05 }

const round = (value: number, digits: number) => Number(value.toFixed(digits))
const mean = (values: number[]) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0)

function buildQuestion(text: string, index: number, total: number, plays: number, shift: number): QuestionInsight {
  const weak = index === Math.min(3, total - 1)
  const rate = weak ? WEAK_RATE + shift : Math.min(0.98, BASE_RATES[index % BASE_RATES.length] + shift)
  const correctRate = round(rate, 2)
  const wrong = Math.round(plays * (1 - correctRate))

  return {
    questionId: `q${index + 1}`,
    order: index + 1,
    text,
    answeredCount: plays,
    correctRate,
    avgAttempts: round(1 + (1 - correctRate) * 1.8, 1),
    needsReview: correctRate < REVIEW_BELOW && plays >= REVIEW_MIN_ANSWERS,
    commonWrong: correctRate < 0.8 && wrong >= 2 ? [{ label: 'chọn nhầm đáp án khác', count: Math.ceil(wrong * 0.6) }] : [],
  }
}

export function buildMockInsights(gameId: string, sessionType?: InsightsSessionType): GameInsights {
  let game
  try {
    game = getMockGame(gameId)
  } catch {
    return { playCount: 0, correctRate: 0, avgAttemptsPerQuestion: 0, questions: [] }
  }

  const key = sessionType ?? 'ALL'
  const questions = game.questions.map((question, index) =>
    buildQuestion(summarizeQuestion(game.gameType, question), index, game.questions.length, PLAYS[key], RATE_SHIFT[key]),
  )

  return {
    playCount: PLAYS[key],
    correctRate: round(mean(questions.map((question) => question.correctRate)), 2),
    avgAttemptsPerQuestion: round(mean(questions.map((question) => question.avgAttempts)), 1),
    questions,
  }
}
