import { runMock } from '../mock/mockRuntime'
import { buildMockInsights } from './mockInsights'
import type { GameInsights, HomeApi, InsightsSessionType, LiveSession, ReviewNeeded } from './HomeApi'

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

const NO_INSIGHTS: GameInsights = { playCount: 0, correctRate: 0, avgAttemptsPerQuestion: 0, questions: [] }

export class MockHomeApi implements HomeApi {
  listLiveSessions() {
    return runMock((scenario) => (scenario === 'empty' ? [] : LIVE))
  }

  listReviewNeeded(limit: number) {
    return runMock((scenario) => (scenario === 'empty' ? [] : REVIEW.slice(0, limit)))
  }

  getGameInsights(gameId: string, sessionType?: InsightsSessionType) {
    return runMock((scenario) => (scenario === 'empty' ? NO_INSIGHTS : buildMockInsights(gameId, sessionType)))
  }
}
