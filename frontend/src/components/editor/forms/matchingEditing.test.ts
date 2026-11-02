import { describe, expect, it } from 'vitest'
import { buildMockGameContents } from '../../../services/mock/gameFixtures'
import type { MatchingQuestion } from '../../../types/game-dsl.types'
import { validateQuestion } from '../../../utils/gameValidation'
import { addPair, canAddPair, canRemovePair, firstUnusedPairNumber, nextPairId, removePair, removePairById, setSideField, setSideFieldById } from './matchingEditing'

const matching = buildMockGameContents().find((game) => game.gameType === 'MATCHING')!
// Câu 1: 3 cặp (p1-p3). Câu 3: 4 cặp (p1-p4).
const three = (): MatchingQuestion => structuredClone(matching.questions[0]) as MatchingQuestion
const four = (): MatchingQuestion => structuredClone(matching.questions[2]) as MatchingQuestion
const six = (): MatchingQuestion => addPair(addPair(four()))
const issuesOf = (question: MatchingQuestion) => validateQuestion('MATCHING', question, 0, 'save')

describe('số cặp luôn từ 3 đến 6 (giới hạn DSL)', () => {
  it('không thêm được cặp thứ 7 (trả lại nguyên bản)', () => {
    const q = six()

    expect(q.pairs).toHaveLength(6)
    expect(canAddPair(q)).toBe(false)
    expect(addPair(q)).toBe(q)
  })

  it('không xóa được khi chỉ còn 3 cặp (trả lại nguyên bản)', () => {
    const q = three()

    expect(canRemovePair(q)).toBe(false)
    expect(removePair(q, 0)).toBe(q)
  })

  it('xóa vị trí không có thì không đổi gì', () => {
    const q = four()

    expect(removePair(q, 9)).toBe(q)
    expect(removePair(q, -1)).toBe(q)
  })
})

describe('mã cặp', () => {
  it('cặp mới lấy số nhỏ nhất chưa dùng và mã cũ được giữ nguyên', () => {
    const q = removePair(four(), 1)

    expect(q.pairs.map((pair) => pair.pairId)).toEqual(['p1', 'p3', 'p4'])
    expect(addPair(q).pairs.map((pair) => pair.pairId)).toEqual(['p1', 'p3', 'p4', 'p2'])
  })

  it('nextPairId bỏ qua mã đã có', () => {
    expect(nextPairId([{ pairId: 'p1' }, { pairId: 'p2' }, { pairId: 'p4' }] as MatchingQuestion['pairs'])).toBe('p3')
  })

  it('mọi cách thêm/xóa đều giữ mã duy nhất và đúng mẫu p<số> (bộ kiểm tra không báo mã)', () => {
    let q = four()

    q = addPair(removePair(q, 0))
    q = addPair(removePair(q, 2))
    q = setSideField(setSideField(q, 3, 'left', 'text', 'x'), 3, 'right', 'text', 'y')

    expect(new Set(q.pairs.map((pair) => pair.pairId)).size).toBe(q.pairs.length)
    expect(issuesOf(q).some((issue) => issue.code === 'badId' || issue.code === 'duplicateId')).toBe(false)
  })
})

describe('bản vá theo mã cặp (ổn định khi thêm/xóa cặp khác)', () => {
  it('addPair dùng mã do form cấp; firstUnusedPairNumber là số lớn nhất + 1 (không dùng lại số đã có)', () => {
    const q = removePair(four(), 1)

    expect(firstUnusedPairNumber(q.pairs)).toBe(5)
    expect(addPair(q, 'p5').pairs.map((pair) => pair.pairId)).toEqual(['p1', 'p3', 'p4', 'p5'])
  })

  it('setSideFieldById sửa đúng cặp dù vị trí đã đổi; mã không còn (cặp đã xóa) thì KHÔNG đổi gì', () => {
    const q = removePair(four(), 0)

    expect(setSideFieldById(q, 'p3', 'left', 'text', 'Â').pairs[1].left.text).toBe('Â')
    expect(setSideFieldById(q, 'p1', 'left', 'text', 'rơi nhầm')).toBe(q)
  })

  it('removePairById xóa đúng cặp có mã đó; mã không còn thì không đổi gì', () => {
    const q = four()

    expect(removePairById(q, 'p2').pairs.map((pair) => pair.pairId)).toEqual(['p1', 'p3', 'p4'])
    expect(removePairById(q, 'p9')).toBe(q)
  })
})

