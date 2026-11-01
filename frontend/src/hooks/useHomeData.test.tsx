import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useGameInsights } from './useHomeData'

const identity = vi.hoisted(() => ({ cacheOwner: 'teacher-a' as string | null }))
const getGameInsights = vi.hoisted(() => vi.fn())

vi.mock('./useTeacherIdentity', () => ({ useTeacherIdentity: () => ({ teacherId: identity.cacheOwner, cacheOwner: identity.cacheOwner }) }))
vi.mock('../services/home', async (original) => ({
  ...(await original<typeof import('../services/home')>()),
  getHomeApi: async () => ({ api: { getGameInsights }, isSample: true }),
}))

afterEach(() => {
  identity.cacheOwner = 'teacher-a'
  getGameInsights.mockReset()
})

describe('useGameInsights: bộ nhớ đệm theo tài khoản', () => {
  it('đổi sang giáo viên khác thì không dùng lại số liệu của người trước mà gọi lại API', async () => {
    getGameInsights.mockImplementation(async () => ({ playCount: identity.cacheOwner === 'teacher-a' ? 26 : 3 }))
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
    const { result, rerender } = renderHook(() => useGameInsights('game-1'), { wrapper })

    await waitFor(() => expect(result.current.data?.insights?.playCount).toBe(26))

    identity.cacheOwner = 'teacher-b'
    rerender()

    await waitFor(() => expect(result.current.data?.insights?.playCount).toBe(3))
    expect(getGameInsights).toHaveBeenCalledTimes(2)
  })

  it('chưa có tài khoản (đã đăng xuất) thì không gọi API', async () => {
    identity.cacheOwner = null
    const client = new QueryClient()
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>

    renderHook(() => useGameInsights('game-1'), { wrapper })
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(getGameInsights).not.toHaveBeenCalled()
  })
})
