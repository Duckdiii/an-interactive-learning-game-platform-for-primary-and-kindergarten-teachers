import { getGames, postGenerateGame } from '../api/gamesApi'
import { isMock } from '../config/mockMode'
import type { GameResponse } from '../types/game-response.types'
import type { GameFilters, GameSummary } from '../types/game-summary.types'
import { GenerateBlockedError } from '../utils/generateErrors'
import { MAX_GAMES_PER_REQUEST } from '../utils/generateRequest'
import type { GenerateGameRequest } from '../utils/generateRequest'
import { listMockGames } from './mock/mockGames'
import { mockGenerateGame } from './mock/mockGenerate'
import { runMock } from './mock/mockRuntime'

// Lớp service cho nhóm endpoint `games`: nhóm đang mô phỏng thì trả dữ liệu mẫu, ngược lại gọi API thật. Giao diện chỉ
// gọi các hàm ở đây, nên khi backend sẵn sàng chỉ cần tắt cờ `games`, không phải sửa trang nào.

export async function listGames(filters: GameFilters): Promise<GameSummary[]> {
  if (!isMock('games')) return getGames(filters)

  return runMock((scenario) => (scenario === 'empty' ? [] : listMockGames(filters)))
}

// Kết quả RIÊNG của từng loại game đã chọn: một loại lỗi không làm mất game của loại khác.
export type CreateGameOutcome =
  | { ok: true; gameType: string; game: GameResponse }
  | { ok: false; gameType: string; error: unknown }

function generateOne(request: GenerateGameRequest, signal?: AbortSignal): Promise<GameResponse> {
  // Nhóm "ai" đang mô phỏng thì dùng AI giả lập. Game mô phỏng nằm trong kho mô phỏng nên nhóm games và editor phải mô phỏng cùng.
  if (isMock('ai')) return mockGenerateGame(request, signal)

  // Lệch contract có chủ đích (xem utils/generateRequest.ts): giao diện cho bỏ trống khối lớp và môn, nhưng openapi.yaml bắt buộc. Không gọi API thật khi thiếu.
  if (!request.subject || !request.gradeLevel) return Promise.reject(new GenerateBlockedError())

  return postGenerateGame(request, signal)
}

/**
 * Tạo game bằng AI (UC-02), mỗi yêu cầu một loại game, chạy SONG SONG (tối đa ba, dưới giới hạn 10 yêu cầu mỗi phút) và trả kết quả riêng cho từng loại, theo đúng
 * thứ tự yêu cầu. Không tự thử lại (kể cả 429): giáo viên bấm "Thử lại" cho phần còn thiếu. `signal` hủy mọi yêu cầu đang chờ.
 */
export async function createGames(requests: ReadonlyArray<GenerateGameRequest>, signal?: AbortSignal): Promise<CreateGameOutcome[]> {
  if (requests.length > MAX_GAMES_PER_REQUEST) throw new RangeError('Tối đa ' + MAX_GAMES_PER_REQUEST + ' trò chơi mỗi lần tạo')

  const settled = await Promise.allSettled(requests.map((request) => generateOne(request, signal)))

  return settled.map((result, index): CreateGameOutcome => {
    const gameType = requests[index].gameType ?? ''

    return result.status === 'fulfilled' ? { ok: true, gameType, game: result.value } : { ok: false, gameType, error: result.reason }
  })
}
