import { fetchGame, saveGame } from '../api/gamesApi'
import { isMock } from '../config/mockMode'
import type { GameEnvelopeBody, GameResponse } from '../types/game-response.types'
import { notFoundError } from './mock/mockErrors'
import { getMockGame, saveMockGame } from './mock/mockGames'
import { runMock } from './mock/mockRuntime'

// Lớp service cho nhóm endpoint `editor` (mở, lưu một game): nhóm đang mô phỏng thì dùng kho game mẫu, ngược lại gọi API
// thật. Lỗi mô phỏng (404, 409, 400) có đúng hình dạng lỗi của backend nên `parseApiError` xử lý như nhau.

/** `GET /games/{gameId}`: mở một game để soạn thảo. */
export async function getGame(gameId: string): Promise<GameResponse> {
  if (!isMock('editor')) return fetchGame(gameId)

  // Kịch bản "trống" nghĩa là giáo viên chưa có game nào, nên mở thẳng một địa chỉ game cũng không tìm thấy.
  return runMock((scenario) => {
    if (scenario === 'empty') throw notFoundError()

    return getMockGame(gameId)
  })
}

/** `PUT /games/{gameId}`: lưu bản nháp hoặc chỉnh sửa; trả game sau khi lưu (có `updatedAt` mới). */
export async function updateGame(gameId: string, body: GameEnvelopeBody): Promise<GameResponse> {
  if (!isMock('editor')) return saveGame(gameId, body)

  return runMock(() => saveMockGame(gameId, body))
}
