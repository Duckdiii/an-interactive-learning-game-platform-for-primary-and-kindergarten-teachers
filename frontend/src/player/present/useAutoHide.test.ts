import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AUTO_HIDE_MS, useAutoHide } from './useAutoHide'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('useAutoHide', () => {
  it('hiện lúc đầu, tự ẩn sau 3 giây không thao tác; rê chuột hoặc bấm phím thì hiện lại và đếm lại từ đầu', () => {
    const { result } = renderHook(() => useAutoHide())

    expect(result.current.visible).toBe(true)
    act(() => vi.advanceTimersByTime(AUTO_HIDE_MS - 1))
    expect(result.current.visible).toBe(true)
    act(() => vi.advanceTimersByTime(1))
    expect(result.current.visible).toBe(false)

    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove'))
    })
    expect(result.current.visible).toBe(true)
    act(() => vi.advanceTimersByTime(2000))
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    })
    act(() => vi.advanceTimersByTime(2000))
    expect(result.current.visible).toBe(true)
    act(() => vi.advanceTimersByTime(1000))
    expect(result.current.visible).toBe(false)
  })

  it('không ẩn khi chuột đang trên thanh; rời ra thì đếm lại (tiêu điểm bàn phím/chuột: xem PresentShell.test)', () => {
    const { result } = renderHook(() => useAutoHide())

    act(() => result.current.barProps.onMouseEnter())
    act(() => vi.advanceTimersByTime(AUTO_HIDE_MS * 2))
    expect(result.current.visible).toBe(true)

    act(() => result.current.barProps.onMouseLeave())
    act(() => vi.advanceTimersByTime(AUTO_HIDE_MS))
    expect(result.current.visible).toBe(false)
  })

  it('gỡ hook thì không còn hẹn giờ chạy', () => {
    const { unmount } = renderHook(() => useAutoHide())

    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
