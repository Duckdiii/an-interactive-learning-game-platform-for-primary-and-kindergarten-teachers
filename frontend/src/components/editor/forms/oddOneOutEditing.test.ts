import { describe, expect, it } from 'vitest'
import { buildMockGameContents } from '../../../services/mock/gameFixtures'
import type { OddOneOutQuestion } from '../../../types/game-dsl.types'
import { validateQuestion } from '../../../utils/gameValidation'
import { addItem, canAddItem, canRemoveItem, oddIndexOf, positionId, removeItem, setItemText, setOddItem } from './oddOneOutEditing'

const odd = buildMockGameContents().find((game) => game.gameType === 'ODD_ONE_OUT')!
// Câu 1: 3 mục, khác loại là c (Hình vuông). Câu 2: 4 mục, khác loại là c (Con cá). Câu 3: 4 mục, khác loại là d (Cái bàn).
const three = (): OddOneOutQuestion => structuredClone(odd.questions[0]) as OddOneOutQuestion
const four = (): OddOneOutQuestion => structuredClone(odd.questions[1]) as OddOneOutQuestion
const five = (): OddOneOutQuestion => addItem(four())
const issuesOf = (question: OddOneOutQuestion) => validateQuestion('ODD_ONE_OUT', question, 0, 'save')
const texts = (question: OddOneOutQuestion) => question.items.map((item) => item.text)

describe('số mục luôn từ 3 đến 5 (giới hạn DSL)', () => {
  it('không thêm được mục thứ 6 (trả lại nguyên bản)', () => {
    const q = five()

    expect(q.items).toHaveLength(5)
    expect(canAddItem(q)).toBe(false)
    expect(addItem(q)).toBe(q)
  })

  it('không xóa được khi chỉ còn 3 mục (trả lại nguyên bản)', () => {
    const q = three()

    expect(canRemoveItem(q)).toBe(false)
    expect(removeItem(q, 0)).toBe(q)
  })

  it('xóa vị trí không có thì không đổi gì', () => {
    const q = four()

    expect(removeItem(q, 9)).toBe(q)
    expect(removeItem(q, -1)).toBe(q)
  })
})

describe('mã mục theo vị trí a đến e', () => {
  it('thêm mục: mã mới là chữ kế tiếp, mục cũ và mục khác loại giữ nguyên', () => {
    const q = addItem(four())

    expect(q.items.map((item) => item.id)).toEqual(['a', 'b', 'c', 'd', 'e'])
    expect(q.oddOneOutId).toBe('c')
    expect(q.items[4].text).toBe('')
  })

  it('xóa mục đứng TRƯỚC mục khác loại: mã được đánh lại và vẫn trỏ đúng mục đó (theo nội dung)', () => {
    const before = four()
    const q = removeItem(before, 0)

    expect(q.items.map((item) => item.id)).toEqual(['a', 'b', 'c'])
    expect(texts(q)).toEqual(['Con chó', 'Con cá', 'Con bò'])
    expect(q.items[oddIndexOf(q)].text).toBe('Con cá')
    expect(q.oddOneOutId).toBe('b')
  })

  it('xóa mục đứng SAU mục khác loại: mục khác loại không đổi', () => {
    const q = removeItem(four(), 3)

    expect(q.items[oddIndexOf(q)].text).toBe('Con cá')
    expect(q.oddOneOutId).toBe('c')
  })

  it('xóa ĐÚNG mục khác loại: phải chọn lại (mã để trống) và bộ kiểm tra báo chưa chọn', () => {
    const q = removeItem(four(), 2)

    expect(q.oddOneOutId).toBe('')
    expect(oddIndexOf(q)).toBe(-1)
    expect(issuesOf(q).some((issue) => issue.field === 'oddOneOutId' && issue.code === 'noCorrect')).toBe(true)
  })

  it('mọi cách thêm/xóa/sửa đều giữ mã theo vị trí (bộ kiểm tra không báo mã sai)', () => {
    let q = four()

    q = addItem(removeItem(q, 1))
    q = setItemText(setItemText(q, 3, 'Con vịt'), 0, 'Con mèo con')
    q = removeItem(q, 0)

    expect(q.items.map((item) => item.id)).toEqual(['a', 'b', 'c', 'd', 'e'].slice(0, q.items.length))
    expect(issuesOf(q).some((issue) => issue.code === 'badPositionalId')).toBe(false)
  })

  it('positionId ngoài a-e trả chuỗi rỗng', () => {
    expect(positionId(0)).toBe('a')
    expect(positionId(4)).toBe('e')
    expect(positionId(5)).toBe('')
  })
})

describe('chọn mục khác loại', () => {
  it('setOddItem đổi lựa chọn, vị trí không có thì trả lại nguyên bản', () => {
    const q = four()

    expect(setOddItem(q, 0).oddOneOutId).toBe('a')
    expect(setOddItem(q, 9)).toBe(q)
    expect(setOddItem(q, -1)).toBe(q)
  })

  it('đổi chữ của mục khác loại thì vẫn chọn đúng mục đó', () => {
    const q = setItemText(four(), 2, 'Con cá heo')

    expect(q.oddOneOutId).toBe('c')
    expect(q.items[2].text).toBe('Con cá heo')
  })

  it('đổi chữ KHÔNG đụng tới mã khác loại, kể cả khi dữ liệu có mã sai (lỗi "không khớp" không đổi thành "chưa chọn")', () => {
    const broken = { ...four(), oddOneOutId: 'z' }
    const after = setItemText(broken, 0, 'Con mèo con')

    expect(after.oddOneOutId).toBe('z')
    expect(issuesOf(after).some((issue) => issue.field === 'oddOneOutId' && issue.code === 'badRef')).toBe(true)
  })

  it('vị trí không có thì setItemText trả lại nguyên bản; không đổi bản cũ', () => {
    const before = four()
    const after = setItemText(before, 1, 'khác')

    expect(setItemText(before, 9, 'x')).toBe(before)
    expect(after).not.toBe(before)
    expect(before.items[1].text).toBe('Con chó')
  })
})

describe('kiểm tra theo bộ luật chung', () => {
  it('câu mẫu của mock hợp lệ', () => {
    for (const question of odd.questions) expect(issuesOf(question as OddOneOutQuestion)).toEqual([])
  })

  it('mục mới còn trống bị báo thiếu chữ (đúng ô)', () => {
    expect(issuesOf(addItem(three())).some((issue) => issue.field === 'items[3].text' && issue.code === 'required')).toBe(true)
  })

  it('hai mục cùng chữ (không phân biệt hoa thường, khoảng trắng) bị báo trùng', () => {
    const q = setItemText(four(), 1, '  CON MÈO ')

    expect(issuesOf(q).some((issue) => issue.field === 'items' && issue.code === 'duplicate')).toBe(true)
    // Khác dấu thì là hai từ khác nhau.
    expect(issuesOf(setItemText(four(), 1, 'Con meo')).some((issue) => issue.code === 'duplicate')).toBe(false)
  })

  it('chữ quá 100 ký tự bị báo đúng ô', () => {
    const q = setItemText(four(), 0, 'a'.repeat(101))

    expect(issuesOf(q).some((issue) => issue.field === 'items[0].text' && issue.code === 'tooLong')).toBe(true)
  })
})
