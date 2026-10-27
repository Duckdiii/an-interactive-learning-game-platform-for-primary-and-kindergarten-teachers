import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ play: vi.fn(), stop: vi.fn(), unload: vi.fn() }))
vi.mock('howler', () => ({
  Howl: class {
    play = mocks.play
    stop = mocks.stop
    unload = mocks.unload
  },
}))

import { useAutoReadPrompt } from './useAutoReadPrompt'

beforeEach(() => vi.clearAllMocks())

describe('useAutoReadPrompt', () => {
  it('bật và có audioUrl thì phát một lần, dọn khi đóng', () => {
    const { unmount } = renderHook(() => useAutoReadPrompt('a.mp3', true))

    expect(mocks.play).toHaveBeenCalledTimes(1)
    unmount()
    expect(mocks.unload).toHaveBeenCalledTimes(1)
  })

  it('đổi câu thì đọc câu mới', () => {
    const { rerender } = renderHook(({ url }) => useAutoReadPrompt(url, true), { initialProps: { url: 'a.mp3' } })

    rerender({ url: 'b.mp3' })
    expect(mocks.play).toHaveBeenCalledTimes(2)
    // Giọng câu cũ phải dừng và được dọn, không đọc chồng lên câu mới.
    expect(mocks.stop).toHaveBeenCalledTimes(1)
    expect(mocks.unload).toHaveBeenCalledTimes(1)
  })

  it('tắt tự đọc giữa câu thì dừng giọng đang đọc', () => {
    const { rerender } = renderHook(({ on }) => useAutoReadPrompt('a.mp3', on), { initialProps: { on: true } })

    rerender({ on: false })
    expect(mocks.stop).toHaveBeenCalledTimes(1)
  })

  it('tắt hoặc không có audioUrl thì không phát', () => {
    renderHook(() => useAutoReadPrompt('a.mp3', false))
    renderHook(() => useAutoReadPrompt(undefined, true))

    expect(mocks.play).not.toHaveBeenCalled()
  })
})
