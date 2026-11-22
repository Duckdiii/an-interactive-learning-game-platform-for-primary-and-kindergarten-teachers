import { describe, expect, it } from 'vitest'
import { parsePedagogicalConstraints } from './constraintParser'

describe('parsePedagogicalConstraints', () => {
  it('bóc tách phép trừ có nhớ phạm vi 50 trong đại dương', () => {
    const prompt = 'Tạo game toán lớp 2: phép trừ có nhớ trong phạm vi 50 với đàn cá dưới đại dương'
    const result = parsePedagogicalConstraints(prompt)

    expect(result.subject).toBe('MATH')
    expect(result.gradeLevel).toBe(2)
    expect(result.mathType).toBe('SUB')
    expect(result.rangeMax).toBe(50)
    expect(result.hasRegrouping).toBe(true)
    expect(result.themeKey).toBe('ocean')
  })

  it('bóc tách phép cộng không nhớ phạm vi 20 nông trại lớp 1', () => {
    const prompt = 'Bài toán lớp 1 phép cộng không nhớ phạm vi 20 về gà và vịt ở nông trại'
    const result = parsePedagogicalConstraints(prompt)

    expect(result.subject).toBe('MATH')
    expect(result.gradeLevel).toBe(1)
    expect(result.mathType).toBe('ADD')
    expect(result.rangeMax).toBe(20)
    expect(result.hasRegrouping).toBe(false)
    expect(result.themeKey).toBe('farm')
  })

  it('bóc tách so sánh số phạm vi 100 trong vũ trụ', () => {
    const prompt = 'So sánh các số lớn hơn bé hơn trong phạm vi 100 giữa các hành tinh vũ trụ lớp 2'
    const result = parsePedagogicalConstraints(prompt)

    expect(result.subject).toBe('MATH')
    expect(result.gradeLevel).toBe(2)
    expect(result.mathType).toBe('COMPARE')
    expect(result.rangeMax).toBe(100)
    expect(result.themeKey).toBe('space')
  })

  it('bóc tách phân loại số chẵn số lẻ', () => {
    const prompt = 'Bắn bóng phân biệt số chẵn và số lẻ trong rừng xanh'
    const result = parsePedagogicalConstraints(prompt)

    expect(result.subject).toBe('MATH')
    expect(result.mathType).toBe('PARITY')
    expect(result.themeKey).toBe('jungle')
  })

  it('bóc tách Tiếng Việt phân biệt l và n', () => {
    const prompt = 'Bài học Tiếng Việt lớp 1 phân biệt âm đầu l và n'
    const result = parsePedagogicalConstraints(prompt)

    expect(result.subject).toBe('VIETNAMESE')
    expect(result.gradeLevel).toBe(1)
    expect(result.languageConcept?.type).toBe('INITIAL_CONSONANT')
    expect(result.languageConcept?.targets).toEqual(['l', 'n'])
  })

  it('bóc tách Tiếng Việt phân biệt dấu hỏi và ngã', () => {
    const prompt = 'Trò chơi Tiếng Việt phân biệt dấu hỏi và dấu ngã'
    const result = parsePedagogicalConstraints(prompt)

    expect(result.subject).toBe('VIETNAMESE')
    expect(result.languageConcept?.type).toBe('TONE')
    expect(result.languageConcept?.targets).toEqual(['hỏi', 'ngã'])
  })

  it('xử lý chuỗi rỗng hoặc tối giản an toàn', () => {
    const result = parsePedagogicalConstraints('')

    expect(result.subject).toBe('MATH')
    expect(result.gradeLevel).toBe(2)
    expect(result.rangeMax).toBe(100)
    expect(result.hasRegrouping).toBe(false)
  })
})
