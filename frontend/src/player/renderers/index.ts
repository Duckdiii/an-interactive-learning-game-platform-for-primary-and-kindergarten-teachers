import type { ComponentType } from 'react'
import type { GameType } from '../../types/game-dsl.types'
import type { AnswerPayload, AnswerResult, StudentQuestionByType } from '../../types/game-student.types'
import type { UiProfile } from '../profile/types'
import MatchingPlayable from './MatchingPlayable'
import QuizPlayable from './QuizPlayable'
import type { PlayableRenderer } from './types'

export type { PlayableRenderer, PlayableRendererProps } from './types'

/** Dạng đã xóa kiểu theo loại game, để khung dùng chung cho mọi loại; đúng loại được bảo đảm lúc đăng ký (xem `define`). */
export type AnyPlayableRenderer = ComponentType<{
  question: StudentQuestionByType[GameType]
  profile: UiProfile
  onSubmit: (answer: AnswerPayload) => Promise<AnswerResult>
}>

// Điểm xóa kiểu duy nhất: mỗi renderer được ràng buộc đúng với loại game của nó khi đăng ký.
const define = <T extends GameType>(renderer: PlayableRenderer<T>) => renderer as unknown as AnyPlayableRenderer

// Mới có 2 trong 10 loại; 8 loại còn lại thêm từng loại ở P2. Loại chưa có thì khung hiện màn "chưa hỗ trợ" thay vì vỡ.
const RENDERERS: ReadonlyMap<GameType, AnyPlayableRenderer> = new Map([
  ['QUIZ', define<'QUIZ'>(QuizPlayable)],
  ['MATCHING', define<'MATCHING'>(MatchingPlayable)],
])

export const getPlayableRenderer = (gameType: GameType) => RENDERERS.get(gameType)
