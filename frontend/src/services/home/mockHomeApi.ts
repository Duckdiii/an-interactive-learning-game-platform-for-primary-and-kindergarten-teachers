import { notFoundError } from '../mock/mockErrors'
import { runMock } from '../mock/mockRuntime'
import { buildMockInsights } from './mockInsights'
import type {
  GameInsights,
  HomeApi,
  InsightsSessionType,
  LiveSession,
  QuestionInsightDetail,
  ReviewNeeded,
} from './HomeApi'

// Dữ liệu mẫu theo wireframe A-Home. Kịch bản `empty` của mockRuntime cho danh sách trống.
const LIVE: LiveSession[] = [
  {
    sessionId: 'mock-session-1',
    gameId: 'mock-game-1',
    gameTitle: 'Đếm số đến 10',
    status: 'ACTIVE',
    participantCount: 24,
    currentQuestionIndex: 2,
    questionCount: 10,
  },
]

const REVIEW: ReviewNeeded[] = [
  {
    gameId: 'mock-game-2',
    gameTitle: 'Ghép chữ về gia đình',
    questionId: 'mock-q-1',
    questionText: 'CHỊ',
    correctRate: 0.41,
    commonWrong: { label: 'CHI', count: 9 },
  },
]

const NO_INSIGHTS: GameInsights = { playCount: 0, correctRate: 0, avgAttemptsPerQuestion: 0, completionRate: 0, avgScore: 0, lowSample: false, questions: [] }

export class MockHomeApi implements HomeApi {
  listLiveSessions() {
    return runMock((scenario) => (scenario === 'empty' ? [] : LIVE))
  }

  listReviewNeeded(limit: number) {
    return runMock((scenario) => (scenario === 'empty' ? [] : REVIEW.slice(0, limit)))
  }

  // Khoảng ngày bị bỏ qua: số liệu mẫu không có ngày.
  getGameInsights(gameId: string, sessionType?: InsightsSessionType) {
    return runMock((scenario) => (scenario === 'empty' ? NO_INSIGHTS : buildMockInsights(gameId, sessionType)))
  }

  getQuestionInsights(gameId: string, questionId: string, sessionType?: InsightsSessionType) {
    return runMock((): QuestionInsightDetail => {
      const question = buildMockInsights(gameId, sessionType).questions.find((item) => item.questionId === questionId)
      if (!question) throw notFoundError()

      const correct = Math.round(question.answeredCount * question.correctRate)
      const wrong = question.commonWrong.map((item) => ({ label: item.label, count: item.count, correct: false }))

      return {
        questionId: question.questionId,
        order: question.order,
        text: question.text,
        answeredCount: question.answeredCount,
        correctRate: question.correctRate,
        needsReview: question.needsReview,
        distribution: [{ label: 'Đáp án đúng', count: correct, correct: true }, ...wrong],
        otherCount: Math.max(0, question.answeredCount - correct - wrong.reduce((sum, item) => sum + item.count, 0)),
        noAnswerCount: 0,
      }
    })
  }
}
