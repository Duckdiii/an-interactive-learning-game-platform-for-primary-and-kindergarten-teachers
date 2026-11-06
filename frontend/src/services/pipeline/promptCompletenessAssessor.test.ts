import { describe, expect, it } from 'vitest'
import {
  assessPromptCompleteness,
  buildEnrichedPrompt,
} from './promptCompletenessAssessor'

describe('promptCompletenessAssessor (Giai đoạn B)', () => {
  it('prompt ngắn/mơ hồ ("toán lớp 2") trả về isComplete = false và đủ 3 câu hỏi làm rõ', () => {
    const result = assessPromptCompleteness('toán lớp 2')

    expect(result.isComplete).toBe(false)
    expect(result.score).toBeLessThan(75)
    expect(result.questions).toHaveLength(3)

    // Câu hỏi 1: Mục tiêu kỹ năng
    const skillQ = result.questions.find((q) => q.id === 'skill')
    expect(skillQ).toBeDefined()
    expect(skillQ?.title).toContain('Lớp 2')
    expect(skillQ?.options.length).toBeGreaterThanOrEqual(3)

    // Câu hỏi 2: Thế giới bối cảnh
    const themeQ = result.questions.find((q) => q.id === 'theme')
    expect(themeQ).toBeDefined()
    expect(themeQ?.options.length).toBe(4)

    // Câu hỏi 3: Mức độ Bloom
    const bloomQ = result.questions.find((q) => q.id === 'bloom')
    expect(bloomQ).toBeDefined()
    expect(bloomQ?.options.length).toBe(3)
  })

  it('prompt ngắn môn Tiếng Việt ("tiếng việt") trả về isComplete = false và câu hỏi ngữ âm Tiếng Việt', () => {
    const result = assessPromptCompleteness('tiếng việt', undefined, 'VIETNAMESE')

    expect(result.isComplete).toBe(false)
    expect(result.score).toBeLessThan(75)
    expect(result.questions).toHaveLength(3)

    const skillQ = result.questions.find((q) => q.id === 'skill')
    expect(skillQ?.title).toContain('Tiếng Việt')
    const hasTonesOrConsonants = skillQ?.options.some((o) => o.label.includes('âm đầu') || o.label.includes('dấu thanh'))
    expect(hasTonesOrConsonants).toBe(true)
  })

  it('prompt mơ hồ không rõ kỹ năng ("bài tập nông trại") trả về isComplete = false', () => {
    const result = assessPromptCompleteness('bài tập nông trại')

    expect(result.isComplete).toBe(false)
    expect(result.score).toBeLessThan(75)
    expect(result.questions).toHaveLength(3)
  })

  it('prompt chi tiết ("phép trừ có nhớ phạm vi 50 đại dương") trả về isComplete = true', () => {
    const result = assessPromptCompleteness('phép trừ có nhớ phạm vi 50 đại dương')

    expect(result.isComplete).toBe(true)
    expect(result.score).toBeGreaterThanOrEqual(75)
    expect(result.questions).toHaveLength(0)
  })

  it('prompt chi tiết chuẩn ("Phép trừ có nhớ trong phạm vi 100 với các con vật nông trại") trả về isComplete = true', () => {
    const result = assessPromptCompleteness(
      'Phép trừ có nhớ trong phạm vi 100 với các con vật nông trại',
      'GRADE_2',
      'MATH'
    )

    expect(result.isComplete).toBe(true)
    expect(result.score).toBeGreaterThanOrEqual(80)
    expect(result.questions).toHaveLength(0)
  })

  describe('buildEnrichedPrompt', () => {
    it('ghép nối chuỗi hợp lý, không lặp từ', () => {
      const base = 'toán lớp 2'
      const patches = [
        'phép cộng có nhớ trong phạm vi 100',
        'trong bối cảnh nông trại vui vẻ',
        'mức độ thông hiểu vừa sức',
      ]

      const enriched = buildEnrichedPrompt(base, patches)
      expect(enriched).toBe(
        'toán lớp 2 (phép cộng có nhớ trong phạm vi 100, trong bối cảnh nông trại vui vẻ, mức độ thông hiểu vừa sức)'
      )
    })

    it('không lặp lại nếu patch đã xuất hiện trong prompt gốc', () => {
      const base = 'phép cộng có nhớ trong phạm vi 100'
      const patches = [
        'phép cộng có nhớ trong phạm vi 100', // Đã có
        'trong bối cảnh đại dương kỳ thú',
      ]

      const enriched = buildEnrichedPrompt(base, patches)
      expect(enriched).toBe('phép cộng có nhớ trong phạm vi 100 (trong bối cảnh đại dương kỳ thú)')
    })

    it('trả về base nguyên bản nếu không có patch nào', () => {
      expect(buildEnrichedPrompt('bài tập toán', [])).toBe('bài tập toán')
      expect(buildEnrichedPrompt('bài tập toán', ['', '   '])).toBe('bài tập toán')
    })
  })
})
