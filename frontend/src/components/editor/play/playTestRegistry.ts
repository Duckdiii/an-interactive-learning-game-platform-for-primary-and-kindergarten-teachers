import type { ComponentType } from 'react'
import type { GameType, QuestionDsl, Subject } from '../../../types/game-dsl.types'
import AudioVisualMatchPlayTest from './AudioVisualMatchPlayTest'
import MatchingPlayTest from './MatchingPlayTest'
import OddOneOutPlayTest from './OddOneOutPlayTest'
import QuizPlayTest from './QuizPlayTest'
import VisualClozePlayTest from './VisualClozePlayTest'

/** Renderer thật nằm trong từng bộ, nên panel không cần biết chi tiết loại game. */
export interface PlayTestProps {
  question: QuestionDsl
  subject: Subject
  /** Báo kết quả (đúng/sai) ngay sau khi giáo viên trả lời xong câu. */
  onResult: (isCorrect: boolean) => void
}

// Bảng loại game đến bộ chơi thử (không rẽ nhánh bằng if/switch). Loại nào chưa có renderer thì KHÔNG có mặt ở đây và panel
// hiện khung "chưa hỗ trợ chơi thử" kèm ảnh minh họa; thêm renderer mới là thêm một dòng ở đây.
export const PLAY_TEST_RENDERERS: Readonly<Partial<Record<GameType, ComponentType<PlayTestProps>>>> = {
  AUDIO_VISUAL_MATCH: AudioVisualMatchPlayTest,
  QUIZ: QuizPlayTest,
  MATCHING: MatchingPlayTest,
  ODD_ONE_OUT: OddOneOutPlayTest,
  VISUAL_CLOZE: VisualClozePlayTest,
}
