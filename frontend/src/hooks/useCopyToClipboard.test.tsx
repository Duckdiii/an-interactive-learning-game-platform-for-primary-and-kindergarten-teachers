import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useCopyToClipboard } from './useCopyToClipboard'

describe('useCopyToClipboard', () => {
  const writeText = vi.fn()

  beforeEach(() => {
    vi.useFakeTimers()
    writeText.mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('sao chép giá trị, ghi nhận giá trị vừa chép rồi tự xóa sau 2 giây', async () => {
    const { result } = renderHook(() => useCopyToClipboard())

    let ok = false
    await act(async () => {
      ok = await result.current.copy('A3F9K2')
    })

    expect(ok).toBe(true)
    expect(writeText).toHaveBeenCalledWith('A3F9K2')
    expect(result.current.copiedValue).toBe('A3F9K2')

    act(() => {
      vi.advanceTimersByTime(1999)
    })
    expect(result.current.copiedValue).toBe('A3F9K2')

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(result.current.copiedValue).toBeNull()
  })

  it('trình duyệt từ chối thì trả false và không ghi nhận đã chép', async () => {
    writeText.mockRejectedValue(new Error('NotAllowedError'))
    const { result } = renderHook(() => useCopyToClipboard())

    let ok = true
    await act(async () => {
      ok = await result.current.copy('A3F9K2')
    })

    expect(ok).toBe(false)
    expect(result.current.copiedValue).toBeNull()
  })

  it('chép lần hai thì tính lại mốc 2 giây', async () => {
    const { result } = renderHook(() => useCopyToClipboard())

    await act(async () => {
      await result.current.copy('AAAAAA')
    })
    act(() => {
      vi.advanceTimersByTime(1500)
    })
    await act(async () => {
      await result.current.copy('BBBBBB')
    })
    act(() => {
      vi.advanceTimersByTime(1500)
    })

    expect(result.current.copiedValue).toBe('BBBBBB')
  })
})
