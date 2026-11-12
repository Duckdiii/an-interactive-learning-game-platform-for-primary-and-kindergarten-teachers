import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('khi không có audioUrl, tự đọc audioText và nghe lại bằng TTS', () => {
    vi.useFakeTimers()
    const speech = { speak: vi.fn(), cancel: vi.fn() }
    vi.stubGlobal('speechSynthesis', speech)
    vi.stubGlobal('SpeechSynthesisUtterance', class {
      text: string
      lang = ''
      constructor(text: string) { this.text = text }
    })

    const { result, unmount } = renderHook(() => useQuestionAudio(undefined, {
      autoPlayOnMount: true, ttsText: 'Cat', ttsLanguage: 'en-US',
    }))
    act(() => vi.advanceTimersByTime(300))
    expect(speech.speak).toHaveBeenCalledTimes(1)
    expect(speech.speak.mock.calls[0][0]).toMatchObject({ text: 'Cat', lang: 'en-US' })
    act(() => result.current())
    expect(speech.cancel).toHaveBeenCalledTimes(1)
    expect(speech.speak).toHaveBeenCalledTimes(2)
    unmount()
    expect(speech.cancel).toHaveBeenCalledTimes(2)
  })

  it('ưu tiên audioUrl, không dùng TTS khi đã có file âm thanh', () => {
    vi.useFakeTimers()
    const speech = { speak: vi.fn(), cancel: vi.fn() }
    vi.stubGlobal('speechSynthesis', speech)
    const { result } = renderHook(() => useQuestionAudio('/mock/cat.wav', {
      autoPlayOnMount: true, ttsText: 'Cat', ttsLanguage: 'en-US',
    }))

    act(() => vi.advanceTimersByTime(300))
    act(() => result.current())
    expect(speech.speak).not.toHaveBeenCalled()
    expect(calls).toEqual(['play', 'stop', 'play'])
  })

  it('đọc audioText nếu file âm thanh tải lỗi, và cho nghe lại', () => {
    const speech = { speak: vi.fn(), cancel: vi.fn() }
    vi.stubGlobal('speechSynthesis', speech)
    vi.stubGlobal('SpeechSynthesisUtterance', class {
      text: string
      lang = ''
      constructor(text: string) { this.text = text }
    })
    const { result } = renderHook(() => useQuestionAudio('/broken.mp3', { ttsText: 'Cat', ttsLanguage: 'en-US' }))
    act(() => result.current())
    const options = howlCtorMock.mock.calls[0][0] as { onloaderror: () => void }
    act(() => options.onloaderror())
    expect(speech.speak).toHaveBeenCalledWith(expect.objectContaining({ text: 'Cat', lang: 'en-US' }))
    act(() => result.current())
    expect(speech.speak).toHaveBeenCalledTimes(2)
  })

  it('thử lại file khi thao tác phát trước bị trình duyệt chặn', () => {
    const speech = { speak: vi.fn(), cancel: vi.fn() }
    vi.stubGlobal('speechSynthesis', speech)
    vi.stubGlobal('SpeechSynthesisUtterance', class {
      text: string
      lang = ''
      constructor(text: string) { this.text = text }
    })
    const { result } = renderHook(() => useQuestionAudio('/cat.mp3', { ttsText: 'Cat', ttsLanguage: 'en-US' }))
    act(() => result.current())
    const options = howlCtorMock.mock.calls[0][0] as { onplayerror: () => void }
    act(() => options.onplayerror())
    expect(speech.speak).toHaveBeenCalledTimes(1)

    act(() => result.current())
    expect(calls).toEqual(['stop', 'play', 'stop', 'play'])
    expect(speech.speak).toHaveBeenCalledTimes(1)
    expect(speech.cancel).toHaveBeenCalledTimes(1)
  })

  it('chuyển câu thì ngừng TTS cũ và đọc nội dung câu mới', () => {
    vi.useFakeTimers()
    const speech = { speak: vi.fn(), cancel: vi.fn() }
    vi.stubGlobal('speechSynthesis', speech)
    vi.stubGlobal('SpeechSynthesisUtterance', class {
      text: string
      lang = ''
      constructor(text: string) { this.text = text }
    })
    const { rerender } = renderHook(({ text }) => useQuestionAudio(undefined, {
      autoPlayOnMount: true, ttsText: text, ttsLanguage: 'en-US',
    }), { initialProps: { text: 'Cat' } })

    act(() => vi.advanceTimersByTime(300))
    rerender({ text: 'Dog' })
    expect(speech.cancel).toHaveBeenCalledTimes(1)
    act(() => vi.advanceTimersByTime(300))
    expect(speech.speak).toHaveBeenLastCalledWith(expect.objectContaining({ text: 'Dog', lang: 'en-US' }))
  })

  it('không lỗi khi trình duyệt không hỗ trợ TTS', () => {
    vi.useFakeTimers()
    vi.stubGlobal('speechSynthesis', undefined)
    const { result, unmount } = renderHook(() => useQuestionAudio(undefined, { autoPlayOnMount: true, ttsText: 'Cat' }))

    expect(() => act(() => vi.advanceTimersByTime(300))).not.toThrow()
    expect(() => act(() => result.current())).not.toThrow()
    expect(() => unmount()).not.toThrow()
  })

  it('tự phát audio HTML5 một lần và vẫn nghe lại nhiều lần', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useQuestionAudio('/mock/meow.mp3', { autoPlayOnMount: true, html5: true }))

    expect(howlCtorMock).toHaveBeenCalledWith({ src: ['/mock/meow.mp3'], html5: true })
    act(() => vi.advanceTimersByTime(300))
    expect(calls).toEqual(['play'])
    act(() => result.current())
    act(() => result.current())
    expect(calls).toEqual(['play', 'stop', 'play', 'stop', 'play'])
    expect(howlCtorMock).toHaveBeenCalledTimes(1)
  })

  it('dọn hẹn giờ và unload khi rời câu trước lúc tự phát', () => {
    vi.useFakeTimers()
    const { unmount } = renderHook(() => useQuestionAudio('/mock/meow.mp3', { autoPlayOnMount: true, html5: true }))

    unmount()
    act(() => vi.advanceTimersByTime(300))
    expect(calls).toEqual([])
    expect(howlUnloadMock).toHaveBeenCalledTimes(1)
  })

  it('không tự phát thêm nếu trẻ đã bấm nghe trước khi hết hẹn giờ', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useQuestionAudio('/mock/meow.mp3', { autoPlayOnMount: true, html5: true }))

    act(() => result.current())
    act(() => vi.advanceTimersByTime(300))
    expect(calls).toEqual(['stop', 'play'])
  })

  it('đổi câu trước lúc tự phát chỉ phát audio của câu mới', () => {
    vi.useFakeTimers()
    const { rerender } = renderHook(({ url }) => useQuestionAudio(url, { autoPlayOnMount: true, html5: true }), {
      initialProps: { url: '/mock/a.mp3' },
    })

    rerender({ url: '/mock/b.mp3' })
    act(() => vi.advanceTimersByTime(300))
    expect(howlUnloadMock).toHaveBeenCalledTimes(1)
    expect(calls).toEqual(['play'])
    expect(howlCtorMock).toHaveBeenLastCalledWith({ src: ['/mock/b.mp3'], html5: true })
  })

  it('sang câu khác có cùng audioUrl vẫn tự phát lại', () => {
    vi.useFakeTimers()
    const { rerender } = renderHook(({ id }) => useQuestionAudio('/mock/a.mp3', { autoPlayOnMount: true, html5: true, questionId: id }), {
      initialProps: { id: 'q1' },
    })
    act(() => vi.advanceTimersByTime(300))
    rerender({ id: 'q2' })
    act(() => vi.advanceTimersByTime(300))
    expect(howlUnloadMock).toHaveBeenCalledTimes(1)
    expect(calls).toEqual(['play', 'play'])
  })

  it('không phát audio khi thiếu audioUrl dù bật tự phát', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useQuestionAudio(undefined, { autoPlayOnMount: true, html5: true }))

    act(() => vi.advanceTimersByTime(300))
    act(() => result.current())
    expect(howlCtorMock).not.toHaveBeenCalled()
    expect(calls).toEqual([])
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
