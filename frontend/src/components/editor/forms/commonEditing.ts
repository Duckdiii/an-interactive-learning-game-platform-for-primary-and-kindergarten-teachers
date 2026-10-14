import type { QuestionDsl } from '../../../types/game-dsl.types'

// Phép sửa các trường CHUNG của mọi câu hỏi (thời gian, điểm, lời đọc, mô tả hình): hàm thuần dùng cho form của mọi loại game.
export const setTimeLimit = <T extends QuestionDsl>(question: T, timeLimitSeconds: number): T => ({ ...question, timeLimitSeconds })

export const setPoints = <T extends QuestionDsl>(question: T, points: number): T => ({ ...question, points })

export type OptionalTextField = 'audioText' | 'visualPrompt'

/** Sửa lời đọc hoặc mô tả hình. Nội dung rỗng thì BỎ HẲN trường (schema không cho chuỗi rỗng); các loại bắt buộc trường này sẽ được bộ kiểm tra báo "cần nhập". */
export function setOptionalText<T extends QuestionDsl>(question: T, field: OptionalTextField, value: string): T {
  const { [field]: _removed, ...rest } = question

  return (value.trim() === '' ? rest : { ...rest, [field]: value }) as T
}
