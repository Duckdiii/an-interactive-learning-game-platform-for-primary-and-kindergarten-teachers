import type { ComponentType } from 'react'
import type { GameType } from '../../types/game-dsl.types'
import type { AnswerPayload, AnswerResult, StudentQuestionByType } from '../../types/game-student.types'
import type { UiProfile } from '../profile/types'
import DragDropPlayable from './DragDropPlayable'
import MatchingPlayable from './MatchingPlayable'
import MemoryCardPlayable from './MemoryCardPlayable'
import OddOneOutPlayable from './OddOneOutPlayable'
import QuizPlayable from './QuizPlayable'
import type { PlayableRenderer } from './types'
import VisualClozePlayable from './VisualClozePlayable'
import WordScramblePlayable from './WordScramblePlayable'

export type { PlayableRenderer, PlayableRendererProps } from './types'

/** Dạng đã xóa kiểu theo loại game, để khung dùng chung cho mọi loại; đúng loại được bảo đảm lúc đăng ký (xem `define`). */
export type AnyPlayableRenderer = ComponentType<{
  question: StudentQuestionByType[GameType]
  profile: UiProfile
  onSubmit: (answer: AnswerPayload) => Promise<AnswerResult>
}>

// Điểm xóa kiểu duy nhất: mỗi renderer được ràng buộc đúng với loại game của nó khi đăng ký.
const define = <T extends GameType>(renderer: PlayableRenderer<T>) => renderer as unknown as AnyPlayableRenderer

// Các loại còn lại thêm từng loại ở P2b. Loại chưa có thì khung hiện màn "chưa hỗ trợ" thay vì vỡ.
const RENDERERS: ReadonlyMap<GameType, AnyPlayableRenderer> = new Map([
  ['QUIZ', define<'QUIZ'>(QuizPlayable)],
  ['ODD_ONE_OUT', define<'ODD_ONE_OUT'>(OddOneOutPlayable)],
  ['MATCHING', define<'MATCHING'>(MatchingPlayable)],
  ['MEMORY_CARD', define<'MEMORY_CARD'>(MemoryCardPlayable)],
  ['VISUAL_CLOZE', define<'VISUAL_CLOZE'>(VisualClozePlayable)],
  ['DRAG_DROP', define<'DRAG_DROP'>(DragDropPlayable)],
  ['WORD_SCRAMBLE', define<'WORD_SCRAMBLE'>(WordScramblePlayable)],
])

export const getPlayableRenderer = (gameType: GameType) => RENDERERS.get(gameType)

/** Loại game cần màn ngang để chơi thoải mái (nối cặp, lật thẻ, kéo thả, sắp xếp). Khung Bé trên điện thoại dọc thì nhắc xoay máy (xem `device/RotatePrompt`). */
export const PLAYABLE_ORIENTATION: Readonly<Record<GameType, 'any' | 'landscape'>> = {
  QUIZ: 'any',
  AUDIO_VISUAL_MATCH: 'any',
  ODD_ONE_OUT: 'any',
  SPOT_THE_TARGET: 'any',
  VISUAL_CLOZE: 'any',
  WORD_SCRAMBLE: 'any',
  MATCHING: 'landscape',
  MEMORY_CARD: 'landscape',
  DRAG_DROP: 'landscape',
  ORDERING: 'landscape',
}
