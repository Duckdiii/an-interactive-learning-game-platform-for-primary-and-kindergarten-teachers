import { describe, expect, it } from 'vitest'
import { buildParentMessage } from './parentMessage'

describe('buildParentMessage', () => {
  it('điền tên trò chơi, liên kết và mã chia sẻ', () => {
    const message = buildParentMessage({ title: 'Nhận biết chữ cái', shareCode: 'ABC123', shareUrl: 'https://aigame.vn/play/ABC123' })

    expect(message).toContain('"Nhận biết chữ cái"')
    expect(message).toContain('https://aigame.vn/play/ABC123')
    expect(message).toContain('mã ABC123')
    expect(message).not.toMatch(/undefined|null|\{title\}|\{url\}|\{code\}/)
  })

  it('không có liên kết hợp lệ (thiếu, javascript:, có tên đăng nhập) thì chỉ có mã, không lộ địa chỉ lạ', () => {
    for (const shareUrl of [null, undefined, '', 'javascript:alert(1)', 'https://u:p@evil.test/x']) {
      const message = buildParentMessage({ title: 'Bài 1', shareCode: 'ABC123', shareUrl })

      expect(message, String(shareUrl)).toContain('nhập mã ABC123')
      expect(message, String(shareUrl)).not.toMatch(/javascript|evil|liên kết/)
    }
  })

  it('tên hoặc liên kết có ký tự đặc biệt của replace ($&, $`) được giữ nguyên chữ', () => {
    const message = buildParentMessage({ title: 'Giá $& cả $`', shareCode: 'ABC123', shareUrl: 'https://aigame.vn/play/ABC123?a=$&b=1' })

    expect(message).toContain('"Giá $& cả $`"')
    expect(message).toContain('?a=$&b=1')
    expect(message).not.toContain('{title}')
    expect(message).not.toContain('{url}')
  })

  it('tên trống thì dùng tên mặc định, tên có khoảng trắng thừa được cắt', () => {
    expect(buildParentMessage({ title: '   ', shareCode: 'ABC123', shareUrl: null })).toContain('Chưa đặt tên')
    expect(buildParentMessage({ title: '  Bài 2  ', shareCode: 'ABC123', shareUrl: null })).toContain('"Bài 2"')
  })
})
