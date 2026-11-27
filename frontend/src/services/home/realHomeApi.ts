import { fetchGameInsights, fetchQuestionInsights, fetchReviewNeeded } from '../../api/gamesApi'
import { HomeApiNotSupportedError } from './HomeApi'
import type {
  GameInsights,
  HomeApi,
  InsightsRange,
  InsightsSessionType,
  QuestionInsightDetail,
  ReviewNeeded,
} from './HomeApi'

// Số liệu kết quả đã có endpoint thật; danh sách phiên đang diễn ra còn ở mức đề xuất (API-CONTRACT 2.10).
export class RealHomeApi implements HomeApi {
  listLiveSessions(): Promise<never> {
    return Promise.reject(new HomeApiNotSupportedError('GET /sessions'))
  }

  listReviewNeeded(limit: number): Promise<ReviewNeeded[]> {
    return fetchReviewNeeded(limit)
  }

  getGameInsights(gameId: string, sessionType?: InsightsSessionType, range?: InsightsRange): Promise<GameInsights> {
    return fetchGameInsights(gameId, sessionType, range)
  }

  getQuestionInsights(
    gameId: string,
    questionId: string,
    sessionType?: InsightsSessionType,
    range?: InsightsRange,
  ): Promise<QuestionInsightDetail> {
    return fetchQuestionInsights(gameId, questionId, sessionType, range)
  }
}
