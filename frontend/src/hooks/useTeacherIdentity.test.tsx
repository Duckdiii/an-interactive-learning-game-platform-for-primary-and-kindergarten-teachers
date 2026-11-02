import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { AuthProvider } from '../context/AuthContext'
import type { AuthUser } from '../types/auth'
import { storeSession } from '../utils/authStorage'
import { useTeacherIdentity } from './useTeacherIdentity'

const wrapper = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>

const identityOf = (user: Partial<AuthUser> | null) => {
  localStorage.clear()
  if (user) storeSession(user as AuthUser, 'token', 'refresh')

  return renderHook(() => useTeacherIdentity(), { wrapper }).result.current
}

afterEach(() => localStorage.clear())

describe('useTeacherIdentity', () => {
  it('có mã giáo viên: dùng mã cho cả sao lưu lẫn khóa bộ nhớ đệm', () => {
    expect(identityOf({ teacherId: 't1', email: 'a@x.vn' })).toEqual({ teacherId: 't1', cacheOwner: 't1' })
  })

  it('phiên cũ chưa có mã: không sao lưu (teacherId null) nhưng khóa bộ nhớ đệm theo email', () => {
    expect(identityOf({ email: 'a@x.vn' })).toEqual({ teacherId: null, cacheOwner: 'a@x.vn' })
  })

  it('chuỗi rỗng hoặc toàn khoảng trắng coi như chưa có, không thành khóa chung', () => {
    expect(identityOf({ teacherId: '  ', email: '' })).toEqual({ teacherId: null, cacheOwner: null })
  })

  it('chưa đăng nhập: không có danh tính nào', () => {
    expect(identityOf(null)).toEqual({ teacherId: null, cacheOwner: null })
  })
})
