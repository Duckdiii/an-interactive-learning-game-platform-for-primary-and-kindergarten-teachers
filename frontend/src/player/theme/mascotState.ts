import type { AnswerResult } from '../../types/game-student.types'
import type { MascotState } from './types'

/** Nhân vật phản ứng theo kết quả chấm: chưa trả lời thì hỏi, đúng thì vui, sai hoặc hết giờ thì an ủi. (`speak` dành cho lúc đang đọc lời nhắc, nối khi có sự kiện từ phát âm thanh.) */
export function mascotStateFor(result: AnswerResult | null): MascotState {
  if (result === null) return 'ask'

  return result.status === 'CORRECT' ? 'happy' : 'comfort'
}
