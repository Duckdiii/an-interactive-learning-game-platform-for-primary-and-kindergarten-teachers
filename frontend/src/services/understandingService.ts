import { postUnderstandGame } from '../api/gamesApi'
import { isMock } from '../config/mockMode'
import type { GameUnderstandingResponse, UnderstandGameRequest } from '../types/understanding.types'
import { mockUnderstandGame } from './mock/mockUnderstanding'

/** Phân tích yêu cầu trong khung chat tạo game. Nhóm `ai` đang mô phỏng thì dùng bản giả lập; ngược lại gọi `POST /games/understand`. */
export function understandGame(request: UnderstandGameRequest, options: { signal?: AbortSignal } = {}): Promise<GameUnderstandingResponse> {
  if (isMock('ai')) return mockUnderstandGame(request)

  return postUnderstandGame(request, options)
}
