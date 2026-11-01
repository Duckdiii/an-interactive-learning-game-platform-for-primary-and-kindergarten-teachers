import { HomeApiNotSupportedError } from './HomeApi'
import type { HomeApi } from './HomeApi'

// Cả ba endpoint còn đề xuất (API-CONTRACT 2.10, 2.8). Khi Backend cài xong, thay bằng lời gọi axiosInstance.
export class RealHomeApi implements HomeApi {
  listLiveSessions(): Promise<never> {
    return Promise.reject(new HomeApiNotSupportedError('GET /sessions'))
  }

  listReviewNeeded(): Promise<never> {
    return Promise.reject(new HomeApiNotSupportedError('GET /insights/review-needed'))
  }

  getGameInsights(): Promise<never> {
    return Promise.reject(new HomeApiNotSupportedError('GET /games/{gameId}/insights'))
  }
}
