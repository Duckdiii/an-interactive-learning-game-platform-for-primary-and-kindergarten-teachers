import { describe, expect, it } from 'vitest'
import { resolveShareUrl, studentAppBaseUrl } from './studentApp'

describe('studentAppBaseUrl', () => {
  it('dùng biến môi trường hợp lệ, bỏ dấu "/" thừa ở cuối và giữ đường dẫn con', () => {
    expect(studentAppBaseUrl('https://hs.example.vn/', 'http://x.test')).toBe('https://hs.example.vn')
    expect(studentAppBaseUrl('https://truong.edu.vn/hoc-sinh//', 'http://x.test')).toBe('https://truong.edu.vn/hoc-sinh')
  })

  it('biến trống, thiếu hoặc không phải http(s) thì dùng địa chỉ đang mở ứng dụng', () => {
    for (const raw of [undefined, '', '  ', 'javascript:alert(1)', 'abc', 42]) {
      expect(studentAppBaseUrl(raw, 'http://localhost:5173'), String(raw)).toBe('http://localhost:5173')
    }
  })

  it('cả hai đều không dùng được thì có giá trị cuối cùng an toàn', () => {
    expect(studentAppBaseUrl(undefined, 'about:blank')).toBe('http://localhost')
  })
})

describe('resolveShareUrl', () => {
  it('ưu tiên shareUrl của Backend khi là http(s)', () => {
    expect(resolveShareUrl('ABC123', 'https://be.example/p/ABC123')).toBe('https://be.example/p/ABC123')
  })

  it('shareUrl thiếu hoặc không an toàn thì ghép từ địa chỉ gốc và mã (đã mã hóa)', () => {
    const expected = `${studentAppBaseUrl()}/play/ABC123`

    expect(resolveShareUrl('ABC123')).toBe(expected)
    expect(resolveShareUrl('ABC123', null)).toBe(expected)
    expect(resolveShareUrl('ABC123', 'javascript:alert(1)')).toBe(expected)
    expect(resolveShareUrl('A/B?')).toBe(`${studentAppBaseUrl()}/play/A%2FB%3F`)
  })
})
