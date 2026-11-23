import { postRegenerateQuestion } from '../api/gamesApi'
import { isMock } from '../config/mockMode'
import type { RegeneratedQuestion } from '../types/regenerate.types'
import { mockRegenerateQuestion } from './mock/mockAi'
import type { MockRegenerateRequest } from './mock/mockAi'

export type RegenerateQuestionRequest = MockRegenerateRequest

/**
 * Yêu cầu AI làm lại MỘT câu (UC-06). Nhóm `ai` đang mô phỏng thì dùng AI giả lập; ngược lại gọi `POST .../regenerate`.
 *
 * - Kết quả chưa được lưu: nơi gọi tự ghép vào bản đang soạn.
 * - Không tự thử lại: Backend đã gọi lại dịch vụ AI tối đa 2 lần trước khi báo lỗi (xem `REGENERATE_QUESTION_TIMEOUT_MS`).
 * - `voice` và `current` chỉ dùng cho bản mô phỏng: `openapi.yaml` hiện chưa có trường giọng đọc trong yêu cầu (xem docs/decisions.md mục 10)
 *   và Backend tự đọc câu hiện tại từ bản đã lưu.
 */
export function regenerateQuestion(request: RegenerateQuestionRequest, options: { signal?: AbortSignal } = {}): Promise<RegeneratedQuestion> {
  if (isMock('ai')) return mockRegenerateQuestion(request, options.signal)

  const { current, gameType, gameId, questionId, feedback } = request
  const withImageReview =
    (gameType === 'VISUAL_CLOZE' && 'sceneImageUrl' in current) ||
    (gameType === 'ODD_ONE_OUT' && 'items' in current && current.items.some((item) => 'assetId' in item)) ||
    gameType === 'AUDIO_VISUAL_MATCH'
  return postRegenerateQuestion(gameId, questionId, {
    feedback,
    signal: options.signal,
    ...(withImageReview ? { withImageReview } : {}),
  })
}
