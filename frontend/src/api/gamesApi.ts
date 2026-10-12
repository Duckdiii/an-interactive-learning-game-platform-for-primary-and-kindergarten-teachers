import axiosInstance from './axiosInstance'
import type { ApiSuccessResponse } from '../types/api'
import type { GameFilters, GameSummary } from '../types/game'
import { getDemoGames } from '../demo/demoData'

export async function getGames(filters: GameFilters, isDemo = false) {
  if (import.meta.env.DEV && isDemo) {
    return getDemoGames(filters)
  }

  const response = await axiosInstance.get<ApiSuccessResponse<GameSummary[]>>(
    '/games',
    {
      params: {
        subject: filters.subject || undefined,
        gradeLevel: filters.gradeLevel || undefined,
        status: filters.status || undefined,
      },
    },
  )

  return response.data.data
}
