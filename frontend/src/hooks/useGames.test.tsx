import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { AxiosError } from 'axios'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getGames } from '../api/gamesApi'
import { AuthProvider } from '../context/AuthContext'
import { loginAsTeacher } from '../test/renderWithApp'
import type { GameSummary } from '../types/game-summary.types'
import { storeSession } from '../utils/authStorage'
import { countGames, shouldRetryGames, sortByUpdatedDesc, useGames } from './useGames'

vi.mock('../api/gamesApi', () => ({ getGames: vi.fn() }))

const mockedGetGames = vi.mocked(getGames)

const game = (gameId: string, status: string, updatedAt: string): GameSummary => ({
  gameId,
  title: gameId,
  gameType: 'QUIZ',
  subject: 'MATH',
  gradeLevel: 'GRADE_1',
  status,
  shareCode: null,
  shareUrl: null,
  thumbnailUrl: null,
  updatedAt,
})

describe('countGames', () => {
  it('đếm tổng, bản nháp và đã đăng', () => {
    const games = [
      game('a', 'DRAFT', '2026-10-01T00:00:00Z'),
      game('b', 'DRAFT', '2026-10-02T00:00:00Z'),
      game('c', 'PUBLISHED', '2026-10-03T00:00:00Z'),
    ]

    expect(countGames(games)).toEqual({ total: 3, draft: 2, published: 1 })
    expect(countGames([])).toEqual({ total: 0, draft: 0, published: 0 })
  })
})

describe('sortByUpdatedDesc', () => {
  it('mới cập nhật nhất lên đầu và không đổi mảng gốc', () => {
    const games = [
      game('cu', 'DRAFT', '2026-10-01T00:00:00Z'),
      game('moi', 'DRAFT', '2026-10-09T00:00:00Z'),
      game('giua', 'DRAFT', '2026-10-05T00:00:00Z'),
    ]

    expect(sortByUpdatedDesc(games).map((item) => item.gameId)).toEqual(['moi', 'giua', 'cu'])
    expect(games.map((item) => item.gameId)).toEqual(['cu', 'moi', 'giua'])
  })
})

describe('shouldRetryGames', () => {
  it('thử lại đúng 1 lần với lỗi thường', () => {
    expect(shouldRetryGames(0, new Error('lỗi'))).toBe(true)
    expect(shouldRetryGames(1, new Error('lỗi'))).toBe(false)
  })

  it('quá hạn thì không thử lại ngay từ lần đầu', () => {
    expect(shouldRetryGames(0, new AxiosError('timeout', 'ECONNABORTED'))).toBe(false)
    expect(shouldRetryGames(0, new AxiosError('timeout', 'ETIMEDOUT'))).toBe(false)
  })

  it('mất mạng (không phải quá hạn) vẫn được thử lại 1 lần', () => {
    expect(shouldRetryGames(0, new AxiosError('Network Error', 'ERR_NETWORK'))).toBe(true)
  })
})

describe('useGames', () => {
  beforeEach(() => loginAsTeacher())
  afterEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  const makeWrapper = (client: QueryClient) =>
    function Wrapper({ children }: { children: ReactNode }) {
      return (
        <QueryClientProvider client={client}>
          <AuthProvider>{children}</AuthProvider>
        </QueryClientProvider>
      )
    }

  it('tải toàn bộ danh sách một lần, không gửi bộ lọc lên API', async () => {
    mockedGetGames.mockResolvedValue([game('a', 'DRAFT', '2026-10-01T00:00:00Z')])

    const { result } = renderHook(() => useGames(), { wrapper: makeWrapper(new QueryClient()) })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockedGetGames).toHaveBeenCalledTimes(1)
    expect(mockedGetGames).toHaveBeenCalledWith({ subject: '', gradeLevel: '', status: '' })
    expect(result.current.data).toHaveLength(1)
  })

  it('bộ nhớ đệm tách theo giáo viên: cô B đăng nhập sau cô A không thấy danh sách của cô A', async () => {
    const client = new QueryClient()
    mockedGetGames.mockResolvedValueOnce([game('cua-co-A', 'PUBLISHED', '2026-10-01T00:00:00Z')])

    const first = renderHook(() => useGames(), { wrapper: makeWrapper(client) })
    await waitFor(() => expect(first.result.current.isSuccess).toBe(true))
    first.unmount()

    // Cô B dùng chung máy (cùng bộ nhớ đệm) nhưng là một tài khoản khác.
    localStorage.clear()
    storeSession({ teacherId: 't2', fullName: 'Trần Thị Bích', email: 'bich@truong.edu.vn' }, 'token', 'refresh')
    let release: (value: GameSummary[]) => void = () => {}
    mockedGetGames.mockReturnValueOnce(new Promise<GameSummary[]>((resolve) => (release = resolve)))

    const second = renderHook(() => useGames(), { wrapper: makeWrapper(client) })

    expect(second.result.current.data).toBeUndefined()
    expect(second.result.current.isPending).toBe(true)

    release([game('cua-co-B', 'DRAFT', '2026-10-02T00:00:00Z')])
    await waitFor(() => expect(second.result.current.isSuccess).toBe(true))
    expect(second.result.current.data?.map((item) => item.gameId)).toEqual(['cua-co-B'])
  })
})
