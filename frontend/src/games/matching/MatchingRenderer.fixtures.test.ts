import { describe, expect, it } from 'vitest'
import type { MatchingQuestion } from '../../types/game-dsl.types'
import {
  makeStudentFixture,
  mockMatchingQuestion,
  mockMatchingQuestionBrokenImages,
  mockMatchingQuestionLongText,
  mockMatchingQuestionSixPairs,
  mockMatchingQuestionWithImages,
} from './MatchingRenderer.fixtures'

/**
 * Fixture dùng cho sandbox nên phải hợp lệ theo DSL v1.0.0 (3 đến 6 cặp, `pairId` dạng `p<số>` không trùng,
 * mỗi phía có chữ hoặc `visualPrompt`, chữ tối đa 100 ký tự). Nếu không, kiểm tra bằng mắt sẽ dựa trên dữ
 * liệu mà Backend không bao giờ sinh ra.
 */
const TEACHER_FIXTURES: Array<[string, MatchingQuestion]> = [
  ['cơ bản', mockMatchingQuestion],
  ['có ảnh', mockMatchingQuestionWithImages],
  ['6 cặp', mockMatchingQuestionSixPairs],
  ['chữ dài', mockMatchingQuestionLongText],
  ['ảnh lỗi', mockMatchingQuestionBrokenImages],
]

describe.each(TEACHER_FIXTURES)('fixture dạng giáo viên: %s', (_name, question) => {
  it('có 3 đến 6 cặp, pairId dạng p<số> và không trùng', () => {
    const ids = question.pairs.map((pair) => pair.pairId)

    expect(question.pairs.length).toBeGreaterThanOrEqual(3)
    expect(question.pairs.length).toBeLessThanOrEqual(6)
    expect(ids.every((id) => /^p[0-9]+$/.test(id))).toBe(true)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('mỗi phía có chữ hoặc visualPrompt, chữ không quá 100 ký tự, id câu dạng q<số>', () => {
    for (const pair of question.pairs) {
      for (const side of [pair.left, pair.right]) {
        expect(Boolean(side.text) || Boolean(side.visualPrompt)).toBe(true)
        expect((side.text ?? '').length).toBeLessThanOrEqual(100)
      }
    }
    expect(question.id).toMatch(/^q[0-9]+$/)
  })
})

describe('mockMatchingQuestionLongText', () => {
  it('có ô dài sát giới hạn ở cả hai cột', () => {
    const lefts = mockMatchingQuestionLongText.pairs.map((pair) => (pair.left.text ?? '').length)
    const rights = mockMatchingQuestionLongText.pairs.map((pair) => (pair.right.text ?? '').length)

    expect(Math.max(...lefts)).toBeGreaterThanOrEqual(90)
    expect(Math.max(...rights)).toBeGreaterThanOrEqual(90)
  })
})

describe('makeStudentFixture', () => {
  it.each(TEACHER_FIXTURES)('%s: id mờ, không lộ pairId, số ô đúng', (_name, question) => {
    const { question: student } = makeStudentFixture(question)
    const allIds = [...student.leftItems, ...student.rightItems].map((item) => item.id)

    expect(student.leftItems).toHaveLength(question.pairs.length)
    expect(student.rightItems).toHaveLength(question.pairs.length)
    expect(student.leftItems.every((item) => /^l[0-9]+$/.test(item.id))).toBe(true)
    expect(student.rightItems.every((item) => /^r[0-9]+$/.test(item.id))).toBe(true)
    expect(allIds.some((id) => /^p[0-9]+$/.test(id))).toBe(false)
    expect(student).not.toHaveProperty('pairs')
  })

  it.each(TEACHER_FIXTURES)('%s: đáp án đúng là song ánh và đúng nội dung từng cặp', (_name, question) => {
    const { question: student, correctMatches } = makeStudentFixture(question)

    expect(new Set(correctMatches.map((m) => m.leftPairId)).size).toBe(question.pairs.length)
    expect(new Set(correctMatches.map((m) => m.rightPairId)).size).toBe(question.pairs.length)

    for (const pair of question.pairs) {
      const match = correctMatches.find(
        (m) => student.leftItems.find((item) => item.id === m.leftPairId)?.text === pair.left.text,
      )
      const rightItem = student.rightItems.find((item) => item.id === match?.rightPairId)
      expect(rightItem?.text).toBe(pair.right.text)
      expect(rightItem?.imageUrl).toBe(pair.right.imageUrl)
    }
  })

  it.each(TEACHER_FIXTURES)('%s: không ô phải nào nằm cùng hàng với ô ghép đúng của nó', (_name, question) => {
    const { question: student, correctMatches } = makeStudentFixture(question)

    for (const match of correctMatches) {
      const row = student.leftItems.findIndex((item) => item.id === match.leftPairId)
      expect(student.rightItems[row].id).not.toBe(match.rightPairId)
    }
  })

  it('giữ nguyên trường chung của câu hỏi (id, thời gian, điểm, câu dẫn, audio)', () => {
    const { question: student } = makeStudentFixture(mockMatchingQuestion)

    expect(student).toMatchObject({
      id: mockMatchingQuestion.id,
      timeLimitSeconds: mockMatchingQuestion.timeLimitSeconds,
      points: mockMatchingQuestion.points,
      audioText: mockMatchingQuestion.audioText,
      audioUrl: mockMatchingQuestion.audioUrl,
    })
  })
})
