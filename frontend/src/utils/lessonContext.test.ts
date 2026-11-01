import { describe, expect, it } from 'vitest'
import { inferLessonContext } from './lessonContext'

describe('inferLessonContext (mock theo từ khóa)', () => {
  it.each([
    ['Phép cộng trong phạm vi 10 cho học sinh lớp 1', 'GRADE_1', 'MATH'],
    ['Đếm số lượng con vật cho bé mầm non', 'KINDERGARTEN', 'MATH'],
    ['Luyện chữ cái và ghép vần cho lớp 2', 'GRADE_2', 'VIETNAMESE'],
    ['Từ vựng tiếng Anh về màu sắc, lớp 3', 'GRADE_3', 'ENGLISH'],
    ['dem so luong con vat cho lop 1', 'GRADE_1', 'MATH'], // gõ không dấu
  ])('"%s" => %s, %s', (idea, gradeLevel, subject) => {
    expect(inferLessonContext(idea)).toEqual({ gradeLevel, subject })
  })

  it('không đoán được thì trả chuỗi rỗng (không chặn việc tạo)', () => {
    expect(inferLessonContext('Một bài học bất kỳ nào đó')).toEqual({ gradeLevel: '', subject: '' })
    expect(inferLessonContext('')).toEqual({ gradeLevel: '', subject: '' })
  })

  it.each([
    ['Hoàn toàn đúng, ban đêm yên tĩnh'], // "toan", "dem" chỉ là một phần của từ khác
    ['Bài vận động buổi sáng'],
    ['Nghề nghiệp của bố mẹ'],
    ['Điện thoại và tivi'],
  ])('"%s" không bị đoán nhầm môn học', (idea) => {
    expect(inferLessonContext(idea).subject).toBe('')
  })

  it('không nhầm số lớp ngoài 1 đến 5 (lớp 7 không phải khối của hệ thống)', () => {
    expect(inferLessonContext('bài toán lớp 7').gradeLevel).toBe('')
  })
})
