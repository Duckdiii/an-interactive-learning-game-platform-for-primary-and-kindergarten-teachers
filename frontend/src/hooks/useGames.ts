import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { listGames } from '../services/gamesService'
import type { GameSummary } from '../types/game-summary.types'
import { useAuth } from './useAuth'

// Mặc định react-query thử lại 3 lần (hơn 7 giây mới báo lỗi). Lệnh đọc danh sách chỉ thử lại 1 lần, và không thử
// lại khi đã quá hạn (máy chủ treo): thử lại chỉ làm giáo viên chờ gấp đôi mà hiếm khi có kết quả khác.
export function shouldRetryGames(failureCount: number, error: unknown) {
  const isTimeout =
    axios.isAxiosError(error) &&
    (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT')

  return failureCount < 1 && !isTimeout
}

const NO_FILTERS = { subject: '', gradeLevel: '', status: '' }

// Tải toàn bộ danh sách game của giáo viên MỘT lần (API chưa phân trang, đã sắp theo updatedAt giảm dần) rồi lọc,
// tìm kiếm, đếm ở máy. Nhờ vậy đổi bộ lọc không phải chờ tải lại và Trang chủ dùng chung dữ liệu với "Trò chơi của tôi".
// Khóa truy vấn có danh tính giáo viên: máy dùng chung ở trường, cô B đăng nhập sau cô A không bao giờ thấy danh sách
// (kèm mã chơi) còn trong bộ nhớ đệm của cô A.
export function useGames() {
  const { user } = useAuth()
  const owner = user?.teacherId ?? user?.email ?? 'anonymous'

  return useQuery({
    queryKey: ['games', owner],
    queryFn: () => listGames(NO_FILTERS),
    retry: shouldRetryGames,
  })
}

export interface GameStats {
  total: number
  draft: number
  published: number
}

export function countGames(games: ReadonlyArray<GameSummary>): GameStats {
  return {
    total: games.length,
    draft: games.filter((game) => game.status === 'DRAFT').length,
    published: games.filter((game) => game.status === 'PUBLISHED').length,
  }
}

// Mới cập nhật nhất trước (không tin hoàn toàn vào thứ tự của máy chủ).
export function sortByUpdatedDesc(games: ReadonlyArray<GameSummary>) {
  return [...games].sort(
    (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
  )
}
