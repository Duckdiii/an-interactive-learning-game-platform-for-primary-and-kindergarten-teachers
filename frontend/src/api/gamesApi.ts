import { AI_ATTEMPT_TIMEOUT_MS, AI_BACKEND_ATTEMPTS, GENERATE_GAME_TIMEOUT_MS, PUBLISH_REQUEST_TIMEOUT_MS, REGENERATE_QUESTION_TIMEOUT_MS } from '../constants/aiLimits'
import axiosInstance from './axiosInstance'
import type { ApiSuccessResponse } from '../types/api'
import type { PublishResult } from '../types/publish.types'
import type { RegeneratedQuestion } from '../types/regenerate.types'
import type { GenerateGameRequest } from '../utils/generateRequest'
import type { GameEnvelopeBody, GameResponse } from '../types/game-response.types'
import type { GameFilters, GameSummary } from '../types/game-summary.types'

// Chỉ áp cho lệnh đọc danh sách: nếu máy chủ treo thì báo lỗi sau 10 giây thay vì quay vô hạn.
// Không đặt timeout chung trên axiosInstance vì các lệnh khác (ví dụ sinh game bằng AI) có thể chạy lâu hơn.
export const GAMES_REQUEST_TIMEOUT_MS = 10_000
// Mở và lưu một game: nội dung lớn hơn danh sách nên cho dài hơn một chút.
export const GAME_REQUEST_TIMEOUT_MS = 15_000

// Hằng số thời gian chờ của lời gọi AI nằm ở `constants/aiLimits.ts` (dùng chung với AI mô phỏng); xuất lại ở đây cho nơi dùng API.
export { AI_ATTEMPT_TIMEOUT_MS, AI_BACKEND_ATTEMPTS, GENERATE_GAME_TIMEOUT_MS, PUBLISH_REQUEST_TIMEOUT_MS, REGENERATE_QUESTION_TIMEOUT_MS }

export async function getGames(filters: GameFilters) {
  const response = await axiosInstance.get<ApiSuccessResponse<GameSummary[]>>(
    '/games',
    {
      timeout: GAMES_REQUEST_TIMEOUT_MS,
      params: {
        subject: filters.subject || undefined,
        gradeLevel: filters.gradeLevel || undefined,
        status: filters.status || undefined,
      },
    },
  )

  return response.data.data
}

/** GET /games/{gameId}: mở một game đầy đủ (kèm câu hỏi) cho trình soạn thảo. */
export async function fetchGame(gameId: string) {
  const response = await axiosInstance.get<ApiSuccessResponse<GameResponse>>(
    `/games/${encodeURIComponent(gameId)}`,
    { timeout: GAME_REQUEST_TIMEOUT_MS },
  )

  return response.data.data
}

/** PUT /games/{gameId}: lưu bản nháp hoặc chỉnh sửa; thân là phần envelope DSL. */
export async function saveGame(gameId: string, body: GameEnvelopeBody) {
  const response = await axiosInstance.put<ApiSuccessResponse<GameResponse>>(
    `/games/${encodeURIComponent(gameId)}`,
    body,
    { timeout: GAME_REQUEST_TIMEOUT_MS },
  )

  return response.data.data
}

export interface RegenerateQuestionOptions {
  // Gợi ý điều chỉnh của giáo viên (tối đa 500 ký tự); trống thì không gửi thân yêu cầu.
  feedback?: string
  signal?: AbortSignal
}

/**
 * POST /games/{gameId}/questions/{questionId}/regenerate: AI làm lại MỘT câu theo bản ĐÃ LƯU trên máy chủ. Trả câu mới (giữ nguyên `id`),
 * KHÔNG tự lưu: nơi gọi ghép vào bản đang soạn. Câu chưa lưu thì máy chủ không biết mã câu và trả 404.
 */
export async function postRegenerateQuestion(gameId: string, questionId: string, options: RegenerateQuestionOptions = {}) {
  const feedback = options.feedback?.trim()
  const response = await axiosInstance.post<ApiSuccessResponse<RegeneratedQuestion>>(
    `/games/${encodeURIComponent(gameId)}/questions/${encodeURIComponent(questionId)}/regenerate`,
    feedback ? { feedback } : undefined,
    { timeout: REGENERATE_QUESTION_TIMEOUT_MS, signal: options.signal },
  )

  return response.data.data
}

/**
 * POST /games/generate (bản JSON đồng bộ): AI sinh MỘT game nháp theo yêu cầu. Muốn nhiều loại thì gọi nhiều lần, mỗi lần một `gameType`.
 * Không tự thử lại (Backend đã thử lại dịch vụ AI; giới hạn 10 yêu cầu mỗi phút nên thử lại tự động còn dễ chạm 429).
 */
export async function postGenerateGame(request: GenerateGameRequest, signal?: AbortSignal) {
  const response = await axiosInstance.post<ApiSuccessResponse<GameResponse>>('/games/generate', request, {
    timeout: GENERATE_GAME_TIMEOUT_MS,
    signal,
  })

  return response.data.data
}

/**
 * POST /games/{gameId}/publish: LƯU nội dung mới nhất rồi xuất bản trong một thao tác (UC-07). Gọi lại khi đã xuất bản vẫn 200 và giữ nguyên mã chia sẻ.
 * Không tự thử lại: lỗi thì giáo viên bấm lại (an toàn vì thao tác lặp lại được).
 */
export async function postPublishGame(gameId: string, body: GameEnvelopeBody, signal?: AbortSignal) {
  const response = await axiosInstance.post<ApiSuccessResponse<PublishResult>>(
    `/games/${encodeURIComponent(gameId)}/publish`,
    body,
    { timeout: PUBLISH_REQUEST_TIMEOUT_MS, signal },
  )

  return response.data.data
}
