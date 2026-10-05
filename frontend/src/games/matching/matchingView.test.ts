import { describe, expect, it } from 'vitest'
import type { MatchingPair, MatchingQuestion } from '../../types/game-dsl.types'
import type { MatchingStudentQuestion } from '../../types/game-student.types'
import {
  correctLinksOf,
  fromStudentQuestion,
  fromTeacherQuestion,
  isCorrectLocally,
  sideDisplay,
} from './matchingView'

function makeQuestion(pairCount: number, id = 'q1'): MatchingQuestion {
  const pairs: MatchingPair[] = Array.from({ length: pairCount }, (_, i) => ({
    pairId: `p${i + 1}`,
    left: { text: `trái ${i + 1}` },
    right: { text: `phải ${i + 1}`, imageUrl: `/img/${i + 1}.png` },
  }))
  return { id, timeLimitSeconds: 30, points: 10, pairs }
}

describe('fromTeacherQuestion', () => {
  it('cột trái giữ thứ tự gốc, id là pairId thật, nội dung đúng phía', () => {
    const view = fromTeacherQuestion(makeQuestion(4))

    expect(view.leftItems.map((item) => item.id)).toEqual(['p1', 'p2', 'p3', 'p4'])
    expect(view.leftItems[0].content).toEqual({ text: 'trái 1' })
  })

  it('cột phải chứa đủ các cặp, mỗi ô giữ nội dung phía phải của đúng pairId', () => {
    const view = fromTeacherQuestion(makeQuestion(4))

    expect([...view.rightItems.map((item) => item.id)].sort()).toEqual(['p1', 'p2', 'p3', 'p4'])
    for (const item of view.rightItems) {
      const n = item.id.slice(1)
      expect(item.content).toEqual({ text: `phải ${n}`, imageUrl: `/img/${n}.png` })
    }
  })

  it('không ô phải nào nằm cùng hàng ngang với ô trái ghép đúng của nó (3 đến 6 cặp, nhiều câu)', () => {
    for (let pairCount = 3; pairCount <= 6; pairCount++) {
      for (let q = 1; q <= 100; q++) {
        const view = fromTeacherQuestion(makeQuestion(pairCount, `q${q}`))
        view.leftItems.forEach((left, row) => {
          expect(view.rightItems[row].id, `pairs=${pairCount} q${q} hàng ${row}`).not.toBe(left.id)
        })
      }
    }
  })

  it('xác định theo question.id: render lại cho cùng thứ tự, câu khác nhau có thể khác nhau', () => {
    const a1 = fromTeacherQuestion(makeQuestion(6, 'q1'))
    const a2 = fromTeacherQuestion(makeQuestion(6, 'q1'))
    const orders = new Set(
      Array.from({ length: 30 }, (_, q) =>
        fromTeacherQuestion(makeQuestion(6, `q${q}`)).rightItems.map((item) => item.id).join(','),
      ),
    )

    expect(a1.rightItems).toEqual(a2.rightItems)
    expect(orders.size).toBeGreaterThan(1)
  })
})

describe('fromStudentQuestion', () => {
  const question: MatchingStudentQuestion = {
    id: 'q1',
    timeLimitSeconds: 30,
    points: 10,
    leftItems: [
      { id: 'l1', text: 'dog' },
      { id: 'l2', text: 'cat', imageUrl: '/cat.png' },
    ],
    rightItems: [
      { id: 'r1', text: 'mèo' },
      { id: 'r2', text: 'chó' },
    ],
  }

  it('giữ nguyên thứ tự Backend gửi, không xáo lại', () => {
    const view = fromStudentQuestion(question)

    expect(view.leftItems.map((item) => item.id)).toEqual(['l1', 'l2'])
    expect(view.rightItems.map((item) => item.id)).toEqual(['r1', 'r2'])
  })

  it('tách id ra khỏi nội dung của ô', () => {
    const view = fromStudentQuestion(question)

    expect(view.leftItems[1]).toEqual({ id: 'l2', content: { text: 'cat', imageUrl: '/cat.png' } })
    expect(view.leftItems[1].content).not.toHaveProperty('id')
  })
})

describe('sideDisplay', () => {
  it('có chữ thì hiện chữ, kèm ảnh nếu có', () => {
    expect(sideDisplay({ text: 'táo' })).toEqual({ text: 'táo', hasImage: false })
    expect(sideDisplay({ text: 'táo', imageUrl: '/a.png' })).toEqual({ text: 'táo', hasImage: true })
  })

  it('chỉ có ảnh thì không có chữ', () => {
    expect(sideDisplay({ imageUrl: '/a.png', visualPrompt: 'apple' })).toEqual({ text: undefined, hasImage: true })
  })

  it('chỉ có visualPrompt (ảnh chưa lấy về) thì dùng nó làm chữ tạm để ô không trống', () => {
    expect(sideDisplay({ visualPrompt: 'apple' })).toEqual({ text: 'apple', hasImage: false })
  })
})

describe('chấm cục bộ (preview, review)', () => {
  it('đúng khi nối đủ và mọi cặp nối hai ô cùng pairId', () => {
    const links = [
      { leftPairId: 'p1', rightPairId: 'p1' },
      { leftPairId: 'p2', rightPairId: 'p2' },
      { leftPairId: 'p3', rightPairId: 'p3' },
    ]

    expect(isCorrectLocally(links, 3)).toBe(true)
  })

  it('sai khi có một cặp nối lệch, dù nối đủ số cặp', () => {
    const links = [
      { leftPairId: 'p1', rightPairId: 'p2' },
      { leftPairId: 'p2', rightPairId: 'p1' },
      { leftPairId: 'p3', rightPairId: 'p3' },
    ]

    expect(isCorrectLocally(links, 3)).toBe(false)
  })

  it('sai khi chưa nối đủ (đúng hết hoặc không, không chấm từng phần)', () => {
    expect(isCorrectLocally([{ leftPairId: 'p1', rightPairId: 'p1' }], 3)).toBe(false)
    expect(isCorrectLocally([], 3)).toBe(false)
  })

  it('correctLinksOf trả mọi cặp đúng theo thứ tự pairs', () => {
    expect(correctLinksOf(makeQuestion(3))).toEqual([
      { leftPairId: 'p1', rightPairId: 'p1' },
      { leftPairId: 'p2', rightPairId: 'p2' },
      { leftPairId: 'p3', rightPairId: 'p3' },
    ])
  })
})
