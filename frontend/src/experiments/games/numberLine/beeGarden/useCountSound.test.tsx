import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { AudioService } from '../../../audio/audioService'
import { useCountSound } from './useCountSound'

const fakeAudio = () => ({ unlock: vi.fn(async () => true), play: vi.fn(() => true) })

describe('useCountSound', () => {
  it('phát nốt đếm theo vạch và thang: thang 11 vạch dùng nốt cùng số thứ tự', () => {
    const audio = fakeAudio()
    const { result } = renderHook(() => useCountSound(audio as unknown as AudioService))
    result.current.play(0, 11)
    result.current.play(7, 11)
    expect(audio.play.mock.calls).toEqual([['count0'], ['count7']])
  })

  it('thang dài (21 vạch) dàn đều lên 11 nốt: vạch cuối là nốt cao nhất', () => {
    const audio = fakeAudio()
    const { result } = renderHook(() => useCountSound(audio as unknown as AudioService))
    result.current.play(20, 21)
    expect(audio.play).toHaveBeenCalledWith('count10')
  })

  it('unlock gọi mở khóa âm thanh của dịch vụ', () => {
    const audio = fakeAudio()
    const { result } = renderHook(() => useCountSound(audio as unknown as AudioService))
    result.current.unlock()
    expect(audio.unlock).toHaveBeenCalledTimes(1)
  })

  it('truyền null thì tắt hẳn âm: không ném lỗi', () => {
    const { result } = renderHook(() => useCountSound(null))
    expect(() => {
      result.current.unlock()
      result.current.play(3, 11)
    }).not.toThrow()
  })

  it('đối tượng trả về ổn định giữa các lần vẽ khi cùng dịch vụ (không tạo lại mỗi lần)', () => {
    const audio = fakeAudio()
    const { result, rerender } = renderHook(() => useCountSound(audio as unknown as AudioService))
    const first = result.current
    rerender()
    expect(result.current).toBe(first)
  })
})
