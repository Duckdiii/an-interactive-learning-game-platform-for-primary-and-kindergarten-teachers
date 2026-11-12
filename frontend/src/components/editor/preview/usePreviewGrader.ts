import { useMemo } from 'react'
import type { GameType, QuestionDsl } from '../../../types/game-dsl.types'
import { createPreviewGrader } from './previewModel'

export function usePreviewGrader(gameType: GameType, question: QuestionDsl, roundKey: number | string) {
  return useMemo(() => ({ roundKey, grade: createPreviewGrader(gameType, question) }),
    [gameType, question, roundKey]).grade
}
