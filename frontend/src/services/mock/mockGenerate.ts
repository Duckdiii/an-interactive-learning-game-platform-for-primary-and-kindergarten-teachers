import type { GameResponse } from '../../types/game-response.types'
import type { GenerateGameRequest } from '../../utils/generateRequest'
import { MOCK_UNSAFE_HINT } from './mockAi'
import { mockApiError } from './mockErrors'
import { createMockGame } from './mockGames'
import { getMockScenario, mockNetworkError, mockTotalDelayMs, mockWait } from './mockRuntime'

// AI MÔ PHỎNG sinh game (UC-02, nhóm "ai" của cờ VITE_USE_MOCK). Backend chưa có POST /games/generate nên kết quả luôn là DỮ LIỆU MÔ PHỎNG: câu hỏi lấy từ bộ
// mẫu của loại game, KHÔNG khớp mô tả của giáo viên (xem createMockGame). Game chỉ được thêm vào kho khi lần sinh XONG; hủy giữa chừng thì không có game nào.
// (Backend thật có thể vẫn tạo game nháp mồ côi khi yêu cầu đã tới nơi mà giao diện hủy: xem docs/decisions.md.)

// Cách một loại game có thể thất bại trong test và khi kiểm tay.
export type MockGenerateFailure = 'timeout' | 'rateLimited' | 'unsafe'

const failures = new Map<string, MockGenerateFailure>()
let calls = 0

/** Chỉ cho test và kiểm tay: cho loại game này thất bại (hoặc bỏ lỗi nếu failure là null). */
export function setMockGenerateFailure(gameType: string, failure: MockGenerateFailure | null) {
  if (failure) failures.set(gameType, failure)
  else failures.delete(gameType)
}

/** Số lần gọi sinh game từ lúc đặt lại (để kiểm không thử lại thừa, không tạo trùng). */
export const getMockGenerateCalls = () => calls

export function resetMockGenerate() {
  failures.clear()
  calls = 0
}

export async function mockGenerateGame(request: GenerateGameRequest, signal?: AbortSignal): Promise<GameResponse> {
  calls += 1

  // Sinh game lâu hơn các lời gọi thường (tìm ảnh, tạo giọng đọc).
  await mockWait(mockTotalDelayMs() * 3, signal)

  const scenario = getMockScenario()
  const failure = request.gameType ? failures.get(request.gameType) : undefined

  if (scenario === 'error') throw mockNetworkError()
  if (scenario === 'timeout' || failure === 'timeout') throw mockApiError(504, 'AI_GENERATION_TIMEOUT', 'Dịch vụ AI không phản hồi kịp sau khi đã thử lại.')
  if (failure === 'rateLimited') throw mockApiError(429, 'RATE_LIMITED', 'Vượt giới hạn 10 yêu cầu mỗi phút.')
  if (failure === 'unsafe' || MOCK_UNSAFE_HINT.test(request.idea ?? '')) {
    throw mockApiError(422, 'UNSAFE_CONTENT', 'Nội dung không đạt chuẩn an toàn học đường.')
  }

  return createMockGame({ gameType: request.gameType ?? 'QUIZ', subject: request.subject, gradeLevel: request.gradeLevel, idea: request.idea })
}
