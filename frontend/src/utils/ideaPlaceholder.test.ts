import { describe, expect, it } from 'vitest'
import { GAME_TEMPLATES } from '../constants/gameTemplates'
import { ideaPlaceholderFor } from './ideaPlaceholder'

describe('ideaPlaceholderFor', () => {
  it('có mẫu cho đúng khối lớp và môn thì dùng chủ đề của mẫu', () => {
    const template = GAME_TEMPLATES.find((item) => item.level === 'KINDERGARTEN' && item.subject === 'MATH')

    expect(ideaPlaceholderFor('KINDERGARTEN', 'MATH')).toBe(`Ví dụ: ${template?.topic}`)
  })

  it('chọn Mầm non thì câu ví dụ không nhắc "lớp 1"', () => {
    expect(ideaPlaceholderFor('KINDERGARTEN', '')).not.toMatch(/lớp 1/i)
    expect(ideaPlaceholderFor('KINDERGARTEN', 'ENGLISH')).not.toMatch(/lớp 1/i)
  })

  it('chưa có mẫu thì ghép từ tên khối lớp và môn', () => {
    expect(ideaPlaceholderFor('GRADE_4', 'MATH')).toBe('Ví dụ: Một bài Toán cho học sinh Lớp 4')
    expect(ideaPlaceholderFor('GRADE_4', '')).toBe('Ví dụ: Một bài học cho học sinh Lớp 4')
    expect(ideaPlaceholderFor('', 'ENGLISH')).toBe('Ví dụ: Một bài Tiếng Anh cho các bé')
  })

  it('chưa chọn gì thì dùng câu ví dụ chung', () => {
    expect(ideaPlaceholderFor('', '')).toBe('Ví dụ: Đếm số lượng con vật cho các bé')
  })
})
