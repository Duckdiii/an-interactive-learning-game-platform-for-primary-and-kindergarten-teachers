import type { QuestionDsl } from '../../../types/game-dsl.types'

// Phép sửa các trường CHUNG của mọi câu hỏi (thời gian, điểm): hàm thuần dùng cho form của mọi loại game.
export const setTimeLimit = <T extends QuestionDsl>(question: T, timeLimitSeconds: number): T => ({ ...question, timeLimitSeconds })

export const setPoints = <T extends QuestionDsl>(question: T, points: number): T => ({ ...question, points })
