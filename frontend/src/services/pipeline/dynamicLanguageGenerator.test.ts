import { describe, expect, it } from 'vitest'
import { generateLanguagePairs } from './dynamicLanguageGenerator'
import type { PedagogicalConstraints } from './constraintParser'

describe('dynamicLanguageGenerator', () => {
  it('sinh cặp từ ghép nối phân biệt âm đầu l và n', () => {
    const constraints: PedagogicalConstraints = {
      subject: 'VIETNAMESE',
      gradeLevel: 1,
      rangeMax: 20,
      hasRegrouping: false,
      languageConcept: { type: 'INITIAL_CONSONANT', targets: ['l', 'n'] },
      themeKey: 'farm',
      rawPrompt: 'Phân biệt l và n',
    }

    const pairs = generateLanguagePairs(constraints, 4)
    expect(pairs.length).toBeGreaterThanOrEqual(3)
    expect(pairs[0].left.text).toContain('Âm')
    expect(pairs[0].right.imageUrl).toBeDefined()
  })

  it('sinh cặp từ phân biệt dấu hỏi và ngã', () => {
    const constraints: PedagogicalConstraints = {
      subject: 'VIETNAMESE',
      gradeLevel: 1,
      rangeMax: 20,
      hasRegrouping: false,
      languageConcept: { type: 'TONE', targets: ['hỏi', 'ngã'] },
      themeKey: 'jungle',
      rawPrompt: 'Phân biệt dấu hỏi ngã',
    }

    const pairs = generateLanguagePairs(constraints, 4)
    expect(pairs.length).toBeGreaterThanOrEqual(2)
    const hasHoiOrNga = pairs.some(
      (p) => p.left.text.includes('hỏi') || p.left.text.includes('ngã')
    )
    expect(hasHoiOrNga).toBe(true)
  })

  it('fallback ghép chữ cái và hình ảnh khi không có target cụ thể', () => {
    const constraints: PedagogicalConstraints = {
      subject: 'VIETNAMESE',
      gradeLevel: 1,
      rangeMax: 20,
      hasRegrouping: false,
      themeKey: 'farm',
      rawPrompt: 'Học chữ cái tiếng việt',
    }

    const pairs = generateLanguagePairs(constraints, 4)
    expect(pairs).toHaveLength(4)
    expect(pairs[0].left.text).toBe('a')
    expect(pairs[0].right.imageUrl).toBeDefined()
  })
})
