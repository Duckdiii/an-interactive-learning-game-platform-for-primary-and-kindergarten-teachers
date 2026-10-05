import type { MatchingQuestion } from '../../types/game-dsl.types'
import type { MatchingStudentQuestion } from '../../types/game-student.types'
import { seededDerangement } from '../common/seededDerangement'
import type { MatchingItem, MatchingView, PairLink } from './matchingTypes'

/**
 * Dạng GIÁO VIÊN (preview, review): dữ liệu có đủ `pairs`, id ô chính là `pairId` thật. Cột trái giữ thứ tự
 * gốc; cột phải xáo (xác định theo `question.id`) sao cho không ô nào cùng hàng với ô ghép đúng của nó.
 */
export function fromTeacherQuestion(question: MatchingQuestion): MatchingView {
  const leftItems: MatchingItem[] = question.pairs.map((pair) => ({ id: pair.pairId, content: pair.left }))
  const rightInOriginalOrder: MatchingItem[] = question.pairs.map((pair) => ({
    id: pair.pairId,
    content: pair.right,
  }))

  return { leftItems, rightItems: seededDerangement(rightInOriginalOrder, question.id) }
}

/**
 * Dạng HỌC SINH (play): Backend đã tách và xáo cả hai cột, id là mã mờ. Giữ nguyên thứ tự nhận được, tuyệt
 * đối không xáo lại ở client (xáo lại sẽ khác thứ tự Backend dùng để chấm khi tải lại trang).
 */
export function fromStudentQuestion(question: MatchingStudentQuestion): MatchingView {
  const toItem = ({ id, ...content }: MatchingStudentQuestion['leftItems'][number]): MatchingItem => ({
    id,
    content,
  })
  return { leftItems: question.leftItems.map(toItem), rightItems: question.rightItems.map(toItem) }
}

/**
 * Chấm cục bộ cho mode `preview`/`review`, nơi id ô là `pairId` thật: đúng khi nối đủ mọi cặp và mỗi cặp
 * nối hai ô cùng `pairId`. Mode `play` KHÔNG dùng hàm này (id là mã mờ, Backend chấm).
 */
export function isCorrectLocally(links: readonly PairLink[], pairCount: number): boolean {
  return links.length === pairCount && links.every((link) => link.leftPairId === link.rightPairId)
}

/** Các cặp đúng của câu hỏi dạng giáo viên, theo thứ tự `pairs` (dùng để hiện đáp án đúng khi xem lại). */
export function correctLinksOf(question: MatchingQuestion): PairLink[] {
  return question.pairs.map((pair) => ({ leftPairId: pair.pairId, rightPairId: pair.pairId }))
}
