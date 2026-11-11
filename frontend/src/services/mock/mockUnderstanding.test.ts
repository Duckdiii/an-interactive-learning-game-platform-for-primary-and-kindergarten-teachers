import { describe, expect, it } from 'vitest'
import type { UnderstandGameRequest } from '../../types/understanding.types'
import { buildMockUnderstanding } from './mockUnderstanding'

const request = (texts: string[], extra: Partial<UnderstandGameRequest> = {}): UnderstandGameRequest => ({
  subject: 'VIETNAMESE',
  gradeLevel: 'GRADE_1',
  messages: texts.map((text, index) => ({ role: index % 2 === 0 ? 'TEACHER' : 'ASSISTANT', text })),
  ...extra,
})

describe('buildMockUnderstanding (mô phỏng POST /games/understand)', () => {
  it('mô tả ngắn ở lượt đầu thì hỏi lại kèm trả lời nhanh, chưa sẵn sàng', () => {
    const result = buildMockUnderstanding(request(['Ôn vần an']))

    expect(result.ready).toBe(false)
    expect(result.question?.quickReplies.length).toBeGreaterThan(0)
  })

  it('đã hỏi một lần thì không hỏi nữa; giữ thẻ giáo viên đã sửa', () => {
    const edited = buildMockUnderstanding(request(['Ôn vần an', 'Hỏi', 'Nhận biết'])).understanding
    const result = buildMockUnderstanding(request(['Ôn vần an', 'Hỏi', 'Nhận biết'], { understanding: { ...edited, setting: 'Biển' } }))

    expect(result.ready).toBe(true)
    expect(result.understanding.setting).toBe('Biển')
  })

  it('đòi ghi âm giọng bé thì báo chưa làm được kèm cách làm thay; nội dung sau dấu ":" thành danh sách', () => {
    const result = buildMockUnderstanding(request(['Bé đọc to các vần sau rồi ghi âm: an, ăn, ân']))

    expect(result.understanding.unsupported[0].need).toMatch(/Ghi âm/)
    expect(result.understanding.content).toEqual(['an', 'ăn', 'ân'])
    expect(result.reply).toMatch(/chưa làm được/)
  })
})
