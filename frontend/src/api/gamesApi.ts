import axiosInstance from './axiosInstance'
import type { ApiSuccessResponse } from '../types/api'
import type { GameEnvelopeBody, GameResponse } from '../types/game-response.types'
import type { GameFilters, GameSummary } from '../types/game-summary.types'

// Chỉ áp cho lệnh đọc danh sách: nếu máy chủ treo thì báo lỗi sau 10 giây thay vì quay vô hạn.
// Không đặt timeout chung trên axiosInstance vì các lệnh khác (ví dụ sinh game bằng AI) có thể chạy lâu hơn.
export const GAMES_REQUEST_TIMEOUT_MS = 10_000
// Mở và lưu một game: nội dung lớn hơn danh sách nên cho dài hơn một chút.
export const GAME_REQUEST_TIMEOUT_MS = 15_000

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
