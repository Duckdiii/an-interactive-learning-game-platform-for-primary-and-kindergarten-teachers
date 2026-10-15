import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../context/AuthContext'
import { createGames } from '../services/gamesService'
import type { CreateGameOutcome } from '../services/gamesService'
import { buildMockGameContents } from '../services/mock/gameFixtures'
import { mockApiError } from '../services/mock/mockErrors'
import { loginAsTeacher } from '../test/renderWithApp'
import type { GameResponse } from '../types/game-response.types'
import type { GenerateGameRequest } from '../utils/generateRequest'
import { clearNewGames, isNewGame } from '../utils/newGames'
import { useCreateGames } from './useCreateGames'

vi.mock('../services/gamesService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/gamesService')>()),
  createGames: vi.fn(),
}))

const mockedCreate = vi.mocked(createGames)
const voice = { region: 'NORTH', gender: 'FEMALE' }
const request = (gameType: string): GenerateGameRequest => ({ gameType, idea: 'Ý tưởng', voice })
const game = (id: string): GameResponse => ({ ...buildMockGameContents()[0], gameId: id, status: 'DRAFT', updatedAt: '2026-10-15T00:00:00.000Z' })
const ok = (gameType: string, id: string): CreateGameOutcome => ({ ok: true, gameType, game: game(id) })
const fail = (gameType: string, error: unknown): CreateGameOutcome => ({ ok: false, gameType, error })

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })

  return { promise, resolve }
}

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  )

  return { invalidate, ...renderHook(() => useCreateGames(), { wrapper }) }
}

beforeEach(() => {
  loginAsTeacher()
  clearNewGames()
})
afterEach(() => {
  vi.clearAllMocks()
  clearNewGames()
  localStorage.clear()
})

