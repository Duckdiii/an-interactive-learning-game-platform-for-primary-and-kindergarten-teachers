import type { PairLink } from './matchingTypes'

/**
 * Kết quả chấm của một màn MATCHING để vẽ: đúng/sai tổng thể và danh sách các cặp đúng (khi biết). Ở mode
 * `play` danh sách này đến từ `correctAnswer.matches` của response chấm (id mờ); ở `preview`/`review` suy ra
 * từ `pairs`. Rỗng nghĩa là không biết đáp án đúng nên chỉ báo sai, không chỉ ra được cặp nào đúng.
 */
export interface MatchingResult {
  isCorrect: boolean
  correctLinks: PairLink[]
}

export type LinkVerdict = 'correct' | 'wrong'

const sameLink = (a: PairLink, b: PairLink) => a.leftPairId === b.leftPairId && a.rightPairId === b.rightPairId

/**
 * Cặp trẻ đã nối đúng hay sai. Cả màn đúng thì mọi cặp đúng. Màn sai mà biết đáp án thì cặp nào trùng đáp án
 * là đúng. Màn sai mà không biết đáp án thì coi mọi cặp là «chưa đúng» (vàng nhẹ), không đoán.
 */
export function verdictOfLink(link: PairLink, result: MatchingResult): LinkVerdict {
  if (result.isCorrect) return 'correct'
  return result.correctLinks.some((correct) => sameLink(correct, link)) ? 'correct' : 'wrong'
}

/** Các cặp đúng mà trẻ chưa nối đúng, để hiện thêm bằng nét đứt xanh cho trẻ học. Màn đúng thì không có. */
export function missingCorrectLinks(links: readonly PairLink[], result: MatchingResult): PairLink[] {
  if (result.isCorrect) return []
  return result.correctLinks.filter((correct) => !links.some((link) => sameLink(correct, link)))
}