describe('mỗi bên là chữ hoặc ảnh', () => {
  it('cặp mới còn trống bị báo "cần chữ hoặc mô tả hình" ở cả hai bên', () => {
    const issues = issuesOf(addPair(three()))

    expect(issues.some((issue) => issue.field === 'pairs[3].left' && issue.code === 'needContent')).toBe(true)
    expect(issues.some((issue) => issue.field === 'pairs[3].right' && issue.code === 'needContent')).toBe(true)
  })

  it('chỉ có mô tả hình (không chữ) vẫn hợp lệ', () => {
    let q = addPair(three())

    q = setSideField(q, 3, 'left', 'visualPrompt', 'con mèo ngồi trên ghế')
    q = setSideField(q, 3, 'right', 'text', 'mèo')

    expect(issuesOf(q)).toEqual([])
    expect(q.pairs[3].left).toEqual({ visualPrompt: 'con mèo ngồi trên ghế' })
  })

  it('xóa hết chữ thì BỎ HẲN trường (schema không cho chuỗi rỗng) và báo thiếu nội dung nếu bên đó không còn gì', () => {
    const q = setSideField(three(), 0, 'left', 'text', '   ')

    expect(q.pairs[0].left).toEqual({})
    expect(issuesOf(q).some((issue) => issue.field === 'pairs[0].left' && issue.code === 'needContent')).toBe(true)
  })

  it('đổi chữ giữ nguyên imageUrl của bên đó (tải ảnh là việc của A5)', () => {
    const q = three()

    q.pairs[0].left = { text: 'a', imageUrl: '/mock/a.png' }

    expect(setSideField(q, 0, 'left', 'text', 'A').pairs[0].left).toEqual({ text: 'A', imageUrl: '/mock/a.png' })
  })

  it('không đổi bản cũ; vị trí không có thì trả lại nguyên bản', () => {
    const before = three()
    const after = setSideField(before, 1, 'right', 'text', 'khác')

    expect(before.pairs[1].right.text).toBe('ăn')
    expect(after.pairs[1].right.text).toBe('khác')
    expect(setSideField(before, 7, 'left', 'text', 'x')).toBe(before)
  })

  it('chữ quá 100 ký tự bị báo ở đúng trường', () => {
    const q = setSideField(three(), 0, 'left', 'text', 'a'.repeat(101))

    expect(issuesOf(q).some((issue) => issue.field === 'pairs[0].left.text' && issue.code === 'tooLong')).toBe(true)
  })
})

describe('không cho trùng', () => {
  it('hai cặp cùng chữ bên trái hoặc bên phải bị báo trùng (không phân biệt hoa thường, khoảng trắng thừa)', () => {
    const left = setSideField(three(), 1, 'left', 'text', '  A ')
    const right = setSideField(three(), 2, 'right', 'text', 'ĂN')

    expect(issuesOf(left).some((issue) => issue.field === 'pairs' && issue.code === 'duplicate')).toBe(true)
    expect(issuesOf(right).some((issue) => issue.field === 'pairs' && issue.code === 'duplicate')).toBe(true)
  })

  it('chữ "apple" và mô tả hình "apple" là hai nội dung khác nhau, không bị báo trùng', () => {
    let q = three()

    q = setSideField(q, 0, 'left', 'text', 'apple')
    q = setSideField(q, 1, 'left', 'text', '')
    q = setSideField(q, 1, 'left', 'visualPrompt', 'apple')

    expect(issuesOf(q).some((issue) => issue.code === 'duplicate')).toBe(false)
  })
})
