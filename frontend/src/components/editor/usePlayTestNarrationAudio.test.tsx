import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { postGenerateNarrationFeedback, postGenerateNarrationPreview } from '../../api/gamesApi'
import { usePlayTestNarrationAudio } from './usePlayTestNarrationAudio'

vi.mock('../../api/gamesApi', () => ({
  postGenerateNarrationFeedback: vi.fn(),
  postGenerateNarrationPreview: vi.fn(),
}))

const getFeedback = vi.mocked(postGenerateNarrationFeedback)
const getQuestionNarration = vi.mocked(postGenerateNarrationPreview)
const audioInstances: MockAudio[] = []

class MockAudio {
  readonly src: string
  onended: (() => void) | null = null
  onerror: (() => void) | null = null
  currentTime = 0
  playbackRate = 1
  play = vi.fn(async (): Promise<void> => undefined)
  pause = vi.fn()

  constructor(src: string) {
    this.src = src
    audioInstances.push(this)
  }
}

const urls = {
  correctAudioUrl: 'https://storage.test/correct.mp3',
  wrongAudioUrl: 'https://storage.test/wrong.mp3',
}

const options: Parameters<typeof usePlayTestNarrationAudio>[0] = {
  enabled: true,
  gameId: 'game-1',
  questionKey: 'q1:0',
  question: { id: 'q1', audioText: 'Đếm ba quả táo.' },
  narration: { gameId: 'game-1', audioText: 'Đếm ba quả táo.', audioUrl: 'https://storage.test/question.mp3' },
  answered: false,
  isCorrect: null,
}

