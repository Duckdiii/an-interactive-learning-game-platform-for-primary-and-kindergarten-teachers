import { act, render } from '@testing-library/react'
import { useEffect } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { logoutTeacher } from '../api/authApi'
import { useAuth } from '../hooks/useAuth'
import { buildMockGameContents } from '../services/mock/gameFixtures'
import { loadDraft, saveDraft } from '../utils/draftStorage'
import { clearNewGames, isNewGame, markNewGames } from '../utils/newGames'
import { AuthProvider } from './AuthContext'

vi.mock('../api/authApi', () => ({ logoutTeacher: vi.fn() }))
const mockedLogout = vi.mocked(logoutTeacher)

let current: ReturnType<typeof useAuth> | null = null

function Probe() {
  const auth = useAuth()

  useEffect(() => {
    current = auth
  })

  return null
}

afterEach(() => {
  current = null
  mockedLogout.mockReset()
  localStorage.clear()
  clearNewGames()
})

describe('AuthProvider.logout', () => {
  it('xóa phiên đăng nhập và MỌI bản sao lưu nháp của máy (máy dùng chung ở trường)', async () => {
    const content = buildMockGameContents()[0]

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    act(() => current?.login({ teacherId: 'tA', email: 'a@truong.edu.vn' }, 'token'))
    saveDraft('tA', 'g1', content, '2026-10-14T07:00:00.000Z')
    saveDraft('tB', 'g9', content, '2026-10-14T07:00:00.000Z')

    await act(() => current!.logout())

    expect(current?.user).toBeNull()
    expect(localStorage.getItem('accessToken')).toBeNull()
    expect(loadDraft('tA', 'g1')).toBeNull()
    expect(loadDraft('tB', 'g9')).toBeNull()
  })

  it('gọi API thu hồi refresh token khi access token vẫn còn trong máy (API cần nó để xác thực)', async () => {
    let tokenWhenCalled: string | null = 'chưa gọi'
    mockedLogout.mockImplementation(async () => {
      tokenWhenCalled = localStorage.getItem('accessToken')
    })
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    act(() => current?.login({ teacherId: 'tA', email: 'a@truong.edu.vn' }, 'token-a'))

    await act(() => current!.logout())

    expect(mockedLogout).toHaveBeenCalledTimes(1)
    expect(tokenWhenCalled).toBe('token-a')
    expect(localStorage.getItem('accessToken')).toBeNull()
  })

  it('API đăng xuất lỗi (mất mạng, 401) vẫn xóa phiên ở máy, không để giáo viên kẹt lại', async () => {
    mockedLogout.mockRejectedValue(new Error('Network Error'))
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    act(() => current?.login({ teacherId: 'tA', email: 'a@truong.edu.vn' }, 'token-a'))

    await act(() => current!.logout())

    expect(current?.user).toBeNull()
    expect(localStorage.getItem('accessToken')).toBeNull()
  })
})

describe('AuthProvider.login', () => {
  it('đăng nhập thì xóa bản sao lưu của người khác trên máy, giữ của chính mình', () => {
    const content = buildMockGameContents()[0]

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    // Cô A hết hạn phiên (401) nên bản sao lưu còn nằm lại; cô B đăng nhập sau đó. Cô B có sẵn một bản của mình.
    saveDraft('tA', 'g1', content, '2026-10-14T07:00:00.000Z')
    saveDraft('tB', 'g2', content, '2026-10-14T07:00:00.000Z')

    act(() => current?.login({ teacherId: 'tB', email: 'b@truong.edu.vn' }, 'token'))

    expect(loadDraft('tA', 'g1')).toBeNull()
    expect(loadDraft('tB', 'g2')).not.toBeNull()
  })
})

describe('dấu "Mới" của game vừa tạo (máy dùng chung)', () => {
  it('đăng xuất xóa dấu "Mới"', async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    act(() => current?.login({ teacherId: 'tA', email: 'a@truong.edu.vn' }, 'token'))
    markNewGames(['mock-game-11'])

    await act(() => current!.logout())

    expect(isNewGame('mock-game-11')).toBe(false)
  })

  it('người khác đăng nhập (phiên trước chỉ hết hạn chứ chưa đăng xuất) cũng không thấy dấu "Mới" của người trước', () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    markNewGames(['mock-game-11'])

    act(() => current?.login({ teacherId: 'tB', email: 'b@truong.edu.vn' }, 'token'))

    expect(isNewGame('mock-game-11')).toBe(false)
  })
})
