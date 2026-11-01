import type { OddOneOutQuestion, TextChoice } from '../../../types/game-dsl.types'
import { TYPE_LIMITS } from '../../../utils/questionSpecs'

// Các phép sửa câu ODD_ONE_OUT (hàm thuần, trả về bản mới, không đổi bản cũ). Mã mục luôn theo VỊ TRÍ a đến e (luật Lớp 2 của DSL), nên thêm hay
// xóa mục đều đánh lại mã và giữ đúng mục khác loại đang chọn (theo thứ tự, không theo mã cũ).

const POSITION_IDS = ['a', 'b', 'c', 'd', 'e'] as const
const LIMITS = TYPE_LIMITS.ODD_ONE_OUT.items

export const positionId = (index: number) => POSITION_IDS[index] ?? ''

/** Thứ tự (từ 0) của mục khác loại, hoặc -1 khi chưa chọn/không khớp mục nào. */
export const oddIndexOf = (question: OddOneOutQuestion) => question.items.findIndex((item) => item.id === question.oddOneOutId)

export const canAddItem = (question: OddOneOutQuestion) => question.items.length < LIMITS.max
export const canRemoveItem = (question: OddOneOutQuestion) => question.items.length > LIMITS.min

const withItems = (question: OddOneOutQuestion, texts: ReadonlyArray<string>, oddIndex: number): OddOneOutQuestion => ({
  ...question,
  items: texts.map((text, index): TextChoice => ({ id: positionId(index), text })),
  oddOneOutId: oddIndex >= 0 && oddIndex < texts.length ? positionId(oddIndex) : '',
})

export function setItemText(question: OddOneOutQuestion, index: number, text: string): OddOneOutQuestion {
  if (index < 0 || index >= question.items.length) return question

  // Chỉ đổi chữ: mã mục và mục khác loại giữ nguyên (kể cả khi dữ liệu từ API có mã khác loại sai, để thông báo lỗi không đổi theo lần sửa chữ).
  return { ...question, items: question.items.map((item, position) => (position === index ? { ...item, text } : item)) }
}

/** Thêm một mục trống ở cuối; không thêm khi đã đủ số tối đa (trả lại nguyên bản). */
export function addItem(question: OddOneOutQuestion): OddOneOutQuestion {
  if (!canAddItem(question)) return question

  return withItems(question, [...question.items.map((item) => item.text), ''], oddIndexOf(question))
}

/** Xóa một mục và đánh lại mã; không xóa khi chỉ còn số tối thiểu. Xóa đúng mục khác loại đang chọn thì phải chọn lại (mã để trống). */
export function removeItem(question: OddOneOutQuestion, index: number): OddOneOutQuestion {
  if (!canRemoveItem(question) || index < 0 || index >= question.items.length) return question

  const odd = oddIndexOf(question)
  const nextOdd = odd === index ? -1 : odd > index ? odd - 1 : odd

  return withItems(
    question,
    question.items.filter((_, position) => position !== index).map((item) => item.text),
    nextOdd,
  )
}

/** Chọn mục khác loại theo thứ tự; vị trí không có thì không đổi gì. */
export function setOddItem(question: OddOneOutQuestion, index: number): OddOneOutQuestion {
  if (index < 0 || index >= question.items.length) return question

  return withItems(question, question.items.map((item) => item.text), index)
}
