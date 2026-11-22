import { describe, expect, it } from 'vitest'
import { generateMathQuestions } from './dynamicMathGenerator'
import type { PedagogicalConstraints } from './constraintParser'

describe('dynamicMathGenerator', () => {
  it('phép cộng có nhớ phạm vi 100: tổng <= 100, hàng đơn vị cộng lại >= 10', () => {
    const constraints: PedagogicalConstraints = {
      subject: 'MATH',
      gradeLevel: 2,
      mathType: 'ADD',
      rangeMax: 100,
      hasRegrouping: true,
      themeKey: 'farm',
      rawPrompt: 'Phép cộng có nhớ trong phạm vi 100',
    }

    // Chạy 30 lần kiểm thử ngẫu nhiên
    for (let i = 0; i < 30; i++) {
      const [q] = generateMathQuestions(constraints, 1)

      expect(q.operation).toBe('+')
      expect(q.numA + q.numB).toBe(Number(q.correctAnswer))
      expect(q.numA + q.numB).toBeLessThanOrEqual(100)
      expect(q.numA).toBeGreaterThan(0)
      expect(q.numB).toBeGreaterThan(0)

      // Kiểm tra có nhớ
      const unitSum = (q.numA % 10) + (q.numB % 10)
      expect(unitSum).toBeGreaterThanOrEqual(10)

      // Phương án nhiễu không trùng đáp án đúng và > 0
      for (const d of q.distractors) {
        expect(d).not.toBe(q.correctAnswer)
        expect(Number(d)).toBeGreaterThan(0)
      }
      expect(new Set(q.distractors).size).toBe(q.distractors.length)
    }
  })

  it('phép trừ có nhớ phạm vi 50: a <= 50, b < a, kết quả > 0, hàng đơn vị a < b', () => {
    const constraints: PedagogicalConstraints = {
      subject: 'MATH',
      gradeLevel: 2,
      mathType: 'SUB',
      rangeMax: 50,
      hasRegrouping: true,
      themeKey: 'ocean',
      rawPrompt: 'Phép trừ có nhớ trong phạm vi 50',
    }

    for (let i = 0; i < 30; i++) {
      const [q] = generateMathQuestions(constraints, 1)

      expect(q.operation).toBe('-')
      expect(q.numA).toBeLessThanOrEqual(50)
      expect(q.numB).toBeLessThan(q.numA)
      expect(q.numB).toBeGreaterThan(0)
      expect(Number(q.correctAnswer)).toBe(q.numA - q.numB)
      expect(Number(q.correctAnswer)).toBeGreaterThan(0)

      // Điều kiện có nhớ phép trừ: hàng đơn vị của số bị trừ nhỏ hơn số trừ
      expect(q.numA % 10).toBeLessThan(q.numB % 10)

      // Phương án nhiễu
      for (const d of q.distractors) {
        expect(d).not.toBe(q.correctAnswer)
        expect(Number(d)).toBeGreaterThan(0)
      }
    }
  })

  it('phép trừ không nhớ phạm vi 100: hàng đơn vị a >= hàng đơn vị b', () => {
    const constraints: PedagogicalConstraints = {
      subject: 'MATH',
      gradeLevel: 2,
      mathType: 'SUB',
      rangeMax: 100,
      hasRegrouping: false,
      themeKey: 'jungle',
      rawPrompt: 'Phép trừ không nhớ phạm vi 100',
    }

    for (let i = 0; i < 20; i++) {
      const [q] = generateMathQuestions(constraints, 1)

      expect(q.numA).toBeLessThanOrEqual(100)
      expect(q.numB).toBeLessThan(q.numA)
      expect(q.numA % 10).toBeGreaterThanOrEqual(q.numB % 10)
    }
  })

  it('sinh câu hỏi so sánh số', () => {
    const constraints: PedagogicalConstraints = {
      subject: 'MATH',
      gradeLevel: 2,
      mathType: 'COMPARE',
      rangeMax: 100,
      hasRegrouping: false,
      themeKey: 'space',
      rawPrompt: 'So sánh các số',
    }

    const [q] = generateMathQuestions(constraints, 1)
    expect(['>', '<', '=']).toContain(q.correctAnswer)
    expect(q.distractors).toHaveLength(2)
  })

  it('gắn hình ảnh asset thật theo theme', () => {
    const constraints: PedagogicalConstraints = {
      subject: 'MATH',
      gradeLevel: 2,
      mathType: 'ADD',
      rangeMax: 20,
      hasRegrouping: false,
      themeKey: 'ocean',
      rawPrompt: 'Toán đại dương',
    }

    const [q] = generateMathQuestions(constraints, 1)
    expect(q.spriteUrl).toMatch(/^\/assets\/themes\/ocean\/.*\.svg$/)
  })
})
