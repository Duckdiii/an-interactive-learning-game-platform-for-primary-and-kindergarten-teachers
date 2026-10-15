import { describe, expect, it } from 'vitest'
import { buildMockGameContents } from '../../../services/mock/gameFixtures'
import type { MemoryCardQuestion } from '../../../types/game-dsl.types'
import { validateQuestion } from '../../../utils/gameValidation'
import { firstUnusedPairNumber, nextPairId } from './matchingEditing'
import { addPair, canAddPair, canRemovePair, removePair, removePairById, setContentField, setContentFieldById } from './memoryEditing'

const memory = buildMockGameContents().find((game) => game.gameType === 'MEMORY_CARD')!
// Câu 1: 3 cặp (p1-p3). Câu 2: 4 cặp (p1-p4). Câu 3: 2 cặp.
const three = (): MemoryCardQuestion => structuredClone(memory.questions[0]) as MemoryCardQuestion
const four = (): MemoryCardQuestion => structuredClone(memory.questions[1]) as MemoryCardQuestion
const two = (): MemoryCardQuestion => structuredClone(memory.questions[2]) as MemoryCardQuestion
const eight = (): MemoryCardQuestion => {
  let q = four()

  while (canAddPair(q)) q = addPair(q)

  return q
}
const issuesOf = (question: MemoryCardQuestion) => validateQuestion('MEMORY_CARD', question, 0, 'save')

describe('số cặp luôn từ 2 đến 8 (giới hạn DSL)', () => {
  it('không thêm được cặp thứ 9 (trả lại nguyên bản)', () => {
    const q = eight()

    expect(q.pairs).toHaveLength(8)
    expect(canAddPair(q)).toBe(false)
    expect(addPair(q)).toBe(q)
  })

  it('không xóa được khi chỉ còn 2 cặp (trả lại nguyên bản)', () => {
    const q = two()

    expect(q.pairs).toHaveLength(2)
    expect(canRemovePair(q)).toBe(false)
    expect(removePair(q, 0)).toBe(q)
    expect(removePairById(q, 'p1')).toBe(q)
  })

  it('xóa vị trí không có thì không đổi gì', () => {
    const q = four()

    expect(removePair(q, 9)).toBe(q)
    expect(removePair(q, -1)).toBe(q)
  })

  it('đủ 2 cặp đến 8 cặp thì mọi bước thêm/xóa đều hợp lệ về số lượng', () => {
    let q = two()

    for (let count = 2; count < 8; count += 1) q = addPair(q)
    expect(q.pairs).toHaveLength(8)
    for (let count = 8; count > 2; count -= 1) q = removePair(q, 0)
    expect(q.pairs).toHaveLength(2)
  })
})

describe('mã cặp', () => {
  it('cặp mới lấy số nhỏ nhất chưa dùng và mã cũ được giữ nguyên', () => {
    const q = removePair(four(), 1)

    expect(q.pairs.map((pair) => pair.pairId)).toEqual(['p1', 'p3', 'p4'])
    expect(addPair(q).pairs.map((pair) => pair.pairId)).toEqual(['p1', 'p3', 'p4', 'p2'])
  })

  it('dùng chung cách cấp mã với MATCHING: bỏ qua mã đã có, số lớn nhất + 1', () => {
    expect(nextPairId([{ pairId: 'p1' }, { pairId: 'p2' }, { pairId: 'p4' }])).toBe('p3')
    expect(firstUnusedPairNumber(removePair(four(), 1).pairs)).toBe(5)
  })

  it('mọi cách thêm/xóa đều giữ mã duy nhất và đúng mẫu p<số> (bộ kiểm tra không báo mã)', () => {
    let q = four()

    q = addPair(removePair(q, 0))
    q = addPair(removePair(q, 2))
    q = setContentField(setContentField(q, 3, 'text', 'x'), 4, 'text', 'y')

    expect(new Set(q.pairs.map((pair) => pair.pairId)).size).toBe(q.pairs.length)
    expect(issuesOf(q).some((issue) => issue.code === 'badId' || issue.code === 'duplicateId')).toBe(false)
  })
})

