import { describe, expect, it } from 'vitest'
import {
  createNumberLineState,
  isCorrectValue,
  isLabeled,
  labelEvery,
  MAX_QUESTION_CHARS,
  MAX_TICKS,
  moveBy,
  numberLineReducer,
  snapValue,
  tickCount,
  tickValues,
  toStudentQuestion,
  validateNumberLine,
  valueToX,
  xToValue,
  type NumberLineIssueCode,
} from './numberLineLogic'
import {
  mockNumberLine10,
  mockNumberLine20,
  mockNumberLineEstimate,
  mockNumberLineStep2,
  mockNumberLineWithAudio,
  NUMBER_LINE_FIXTURES,
} from './numberLineFixtures'
import type { NumberLineQuestion } from './numberLineTypes'

const q = (overrides: Partial<NumberLineQuestion> = {}): NumberLineQuestion => ({ ...mockNumberLine10, ...overrides })
const codes = (question: NumberLineQuestion): NumberLineIssueCode[] => validateNumberLine(question).map((i) => i.code)

describe('tickCount / tickValues', () => {
  it.each([
    [{ min: 0, max: 10, step: 1 }, 11],
    [{ min: 0, max: 20, step: 2 }, 11],
    [{ min: 0, max: 100, step: 10 }, 11],
    [{ min: 5, max: 6, step: 1 }, 2],
    [{ min: -5, max: 5, step: 5 }, 3],
    [{ min: 0, max: 20, step: 1 }, 21],
    [{ min: 10, max: 10, step: 1 }, 0], // thang suy biến
    [{ min: 10, max: 0, step: 1 }, 0],
    [{ min: 0, max: 10, step: 0 }, 0],
    [{ min: 0, max: 10, step: -1 }, 0],
    [{ min: 0.5, max: 10, step: 1 }, 0], // không phải số nguyên
  ])('%j → %s vạch', (scale, expected) => {
    expect(tickCount(scale)).toBe(expected)
  })

  it('tickValues liệt kê đúng giá trị từng vạch', () => {
    expect(tickValues({ min: 0, max: 10, step: 5 })).toEqual([0, 5, 10])
    expect(tickValues({ min: -4, max: 4, step: 2 })).toEqual([-4, -2, 0, 2, 4])
    expect(tickValues({ min: 3, max: 3, step: 1 })).toEqual([])
  })

  it('số giá trị bằng tickCount và vạch cuối luôn là max khi chia hết', () => {
    for (const fixture of Object.values(NUMBER_LINE_FIXTURES)) {
      const values = tickValues(fixture)
      expect(values).toHaveLength(tickCount(fixture))
      expect(values[0]).toBe(fixture.min)
      expect(values[values.length - 1]).toBe(fixture.max)
    }
  })
})

