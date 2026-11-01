import type { GameType, QuestionDsl } from './game-dsl.types'

/** Kết quả `POST /games/{id}/questions/{qid}/regenerate`: câu mới theo DSL (giữ nguyên `id`), chưa được lưu. */
export interface RegeneratedQuestion {
  question: QuestionDsl
  gameType: GameType
}
