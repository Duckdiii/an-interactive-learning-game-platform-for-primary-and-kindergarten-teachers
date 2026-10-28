import type { GameType, QuestionDsl } from '../../../types/game-dsl.types'
import type { AnswerPayload, AnswerResult } from '../../../types/game-student.types'
// Chấm cục bộ trong trình soạn thảo (chế độ xem trước): không có phiên chơi, không gọi API. Chỉ dùng phần chấm THUẦN của mock
// (`MOCK_HANDLERS`), không kéo theo `mockPlayerApi`. Nó nằm trong bản build thật vì đó là logic, không phải dữ liệu mẫu.
import { MOCK_HANDLERS } from '../../../player/api/mockPlayerHandlers'
import { PLAYABLE_ORIENTATION } from '../../../player/renderers'

export type PreviewDevice = 'tv' | 'tablet' | 'phone'

export const PREVIEW_DEVICES: readonly PreviewDevice[] = ['tv', 'tablet', 'phone']
export const DEFAULT_PREVIEW_DEVICE: PreviewDevice = 'tablet'

/** Kích thước thiết kế (px) của từng thiết bị; điện thoại dọc, trừ loại game cần màn ngang thì xoay ngang. */
export function previewDeviceSize(gameType: GameType, device: PreviewDevice): { width: number; height: number } {
  if (device === 'tv') return { width: 1280, height: 720 }

  if (device === 'tablet') return { width: 1024, height: 768 }

  return PLAYABLE_ORIENTATION[gameType] === 'landscape' ? { width: 844, height: 390 } : { width: 390, height: 844 }
}

/** Seed cố định theo id câu: thứ tự xáo giống nhau mỗi lần dựng lại. */
export const previewSeed = (question: QuestionDsl) => `preview-${question.id}`

export const toPreviewStudentQuestion = (gameType: GameType, question: QuestionDsl) =>
  MOCK_HANDLERS[gameType].toStudent(question, previewSeed(question))

export function gradePreviewAnswer(gameType: GameType, question: QuestionDsl, answer: AnswerPayload): AnswerResult {
  const handler = MOCK_HANDLERS[gameType]
  const seed = previewSeed(question)
  const isCorrect = 'outcome' in answer ? false : handler.isCorrect(question, seed, answer)

  return {
    status: isCorrect ? 'CORRECT' : 'INCORRECT',
    isCorrect,
    pointsEarned: isCorrect ? question.points : 0,
    totalScore: isCorrect ? question.points : 0,
    correctAnswer: handler.correct(question, seed),
  }
}
