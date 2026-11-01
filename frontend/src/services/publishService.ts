import { postPublishGame } from '../api/gamesApi'
import { isMock } from '../config/mockMode'
import type { GameEnvelopeBody } from '../types/game-response.types'
import type { PublishResult } from '../types/publish.types'
import { mockPublishGame } from './mock/mockPublish'

/**
 * Xuất bản game (UC-07): gửi nội dung mới nhất để Backend lưu rồi xuất bản trong một thao tác. Nhóm "editor" đang mô phỏng thì dùng bản giả lập (cùng kho game với
 * trình soạn thảo); ngược lại gọi POST /games/{id}/publish. Không tự thử lại; gọi lại an toàn vì xuất bản là thao tác lặp lại được.
 */
export function publishGame(gameId: string, body: GameEnvelopeBody, options: { signal?: AbortSignal } = {}): Promise<PublishResult> {
  return isMock('editor') ? mockPublishGame(gameId, body, options.signal) : postPublishGame(gameId, body, options.signal)
}
