import { describe, expect, it } from 'vitest'
import { GAME_TYPES } from '../../../types/game-dsl.types'
import type { QuestionDsl, VisualClozeImageQuestionDsl } from '../../../types/game-dsl.types'
import { createPreviewGrader, gradePreviewAnswer, previewDeviceSize, toPreviewStudentQuestion } from './previewModel'

const quiz = {
  id: 'q1',
  timeLimitSeconds: 20,
  points: 15,
  questionText: '1 + 2 = ?',
  options: [
    { id: 'a', text: '2' },
    { id: 'b', text: '3' },
  ],
  correctOptionId: 'b',
} as QuestionDsl

const image: VisualClozeImageQuestionDsl = {
  id: 'q-image', points: 10, timeLimitSeconds: 60, questionText: 'Điền hình',
  sceneImageUrl: 'https://example.com/scene.png', sceneWidth: 800, sceneHeight: 400,
  blanks: [{ id: 'b1', x: 200, y: 200, correctOptionId: 'cat' }, { id: 'b2', x: 600, y: 200, correctOptionId: 'dog' }],
  options: [{ id: 'cat', visualPrompt: 'Mèo' }, { id: 'dog', visualPrompt: 'Chó' }],
}

it('preview accepts the first correct IMAGE pair without prematurely finishing or exposing the mapping', () => {
  expect(gradePreviewAnswer('VISUAL_CLOZE', image, { placements: [{ blankId: 'b1', optionId: 'cat' }] }))
    .toMatchObject({ status: 'IN_PROGRESS', retryable: true, placementCorrect: true, correctAnswer: null })
})

it('a preview attempt remembers accepted pairs and a new attempt starts empty', () => {
  const grade = createPreviewGrader('VISUAL_CLOZE', image)
  expect(grade({ placements: [{ blankId: 'b1', optionId: 'cat' }] }).status).toBe('IN_PROGRESS')
  expect(grade({ placements: [{ blankId: 'b2', optionId: 'dog' }] }).status).toBe('CORRECT')
  expect(createPreviewGrader('VISUAL_CLOZE', image)({ placements: [{ blankId: 'b2', optionId: 'dog' }] }).status).toBe('IN_PROGRESS')
})

describe('previewDeviceSize', () => {
  it('Tivi 1280x720, máy tính bảng 1024x768 với mọi loại game', () => {
    for (const type of GAME_TYPES) {
      expect(previewDeviceSize(type, 'tv')).toEqual({ width: 1280, height: 720 })
      expect(previewDeviceSize(type, 'tablet')).toEqual({ width: 1024, height: 768 })
    }
  })

  it('điện thoại: dọc, trừ loại cần màn ngang', () => {
    expect(previewDeviceSize('QUIZ', 'phone')).toEqual({ width: 390, height: 844 })
    expect(previewDeviceSize('MATCHING', 'phone')).toEqual({ width: 844, height: 390 })
    expect(previewDeviceSize('MEMORY_CARD', 'phone')).toEqual({ width: 844, height: 390 })
  })
})

describe('gradePreviewAnswer', () => {
  it('đúng: được điểm của câu và nêu đáp án đúng', () => {
    expect(gradePreviewAnswer('QUIZ', quiz, { selectedOptionId: 'b' })).toEqual({
      status: 'CORRECT',
      isCorrect: true,
      pointsEarned: 15,
      totalScore: 15,
      correctAnswer: { selectedOptionId: 'b' },
    })
  })

  it('sai: không điểm, vẫn nêu đáp án đúng để trẻ học', () => {
    const result = gradePreviewAnswer('QUIZ', quiz, { selectedOptionId: 'a' })

    expect(result).toMatchObject({ status: 'INCORRECT', isCorrect: false, pointsEarned: 0, correctAnswer: { selectedOptionId: 'b' } })
  })

  it('câu đưa cho renderer không chứa đáp án đúng', () => {
    expect(toPreviewStudentQuestion('QUIZ', quiz)).not.toHaveProperty('correctOptionId')
  })
})
