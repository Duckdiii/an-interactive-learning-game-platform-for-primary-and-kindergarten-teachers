import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../context/AuthContext'
import { updateGame } from '../services/gameService'
import { getMockGame, resetMockGames } from '../services/mock/mockGames'
import { setMockScenario } from '../services/mock/mockRuntime'
import { loginAsTeacher } from '../test/renderWithApp'
import { saveDraft } from '../utils/draftStorage'
import { toContent } from '../utils/gameContent'
import { AUTOSAVE_DELAY_MS, useGameEditor } from './useGameEditor'

// Đếm số lần gửi lên "máy chủ" (bản mô phỏng) mà vẫn chạy thật.
vi.mock('../services/gameService', async (importOriginal) => {
  const original = await importOriginal<typeof import('../services/gameService')>()

  return { ...original, updateGame: vi.fn(original.updateGame) }
})

// P3.8: tự lưu sau AUTOSAVE_DELAY_MS kể từ lần sửa cuối. mock-game-2 là bản nháp.
const GAME_ID = 'mock-game-2'
const OWNER = 't1'

const wrapper = ({ children }: { children: ReactNode }) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  )
}

const setup = (paused = false) => renderHook((props: { paused: boolean }) => useGameEditor(getMockGame(GAME_ID), props), { wrapper, initialProps: { paused } })
const advance = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms) })

beforeEach(() => {
  vi.stubEnv('VITE_USE_MOCK', 'editor')
  vi.stubEnv('VITE_MOCK_LATENCY_MS', '0')
  vi.useFakeTimers()
  loginAsTeacher()
  resetMockGames()
  vi.mocked(updateGame).mockClear()
})
afterEach(() => {
  vi.useRealTimers()
  vi.stubEnv('VITE_USE_MOCK', 'none')
  setMockScenario('normal')
  localStorage.clear()
})

describe('useGameEditor: tự lưu', () => {
  it('sửa xong đợi đủ thời gian thì gửi đúng một lần, với nội dung đã cắt khoảng trắng', async () => {
    const { result } = setup()

    act(() => result.current.setTitle('  Tên mới  '))
    expect(result.current.autosave).toBe('pending')
    await advance(AUTOSAVE_DELAY_MS - 1)
    expect(updateGame).not.toHaveBeenCalled()

    await advance(1)
    expect(updateGame).toHaveBeenCalledTimes(1)
    expect(vi.mocked(updateGame).mock.calls[0][0]).toBe(GAME_ID)
    expect(vi.mocked(updateGame).mock.calls[0][1].metadata.title).toBe('Tên mới')

    await advance(100)
    expect(result.current.autosave).toBe('saved')
    expect(getMockGame(GAME_ID).metadata.title).toBe('Tên mới')
  })

  it('gõ liên tục chỉ lưu một lần, sau khi ngừng gõ', async () => {
    const { result } = setup()

    act(() => result.current.setTitle('a'))
    await advance(1500)
    act(() => result.current.setTitle('ab'))
    await advance(1500)
    expect(updateGame).not.toHaveBeenCalled()

    await advance(600)
    expect(updateGame).toHaveBeenCalledTimes(1)
    expect(vi.mocked(updateGame).mock.calls[0][1].metadata.title).toBe('ab')
  })

  it('còn lỗi kiểm tra thì không gửi và báo "blocked"', async () => {
    const { result } = setup()

    act(() => result.current.setTitle(''))
    expect(result.current.autosave).toBe('blocked')
    expect(result.current.liveIssues.length).toBeGreaterThan(0)

    await advance(AUTOSAVE_DELAY_MS * 3)
    expect(updateGame).not.toHaveBeenCalled()
  })

  it('lưu lỗi thì KHÔNG tự thử lại; save() thủ công gửi lại được; sửa tiếp thì tự lưu lại', async () => {
    const { result } = setup()

    setMockScenario('error')
    act(() => result.current.setTitle('x'))
    await advance(AUTOSAVE_DELAY_MS + 100)
    expect(updateGame).toHaveBeenCalledTimes(1)
    expect(result.current.autosave).toBe('error')

    await advance(AUTOSAVE_DELAY_MS * 5)
    expect(updateGame).toHaveBeenCalledTimes(1)

    setMockScenario('normal')
    act(() => {
      result.current.save()
    })
    await advance(100)
    expect(updateGame).toHaveBeenCalledTimes(2)
    expect(result.current.autosave).toBe('saved')

    act(() => result.current.setTitle('xy'))
    await advance(AUTOSAVE_DELAY_MS + 100)
    expect(updateGame).toHaveBeenCalledTimes(3)
  })

  it('dấu cách cuối không gây lưu lặp và không bị cắt khỏi bản đang gõ', async () => {
    const { result } = setup()

    act(() => result.current.setTitle('Tên có dấu cách '))
    await advance(AUTOSAVE_DELAY_MS + 100)
    expect(updateGame).toHaveBeenCalledTimes(1)
    expect(result.current.autosave).toBe('saved')
    expect(result.current.dirty).toBe(false)

    await advance(AUTOSAVE_DELAY_MS * 5)
    expect(updateGame).toHaveBeenCalledTimes(1)
    expect(result.current.draft.metadata.title).toBe('Tên có dấu cách ')
  })

  it('đang hỏi khôi phục bản sao lưu thì không tự lưu; bỏ bản sao lưu xong mới lưu', async () => {
    const content = toContent(getMockGame(GAME_ID))

    saveDraft(OWNER, GAME_ID, { ...content, metadata: { ...content.metadata, title: 'Bản cũ' } }, getMockGame(GAME_ID).updatedAt)

    const { result } = setup()

    expect(result.current.pendingRestore).not.toBeNull()
    act(() => result.current.setTitle('x'))
    await advance(AUTOSAVE_DELAY_MS * 3)
    expect(updateGame).not.toHaveBeenCalled()

    act(() => result.current.discardRestore())
    await advance(AUTOSAVE_DELAY_MS + 100)
    expect(updateGame).toHaveBeenCalledTimes(1)
  })

  it('cờ paused (còn chữ gõ chưa vào bản nháp) hoãn tự lưu cho tới khi hết', async () => {
    const { result, rerender } = setup(true)

    act(() => result.current.setTitle('x'))
    await advance(AUTOSAVE_DELAY_MS * 3)
    expect(updateGame).not.toHaveBeenCalled()

    rerender({ paused: false })
    await advance(AUTOSAVE_DELAY_MS + 100)
    expect(updateGame).toHaveBeenCalledTimes(1)
  })
})
