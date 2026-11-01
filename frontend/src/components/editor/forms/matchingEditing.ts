import type { MatchingQuestion } from '../../../types/game-dsl.types'
import { TYPE_LIMITS } from '../../../utils/questionSpecs'

// Các phép sửa câu MATCHING (hàm thuần, trả về bản mới, không đổi bản cũ). Số cặp theo giới hạn DSL (3 đến 6). Mã cặp (p1, p2...) chỉ cần
// duy nhất và đúng mẫu `p<số>`: cặp có sẵn GIỮ NGUYÊN mã, cặp mới lấy số nhỏ nhất chưa dùng.

const LIMITS = TYPE_LIMITS.MATCHING.pairs

export type Side = 'left' | 'right'
export type SideField = 'text' | 'visualPrompt'

export const canAddPair = (question: MatchingQuestion) => question.pairs.length < LIMITS.max
export const canRemovePair = (question: MatchingQuestion) => question.pairs.length > LIMITS.min

/** Mã cặp mới: `p<n>` với n nhỏ nhất (từ 1) chưa có cặp nào dùng. */
export function nextPairId(pairs: ReadonlyArray<{ pairId: string }>) {
  const used = new Set(pairs.map((pair) => pair.pairId))
  let number = 1

  while (used.has(`p${number}`)) number += 1

  return `p${number}`
}

/** Thêm một cặp trống ở cuối (hai bên chưa có nội dung nên bộ kiểm tra báo "cần chữ hoặc mô tả hình"); không thêm khi đã đủ số tối đa. */
export function addPair(question: MatchingQuestion, pairId: string = nextPairId(question.pairs)): MatchingQuestion {
  if (!canAddPair(question)) return question

  return { ...question, pairs: [...question.pairs, { pairId, left: {}, right: {} }] }
}

/** Số nhỏ nhất mà mã `p<số>` chưa bao giờ được dùng (kể cả cặp đã xóa): form dùng làm mã cặp mới để một bản vá đang chờ của cặp đã xóa không bao giờ rơi nhầm vào cặp mới. */
export function firstUnusedPairNumber(pairs: ReadonlyArray<{ pairId: string }>) {
  return pairs.reduce((max, pair) => Math.max(max, Number(pair.pairId.replace(/^p/, '')) || 0), 0) + 1
}

/** Xóa cặp ở vị trí `index`; không xóa khi chỉ còn số tối thiểu hoặc vị trí không có. */
export function removePair(question: MatchingQuestion, index: number): MatchingQuestion {
  if (!canRemovePair(question) || index < 0 || index >= question.pairs.length) return question

  return { ...question, pairs: question.pairs.filter((_, position) => position !== index) }
}

/** Như `removePair` nhưng chỉ theo mã cặp (ổn định khi thêm/xóa cặp khác); mã không còn thì không đổi gì. */
export const removePairById = (question: MatchingQuestion, pairId: string) =>
  removePair(question, question.pairs.findIndex((pair) => pair.pairId === pairId))

/** Như `setSideField` nhưng tìm cặp theo mã cặp; mã không còn (cặp đã bị xóa) thì không đổi gì. */
export const setSideFieldById = (question: MatchingQuestion, pairId: string, side: Side, field: SideField, value: string) =>
  setSideField(question, question.pairs.findIndex((pair) => pair.pairId === pairId), side, field, value)

/**
 * Sửa chữ hoặc mô tả hình của một bên. Nội dung rỗng thì BỎ HẲN trường (schema không cho chuỗi rỗng); `imageUrl` của bên đó giữ nguyên
 * (tải ảnh là việc của A5). Vị trí không có thì trả lại nguyên bản.
 */
export function setSideField(question: MatchingQuestion, index: number, side: Side, field: SideField, value: string): MatchingQuestion {
  const pair = question.pairs[index]

  if (!pair) return question

  const { [field]: _removed, ...rest } = pair[side]
  const nextSide = value.trim() === '' ? rest : { ...rest, [field]: value }

  return {
    ...question,
    pairs: question.pairs.map((item, position) => (position === index ? { ...item, [side]: nextSide } : item)),
  }
}