describe('validateNumberLine', () => {
  it('mọi mẫu đều hợp lệ', () => {
    for (const [name, fixture] of Object.entries(NUMBER_LINE_FIXTURES)) expect([name, codes(fixture)]).toEqual([name, []])
  })

  it('giới hạn đúng: 21 vạch hợp lệ, 22 vạch thì báo', () => {
    expect(codes(q({ min: 0, max: 20, step: 1, target: 5 }))).toEqual([])
    expect(codes(q({ min: 0, max: 21, step: 1, target: 5 }))).toEqual(['TOO_MANY_TICKS'])
    expect(MAX_TICKS).toBe(21)
  })

  it.each([
    ['câu hỏi rỗng', { questionText: '' }, ['TEXT_EMPTY']],
    ['câu hỏi chỉ khoảng trắng', { questionText: '   ' }, ['TEXT_EMPTY']],
    ['câu hỏi dài quá', { questionText: 'a'.repeat(MAX_QUESTION_CHARS + 1) }, ['TEXT_TOO_LONG']],
    ['max ≤ min', { max: 0 }, ['RANGE_INVALID']],
    ['bước 0', { step: 0 }, ['STEP_INVALID']],
    ['bước âm', { step: -2 }, ['STEP_INVALID']],
    ['khoảng không chia hết cho bước', { step: 3, target: 6 }, ['RANGE_NOT_DIVISIBLE']],
    ['đáp án ngoài thang', { target: 11 }, ['TARGET_OFF_SCALE']],
    ['đáp án dưới min', { target: -1 }, ['TARGET_OFF_SCALE']],
    ['đáp án lệch vạch (bước 2, đáp án lẻ)', { step: 2, target: 7 }, ['TARGET_OFF_SCALE']],
    ['vị trí đầu ngoài thang', { startValue: 11 }, ['START_OFF_SCALE']],
    ['vị trí đầu lệch vạch', { step: 2, target: 6, startValue: 3 }, ['START_OFF_SCALE']],
    ['độ lệch âm', { tolerance: -1 }, ['TOLERANCE_INVALID']],
    ['độ lệch lớn hơn cả thang', { tolerance: 11 }, ['TOLERANCE_INVALID']],
  ] as const)('%s', (_label, overrides, expected) => {
    expect(codes(q(overrides as Partial<NumberLineQuestion>))).toEqual(expected)
  })

  it.each(['min', 'max', 'step', 'target', 'tolerance', 'startValue'] as const)('%s không phải số nguyên → NOT_INTEGER, không kiểm tiếp', (key) => {
    const issues = validateNumberLine(q({ [key]: 1.5 } as Partial<NumberLineQuestion>))
    expect(issues).toEqual([expect.objectContaining({ code: 'NOT_INTEGER', path: key })])
  })

  it('NaN và Infinity cũng không phải số nguyên', () => {
    expect(codes(q({ target: Number.NaN }))).toEqual(['NOT_INTEGER'])
    expect(codes(q({ max: Number.POSITIVE_INFINITY }))).toEqual(['NOT_INTEGER'])
  })

  it('độ lệch 0 và bằng cả thang đều hợp lệ (ranh giới)', () => {
    expect(codes(q({ tolerance: 0 }))).toEqual([])
    expect(codes(q({ tolerance: 10 }))).toEqual([])
  })

  it('mỗi lỗi mang đường dẫn trường để hiện đúng chỗ', () => {
    expect(validateNumberLine(q({ target: 11 }))[0]).toMatchObject({ path: 'target' })
    expect(validateNumberLine(q({ questionText: '' }))[0]).toMatchObject({ path: 'questionText' })
  })

  it('gom nhiều lỗi độc lập cùng lúc', () => {
    expect(codes(q({ questionText: '', target: 99, tolerance: -3 }))).toEqual(['TEXT_EMPTY', 'TARGET_OFF_SCALE', 'TOLERANCE_INVALID'])
  })
})

describe('snapValue', () => {
  const scale = { min: 0, max: 10, step: 2 }
  it.each([
    [0, 0],
    [0.9, 0],
    [1, 2], // hòa: đúng giữa 0 và 2 → vạch lớn hơn
    [1.1, 2],
    [2.9, 2],
    [3, 4],
    [9.5, 10],
    [10, 10],
    [-5, 0], // kẹp
    [99, 10],
    [Number.NaN, 0],
    [Number.POSITIVE_INFINITY, 0],
  ])('snap(%s) = %s', (raw, expected) => {
    expect(snapValue(raw, scale)).toBe(expected)
  })

  it('thang không chia hết (câu hỏi lỗi chưa bị chặn) vẫn không vượt max', () => {
    // 0..10 bước 4: round(10/4) = 3 → 12 nếu không kẹp lại.
    expect(snapValue(10, { min: 0, max: 10, step: 4 })).toBe(10)
    expect(snapValue(9.9, { min: 0, max: 10, step: 4 })).toBe(8) // vạch gần nhất là 8, không phải max
  })

  it('thang có min khác 0', () => {
    expect(snapValue(7, { min: 5, max: 15, step: 5 })).toBe(5)
    expect(snapValue(8, { min: 5, max: 15, step: 5 })).toBe(10)
  })

  it('kết quả luôn nằm đúng trên một vạch với mọi đầu vào', () => {
    const values = tickValues(scale)
    for (let raw = -3; raw <= 14; raw += 0.37) expect(values).toContain(snapValue(raw, scale))
  })
})

describe('moveBy (nút + và −)', () => {
  const scale = { min: 0, max: 10, step: 2 }
  it('dịch đúng một bước giá trị mỗi vạch', () => {
    expect(moveBy(4, 1, scale)).toBe(6)
    expect(moveBy(4, -1, scale)).toBe(2)
    expect(moveBy(4, 2, scale)).toBe(8)
  })

  it('kẹp ở hai đầu: không ra ngoài thang', () => {
    expect(moveBy(10, 1, scale)).toBe(10)
    expect(moveBy(0, -1, scale)).toBe(0)
    expect(moveBy(8, 5, scale)).toBe(10)
  })

  it('bấm + rồi − trở về đúng chỗ cũ (không trôi) ở mọi vạch', () => {
    for (const v of tickValues(scale)) {
      if (v < scale.max) expect(moveBy(moveBy(v, 1, scale), -1, scale)).toBe(v)
    }
  })
})

