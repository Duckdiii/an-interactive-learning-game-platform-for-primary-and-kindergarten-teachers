import { describe, expect, it } from 'vitest'
import { GRADE_LEVELS } from '../../types/game-dsl.types'
import { AGE_BANDS } from '../theme/themeTypes'
import { AGE_BAND_ORDER, AGE_PROFILES, bandOfGrade, minContainerWidthFor, stageScale } from './ageProfiles'

describe('AGE_PROFILES', () => {
  it('có đủ ba nhóm tuổi của AGE_BANDS, mỗi hồ sơ khai báo đúng nhóm của nó', () => {
    expect(Object.keys(AGE_PROFILES).sort()).toEqual([...AGE_BANDS].sort())
    expect([...AGE_BAND_ORDER].sort()).toEqual([...AGE_BANDS].sort())
    for (const band of AGE_BANDS) expect(AGE_PROFILES[band].band).toBe(band)
  })

  it('vùng chạm tối thiểu đúng các ngưỡng người dùng chốt: 64 / 56 / 48px', () => {
    expect(AGE_PROFILES.PRESCHOOL.minTouchTargetPx).toBe(64)
    expect(AGE_PROFILES.GRADE_1_2.minTouchTargetPx).toBe(56)
    expect(AGE_PROFILES.GRADE_3_5.minTouchTargetPx).toBe(48)
  })

  it('mầm non: không đồng hồ đếm ngược, không bảng xếp hạng sống; hai nhóm lớn hơn thì được', () => {
    expect(AGE_PROFILES.PRESCHOOL).toMatchObject({ allowTimer: false, allowLiveLeaderboard: false })
    for (const band of ['GRADE_1_2', 'GRADE_3_5'] as const) {
      expect(AGE_PROFILES[band]).toMatchObject({ allowTimer: true, allowLiveLeaderboard: true })
    }
  })

  it('nhóm nhỏ tuổi hơn thì chặt hơn: vùng chạm lớn hơn, ít chữ hơn, ít lựa chọn hơn (không tăng khi lên lớp)', () => {
    const [a, b, c] = AGE_BAND_ORDER.map((band) => AGE_PROFILES[band])
    expect(a.minTouchTargetPx).toBeGreaterThan(b.minTouchTargetPx)
    expect(b.minTouchTargetPx).toBeGreaterThan(c.minTouchTargetPx)
    expect(a.maxCharsPerCard).toBeLessThan(b.maxCharsPerCard)
    expect(b.maxCharsPerCard).toBeLessThan(c.maxCharsPerCard)
    expect(a.maxQuestionChars).toBeLessThan(b.maxQuestionChars)
    expect(b.maxQuestionChars).toBeLessThan(c.maxQuestionChars)
    expect(a.maxOptions).toBeLessThanOrEqual(b.maxOptions)
    expect(b.maxOptions).toBeLessThanOrEqual(c.maxOptions)
  })

  it('gợi ý theo thời gian: trẻ càng nhỏ gợi ý càng sớm (5–7 giây); nhóm lớn nhất tắt gợi ý', () => {
    const [a, b, c] = AGE_BANDS.map((band) => AGE_PROFILES[band].hintDelaySeconds)
    expect(a).toBe(5)
    expect(b).toBe(7)
    expect(c).toBeNull()
    for (const delay of [a, b]) {
      expect(delay).toBeGreaterThanOrEqual(5)
      expect(delay).toBeLessThanOrEqual(7)
    }
    expect(a!).toBeLessThan(b!)
  })

  it('giới hạn không vượt giới hạn của DSL (câu ≤ 200 ký tự) và đủ cho MATCHING tối thiểu 3 cặp', () => {
    for (const band of AGE_BANDS) {
      expect(AGE_PROFILES[band].maxQuestionChars).toBeLessThanOrEqual(200)
      expect(AGE_PROFILES[band].maxOptions).toBeGreaterThanOrEqual(3)
    }
  })
})

describe('bandOfGrade', () => {
  it.each([
    ['KINDERGARTEN', 'PRESCHOOL'],
    ['GRADE_1', 'GRADE_1_2'],
    ['GRADE_2', 'GRADE_1_2'],
    ['GRADE_3', 'GRADE_3_5'],
    ['GRADE_4', 'GRADE_3_5'],
    ['GRADE_5', 'GRADE_3_5'],
  ] as const)('%s → %s', (grade, band) => {
    expect(bandOfGrade(grade)).toBe(band)
  })

  it('phủ mọi khối lớp của DSL (không bỏ sót khi DSL thêm lớp)', () => {
    for (const grade of GRADE_LEVELS) expect(AGE_BANDS).toContain(bandOfGrade(grade))
  })
})

describe('stageScale', () => {
  it.each([
    [400, 800, 0.5],
    [800, 800, 1],
    [1280, 800, 1], // không phóng to quá 1
    [390, 800, 0.4875],
    [0, 800, 0],
    [-5, 800, 0],
    [Number.NaN, 800, 0],
    [400, 0, 0],
    [400, Number.NaN, 0],
  ])('khung %s, sân %s → %s', (container, stage, expected) => {
    expect(stageScale(container, stage)).toBeCloseTo(expected, 10)
  })
})

describe('minContainerWidthFor', () => {
  it('thẻ cao 110 đạt 64px khi sân rộng ít nhất 466px (khớp ước lượng cũ "từ khoảng 470px")', () => {
    expect(minContainerWidthFor(110, 64, 800)).toBe(466)
  })

  it('nút cao 96: đạt 64px từ 534px, đạt 48px từ 400px', () => {
    expect(minContainerWidthFor(96, 64, 800)).toBe(534)
    expect(minContainerWidthFor(96, 48, 800)).toBe(400)
  })

  it('đúng ranh giới: ở đúng chiều rộng đó thì vừa đạt', () => {
    const width = minContainerWidthFor(110, 64, 800)
    expect(110 * stageScale(width, 800)).toBeGreaterThanOrEqual(64)
    expect(110 * stageScale(width - 1, 800)).toBeLessThan(64)
  })

  it('thuộc tính ranh giới trên nhiều cặp (cạnh ngắn × ngưỡng): đúng ở w, hụt ở w-1, không lệch 1 do dấu phẩy động', () => {
    for (let side = 40; side <= 300; side += 1) {
      for (const target of [48, 56, 64]) {
        const needed = minContainerWidthFor(side, target, 800)
        if (needed > 800) continue // không đạt ở mọi chiều rộng (sân không phóng to)
        expect(side * stageScale(needed, 800)).toBeGreaterThanOrEqual(target - 1e-6)
        expect(side * stageScale(needed - 1, 800)).toBeLessThan(target)
      }
    }
  })

  it('cạnh ngắn không hợp lệ thì vô hạn (không bao giờ đạt)', () => {
    expect(minContainerWidthFor(0, 64, 800)).toBe(Number.POSITIVE_INFINITY)
    expect(minContainerWidthFor(-1, 64, 800)).toBe(Number.POSITIVE_INFINITY)
  })
})
