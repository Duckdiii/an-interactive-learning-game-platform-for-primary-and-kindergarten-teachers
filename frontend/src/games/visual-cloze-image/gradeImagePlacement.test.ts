import { describe, expect, it } from 'vitest'
import type { VisualClozeImageQuestionDsl } from '../../types/game-dsl.types'
import { gradeImagePlacement } from './gradeImagePlacement'

const question: VisualClozeImageQuestionDsl = {
  id: 'q1', points: 20, timeLimitSeconds: 60, questionText: 'Điền hình',
  sceneImageUrl: 'https://example.com/scene.png', sceneWidth: 800, sceneHeight: 400,
  blanks: [{ id: 'left', x: 200, y: 200, correctOptionId: 'cat' }, { id: 'right', x: 600, y: 200, correctOptionId: 'dog' }],
  options: [{ id: 'cat', visualPrompt: 'Mèo' }, { id: 'dog', visualPrompt: 'Chó' }, { id: 'bird', visualPrompt: 'Chim' }],
}
const place = (blankId: string, optionId: string) => ({ placements: [{ blankId, optionId }] })

describe('local IMAGE grading: retry individual pairs', () => {
  it('preserves a correct first pair, accepts correction of a wrong second pair and scores only at completion', () => {
    const first = gradeImagePlacement(question, place('left', 'cat'), [])
    expect(first.result).toMatchObject({ status: 'IN_PROGRESS', retryable: true, placementCorrect: true, pointsEarned: 0, correctAnswer: null })
    expect(first.acceptedPlacements).toEqual([{ blankId: 'left', optionId: 'cat' }])
    const wrong = gradeImagePlacement(question, place('right', 'bird'), first.acceptedPlacements)
    expect(wrong.result).toMatchObject({ status: 'INCORRECT', retryable: true, placementCorrect: false, pointsEarned: 0, correctAnswer: null })
    expect(wrong.acceptedPlacements).toEqual([{ blankId: 'left', optionId: 'cat' }])
    const final = gradeImagePlacement(question, place('right', 'dog'), wrong.acceptedPlacements)
    expect(final.result).toMatchObject({ status: 'CORRECT', retryable: false, placementCorrect: true, pointsEarned: 20,
      correctAnswer: { placements: [{ blankId: 'left', optionId: 'cat' }, { blankId: 'right', optionId: 'dog' }] } })
  })

  it('replaying an accepted pair does not duplicate progress or award points', () => {
    const accepted = [{ blankId: 'left', optionId: 'cat' }]
    const duplicate = gradeImagePlacement(question, place('left', 'cat'), accepted)
    expect(duplicate.acceptedPlacements).toEqual(accepted)
    expect(duplicate.result).toMatchObject({ status: 'IN_PROGRESS', pointsEarned: 0 })
  })

  it.each([
    place('missing', 'cat'), place('left', 'missing'), { placements: [] },
    { placements: [{ blankId: 'left', optionId: 'cat' }, { blankId: 'right', optionId: 'dog' }] },
  ])('rejects unknown IDs and malformed/batch submissions', (answer) => {
    expect(() => gradeImagePlacement(question, answer, [])).toThrow()
  })

  it('does not reuse a consumed option or replace a correctly locked blank', () => {
    const accepted = [{ blankId: 'left', optionId: 'cat' }]
    expect(() => gradeImagePlacement(question, place('right', 'cat'), accepted)).toThrow()
    expect(() => gradeImagePlacement(question, place('left', 'dog'), accepted)).toThrow()
  })

  it.each(['TIMEOUT', 'SKIPPED'] as const)('ends %s without exposing the answer key', (outcome) => {
    expect(gradeImagePlacement(question, { outcome }, []).result).toMatchObject({ status: outcome, isCorrect: false, retryable: false, correctAnswer: null })
  })
})
