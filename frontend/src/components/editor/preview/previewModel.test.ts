import { describe, expect, it } from 'vitest'
import { GAME_TYPES } from '../../../types/game-dsl.types'
import type { QuestionDsl } from '../../../types/game-dsl.types'
import { gradePreviewAnswer, previewDeviceSize, toPreviewStudentQuestion } from './previewModel'

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
