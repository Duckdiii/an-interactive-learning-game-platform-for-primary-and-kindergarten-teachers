import type { MatchingQuestion, PairSide } from '../../types/game-dsl.types'
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
 * Cái hiển thị trong một ô: chữ và/hoặc ảnh. DSL cho phép một phía chỉ có `visualPrompt` (ảnh chưa được
 * lấy về); khi đó dùng `visualPrompt` làm chữ tạm để ô không bị trống, còn có `imageUrl` thì ảnh đã đủ nghĩa.
 *
 * `imageFailed` là khi có `imageUrl` nhưng ảnh tải lỗi (404, mất mạng): coi như ô không có ảnh và quay về
 * chữ (`text`, hoặc `visualPrompt` nếu không có). DSL bảo đảm mỗi phía có `text` hoặc `visualPrompt` nên ô
 * không bao giờ trống, trẻ vẫn nhận ra nội dung ô.
 */
export function sideDisplay(
  content: PairSide,
  imageFailed = false,
): { text: string | undefined; hasImage: boolean } {
  const hasImage = Boolean(content.imageUrl) && !imageFailed
  return { text: content.text ?? (hasImage ? undefined : content.visualPrompt), hasImage }
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
