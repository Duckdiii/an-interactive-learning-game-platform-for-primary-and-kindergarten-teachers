import type { OrderingQuestion } from '../../types/game-dsl.types'
import type { StudentOrderingQuestion } from '../../types/game-student.types'

export interface Point {
  x: number
  y: number
}

export interface Bounds extends Point {
  width: number
  height: number
}

export interface SlotLayout {
  slotNumber: number
  bounds: Bounds
}

export interface OrderingBoardLayout {
  width: number
  height: number
  promptY: number
  promptHeight: number
  illustrationY: number | null
  audioY: number | null
  slots: SlotLayout[]
  slotPositions: Record<number, Point>
  trayBounds: Bounds
  trayPositions: Record<string, Point>
  itemWidth: number
  itemHeight: number
  confirmY: number
  confirmHeight: number
  confirmWidth: number
}

export interface OrderingDisplayStep {
  id: string
  text?: string
  visualPrompt?: string
  imageUrl?: string
  correctPosition?: number
}

export interface OrderingAnswerResult {
  isCorrect: boolean
  correctOrder?: string[]
}

export interface OrderingAnswerPayload {
  order: string[]
  orderedStepIds?: string[]
}

export type OrderingModeProps =
  | {
      mode: 'preview'
      question: OrderingQuestion
      onAnswered?: (payload: OrderingAnswerPayload) => void
      disabled?: boolean
    }
  | {
      mode: 'play'
      question: StudentOrderingQuestion
      onAnswered: (payload: OrderingAnswerPayload) => OrderingAnswerResult | Promise<OrderingAnswerResult>
      disabled?: boolean
    }
  | {
      mode: 'review'
      question: OrderingQuestion
      order?: string[]
      correctOrder?: string[]
      disabled?: boolean
    }

export type OrderingRendererProps = OrderingModeProps & { minTouchPx?: number }
