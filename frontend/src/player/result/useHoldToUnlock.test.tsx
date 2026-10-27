import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useHoldToUnlock } from './useHoldToUnlock'

const key = (k: string, repeat = false) => ({ key: k, repeat, preventDefault: vi.fn() }) as never
const pointer = (over: { button?: number; pointerId?: number } = {}) => ({ button: 0, pointerId: 1, ...over }) as never

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('useHoldToUnlock', () => {
  it('giữ 2900ms rồi thả: chưa mở, tiến độ về 0', () => {
    const { result } = renderHook(() => useHoldToUnlock())

    act(() => result.current.bind.onPointerDown(pointer()))
    act(() => vi.advanceTimersByTime(2900))
    expect(result.current.progress).toBeGreaterThan(0.9)
    act(() => result.current.bind.onPointerUp(pointer()))
    act(() => vi.advanceTimersByTime(1000))

    expect(result.current.unlocked).toBe(false)
    expect(result.current.progress).toBe(0)
  })

  it('giữ 3000ms thì mở', () => {
    const { result } = renderHook(() => useHoldToUnlock())

    act(() => result.current.bind.onPointerDown(pointer()))
    act(() => vi.advanceTimersByTime(3000))

    expect(result.current.unlocked).toBe(true)
    expect(result.current.progress).toBe(1)
  })

  it('rời giữa chừng thì hủy', () => {
    const { result } = renderHook(() => useHoldToUnlock())

    act(() => result.current.bind.onPointerDown(pointer()))
    act(() => vi.advanceTimersByTime(1500))
    act(() => result.current.bind.onPointerLeave(pointer()))
    act(() => vi.advanceTimersByTime(3000))

    expect(result.current.unlocked).toBe(false)
  })

  it('giữ phím Enter 3000ms thì mở; lặp phím không đặt lại; phím khác bị bỏ qua', () => {
    const { result } = renderHook(() => useHoldToUnlock())

    act(() => result.current.bind.onKeyDown(key('a')))
    expect(vi.getTimerCount()).toBe(0)
    act(() => result.current.bind.onKeyDown(key('Enter')))
    act(() => vi.advanceTimersByTime(2000))
    act(() => result.current.bind.onKeyDown(key('Enter', true)))
    act(() => vi.advanceTimersByTime(1000))

    expect(result.current.unlocked).toBe(true)
  })

  it('nhả phím Space sớm thì hủy', () => {
    const { result } = renderHook(() => useHoldToUnlock())

    act(() => result.current.bind.onKeyDown(key(' ')))
    act(() => vi.advanceTimersByTime(1000))
    act(() => result.current.bind.onKeyUp(key(' ')))
    act(() => vi.advanceTimersByTime(3000))

    expect(result.current.unlocked).toBe(false)
  })

  it('chuột phải hoặc chuột giữa không bắt đầu giữ', () => {
    const { result } = renderHook(() => useHoldToUnlock())

    act(() => result.current.bind.onPointerDown(pointer({ button: 2 })))
    act(() => result.current.bind.onPointerDown(pointer({ button: 1 })))
    act(() => vi.advanceTimersByTime(3000))

    expect(result.current.unlocked).toBe(false)
  })

  it('chạm hai ngón: nhấc ngón thứ hai không hủy, ngón đang giữ đủ 3 giây thì mở', () => {
    const { result } = renderHook(() => useHoldToUnlock())

    act(() => result.current.bind.onPointerDown(pointer({ pointerId: 1 })))
    act(() => result.current.bind.onPointerDown(pointer({ pointerId: 2 })))
    act(() => result.current.bind.onPointerUp(pointer({ pointerId: 2 })))
    act(() => vi.advanceTimersByTime(3000))

    expect(result.current.unlocked).toBe(true)
  })

  it('giữ phím rồi mất focus (Tab đi) thì hủy', () => {
    const { result } = renderHook(() => useHoldToUnlock())

    act(() => result.current.bind.onKeyDown(key('Enter')))
    act(() => vi.advanceTimersByTime(1000))
    act(() => result.current.bind.onBlur())
    act(() => vi.advanceTimersByTime(3000))

    expect(result.current.unlocked).toBe(false)
  })

  it('menu ngữ cảnh bị chặn; unmount khi đang giữ không lỗi và không còn timer', () => {
    const { result, unmount } = renderHook(() => useHoldToUnlock())
    const preventDefault = vi.fn()

    result.current.bind.onContextMenu({ preventDefault })
    expect(preventDefault).toHaveBeenCalled()
    act(() => result.current.bind.onPointerDown(pointer()))
    unmount()

    expect(vi.getTimerCount()).toBe(0)
    expect(() => vi.advanceTimersByTime(5000)).not.toThrow()
  })
})
