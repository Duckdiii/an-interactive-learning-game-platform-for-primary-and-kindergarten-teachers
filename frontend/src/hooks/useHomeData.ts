import { useQuery } from '@tanstack/react-query'
import { getHomeApi, HomeApiNotSupportedError } from '../services/home'
import type { GameInsights, HomeApi, InsightsSessionType, LiveSession, ReviewNeeded } from '../services/home'
import { useTeacherIdentity } from './useTeacherIdentity'

export const REVIEW_LIMIT = 3

interface HomeList<T> {
  items: T[]
  isSample: boolean
}

// Endpoint chưa có (NotSupported) coi như danh sách trống để màn hình hiện trạng thái trống, không báo lỗi.
async function load<T>(
  group: 'sessions' | 'results',
  fetch: (api: HomeApi) => Promise<T[]>,
): Promise<HomeList<T>> {
  const { api, isSample } = await getHomeApi(group)

  try {
    return { items: await fetch(api), isSample }
  } catch (error) {
    if (error instanceof HomeApiNotSupportedError) return { items: [], isSample }
    throw error
  }
}

export function useLiveSessions() {
  const { cacheOwner } = useTeacherIdentity()

  return useQuery({
    queryKey: ['home', 'live-sessions', cacheOwner ?? ''],
    queryFn: () => load<LiveSession>('sessions', (api) => api.listLiveSessions()),
    enabled: cacheOwner !== null,
    retry: 1,
  })
}

export function useReviewNeeded() {
  const { cacheOwner } = useTeacherIdentity()

  return useQuery({
    queryKey: ['home', 'review-needed', cacheOwner ?? ''],
    queryFn: () => load<ReviewNeeded>('results', (api) => api.listReviewNeeded(REVIEW_LIMIT)),
    enabled: cacheOwner !== null,
    retry: 1,
  })
}

export interface InsightsResult {
  // null khi Backend chưa có endpoint (NotSupported): trang hiện "Chưa có số liệu", không báo lỗi.
  insights: GameInsights | null
  isSample: boolean
}

export function useGameInsights(gameId: string | null, sessionType?: InsightsSessionType) {
  const { cacheOwner } = useTeacherIdentity()

  return useQuery({
    queryKey: ['results', 'insights', cacheOwner ?? '', gameId ?? '', sessionType ?? 'ALL'],
    queryFn: async (): Promise<InsightsResult> => {
      const { api, isSample } = await getHomeApi('results')

      try {
        return { insights: await api.getGameInsights(gameId ?? '', sessionType), isSample }
      } catch (error) {
        if (error instanceof HomeApiNotSupportedError) return { insights: null, isSample }
        throw error
      }
    },
    enabled: cacheOwner !== null && gameId !== null,
    retry: 1,
  })
}
