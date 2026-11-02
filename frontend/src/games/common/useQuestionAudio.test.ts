import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useQuestionAudio } from './useQuestionAudio'

const calls: string[] = []
const howlCtorMock = vi.fn()
const howlUnloadMock = vi.fn()
vi.mock('howler', () => ({
  Howl: class {
    constructor(options: unknown) {
      howlCtorMock(options)
    }
    stop = () => {
      calls.push('stop')
    }
    play = () => {
      calls.push('play')
    }
    unload = howlUnloadMock
  },
}))

describe('useQuestionAudio', () => {
  beforeEach(() => {
    calls.length = 0
    howlCtorMock.mockClear()
    howlUnloadMock.mockClear()
  })

  it('tạo Howl một lần theo audioUrl; play() dừng rồi phát lại từ đầu', () => {
    const { result } = renderHook(() => useQuestionAudio('/mock/q1.wav'))

    result.current()
    result.current()

    expect(howlCtorMock).toHaveBeenCalledTimes(1)
    expect(howlCtorMock).toHaveBeenCalledWith({ src: ['/mock/q1.wav'] })
    expect(calls).toEqual(['stop', 'play', 'stop', 'play'])
  })

  it('không có audioUrl thì không tạo Howl và play() không làm gì', () => {
    const { result } = renderHook(() => useQuestionAudio(undefined))

    result.current()

    expect(howlCtorMock).not.toHaveBeenCalled()
    expect(calls).toEqual([])
  })

  it('đổi audioUrl thì unload âm cũ và tạo âm mới', () => {
    const { rerender } = renderHook(({ url }) => useQuestionAudio(url), {
      initialProps: { url: '/mock/a.wav' },
    })

    rerender({ url: '/mock/b.wav' })

    expect(howlUnloadMock).toHaveBeenCalledTimes(1)
    expect(howlCtorMock).toHaveBeenCalledTimes(2)
    expect(howlCtorMock).toHaveBeenLastCalledWith({ src: ['/mock/b.wav'] })
  })

  it('đóng component thì unload', () => {
    const { unmount } = renderHook(() => useQuestionAudio('/mock/q1.wav'))

    unmount()

    expect(howlUnloadMock).toHaveBeenCalledTimes(1)
  })
})
