import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../context/AuthContext'
import * as gameService from '../services/gameService'
import * as mockGames from '../services/mock/mockGames'
import { getMockGame, resetMockGames } from '../services/mock/mockGames'
import { getMockPublishCalls, resetMockPublish, setMockPublishFailure } from '../services/mock/mockPublish'
import { setMockScenario } from '../services/mock/mockRuntime'
import { loginAsTeacher } from '../test/renderWithApp'
import type { GameResponse } from '../types/game-response.types'
import { loadDraft } from '../utils/draftStorage'
import { gameQueryKey } from './useGame'
import { useGameEditor } from './useGameEditor'

// B1.2: xuất bản từ trình soạn thảo (kiểm tra trước, khóa trong lúc chờ, chỉ phần đã gửi được coi là đã lưu, lỗi không đụng bản đang soạn).
// mock-game-2 là game NHÁP.
const GAME_ID = 'mock-game-2'
const OWNER = 't1'
let client: QueryClient

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={client}>
    <AuthProvider>{children}</AuthProvider>
  </QueryClientProvider>
)

const mountEditor = () => renderHook(() => useGameEditor(getMockGame(GAME_ID)), { wrapper })

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  vi.stubEnv('VITE_USE_MOCK', 'editor,games')
  loginAsTeacher()
  resetMockGames()
  resetMockPublish()
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.stubEnv('VITE_USE_MOCK', 'none')
  vi.stubEnv('VITE_MOCK_LATENCY_MS', '0')
  setMockScenario('normal')
  localStorage.clear()
})

