import type { ComponentType } from 'react'
import type { GameType, QuestionDsl } from '../../../types/game-dsl.types'
import MatchingPlayTest from './MatchingPlayTest'
import QuizPlayTest from './QuizPlayTest'

/** Mọi bộ chơi thử nhận đúng hai prop này; renderer thật nằm trong từng bộ, nên panel không cần biết loại game. */
export interface PlayTestProps {
  question: QuestionDsl
  /** Báo kết quả (đúng/sai) ngay sau khi giáo viên trả lời xong câu. */
  onResult: (isCorrect: boolean) => void
}

// Bảng loại game đến bộ chơi thử (không rẽ nhánh bằng if/switch). Loại nào chưa có renderer thì KHÔNG có mặt ở đây và panel
// hiện khung "chưa hỗ trợ chơi thử" kèm ảnh minh họa; thêm renderer mới là thêm một dòng ở đây.
export const PLAY_TEST_RENDERERS: Readonly<Partial<Record<GameType, ComponentType<PlayTestProps>>>> = {
  QUIZ: QuizPlayTest,
  MATCHING: MatchingPlayTest,
}