describe('useCreateGames', () => {
  it('thành công cả hai: trả game theo ĐÚNG thứ tự yêu cầu, đánh dấu "Mới", làm mới danh sách của giáo viên', async () => {
    mockedCreate.mockResolvedValue([ok('QUIZ', 'g1'), ok('MATCHING', 'g2')])

    const { result, invalidate } = setup()
    let outcome: Awaited<ReturnType<typeof result.current.create>> | undefined

    await act(async () => {
      outcome = await result.current.create([request('QUIZ'), request('MATCHING')])
    })

    expect(outcome).toMatchObject({ status: 'done' })
    expect(outcome?.status === 'done' && outcome.games.map((item) => item.gameId)).toEqual(['g1', 'g2'])
    expect(isNewGame('g1') && isNewGame('g2')).toBe(true)
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['games', 't1'] })
    expect(result.current.creating).toBe(false)
  })

  it('bấm lần hai khi đang tạo thì bỏ qua (busy), chỉ gọi dịch vụ một lần', async () => {
    const pending = deferred<CreateGameOutcome[]>()

    mockedCreate.mockReturnValue(pending.promise)

    const { result } = setup()
    let first!: Promise<unknown>
    let second: unknown

    act(() => {
      first = result.current.create([request('QUIZ')])
    })
    await act(async () => {
      second = await result.current.create([request('QUIZ')])
    })

    expect(second).toEqual({ status: 'busy' })
    expect(mockedCreate).toHaveBeenCalledTimes(1)
    expect(result.current.creating).toBe(true)

    await act(async () => {
      pending.resolve([ok('QUIZ', 'g1')])
      await first
    })
  })

  it('lỗi một phần: loại xong được NHỚ, loại lỗi có lỗi riêng; thử lại chỉ gửi loại còn thiếu và ghép đủ kết quả', async () => {
    mockedCreate.mockResolvedValueOnce([ok('QUIZ', 'g1'), fail('MATCHING', mockApiError(504, 'AI_GENERATION_TIMEOUT', 'x'))])

    const { result } = setup()
    let outcome: unknown

    await act(async () => {
      outcome = await result.current.create([request('QUIZ'), request('MATCHING')])
    })

    expect(outcome).toEqual({ status: 'partial' })
    expect(Object.keys(result.current.created)).toEqual(['QUIZ'])
    expect(result.current.failures.MATCHING.kind).toBe('busy')

    mockedCreate.mockResolvedValueOnce([ok('MATCHING', 'g2')])
    await act(async () => {
      outcome = await result.current.create([request('QUIZ'), request('MATCHING')])
    })

    expect(mockedCreate.mock.calls[1][0].map((item) => item.gameType)).toEqual(['MATCHING'])
    expect(outcome).toMatchObject({ status: 'done' })
    expect(outcome && (outcome as { games: GameResponse[] }).games.map((item) => item.gameId)).toEqual(['g1', 'g2'])
    expect(result.current.failures).toEqual({})
  })

  it('"reset" quên kết quả cũ: lần tạo mới gửi lại mọi loại', async () => {
    mockedCreate.mockResolvedValue([ok('QUIZ', 'g1')])

    const { result } = setup()

    await act(async () => {
      await result.current.create([request('QUIZ')])
    })
    act(() => result.current.reset())
    expect(result.current.created).toEqual({})

    mockedCreate.mockResolvedValue([ok('QUIZ', 'g2')])
    await act(async () => {
      await result.current.create([request('QUIZ')])
    })

    expect(mockedCreate.mock.calls[1][0]).toHaveLength(1)
  })

  it('hủy: kết quả là canceled, KHÔNG có lỗi nào, đánh dấu canceled; game đã xong trước đó (nếu có) vẫn được giữ', async () => {
    const canceled = Object.assign(new Error('canceled'), { code: 'ERR_CANCELED', __CANCEL__: true })

    // Dịch vụ kết thúc NGAY KHI nhận tín hiệu hủy: một loại đã xong kịp, loại kia bị hủy.
    mockedCreate.mockImplementation(
      (_requests, signal) =>
        new Promise((resolve) => {
          signal?.addEventListener('abort', () => resolve([ok('QUIZ', 'g1'), fail('MATCHING', canceled)]))
        }),
    )

    const { result } = setup()
    let outcome: unknown
    let running!: Promise<unknown>

    act(() => {
      running = result.current.create([request('QUIZ'), request('MATCHING')])
    })
    await act(async () => {
      result.current.cancel()
      outcome = await running
    })

    expect(outcome).toEqual({ status: 'canceled' })
    expect(result.current.failures).toEqual({})
    expect(result.current.canceled).toBe(true)
    expect(Object.keys(result.current.created)).toEqual(['QUIZ'])
  })

  it('rời trang (unmount) hủy tín hiệu; game đã tạo xong vẫn được đánh dấu', async () => {
    const pending = deferred<CreateGameOutcome[]>()
    let seen: AbortSignal | undefined

    mockedCreate.mockImplementation((_requests, signal) => {
      seen = signal

      return pending.promise
    })

    const { result, unmount } = setup()

    act(() => {
      void result.current.create([request('QUIZ')])
    })
    unmount()

    expect(seen?.aborted).toBe(true)

    pending.resolve([ok('QUIZ', 'g9')])
    await act(async () => {
      await pending.promise
    })

    expect(isNewGame('g9')).toBe(true)
  })

  it('"reset" khi đang tạo bị bỏ qua (không xóa kết quả giữa chừng)', async () => {
    const pending = deferred<CreateGameOutcome[]>()

    mockedCreate.mockResolvedValueOnce([ok('QUIZ', 'g1')])

    const { result } = setup()

    await act(async () => {
      await result.current.create([request('QUIZ')])
    })
    mockedCreate.mockReturnValueOnce(pending.promise)

    let running!: Promise<unknown>

    act(() => {
      running = result.current.create([request('QUIZ'), request('MATCHING')])
    })
    act(() => result.current.reset())

    expect(Object.keys(result.current.created)).toEqual(['QUIZ'])

    await act(async () => {
      pending.resolve([ok('MATCHING', 'g2')])
      await running
    })
  })

  it('đã hủy thì dù mọi loại vừa xong cũng KHÔNG báo "done" (trang không điều hướng khi giáo viên vừa bấm hủy), game vẫn được đánh dấu', async () => {
    mockedCreate.mockImplementation(
      (_requests, signal) =>
        new Promise((resolve) => {
          signal?.addEventListener('abort', () => resolve([ok('QUIZ', 'g1')]))
        }),
    )

    const { result } = setup()
    let outcome: unknown
    let running!: Promise<unknown>

    act(() => {
      running = result.current.create([request('QUIZ')])
    })
    await act(async () => {
      result.current.cancel()
      outcome = await running
    })

    expect(outcome).toEqual({ status: 'canceled' })
    expect(isNewGame('g1')).toBe(true)
  })

  it('loại không an toàn hoặc thiếu khối lớp/môn không bị gửi lại; chỉ còn loại như vậy thì không gọi dịch vụ lần nào', async () => {
    const { mockApiError: apiError } = await import('../services/mock/mockErrors')

    mockedCreate.mockResolvedValueOnce([fail('QUIZ', apiError(422, 'UNSAFE_CONTENT', 'x')), fail('MATCHING', apiError(504, 'AI_GENERATION_TIMEOUT', 'x'))])

    const { result } = setup()
    let outcome: unknown

    await act(async () => {
      await result.current.create([request('QUIZ'), request('MATCHING')])
    })

    mockedCreate.mockResolvedValueOnce([ok('MATCHING', 'g2')])
    await act(async () => {
      outcome = await result.current.create([request('QUIZ'), request('MATCHING')])
    })

    expect(mockedCreate.mock.calls[1][0].map((item) => item.gameType)).toEqual(['MATCHING'])
    expect(outcome).toEqual({ status: 'partial' })

    await act(async () => {
      outcome = await result.current.create([request('QUIZ'), request('MATCHING')])
    })

    expect(mockedCreate).toHaveBeenCalledTimes(2)
    expect(outcome).toEqual({ status: 'partial' })
  })
})
