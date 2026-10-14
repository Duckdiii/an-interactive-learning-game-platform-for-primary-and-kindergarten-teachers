import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { getGame } from '../services/gameService'
import { useTeacherIdentity } from './useTeacherIdentity'

// Mở game: 404 và các lỗi 4xx khác là kết quả chắc chắn (thử lại không đổi được), quá hạn thì thử lại chỉ làm giáo viên chờ
// gấp đôi. Chỉ lỗi mạng hoặc 5xx mới thử lại một lần.
export function shouldRetryGame(failureCount: number, error: unknown) {
  if (failureCount >= 1) return false
  if (!axios.isAxiosError(error)) return false
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') return false

  const status = error.response?.status

  return status === undefined || status >= 500
}

// Khóa truy vấn có danh tính giáo viên (cùng lý do với `useGames`): máy dùng chung không lộ game của người trước.
export const gameQueryKey = (owner: string, gameId: string | null) => ['game', owner, gameId] as const

export function useGame(gameId: string | null) {
  const { cacheOwner } = useTeacherIdentity()

  return useQuery({
    queryKey: gameQueryKey(cacheOwner ?? '', gameId),
    queryFn: () => getGame(gameId ?? ''),
    enabled: Boolean(gameId) && cacheOwner !== null,
    retry: shouldRetryGame,
  })
}
