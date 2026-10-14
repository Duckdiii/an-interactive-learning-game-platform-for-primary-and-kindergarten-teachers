import { getGames } from '../api/gamesApi'
import { isMock } from '../config/mockMode'
import type { GameFilters, GameSummary } from '../types/game-summary.types'
import { listMockGames } from './mock/mockGames'
import { runMock } from './mock/mockRuntime'

// Lớp service cho nhóm endpoint `games`: nhóm đang mô phỏng thì trả dữ liệu mẫu, ngược lại gọi API thật. Giao diện chỉ
// gọi các hàm ở đây, nên khi backend sẵn sàng chỉ cần tắt cờ `games`, không phải sửa trang nào.

export async function listGames(filters: GameFilters): Promise<GameSummary[]> {
  if (!isMock('games')) return getGames(filters)

  return runMock((scenario) => (scenario === 'empty' ? [] : listMockGames(filters)))
}
