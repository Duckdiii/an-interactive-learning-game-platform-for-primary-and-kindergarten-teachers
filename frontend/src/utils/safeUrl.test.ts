import { describe, expect, it } from 'vitest'
import { safeHttpUrl } from './safeUrl'

describe('safeHttpUrl', () => {
  it('nhận http và https, chuẩn hóa và cắt khoảng trắng', () => {
    expect(safeHttpUrl('https://aigame.vn/play/ABC123')).toBe('https://aigame.vn/play/ABC123')
    expect(safeHttpUrl('  http://localhost:5173/play/X  ')).toBe('http://localhost:5173/play/X')
  })

  it('bỏ giao thức nguy hiểm hoặc lạ và giá trị không phải địa chỉ', () => {
    for (const value of ['javascript:alert(1)', 'data:text/html,<b>x</b>', 'file:///etc/passwd', 'ftp://a.b/c', 'vbscript:x', '//evil.com', '/play/ABC', 'abc', '', '   ']) {
      expect(safeHttpUrl(value), value).toBeNull()
    }
    expect(safeHttpUrl(null)).toBeNull()
    expect(safeHttpUrl(undefined)).toBeNull()
  })
})
