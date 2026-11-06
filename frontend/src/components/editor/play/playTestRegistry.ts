import type { ComponentType } from 'react'
import type { GameType, QuestionDsl } from '../../../types/game-dsl.types'
import AudioVisualMatchPlayTest from './AudioVisualMatchPlayTest'
import DragDropPlayTest from './DragDropPlayTest'
import MatchingPlayTest from './MatchingPlayTest'
import MemoryCardPlayTest from './MemoryCardPlayTest'
import OddOneOutPlayTest from './OddOneOutPlayTest'
import OrderingPlayTest from './OrderingPlayTest'
import QuizPlayTest from './QuizPlayTest'
import SpotTheTargetPlayTest from './SpotTheTargetPlayTest'
import VisualClozePlayTest from './VisualClozePlayTest'
import WordScramblePlayTest from './WordScramblePlayTest'

/** Mọi bộ chơi thử nhận đúng hai prop này; renderer thật nằm trong từng bộ, nên panel không cần biết loại game. */
export interface PlayTestProps {
  question: QuestionDsl
  /** Báo kết quả (đúng/sai) ngay sau khi giáo viên trả lời xong câu. */
  onResult: (isCorrect: boolean) => void
}

// Bảng loại game đến bộ chơi thử: Hỗ trợ đầy đủ 10/10 cơ chế game trong Workspace Editor
export const PLAY_TEST_RENDERERS: Readonly<Record<GameType, ComponentType<PlayTestProps>>> = {
  QUIZ: QuizPlayTest,
  MATCHING: MatchingPlayTest,
  MEMORY_CARD: MemoryCardPlayTest,
  DRAG_DROP: DragDropPlayTest,
  WORD_SCRAMBLE: WordScramblePlayTest,
  ODD_ONE_OUT: OddOneOutPlayTest,
  VISUAL_CLOZE: VisualClozePlayTest,
  ORDERING: OrderingPlayTest,
  AUDIO_VISUAL_MATCH: AudioVisualMatchPlayTest,
  SPOT_THE_TARGET: SpotTheTargetPlayTest,
}