describe('usePlayTestNarrationAudio', () => {
  beforeEach(() => {
    audioInstances.length = 0
    getFeedback.mockReset()
    getQuestionNarration.mockReset()
    vi.stubGlobal('Audio', MockAudio)
  })

  afterEach(() => vi.unstubAllGlobals())

  it('autoplays only the URL whose audioText exactly matches the current question', async () => {
    getFeedback.mockResolvedValue(urls)
    const { result } = renderHook(() => usePlayTestNarrationAudio(options))

    await waitFor(() => expect(audioInstances.map((audio) => audio.src)).toContain(options.narration?.audioUrl))
    expect(result.current.questionAudioAvailable).toBe(true)
  })

  it('uses the saved TTS URL instead of a legacy Quiz mock URL', async () => {
    const savedUrl = 'https://storage.test/saved-quiz-question.mp3'
    getFeedback.mockResolvedValue(urls)
    getQuestionNarration.mockResolvedValue({
      questionId: 'q1', audioUrl: savedUrl, bytes: 1200, durationMillis: 1400,
    })

    const { result } = renderHook(() => usePlayTestNarrationAudio({
      ...options,
      question: { ...options.question!, audioUrl: '/mock/q1.wav', saved: true },
      narration: undefined,
    }))

    await waitFor(() => expect(getQuestionNarration).toHaveBeenCalledWith('game-1', 'q1', expect.anything()))
    await waitFor(() => expect(audioInstances.map((audio) => audio.src)).toContain(savedUrl))
    expect(audioInstances.map((audio) => audio.src)).not.toContain('/mock/q1.wav')
    expect(result.current.questionAudioAvailable).toBe(true)
  })

  it('rejects a stale narration snapshot after the question text changes', () => {
    const { result } = renderHook(() => usePlayTestNarrationAudio({
      ...options,
      gameId: undefined,
      question: { id: 'q1', audioText: 'Nội dung đã đổi.' },
    }))

    expect(result.current.questionAudioAvailable).toBe(false)
    expect(audioInstances).toHaveLength(0)
  })

  it('stops the previous clip and chooses correct or wrong feedback from the existing result', async () => {
    getFeedback.mockResolvedValue(urls)
    const { result, rerender } = renderHook((props) => usePlayTestNarrationAudio(props), { initialProps: options })
    await waitFor(() => expect(audioInstances).toHaveLength(1))

    rerender({ ...options, answered: true, isCorrect: false })
    await waitFor(() => expect(audioInstances.at(-1)?.src).toBe(urls.wrongAudioUrl))
    expect(audioInstances[0].pause).toHaveBeenCalled()

    act(() => result.current.replayFeedback())
    await waitFor(() => expect(audioInstances.at(-1)?.src).toBe(urls.wrongAudioUrl))
    expect(audioInstances.at(-2)?.pause).toHaveBeenCalled()

    rerender({ ...options, answered: true, isCorrect: true })
    await waitFor(() => expect(audioInstances.at(-1)?.src).toBe(urls.correctAudioUrl))
    expect(audioInstances.at(-2)?.pause).toHaveBeenCalled()
  })

  it('keeps English TTS feedback at its previous normal playback speed', async () => {
    getFeedback.mockResolvedValue(urls)
    const englishOptions = { ...options, subject: 'ENGLISH' as const }
    const { rerender } = renderHook((props) => usePlayTestNarrationAudio(props), { initialProps: englishOptions })
    await waitFor(() => expect(getFeedback).toHaveBeenCalledTimes(1))

    rerender({ ...englishOptions, answered: true, isCorrect: true })

    await waitFor(() => expect(audioInstances.at(-1)?.src).toBe(urls.correctAudioUrl))
    expect(audioInstances.at(-1)?.playbackRate).toBe(0.85)
  })

  it('loads feedback audio once for a PlayTest entry and reuses the URLs across questions', async () => {
    getFeedback.mockResolvedValue(urls)
    const { rerender } = renderHook((props) => usePlayTestNarrationAudio(props), { initialProps: options })
    await waitFor(() => expect(getFeedback).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(audioInstances).toHaveLength(1))

    rerender({ ...options, questionKey: 'q2:0', question: { id: 'q2', audioText: 'Question two.' }, narration: undefined })

    expect(getFeedback).toHaveBeenCalledTimes(1)
    expect(audioInstances[0].pause).toHaveBeenCalled()
  })

  it('exposes a recoverable error and retries the feedback URL request', async () => {
    getFeedback.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(urls)
    const { result } = renderHook(() => usePlayTestNarrationAudio(options))

    await waitFor(() => expect(result.current.feedbackError).toBeTruthy())
    await act(async () => result.current.retryFeedback())

    await waitFor(() => expect(result.current.feedbackAvailable).toBe(true))
    expect(getFeedback).toHaveBeenCalledTimes(2)
  })

  it('reports browser playback failure while leaving replay available', async () => {
    getFeedback.mockResolvedValue(urls)
    const failingAudio = class extends MockAudio {
      play = vi.fn(async () => { throw new Error('autoplay blocked') })
    }
    vi.stubGlobal('Audio', failingAudio)
    const { result } = renderHook(() => usePlayTestNarrationAudio(options))

    await waitFor(() => expect(result.current.playbackError).toBeTruthy())
    expect(result.current.questionAudioAvailable).toBe(true)
    expect(result.current.replayQuestion).toBeTypeOf('function')
  })

  it('ignores a rejected play promise from a clip stopped after question change', async () => {
    let rejectPlayback: ((reason?: unknown) => void) | undefined
    class DeferredAudio extends MockAudio {
      play = vi.fn(() => new Promise<void>((_resolve, reject) => { rejectPlayback = reject }))
    }
    getFeedback.mockResolvedValue(urls)
    vi.stubGlobal('Audio', DeferredAudio)

    const { result, rerender } = renderHook((props) => usePlayTestNarrationAudio(props), { initialProps: options })
    await waitFor(() => expect(audioInstances).toHaveLength(1))
    const previousAudio = audioInstances[0]

    rerender({ ...options, questionKey: 'q2:0', question: { id: 'q2', audioText: 'New question.' }, narration: undefined })
    await waitFor(() => expect(previousAudio.pause).toHaveBeenCalled())
    await act(async () => { rejectPlayback?.(new Error('interrupted after stop')) })

    expect(result.current.playbackError).toBeUndefined()
  })
})
