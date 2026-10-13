import { describe, expect, it } from 'vitest'
import {
  compareGradeLevels,
  fallbackLabel,
  gameStatusLabel,
  gradeLevelLabel,
  subjectLabel,
} from './labels'

describe('nhãn tiếng Việt cho enum của API', () => {
  it.each([
    ['MATH', 'Toán'],
    ['VIETNAMESE', 'Tiếng Việt'],
    ['ENGLISH', 'Tiếng Anh'],
  ])('môn %s hiển thị %s', (value, label) => {
    expect(subjectLabel(value)).toBe(label)
  })

  it.each([
    ['KINDERGARTEN', 'Mầm non'],
    ['GRADE_1', 'Lớp 1'],
    ['GRADE_2', 'Lớp 2'],
    ['GRADE_3', 'Lớp 3'],
    ['GRADE_4', 'Lớp 4'],
    ['GRADE_5', 'Lớp 5'],
  ])('khối %s hiển thị %s', (value, label) => {
    expect(gradeLevelLabel(value)).toBe(label)
  })

  it.each([
    ['DRAFT', 'Bản nháp'],
    ['PUBLISHED', 'Đã đăng'],
  ])('trạng thái %s hiển thị %s', (value, label) => {
    expect(gameStatusLabel(value)).toBe(label)
  })

  it('giá trị chưa có trong bảng vẫn hiển thị được, không vỡ', () => {
    expect(subjectLabel('SCIENCE')).toBe('Science')
    expect(gradeLevelLabel('GRADE_6')).toBe('Grade 6')
    expect(gameStatusLabel('ARCHIVED')).toBe('Archived')
  })

  it('không nhầm khoá có sẵn của Object (constructor, toString)', () => {
    expect(subjectLabel('constructor')).toBe('Constructor')
    expect(subjectLabel('toString')).toBe('Tostring')
  })

  it('fallbackLabel tách theo dấu gạch dưới và viết hoa chữ đầu', () => {
    expect(fallbackLabel('SPOT_THE_TARGET')).toBe('Spot The Target')
  })

  it('thứ tự khối lớp: Mầm non, Lớp 1 đến Lớp 5, giá trị lạ xếp cuối', () => {
    const sorted = ['GRADE_5', 'UNKNOWN', 'GRADE_1', 'KINDERGARTEN', 'GRADE_3'].sort(
      compareGradeLevels,
    )

    expect(sorted).toEqual(['KINDERGARTEN', 'GRADE_1', 'GRADE_3', 'GRADE_5', 'UNKNOWN'])
  })
})
