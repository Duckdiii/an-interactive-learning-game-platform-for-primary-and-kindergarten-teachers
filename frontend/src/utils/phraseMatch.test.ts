import { describe, expect, it } from 'vitest'
import { hasPhrase, toMatchText } from './phraseMatch'

describe('toMatchText', () => {
  it('bỏ dấu, bỏ dấu câu, gộp khoảng trắng và bọc dấu cách hai đầu', () => {
    expect(toMatchText('  Đếm số, lượng!  con-vật  ')).toBe(' dem so luong con vat ')
    expect(toMatchText('')).toBe('  ')
  })
})

describe('hasPhrase (theo ranh giới từ, không theo chuỗi con)', () => {
  const match = (text: string, phrase: string) => hasPhrase(toMatchText(text), phrase)

  it('khớp cụm từ đủ cả từ, ở đầu, giữa hoặc cuối câu', () => {
    expect(match('đếm số lượng', 'dem so')).toBe(true)
    expect(match('bài đếm số', 'dem so')).toBe(true)
    expect(match('Bài học ĐẾM SỐ.', 'dem so')).toBe(true)
  })

  it('không khớp khi từ khóa chỉ là một phần của từ khác', () => {
    expect(match('hoàn toàn đúng', 'toan')).toBe(true) // bỏ dấu thì "toàn" cũng là "toan": cụm từ khóa phải đủ nghĩa
    expect(match('hoàn toàn đúng', 'mon toan')).toBe(false)
    expect(match('nghề nghiệp', 'nghe')).toBe(true)
    expect(match('nghề nghiệp', 'nghe va')).toBe(false)
    expect(match('chữ cái', 'chu')).toBe(true)
    expect(match('chữ cái', 'chu c')).toBe(false) // nửa từ không khớp
    expect(match('chữ cái', 'u cai')).toBe(false)
  })

  it('cụm từ khóa có khoảng trắng thừa hai đầu vẫn khớp đúng', () => {
    expect(match('đếm số', ' dem so ')).toBe(true)
  })
})
