import { describe, expect, it } from 'vitest'
import { buildMockGameContents } from '../../../services/mock/gameFixtures'
import type { QuizQuestion } from '../../../types/game-dsl.types'
import { validateQuestion } from '../../../utils/gameValidation'
import {
  addOption,
  canAddOption,
  canRemoveOption,
  correctIndexOf,
  removeOption,
  setCorrectOption,
  setOptionText,
  setQuestionText,
} from './quizEditing'
import { setPoints, setTimeLimit } from './commonEditing'

// Câu 2 của game QUIZ mẫu: 4 đáp án (a-d), đúng là b.
const four = (): QuizQuestion => structuredClone(buildMockGameContents()[0].questions[1]) as QuizQuestion
// Câu 1: 3 đáp án, đúng là b.
const three = (): QuizQuestion => structuredClone(buildMockGameContents()[0].questions[0]) as QuizQuestion
const two = (): QuizQuestion => removeOption(three(), 2)
const issuesOf = (question: QuizQuestion) => validateQuestion('QUIZ', question, 0, 'save')

describe('số đáp án luôn từ 2 đến 4', () => {
  it('không thêm được đáp án thứ 5 (trả lại nguyên bản)', () => {
    const q = four()

    expect(canAddOption(q)).toBe(false)
    expect(addOption(q)).toBe(q)
  })

  it('không xóa được khi chỉ còn 2 đáp án (trả lại nguyên bản)', () => {
    const q = two()

    expect(q.options).toHaveLength(2)
    expect(canRemoveOption(q)).toBe(false)
    expect(removeOption(q, 0)).toBe(q)
  })

  it('thêm đáp án: mã theo vị trí, văn bản trống, giữ nguyên đáp án đúng', () => {
    const q = addOption(three())

    expect(q.options.map((option) => option.id)).toEqual(['a', 'b', 'c', 'd'])
    expect(q.options[3].text).toBe('')
    expect(q.correctOptionId).toBe('b')
  })

  it('đáp án trống vừa thêm bị bộ kiểm tra báo "cần nhập" ở đúng trường', () => {
    const issues = issuesOf(addOption(three()))

    expect(issues.some((issue) => issue.field === 'options[3].text' && issue.code === 'required')).toBe(true)
  })
})

describe('xóa đáp án', () => {
  it('đánh lại mã và dịch đáp án đúng theo vị trí mới', () => {
    // Xóa "a" của {a,b,c} với đúng là b: còn {a:'3', b:'4'} và đúng là a.
    const q = removeOption(three(), 0)

    expect(q.options.map((option) => option.id)).toEqual(['a', 'b'])
    expect(q.options.map((option) => option.text)).toEqual(['3', '4'])
    expect(q.correctOptionId).toBe('a')
    expect(issuesOf(q)).toEqual([])
  })

  it('xóa đáp án đứng sau đáp án đúng thì đáp án đúng giữ nguyên', () => {
    const q = removeOption(three(), 2)

    expect(q.correctOptionId).toBe('b')
    expect(issuesOf(q)).toEqual([])
  })

  it('xóa chính đáp án đúng thì phải chọn lại: mã đáp án đúng để trống và báo "chưa có đáp án đúng"', () => {
    const q = removeOption(three(), 1)

    expect(q.correctOptionId).toBe('')
    expect(issuesOf(q).some((issue) => issue.code === 'noCorrect' && issue.field === 'correctOptionId')).toBe(true)
  })
})

describe('chọn đáp án đúng', () => {
  it('chỉ một đáp án đúng tại mọi thời điểm', () => {
    const q = setCorrectOption(three(), 2)

    expect(q.correctOptionId).toBe('c')
    expect(correctIndexOf(q)).toBe(2)
    expect(issuesOf(q)).toEqual([])
  })
})

describe('sửa chữ, thời gian, điểm', () => {
  it('sửa chữ đáp án giữ nguyên mã và đáp án đúng; không đổi bản cũ', () => {
    const before = three()
    const after = setOptionText(before, 0, 'Hai')

    expect(after.options[0]).toEqual({ id: 'a', text: 'Hai' })
    expect(after.correctOptionId).toBe(before.correctOptionId)
    expect(before.options[0].text).toBe('2')
  })

  it('sửa nội dung câu, thời gian, điểm', () => {
    const q = setPoints(setTimeLimit(setQuestionText(three(), 'Câu mới?'), 45), 20)

    expect(q).toMatchObject({ questionText: 'Câu mới?', timeLimitSeconds: 45, points: 20 })
  })

  it('ranh giới 200 ký tự của nội dung câu (SRS ghi 500, DSL ghi 200: lấy 200)', () => {
    expect(issuesOf(setQuestionText(three(), 'a'.repeat(200)))).toEqual([])
    expect(issuesOf(setQuestionText(three(), 'a'.repeat(201))).some((issue) => issue.code === 'tooLong' && issue.field === 'questionText')).toBe(true)
  })

  it('thời gian 10 đến 120 giây (giáo viên nhập)', () => {
    expect(issuesOf(setTimeLimit(three(), 10))).toEqual([])
    expect(issuesOf(setTimeLimit(three(), 120))).toEqual([])
    expect(issuesOf(setTimeLimit(three(), 9)).some((issue) => issue.field === 'timeLimitSeconds')).toBe(true)
    expect(issuesOf(setTimeLimit(three(), 121)).some((issue) => issue.field === 'timeLimitSeconds')).toBe(true)
  })
})
