import { describe, expect, it } from 'vitest'
import { beHeadline, buildParentMessage, starCount } from './resultText'

describe('starCount', () => {
  it.each([
    [0, 5, 1],
    [2, 5, 2],
    [3, 5, 3],
    [4, 5, 4],
    [5, 5, 5],
    [0, 0, 1],
  ])('%i/%i -> %i sao', (c, t, stars) => expect(starCount(c, t)).toBe(stars))
})

describe('beHeadline', () => {
  it('luôn tích cực theo tỉ lệ', () => {
    expect(beHeadline(4, 5)).toBe('Giỏi quá!')
    expect(beHeadline(3, 5)).toBe('Bé làm tốt lắm!')
    expect(beHeadline(2, 5)).toBe('Bé đã cố gắng rồi!')
    expect(beHeadline(0, 0)).toBe('Bé đã cố gắng rồi!')
  })
})

describe('buildParentMessage', () => {
  it('giỏi: khen, có chủ đề', () => {
    expect(buildParentMessage({ correct: 4, total: 5, topic: 'Đếm số', subject: 'MATH' })).toBe(
      'Bé làm đúng 4/5 câu chủ đề “Đếm số”. Khen bé và thử một trò chơi khác cùng chủ đề nhé.',
    )
  })

  it('chủ đề rỗng hoặc khoảng trắng thì bỏ cụm chủ đề', () => {
    expect(buildParentMessage({ correct: 1, total: 5, topic: '', subject: 'MATH' })).toBe('Bé làm đúng 1/5 câu. Thử cùng bé đếm đồ vật trong nhà để ôn thêm.')
    expect(buildParentMessage({ correct: 1, total: 5, topic: '   ', subject: 'MATH' })).not.toContain('chủ đề')
    expect(buildParentMessage({ correct: 1, total: 5, subject: 'MATH' })).not.toContain('chủ đề')
  })

  it('gợi ý theo môn và môn lạ', () => {
    expect(buildParentMessage({ correct: 1, total: 5, subject: 'VIETNAMESE' })).toContain('đọc to')
    expect(buildParentMessage({ correct: 1, total: 5, subject: 'ENGLISH' })).toContain('tiếng Anh')
    expect(buildParentMessage({ correct: 1, total: 5, subject: 'ART' })).toContain('Chơi lại cùng bé')
  })
})
