import { act, render } from '@testing-library/react'
import { useEffect } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { useAuth } from '../hooks/useAuth'
import { buildMockGameContents } from '../services/mock/gameFixtures'
import { loadDraft, saveDraft } from '../utils/draftStorage'
import { AuthProvider } from './AuthContext'

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
  localStorage.clear()
})

describe('AuthProvider.logout', () => {
  it('xóa phiên đăng nhập và MỌI bản sao lưu nháp của máy (máy dùng chung ở trường)', () => {
    const content = buildMockGameContents()[0]

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    act(() => current?.login({ teacherId: 'tA', email: 'a@truong.edu.vn' }, 'token', 'refresh'))
    saveDraft('tA', 'g1', content, '2026-10-14T07:00:00.000Z')
    saveDraft('tB', 'g9', content, '2026-10-14T07:00:00.000Z')

    act(() => current?.logout())

    expect(current?.user).toBeNull()
    expect(localStorage.getItem('accessToken')).toBeNull()
    expect(loadDraft('tA', 'g1')).toBeNull()
    expect(loadDraft('tB', 'g9')).toBeNull()
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

    act(() => current?.login({ teacherId: 'tB', email: 'b@truong.edu.vn' }, 'token', 'refresh'))

    expect(loadDraft('tA', 'g1')).toBeNull()
    expect(loadDraft('tB', 'g2')).not.toBeNull()
  })
})
