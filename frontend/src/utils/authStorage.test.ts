import { afterEach, describe, expect, it } from 'vitest'
import { clearStoredSession, readStoredSession, storeAccessToken, storeSession } from './authStorage'

afterEach(() => localStorage.clear())

// Máy đã đăng nhập theo contract cũ còn khóa `refreshToken` trong localStorage: refresh token giờ nằm trong cookie HttpOnly,
// bản cũ trong localStorage phải bị dọn để không còn token đọc được bằng JS.
describe('dọn refresh token của contract cũ khỏi localStorage', () => {
  it('đọc phiên đã lưu thì xóa khóa refreshToken cũ, vẫn giữ phiên', () => {
    storeSession({ teacherId: 't1', email: 'lan@truong.edu.vn' }, 'access')
    localStorage.setItem('refreshToken', 'legacy-refresh')

    const session = readStoredSession()

    expect(localStorage.getItem('refreshToken')).toBeNull()
    expect(session.accessToken).toBe('access')
    expect(session.user?.teacherId).toBe('t1')
  })

  it('lưu access token mới cũng xóa khóa refreshToken cũ', () => {
    localStorage.setItem('refreshToken', 'legacy-refresh')

    storeAccessToken('access')

    expect(localStorage.getItem('refreshToken')).toBeNull()
  })

  it('xóa phiên thì xóa cả khóa refreshToken cũ', () => {
    storeSession({ teacherId: 't1', email: 'lan@truong.edu.vn' }, 'access')
    localStorage.setItem('refreshToken', 'legacy-refresh')

    clearStoredSession()

    expect(localStorage.getItem('refreshToken')).toBeNull()
    expect(localStorage.getItem('accessToken')).toBeNull()
  })
})