describe('bản vá theo mã cặp (ổn định khi thêm/xóa cặp khác)', () => {
  it('addPair dùng mã do form cấp', () => {
    const q = removePair(four(), 1)

    expect(addPair(q, 'p5').pairs.map((pair) => pair.pairId)).toEqual(['p1', 'p3', 'p4', 'p5'])
  })

  it('setContentFieldById sửa đúng cặp dù vị trí đã đổi; mã không còn (cặp đã xóa) thì KHÔNG đổi gì', () => {
    const q = removePair(four(), 0)

    expect(setContentFieldById(q, 'p3', 'text', 'Chó').pairs[1].content.text).toBe('Chó')
    expect(setContentFieldById(q, 'p1', 'text', 'rơi nhầm')).toBe(q)
  })

  it('removePairById xóa đúng cặp có mã đó; mã không còn thì không đổi gì', () => {
    const q = four()

    expect(removePairById(q, 'p2').pairs.map((pair) => pair.pairId)).toEqual(['p1', 'p3', 'p4'])
    expect(removePairById(q, 'p9')).toBe(q)
  })
})

describe('mặt thẻ là chữ hoặc mô tả hình', () => {
  it('cặp mới còn trống bị báo "cần chữ hoặc mô tả hình"', () => {
    const issues = issuesOf(addPair(three()))

    expect(issues.some((issue) => issue.field === 'pairs[3].content' && issue.code === 'needContent')).toBe(true)
  })

  it('chỉ có mô tả hình (không chữ) vẫn hợp lệ', () => {
    const q = setContentField(addPair(three()), 3, 'visualPrompt', 'con mèo ngồi trên ghế')

    expect(issuesOf(q)).toEqual([])
    expect(q.pairs[3].content).toEqual({ visualPrompt: 'con mèo ngồi trên ghế' })
  })

  it('xóa hết chữ (hoặc chỉ còn dấu cách) thì BỎ HẲN trường và báo thiếu nội dung nếu thẻ không còn gì', () => {
    const q = setContentField(three(), 0, 'text', '   ')

    expect(q.pairs[0].content).toEqual({})
    expect(issuesOf(q).some((issue) => issue.field === 'pairs[0].content' && issue.code === 'needContent')).toBe(true)
  })

  it('đổi chữ giữ nguyên imageUrl và mô tả hình của thẻ (tải ảnh là việc của A5)', () => {
    const q = three()

    q.pairs[0].content = { text: 'mèo', visualPrompt: 'con mèo', imageUrl: '/mock/cat.png' }

    expect(setContentField(q, 0, 'text', 'Mèo').pairs[0].content).toEqual({ text: 'Mèo', visualPrompt: 'con mèo', imageUrl: '/mock/cat.png' })
  })

  it('không đổi bản cũ; vị trí không có thì trả lại nguyên bản', () => {
    const before = three()
    const after = setContentField(before, 1, 'text', 'khác')

    expect(after).not.toBe(before)
    expect(before.pairs[1].content.text).not.toBe('khác')
    expect(setContentField(before, 9, 'text', 'x')).toBe(before)
  })
})

describe('không cho trùng và giới hạn độ dài', () => {
  it('hai cặp cùng chữ bị báo trùng (ở danh sách cặp)', () => {
    const q = setContentField(three(), 1, 'text', three().pairs[0].content.text ?? '')

    expect(issuesOf(q).some((issue) => issue.field === 'pairs' && issue.code === 'duplicate')).toBe(true)
  })

  it('chữ quá 100 ký tự bị báo đúng ô', () => {
    const q = setContentField(three(), 0, 'text', 'a'.repeat(101))

    expect(issuesOf(q).some((issue) => issue.field === 'pairs[0].content.text' && issue.code === 'tooLong')).toBe(true)
  })

  it('câu mẫu của mock hợp lệ', () => {
    for (const question of [three(), four(), two()]) expect(issuesOf(question)).toEqual([])
  })
})
