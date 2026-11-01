import type { DragDropQuestion } from '../../types/game-dsl.types'
import type { StudentDragDropQuestion } from '../../types/game-student.types'

export interface Point {
  x: number
  y: number
}

export interface Bounds extends Point {
  width: number
  height: number
}

export interface DragDropDisplayItem {
  id: string
  text?: string
  visualPrompt?: string
  imageUrl?: string
  targetZoneId?: string
}

export interface DragDropAnswerResult {
  isCorrect: boolean
  correctPlacements?: { itemId: string; zoneId: string }[]
}

export type DragDropRendererProps =
  | {
      mode: 'preview'
      question: DragDropQuestion
      onAnswered?: (placements: { itemId: string; zoneId: string }[]) => void
      disabled?: boolean
    }
  | {
      mode: 'play'
      question: StudentDragDropQuestion
      onAnswered: (placements: { itemId: string; zoneId: string }[]) => DragDropAnswerResult | Promise<DragDropAnswerResult>
      disabled?: boolean
    }
  | {
      mode: 'review'
      question: DragDropQuestion
      placements?: { itemId: string; zoneId: string }[]
      disabled?: boolean
    }