describe('valueToX / xToValue', () => {
  const scale = { min: 0, max: 10, step: 1 }
  const geometry = { left: 100, right: 700 }

  it('hai đầu thang ứng đúng hai đầu đường', () => {
    expect(valueToX(0, scale, geometry)).toBe(100)
    expect(valueToX(10, scale, geometry)).toBe(700)
    expect(valueToX(5, scale, geometry)).toBe(400)
  })

  it('giá trị ngoài thang bị kẹp vào đường', () => {
    expect(valueToX(-5, scale, geometry)).toBe(100)
    expect(valueToX(50, scale, geometry)).toBe(700)
  })

  it('vòng tròn: xToValue(valueToX(v)) = v cho mọi vạch của mọi mẫu', () => {
    for (const fixture of Object.values(NUMBER_LINE_FIXTURES)) {
      for (const v of tickValues(fixture)) expect(xToValue(valueToX(v, fixture, geometry), fixture, geometry)).toBe(v)
    }
  })

  it('chạm lệch nhẹ khỏi vạch vẫn về đúng vạch gần nhất; chạm ngoài hai đầu kẹp vào đầu', () => {
    expect(xToValue(259, scale, geometry)).toBe(3) // (259-100)/600*10 = 2.65 → vạch 3 (x=280) gần hơn vạch 2 (x=220)
    expect(xToValue(239, scale, geometry)).toBe(2) // 2.32 → vạch 2
    expect(xToValue(50, scale, geometry)).toBe(0)
    expect(xToValue(9999, scale, geometry)).toBe(10)
  })

  it('đầu vào hỏng: về min thay vì NaN', () => {
    expect(xToValue(Number.NaN, scale, geometry)).toBe(0)
    expect(xToValue(300, scale, { left: 500, right: 500 })).toBe(0)
    expect(valueToX(3, { min: 5, max: 5, step: 1 }, geometry)).toBe(100)
  })
})

describe('isCorrectValue', () => {
  it.each([
    [7, 7, 0, true],
    [6, 7, 0, false],
    [8, 7, 0, false],
    [6, 7, 1, true], // đúng ranh giới độ lệch
    [8, 7, 1, true],
    [5, 7, 1, false],
    [70, 70, 10, true],
    [60, 70, 10, true],
    [50, 70, 10, false],
    [Number.NaN, 7, 100, false],
    [Number.POSITIVE_INFINITY, 7, 100, false],
  ])('giá trị %s, đáp án %s, lệch %s → %s', (value, target, tolerance, expected) => {
    expect(isCorrectValue(value, target, tolerance)).toBe(expected)
  })

  it('tính lại bằng code từ câu hỏi: mẫu ước lượng chấp nhận một vạch lệch', () => {
    const { target, tolerance } = mockNumberLineEstimate
    expect(isCorrectValue(60, target, tolerance)).toBe(true)
    expect(isCorrectValue(80, target, tolerance)).toBe(true)
    expect(isCorrectValue(90, target, tolerance)).toBe(false)
  })
})

describe('labelEvery', () => {
  it.each([
    [2, 1],
    [11, 1],
    [12, 2],
    [21, 2],
    [22, 2], // ceil(22/2) = 11 nhãn: còn đủ
    [23, 3], // ceil(23/2) = 12 > 11 → phải thưa hơn
    [31, 3],
    [101, 10],
  ])('%s vạch → hiện nhãn mỗi %s vạch', (ticks, expected) => {
    expect(labelEvery(ticks)).toBe(expected)
  })

  it('luôn còn không quá 11 nhãn', () => {
    for (let ticks = 2; ticks <= 200; ticks += 1) expect(Math.ceil(ticks / labelEvery(ticks))).toBeLessThanOrEqual(11)
  })
})

