import { describe, expect, it } from 'vitest'
import { buildMockGameContents } from '../../../services/mock/gameFixtures'
import type { VisualClozeQuestion } from '../../../types/game-dsl.types'
import { validateQuestion } from '../../../utils/gameValidation'
import { addDistractor, canAddDistractor, canRemoveDistractor, hasBlank, insertBlank, removeDistractor, setCorrectAnswer, setDistractor, setSentence } from './clozeEditing'

const cloze = buildMockGameContents().find((game) => game.gameType === 'VISUAL_CLOZE')!
// Câu 1: "Con mèo đang ___ trên ghế." đúng "ngủ", nhiễu chạy, bay (2). Câu 3: nhiễu bay, chạy, hát (3).
const two = (): VisualClozeQuestion => structuredClone(cloze.questions[0]) as VisualClozeQuestion
const three = (): VisualClozeQuestion => structuredClone(cloze.questions[2]) as VisualClozeQuestion
const one = (): VisualClozeQuestion => removeDistractor(two(), 0)
const issuesOf = (question: VisualClozeQuestion) => validateQuestion('VISUAL_CLOZE', question, 0, 'save')
const has = (question: VisualClozeQuestion, code: string, field: string) => issuesOf(question).some((issue) => issue.code === code && issue.field === field)

describe('số từ nhiễu luôn từ 1 đến 3 (giới hạn DSL)', () => {
  it('không thêm được từ nhiễu thứ 4 (trả lại nguyên bản)', () => {
    const q = three()

    expect(canAddDistractor(q)).toBe(false)
    expect(addDistractor(q)).toBe(q)
  })

  it('không xóa được khi chỉ còn 1 từ nhiễu (trả lại nguyên bản)', () => {
    const q = one()

    expect(q.distractors).toHaveLength(1)
    expect(canRemoveDistractor(q)).toBe(false)
    expect(removeDistractor(q, 0)).toBe(q)
  })

  it('xóa vị trí không có thì không đổi gì; thêm rồi xóa giữ nguyên các từ khác', () => {
    const q = two()

    expect(removeDistractor(q, 9)).toBe(q)
    // Ngay sau phần tử cuối cũng là vị trí không có.
    expect(removeDistractor(q, 2)).toBe(q)
    expect(removeDistractor(q, -1)).toBe(q)
    expect(addDistractor(q).distractors).toEqual(['chạy', 'bay', ''])
    expect(removeDistractor(three(), 1).distractors).toEqual(['bay', 'hát'])
  })

  it('thêm từ nhiễu không đụng tới câu và từ đúng', () => {
    const q = addDistractor(two())

    expect(q.sentenceTemplate).toBe(two().sentenceTemplate)
    expect(q.correctAnswer).toBe('ngủ')
  })
})

describe('sửa từng trường (không đổi bản cũ)', () => {
  it('setSentence, setCorrectAnswer, setDistractor chỉ đổi đúng trường', () => {
    const before = two()
    const q = setDistractor(setCorrectAnswer(setSentence(before, 'Con mèo ___ ngoan.'), 'ngồi'), 1, 'nằm')

    expect(q).toMatchObject({ sentenceTemplate: 'Con mèo ___ ngoan.', correctAnswer: 'ngồi', distractors: ['chạy', 'nằm'] })
    expect(before.sentenceTemplate).toBe('Con mèo đang ___ trên ghế.')
    expect(before.distractors).toEqual(['chạy', 'bay'])
  })

  it('setDistractor ở vị trí không có thì trả lại nguyên bản', () => {
    const q = two()

    expect(setDistractor(q, 5, 'x')).toBe(q)
    expect(setDistractor(q, -1, 'x')).toBe(q)
  })
})

