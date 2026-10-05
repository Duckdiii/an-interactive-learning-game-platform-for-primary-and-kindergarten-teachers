import type { PairSide } from '../../types/game-dsl.types'
import type { AnswerResult } from '../common/answerResult'

/** Một ô trong cột trái hoặc phải. `id` là `pairId` thật (dạng giáo viên) hoặc mã mờ (dạng học sinh). */
export interface MatchingItem {
  id: string
  content: PairSide
}

/** Dữ liệu đã chuẩn hoá mà renderer vẽ: hai cột theo đúng thứ tự hiển thị từ trên xuống. */
export interface MatchingView {
  leftItems: MatchingItem[]
  rightItems: MatchingItem[]
}

/**
 * Một cặp trẻ đã nối. Tên field trùng phần trả lời của MATCHING trong DSL mục 5.6
 * (`matches[{leftPairId, rightPairId}]`), nên gửi thẳng được lên `POST /sessions/{id}/interactions`.
 */
export interface PairLink {
  leftPairId: string
  rightPairId: string
}

/** `correctAnswer` của MATCHING trong response chấm: toàn bộ các cặp đúng. */
export interface MatchingCorrectAnswer {
  matches: PairLink[]
}

export type MatchingAnswerResult = AnswerResult<MatchingCorrectAnswer>