describe('useGameEditor.publish', () => {
  it('thành công: có kết quả (mã, địa chỉ), hết "chưa lưu", game thành đã xuất bản trong bộ nhớ đệm và máy chủ', async () => {
    client.setQueryData(gameQueryKey(OWNER, GAME_ID), getMockGame(GAME_ID))

    const { result } = mountEditor()

    act(() => result.current.setTitle('Tên trước khi xuất bản'))
    expect(result.current.dirty).toBe(true)

    let found: unknown

    act(() => {
      found = result.current.publish()
    })
    expect(found).toEqual([])

    await waitFor(() => expect(result.current.publishResult).not.toBeNull())

    expect(result.current.publishResult).toMatchObject({ gameId: GAME_ID, status: 'PUBLISHED' })
    expect(result.current.dirty).toBe(false)
    expect(result.current.publishing).toBe(false)
    expect(result.current.publishFailure).toBeNull()
    expect(getMockGame(GAME_ID)).toMatchObject({ status: 'PUBLISHED', metadata: { title: 'Tên trước khi xuất bản' } })

    expect(client.getQueryData<GameResponse>(gameQueryKey(OWNER, GAME_ID))).toMatchObject({ status: 'PUBLISHED', metadata: { title: 'Tên trước khi xuất bản' } })
    expect(loadDraft(OWNER, GAME_ID)).toBeNull()
  })

  it('không lấy lại được bản mới sau khi xuất bản: xuất bản vẫn thành công và bộ nhớ đệm vẫn báo "đã xuất bản" (bản vá)', async () => {
    client.setQueryData(gameQueryKey(OWNER, GAME_ID), getMockGame(GAME_ID))
    vi.spyOn(gameService, 'getGame').mockRejectedValue(new Error('mất mạng'))

    const { result } = mountEditor()

    act(() => result.current.setTitle('Tên mới'))
    act(() => {
      result.current.publish()
    })

    await waitFor(() => expect(result.current.publishResult).not.toBeNull())
    await waitFor(() => expect(result.current.publishing).toBe(false))

    expect(result.current.publishFailure).toBeNull()
    expect(client.getQueryData<GameResponse>(gameQueryKey(OWNER, GAME_ID))).toMatchObject({ status: 'PUBLISHED', metadata: { title: 'Tên mới' } })
  })

  it('dữ liệu chưa đủ để xuất bản (2c): trả lỗi, KHÔNG gọi mạng, không đổi bản đang soạn', async () => {
    const { result } = mountEditor()

    act(() => result.current.setTitle(''))

    let found: ReturnType<typeof result.current.publish> = []

    act(() => {
      found = result.current.publish()
    })

    expect(found.length).toBeGreaterThan(0)
    expect(getMockPublishCalls()).toBe(0)
    expect(result.current.publishing).toBe(false)
    expect(result.current.publishIssues.length).toBeGreaterThan(0)
    expect(result.current.dirty).toBe(true)

    // Sửa xong thì lỗi tự biến mất.
    act(() => result.current.setTitle('Đã có tên'))
    expect(result.current.publishIssues).toEqual([])
  })

  it('đang xuất bản thì bấm đúp và bấm Lưu đều không gửi thêm', async () => {
    vi.stubEnv('VITE_MOCK_LATENCY_MS', '30')

    const saveSpy = vi.spyOn(mockGames, 'saveMockGame')
    const { result } = mountEditor()

    act(() => result.current.setTitle('Tên mới'))
    act(() => {
      result.current.publish()
    })
    await waitFor(() => expect(result.current.publishing).toBe(true))

    act(() => {
      result.current.publish()
      result.current.save()
    })

    await waitFor(() => expect(result.current.publishResult).not.toBeNull())
    expect(getMockPublishCalls()).toBe(1)
    // Bấm Lưu trong lúc xuất bản (đã gồm lưu) không gửi thêm bản lưu chồng lên.
    expect(saveSpy).not.toHaveBeenCalled()
  })

  it('sửa thêm trong lúc chờ: chỉ phần đã gửi được coi là đã lưu, phần sửa thêm vẫn "chưa lưu" và không bị ghi đè', async () => {
    vi.stubEnv('VITE_MOCK_LATENCY_MS', '30')

    const { result } = mountEditor()

    act(() => result.current.setTitle('Bản đã gửi'))
    act(() => {
      result.current.publish()
    })
    await waitFor(() => expect(result.current.publishing).toBe(true))

    act(() => result.current.setTitle('Bản sửa thêm trong lúc chờ'))

    await waitFor(() => expect(result.current.publishResult).not.toBeNull())

    expect(result.current.draft.metadata.title).toBe('Bản sửa thêm trong lúc chờ')
    expect(result.current.dirty).toBe(true)
    expect(getMockGame(GAME_ID).metadata.title).toBe('Bản đã gửi')
  })

  it('2a (không lưu được): báo lỗi đúng loại, giữ nguyên bản đang soạn và vẫn "chưa lưu", máy chủ không đổi', async () => {
    const { result } = mountEditor()

    act(() => result.current.setTitle('Chưa xuất bản được'))
    setMockPublishFailure('save')
    act(() => {
      result.current.publish()
    })

    await waitFor(() => expect(result.current.publishFailure).not.toBeNull())

    expect(result.current.publishFailure?.kind).toBe('failed')
    expect(result.current.publishResult).toBeNull()
    expect(result.current.draft.metadata.title).toBe('Chưa xuất bản được')
    expect(result.current.dirty).toBe(true)
    expect(getMockGame(GAME_ID).status).toBe('DRAFT')

    // Thử lại sau khi lỗi qua đi thì thành công.
    setMockPublishFailure(null)
    act(() => {
      result.current.publish()
    })
    await waitFor(() => expect(result.current.publishResult).not.toBeNull())
    expect(result.current.publishFailure).toBeNull()
  })

  it('2b (đã lưu nhưng chưa có mã): báo đúng loại; bản đang soạn VẪN "chưa lưu" vì không biết chắc máy chủ đã lưu', async () => {
    const { result } = mountEditor()

    act(() => result.current.setTitle('Đã lưu chưa có mã'))
    setMockPublishFailure('share')
    act(() => {
      result.current.publish()
    })

    await waitFor(() => expect(result.current.publishFailure).not.toBeNull())

    expect(result.current.publishFailure?.kind).toBe('shareFailed')
    expect(result.current.dirty).toBe(true)
    expect(getMockGame(GAME_ID)).toMatchObject({ status: 'DRAFT', metadata: { title: 'Đã lưu chưa có mã' } })
  })

  it('rời trang giữa chừng: xuất bản vẫn xong và bộ nhớ đệm được cập nhật', async () => {
    vi.stubEnv('VITE_MOCK_LATENCY_MS', '30')

    client.setQueryData(gameQueryKey(OWNER, GAME_ID), getMockGame(GAME_ID))

    const { result, unmount } = mountEditor()

    act(() => result.current.setTitle('Xuất bản rồi rời trang'))
    act(() => {
      result.current.publish()
    })
    await waitFor(() => expect(result.current.publishing).toBe(true))
    unmount()

    await waitFor(() => expect(getMockGame(GAME_ID).status).toBe('PUBLISHED'))
    await waitFor(() => expect(client.getQueryData<GameResponse>(gameQueryKey(OWNER, GAME_ID))?.status).toBe('PUBLISHED'))
  })
})
