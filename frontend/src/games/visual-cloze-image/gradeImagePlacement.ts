import type { VisualClozeImageQuestionDsl } from '../../types/game-dsl.types'
import type { AnswerPayload, AnswerResult, StudentVisualClozeImagePlacement } from '../../types/game-student.types'

export interface ImagePlacementGrade {
  result: AnswerResult
  acceptedPlacements: StudentVisualClozeImagePlacement[]
}

/** Local preview/mock equivalent of the server's per-pair IMAGE contract. */
export function gradeImagePlacement(question: VisualClozeImageQuestionDsl, answer: AnswerPayload,
  accepted: readonly StudentVisualClozeImagePlacement[]): ImagePlacementGrade {
  const acceptedPlacements = accepted.map((placement) => ({ ...placement }))
  const base = { pointsEarned: 0, totalScore: 0, correctAnswer: null }
  if ('outcome' in answer) {
    return { acceptedPlacements, result: { ...base, status: answer.outcome, isCorrect: false, retryable: false } }
  }
  if (!('placements' in answer) || !Array.isArray(answer.placements) || answer.placements.length !== 1)
    throw new Error('IMAGE expects one blank-option pair')
  const placement = answer.placements[0]
  if (!placement || !('blankId' in placement) || !('optionId' in placement)) throw new Error('Invalid IMAGE pair')
  const { blankId, optionId } = placement
  const blank = question.blanks.find((item) => item.id === blankId)
  if (!blank || !question.options.some((option) => option.id === optionId)) throw new Error('Unknown IMAGE ID')
  const previous = acceptedPlacements.find((item) => item.blankId === blankId)
  if (previous && previous.optionId !== optionId) throw new Error('Blank already completed')
  if (acceptedPlacements.some((item) => item.optionId === optionId && item.blankId !== blankId)) throw new Error('Option already used')
  if (blank.correctOptionId !== optionId) {
    return { acceptedPlacements, result: { ...base, status: 'INCORRECT', isCorrect: false, placementCorrect: false, retryable: true } }
  }
  if (!previous) acceptedPlacements.push({ blankId, optionId })
  const complete = acceptedPlacements.length === question.blanks.length
  return {
    acceptedPlacements,
    result: {
      status: complete ? 'CORRECT' : 'IN_PROGRESS', isCorrect: true, placementCorrect: true, retryable: !complete,
      pointsEarned: complete ? question.points : 0, totalScore: complete ? question.points : 0,
      correctAnswer: complete ? { placements: acceptedPlacements } : null,
    },
  }
}
