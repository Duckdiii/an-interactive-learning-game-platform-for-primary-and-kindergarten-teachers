import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useAnimationTime } from './useAnimationTime'

const mockMatchMedia = (reduce: boolean) =>
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: reduce && query.includes('reduce'), media: query }))

describe('useAnimationTime', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('chạy theo thời gian khi được bật', async () => {
    mockMatchMedia(false)
    vi.useFakeTimers()
    const { result } = renderHook(() => useAnimationTime(true))
    await act(async () => {
      vi.advanceTimersByTime(500)
    })
    expect(result.current).toBeGreaterThan(0)
  })

  it('đứng ở 0 khi máy bật "giảm chuyển động" hoặc khi tắt', async () => {
    mockMatchMedia(true)
    vi.useFakeTimers()
    const reduced = renderHook(() => useAnimationTime(true))
    mockMatchMedia(false)
    const disabled = renderHook(() => useAnimationTime(false))
    await act(async () => {
      vi.advanceTimersByTime(500)
    })
    expect(reduced.result.current).toBe(0)
    expect(disabled.result.current).toBe(0)
  })
})