describe('isLabeled', () => {
  const labeled = (ticks: number) => Array.from({ length: ticks }, (_, i) => i).filter((i) => isLabeled(i, ticks, labelEvery(ticks)))

  it('luôn có nhãn đầu và cuối với mọi số vạch', () => {
    for (let ticks = 2; ticks <= 200; ticks += 1) {
      const shown = labeled(ticks)
      expect([ticks, shown[0], shown[shown.length - 1]]).toEqual([ticks, 0, ticks - 1])
    }
  })

  it('thang 0..110 bước 10 (12 vạch, cách 2): vạch cuối có nhãn, vạch 10 sát cuối bị bỏ', () => {
    expect(labeled(12)).toEqual([0, 2, 4, 6, 8, 11])
  })

  it('thang 0..20 (21 vạch, cách 2) giữ nhãn mỗi 2 vạch', () => {
    expect(labeled(21)).toEqual([0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20])
  })

  it('không quá 11 nhãn và hai nhãn liền nhau luôn cách ít nhất mức đã chọn', () => {
    for (let ticks = 2; ticks <= 200; ticks += 1) {
      const shown = labeled(ticks)
      expect([ticks, shown.length <= 11]).toEqual([ticks, true])
      for (let i = 1; i < shown.length; i += 1) expect(shown[i] - shown[i - 1]).toBeGreaterThanOrEqual(Math.min(labelEvery(ticks), ticks))
    }
  })
})

describe('toStudentQuestion', () => {
  it('bỏ đáp án và độ lệch, giữ phần còn lại', () => {
    const student = toStudentQuestion(mockNumberLineWithAudio)
    expect(student).not.toHaveProperty('target')
    expect(student).not.toHaveProperty('tolerance')
    expect(student).toMatchObject({ id: mockNumberLineWithAudio.id, min: 0, max: 10, step: 1, audioUrl: '/mock/q1.wav' })
    expect(JSON.stringify(student)).not.toContain('"target"')
  })

  it('giữ vị trí đầu (startValue)', () => {
    expect(toStudentQuestion(mockNumberLine20).startValue).toBe(10)
  })

  it('không làm thay đổi câu hỏi gốc', () => {
    const copy = { ...mockNumberLineStep2 }
    toStudentQuestion(mockNumberLineStep2)
    expect(mockNumberLineStep2).toEqual(copy)
  })
})

describe('numberLineReducer', () => {
  const idle = createNumberLineState(3)

  it('set đổi giá trị khi chưa nộp; cùng giá trị thì giữ nguyên danh tính', () => {
    expect(numberLineReducer(idle, { type: 'set', value: 5 })).toEqual({ value: 5, phase: 'idle' })
    expect(numberLineReducer(idle, { type: 'set', value: 3 })).toBe(idle)
  })

  it('đang chấm hoặc đã xong thì khóa: set bị bỏ qua', () => {
    const submitting = numberLineReducer(idle, { type: 'submitStart' })
    expect(numberLineReducer(submitting, { type: 'set', value: 9 })).toBe(submitting)
    const done = numberLineReducer(submitting, { type: 'submitDone' })
    expect(done.phase).toBe('done')
    expect(numberLineReducer(done, { type: 'set', value: 9 })).toBe(done)
  })

  it('luồng nộp: idle → submitting → done; lỗi thì mở khóa lại', () => {
    const submitting = numberLineReducer(idle, { type: 'submitStart' })
    expect(submitting.phase).toBe('submitting')
    expect(numberLineReducer(submitting, { type: 'submitFailed' }).phase).toBe('idle')
    expect(numberLineReducer(submitting, { type: 'submitDone' }).phase).toBe('done')
  })

  it('chuyển pha sai thứ tự bị bỏ qua (không nhảy cóc)', () => {
    expect(numberLineReducer(idle, { type: 'submitDone' })).toBe(idle)
    expect(numberLineReducer(idle, { type: 'submitFailed' })).toBe(idle)
    const done = createNumberLineState(3, 'done')
    expect(numberLineReducer(done, { type: 'submitStart' })).toBe(done)
  })

  it('xem lại bắt đầu ở pha done', () => {
    expect(createNumberLineState(4, 'done')).toEqual({ value: 4, phase: 'done' })
  })
})

describe('mẫu', () => {
  it('đáp án của mọi mẫu đúng bằng chính nó (tính lại bằng code)', () => {
    for (const fixture of Object.values(NUMBER_LINE_FIXTURES)) {
      expect(isCorrectValue(fixture.target, fixture.target, fixture.tolerance)).toBe(true)
    }
  })
})
