import type { GameEnvelopeBody } from '../../types/game-response.types'
import type { PublishResult } from '../../types/publish.types'
import { mockApiError } from './mockErrors'
import { publishMockGame, saveMockGame } from './mockGames'
import { getMockScenario, mockNetworkError, mockTimeoutError, mockTotalDelayMs, mockWait } from './mockRuntime'

// Xuất bản MÔ PHỎNG (nhóm "editor"): thêm độ trễ và các kịch bản lỗi của UC-07 để thử giao diện mà không cần Backend.
// "save": không lưu được (2a); "share": đã lưu nhưng chưa tạo được mã chia sẻ (2b). Contract chưa phân biệt 2a và 2b (cùng 500): mã SHARE_CODE_UNAVAILABLE là
// ĐỀ XUẤT cho Backend (docs/decisions.md).
export type MockPublishFailure = 'save' | 'share'

export const SHARE_CODE_UNAVAILABLE = 'SHARE_CODE_UNAVAILABLE'

let failure: MockPublishFailure | null = null
let calls = 0

export function setMockPublishFailure(next: MockPublishFailure | null) {
  failure = next
}

/** Số lần gọi xuất bản từ lúc đặt lại (để kiểm không gọi thừa). */
export const getMockPublishCalls = () => calls

export function resetMockPublish() {
  failure = null
  calls = 0
}

export async function mockPublishGame(gameId: string, body: GameEnvelopeBody, signal?: AbortSignal): Promise<PublishResult> {
  calls += 1

  await mockWait(mockTotalDelayMs() * 2, signal)

  const scenario = getMockScenario()

  if (scenario === 'error') throw mockNetworkError()
  if (scenario === 'timeout') throw mockTimeoutError()
  if (failure === 'save') throw mockApiError(500, 'INTERNAL_ERROR', 'Không lưu được trò chơi.')

  if (failure === 'share') {
    saveMockGame(gameId, body)

    throw mockApiError(500, SHARE_CODE_UNAVAILABLE, 'Không tạo được mã chia sẻ.')
  }

  return publishMockGame(gameId, body)
}