describe('chỗ trống "___": đúng một cụm gạch dưới liền nhau', () => {
  it('hasBlank nhận mọi cụm gạch dưới', () => {
    expect(hasBlank('Con ___ kêu')).toBe(true)
    expect(hasBlank('Con _ kêu')).toBe(true)
    expect(hasBlank('Con ____ kêu')).toBe(true)
    expect(hasBlank('Con mèo kêu')).toBe(false)
  })

  it('chèn vào giữa câu (có chữ dính liền hai bên thì thêm dấu cách), con trỏ nằm ngay sau chỗ trống', () => {
    const result = insertBlank('Con mèo đang ngủ', 8, 8)

    expect(result).toEqual({ text: 'Con mèo ___ đang ngủ', caret: 11 })
    expect(insertBlank('Concon', 3, 3)).toEqual({ text: 'Con ___ con', caret: 7 })
  })

  it('chèn ở cuối câu hoặc trước dấu câu: không thêm dấu cách thừa', () => {
    expect(insertBlank('Con mèo đang ', 13, 13)).toEqual({ text: 'Con mèo đang ___', caret: 16 })
    expect(insertBlank('Con mèo đang.', 12, 12)).toEqual({ text: 'Con mèo đang ___.', caret: 16 })
    expect(insertBlank('', 0, 0)).toEqual({ text: '___', caret: 3 })
  })

  it('chèn thay cho đoạn đang chọn (từ đúng được chọn sẵn)', () => {
    expect(insertBlank('Con mèo đang ngủ trên ghế.', 13, 16)).toEqual({ text: 'Con mèo đang ___ trên ghế.', caret: 16 })
  })

  it('vị trí ngoài câu được kẹp vào đầu/cuối; đảo thứ tự đầu cuối vẫn đúng', () => {
    expect(insertBlank('abc', 99, 99)?.text).toBe('abc ___')
    expect(insertBlank('abc', -5, -5)?.text).toBe('___ abc')
    expect(insertBlank('Con mèo ngủ', 12, 8)?.text).toBe('Con mèo ___')
  })

  it('câu đã có chỗ trống thì KHÔNG chèn thêm (luật đúng một chỗ trống)', () => {
    expect(insertBlank('Con ___ kêu', 0, 0)).toBeNull()
    expect(insertBlank('Con _ kêu', 0, 0)).toBeNull()
  })

  it('kết quả chèn vào câu không có chỗ trống thì hợp lệ về chỗ trống', () => {
    const q = setSentence(two(), insertBlank('Con mèo đang trên ghế', 13, 13)!.text)

    expect(issuesOf(q)).toEqual([])
  })
})

describe('kiểm tra theo bộ luật chung', () => {
  it('câu mẫu của mock hợp lệ', () => {
    for (const question of cloze.questions) expect(issuesOf(question as VisualClozeQuestion)).toEqual([])
  })

  it('thiếu chỗ trống, hai chỗ trống, hoặc chỗ trống không đúng 3 gạch đều báo blankCount', () => {
    expect(has(setSentence(two(), 'Con mèo ngủ.'), 'blankCount', 'sentenceTemplate')).toBe(true)
    expect(has(setSentence(two(), 'Con ___ ngủ ___.'), 'blankCount', 'sentenceTemplate')).toBe(true)
    expect(has(setSentence(two(), 'Con ____ ngủ.'), 'blankCount', 'sentenceTemplate')).toBe(true)
    expect(has(setSentence(two(), 'Con _ ngủ.'), 'blankCount', 'sentenceTemplate')).toBe(true)
    expect(has(setSentence(two(), 'Con ___ ngủ.'), 'blankCount', 'sentenceTemplate')).toBe(false)
  })

  it('câu ngắn dưới 3 ký tự hoặc dài quá 200 ký tự bị báo đúng ô', () => {
    expect(has(setSentence(two(), '__'), 'tooShort', 'sentenceTemplate')).toBe(true)
    expect(has(setSentence(two(), `${'a'.repeat(198)}___`), 'tooLong', 'sentenceTemplate')).toBe(true)
  })

  it('từ đúng trống hoặc quá 50 ký tự bị báo đúng ô', () => {
    expect(has(setCorrectAnswer(two(), ''), 'required', 'correctAnswer')).toBe(true)
    expect(has(setCorrectAnswer(two(), 'a'.repeat(51)), 'tooLong', 'correctAnswer')).toBe(true)
  })

  it('từ nhiễu mới còn trống báo thiếu chữ đúng ô; quá 50 ký tự báo đúng ô', () => {
    expect(has(addDistractor(two()), 'required', 'distractors[2]')).toBe(true)
    expect(has(setDistractor(two(), 0, 'a'.repeat(51)), 'tooLong', 'distractors[0]')).toBe(true)
  })

  it('từ nhiễu trùng từ đúng hoặc trùng nhau (không phân biệt hoa thường, khoảng trắng) bị báo trùng ở danh sách', () => {
    expect(has(setDistractor(two(), 0, ' NGỦ '), 'duplicate', 'distractors')).toBe(true)
    expect(has(setDistractor(two(), 1, 'Chạy'), 'duplicate', 'distractors')).toBe(true)
    // Khác dấu thì là hai từ khác nhau.
    expect(has(setDistractor(two(), 0, 'ngu'), 'duplicate', 'distractors')).toBe(false)
  })

  it('thiếu mô tả hình (bắt buộc ở loại này) bị báo đúng ô', () => {
    const q = two()

    delete (q as Partial<VisualClozeQuestion>).visualPrompt

    expect(has(q, 'required', 'visualPrompt')).toBe(true)
  })
})
