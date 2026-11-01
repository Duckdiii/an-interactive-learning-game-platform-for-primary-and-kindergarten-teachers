import { describe, expect, it } from 'vitest'
import { initialOf } from './initials'

describe('initialOf', () => {
  it('lấy chữ cái đầu của TÊN (từ cuối) vì người Việt gọi bằng tên', () => {
    expect(initialOf('Nguyễn Thị Lan')).toBe('L')
    expect(initialOf('Trần Văn Đức')).toBe('Đ')
  })

  it('viết hoa đúng chữ có dấu tiếng Việt', () => {
    expect(initialOf('lê thị ánh')).toBe('Á')
    expect(initialOf('ông Ơn')).toBe('Ơ')
  })

  it('bỏ khoảng trắng thừa', () => {
    expect(initialOf('  Nguyễn   An  ')).toBe('A')
  })

  it('không có tên thì dùng email, rỗng thì hiện dấu hỏi', () => {
    expect(initialOf('lan@truong.edu.vn')).toBe('L')
    expect(initialOf('')).toBe('?')
    expect(initialOf(undefined)).toBe('?')
    expect(initialOf('   ')).toBe('?')
  })
})
