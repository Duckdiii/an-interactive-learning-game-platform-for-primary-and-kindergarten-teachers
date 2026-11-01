import axiosInstance from './axiosInstance'
import type { ApiSuccessResponse } from '../types/api'
import type { GameFilters, GameSummary } from '../types/game-summary.types'
import type { GameDsl, Subject, GradeLevel } from '../types/game-dsl.types'

export interface GeneratedGameResponse {
  gameId: string
  game: GameDsl
  curriculum: {
    evidence: { chunks?: Array<{ chunkId: string; topic: string; text: string; sourceDocument: string; pdfPages: number[]; printedPages: number[] }> }
    review: { status: 'PENDING' | 'REVIEWED' | 'UNAVAILABLE' | 'STALE'; claims: unknown[]; warnings: unknown[] }
  }
}

export async function generateGame(input: {
  gameType: 'QUIZ'
  topic: string
  subject: Subject
  gradeLevel: GradeLevel
}) {
  const response = await axiosInstance.post<ApiSuccessResponse<GeneratedGameResponse>>(
    '/games/generate', input,
  )
  return response.data.data
}

export async function getGames(filters: GameFilters) {
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
