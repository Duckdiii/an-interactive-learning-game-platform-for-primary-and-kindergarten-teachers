import type { MemoryCardQuestion } from '../../../types/game-dsl.types'
import { TYPE_LIMITS } from '../../../utils/questionSpecs'
import { nextPairId } from './matchingEditing'

// Các phép sửa câu MEMORY_CARD (hàm thuần, trả về bản mới, không đổi bản cũ). Số cặp theo giới hạn DSL (2 đến 8). Mỗi cặp là HAI thẻ giống nhau
// nên chỉ có MỘT nội dung (`content`: chữ hoặc mô tả hình). Mã cặp (p1, p2...) dùng chung cách cấp số với MATCHING và GIỮ NGUYÊN cho cặp có sẵn.

const LIMITS = TYPE_LIMITS.MEMORY_CARD.pairs

export type ContentField = 'text' | 'visualPrompt'

export const canAddPair = (question: MemoryCardQuestion) => question.pairs.length < LIMITS.max
export const canRemovePair = (question: MemoryCardQuestion) => question.pairs.length > LIMITS.min

/** Thêm một cặp trống ở cuối (chưa có nội dung nên bộ kiểm tra báo "cần chữ hoặc mô tả hình"); không thêm khi đã đủ số tối đa. */
export function addPair(question: MemoryCardQuestion, pairId: string = nextPairId(question.pairs)): MemoryCardQuestion {
  if (!canAddPair(question)) return question

  return { ...question, pairs: [...question.pairs, { pairId, content: {} }] }
}

/** Xóa cặp ở vị trí `index`; không xóa khi chỉ còn số tối thiểu hoặc vị trí không có. */
export function removePair(question: MemoryCardQuestion, index: number): MemoryCardQuestion {
  if (!canRemovePair(question) || index < 0 || index >= question.pairs.length) return question

  return { ...question, pairs: question.pairs.filter((_, position) => position !== index) }
}

/** Như `removePair` nhưng chỉ theo mã cặp (ổn định khi thêm/xóa cặp khác); mã không còn thì không đổi gì. */
export const removePairById = (question: MemoryCardQuestion, pairId: string) =>
  removePair(question, question.pairs.findIndex((pair) => pair.pairId === pairId))

/**
 * Sửa chữ hoặc mô tả hình của thẻ. Nội dung rỗng (hoặc chỉ có dấu cách) thì BỎ HẲN trường (schema không cho chuỗi rỗng); `imageUrl` của thẻ giữ nguyên
 * (tải ảnh là việc của A5). Vị trí không có thì trả lại nguyên bản.
 */
export function setContentField(question: MemoryCardQuestion, index: number, field: ContentField, value: string): MemoryCardQuestion {
  const pair = question.pairs[index]

  if (!pair) return question

  const { [field]: _removed, ...rest } = pair.content
  const content = value.trim() === '' ? rest : { ...rest, [field]: value }

  return { ...question, pairs: question.pairs.map((item, position) => (position === index ? { ...item, content } : item)) }
}

/** Như `setContentField` nhưng tìm cặp theo mã cặp; mã không còn (cặp đã bị xóa) thì không đổi gì. */
export const setContentFieldById = (question: MemoryCardQuestion, pairId: string, field: ContentField, value: string) =>
  setContentField(question, question.pairs.findIndex((pair) => pair.pairId === pairId), field, value)
