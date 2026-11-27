import type { ComponentType } from 'react'
import type { GameType, QuestionDsl, Subject } from '../../../types/game-dsl.types'
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

/** Renderer thật nằm trong từng bộ, nên panel không cần biết chi tiết loại game. */
export interface PlayTestProps {
  question: QuestionDsl
  subject: Subject
  /** Báo kết quả (đúng/sai) ngay sau khi giáo viên trả lời xong câu. */
  onResult: (isCorrect: boolean) => void
  /** Audio đã được PlayTest quản lý để tránh trình duyệt đọc chồng lên MP3 TTS. */
  playQuestionAudio?: () => void
  playPairFeedback?: (correct: boolean) => void
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
