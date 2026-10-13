import axiosInstance from './axiosInstance'
import type { ApiSuccessResponse } from '../types/api'
import type { GameFilters, GameSummary } from '../types/game-summary.types'

// Chỉ áp cho lệnh đọc danh sách: nếu máy chủ treo thì báo lỗi sau 10 giây thay vì quay vô hạn.
// Không đặt timeout chung trên axiosInstance vì các lệnh khác (ví dụ sinh game bằng AI) có thể chạy lâu hơn.
export const GAMES_REQUEST_TIMEOUT_MS = 10_000

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
