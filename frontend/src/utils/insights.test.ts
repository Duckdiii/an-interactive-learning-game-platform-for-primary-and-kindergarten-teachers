import { describe, expect, it } from 'vitest'
import type { QuestionInsight } from '../services/home'
import {
  filterToSessionType,
  formatDecimalVi,
  isLowRate,
  parseResultsFilter,
  pickReviewQuestion,
  resultsLink,
  toPercent,
} from './insights'

const question = (order: number, correctRate: number, needsReview: boolean): QuestionInsight => ({
  questionId: `q${order}`,
  order,
  text: `Câu ${order}`,
  answeredCount: 20,
  correctRate,
  avgAttempts: 1,
  needsReview,
  commonWrong: [],
})

describe('pickReviewQuestion', () => {
  it('chọn câu needsReview có tỉ lệ đúng thấp nhất', () => {
    const picked = pickReviewQuestion([question(1, 0.3, false), question(2, 0.55, true), question(3, 0.41, true)])

    expect(picked?.order).toBe(3)
  })

  it('hòa thì lấy câu đứng trước; không có câu nào cần ôn thì null', () => {
    expect(pickReviewQuestion([question(2, 0.4, true), question(1, 0.4, true)])?.order).toBe(1)
    expect(pickReviewQuestion([question(1, 0.9, false)])).toBeNull()
    expect(pickReviewQuestion([])).toBeNull()
  })
})

describe('định dạng và ánh xạ', () => {
  it('số thập phân dùng dấu phẩy, % làm tròn', () => {
    expect(formatDecimalVi(1.6)).toBe('1,6')
    expect(formatDecimalVi(2)).toBe('2,0')
    expect(toPercent(0.408)).toBe(41)
    expect(toPercent(0.725)).toBe(73)
    // Số liệu lỗi từ máy chủ bị chặn trong 0..100.
    expect(toPercent(-0.2)).toBe(0)
    expect(toPercent(1.4)).toBe(100)
  })

  it('dưới 50% là thấp', () => {
    expect(isLowRate(0.49)).toBe(true)
    expect(isLowRate(0.5)).toBe(false)
    // Màu khớp số đang hiện: 0,496 hiện "50%" nên không vàng.
    expect(isLowRate(0.496)).toBe(false)
  })

  it('chip lọc <-> sessionType; giá trị lạ trên URL coi là Tất cả', () => {
    expect(parseResultsFilter('TEAM')).toBe('TEAM')
    expect(parseResultsFilter('SELF')).toBe('SELF')
    expect(parseResultsFilter('SOLO')).toBe('ALL')
    expect(parseResultsFilter(null)).toBe('ALL')
    expect(filterToSessionType('ALL')).toBeUndefined()
    expect(filterToSessionType('TEAM')).toBe('TEAM')
  })

  it('liên kết kết quả mã hóa gameId', () => {
    expect(resultsLink('a/b')).toBe('/results?gameId=a%2Fb')
  })
})
