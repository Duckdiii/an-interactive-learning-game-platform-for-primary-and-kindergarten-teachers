import type { WordScrambleQuestion } from '../../types/game-dsl.types'
import type { StudentWordScrambleQuestion } from '../../types/game-student.types'

export interface Point {
  x: number
  y: number
}

export interface Bounds extends Point {
  width: number
  height: number
}

export interface LetterTile {
  tileId: string
  character: string
}

export interface WordScrambleAnswerResult {
  isCorrect: boolean
  correctWord?: string
}

export type WordScrambleRendererProps =
  | {
      mode: 'preview'
      question: WordScrambleQuestion
      onAnswered?: (word: string) => void
      disabled?: boolean
    }
  | {
      mode: 'play'
      question: StudentWordScrambleQuestion
      onAnswered: (word: string) => WordScrambleAnswerResult | Promise<WordScrambleAnswerResult>
      disabled?: boolean
    }
  | {
      mode: 'review'
      question: WordScrambleQuestion
      completedWord?: string
      disabled?: boolean
    }
