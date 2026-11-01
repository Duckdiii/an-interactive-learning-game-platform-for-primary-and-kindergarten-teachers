import { describe, expect, it } from 'vitest'
import { formatRelativeTime } from './relativeTime'

// 12:00 giờ địa phương: các mốc "n giờ trước" và "n ngày trước" ổn định bất kể múi giờ của máy chạy test.
const NOW = new Date(2026, 9, 14, 12, 0, 0).getTime()
const ago = (ms: number) => new Date(NOW - ms).toISOString()
const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

describe('formatRelativeTime', () => {
  it.each([
    [0, 'Vừa xong'],
    [30_000, 'Vừa xong'],
    [MINUTE, '1 phút trước'],
    [59 * MINUTE, '59 phút trước'],
    [HOUR, '1 giờ trước'],
    [23 * HOUR, '23 giờ trước'],
  ])('cách đây %i ms hiển thị "%s"', (diff, expected) => {
    expect(formatRelativeTime(ago(diff), NOW)).toBe(expected)
  })

  it('từ 24 giờ trở đi tính theo ngày lịch: hôm qua, rồi n ngày trước', () => {
    expect(formatRelativeTime(ago(DAY), NOW)).toBe('Hôm qua')
    expect(formatRelativeTime(ago(36 * HOUR), NOW)).toBe('Hôm qua')
    expect(formatRelativeTime(ago(2 * DAY), NOW)).toBe('2 ngày trước')
    expect(formatRelativeTime(ago(6 * DAY), NOW)).toBe('6 ngày trước')
  })

  it('47 giờ trước mà đã sang hai ngày lịch trước thì KHÔNG gọi là "Hôm qua"', () => {
    // 08:00 thứ Hai, xem lúc 07:00 thứ Tư (47 giờ sau).
    const monday = new Date(2026, 9, 12, 8, 0, 0).toISOString()
    const wednesday = new Date(2026, 9, 14, 7, 0, 0).getTime()

    expect(formatRelativeTime(monday, wednesday)).toBe('2 ngày trước')
  })

  it('25 giờ trước nhưng chỉ cách một ngày lịch thì là "Hôm qua"', () => {
    const lateMonday = new Date(2026, 9, 12, 23, 0, 0).toISOString()
    const tuesday = new Date(2026, 9, 13, 23, 59, 0).getTime()

    expect(formatRelativeTime(lateMonday, tuesday)).toBe('Hôm qua')
  })

  it('từ 7 ngày trở lên ghi ngày đầy đủ dd/MM/yyyy', () => {
    expect(formatRelativeTime(ago(7 * DAY), NOW)).toMatch(/^\d{2}\/\d{2}\/\d{4}$/)
    expect(formatRelativeTime('2026-01-05T10:00:00', NOW)).toBe('05/01/2026')
  })

  it('thời điểm trong tương lai (đồng hồ lệch) coi như vừa xong, không ra số âm', () => {
    expect(formatRelativeTime(new Date(NOW + 5 * MINUTE).toISOString(), NOW)).toBe('Vừa xong')
  })

  it('chuỗi không hợp lệ trả về rỗng thay vì "NaN"', () => {
    expect(formatRelativeTime('không phải ngày', NOW)).toBe('')
  })
})
