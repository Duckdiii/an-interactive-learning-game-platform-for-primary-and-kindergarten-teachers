import { useCallback, useEffect, useRef, useState } from 'react'
import { postGenerateNarrationFeedback } from '../../api/gamesApi'

export interface PlayTestQuestionNarration {
  gameId: string
  audioText: string
  audioUrl: string
}

export interface PlayTestNarrationQuestion {
  id: string
  audioText?: string
}

interface UsePlayTestNarrationAudioOptions {
  enabled: boolean
  gameId?: string
  questionKey: string
  question?: PlayTestNarrationQuestion
  narration?: PlayTestQuestionNarration
  answered: boolean
  isCorrect: boolean | null
}

const FEEDBACK_LOAD_ERROR = 'Không tải được giọng đọc phản hồi. Kết quả vẫn hiển thị bằng chữ.'
const PLAYBACK_ERROR = 'Không phát được lời đọc. Trò chơi vẫn dùng được; bạn có thể chọn nghe lại.'

export function usePlayTestNarrationAudio({ enabled, gameId, questionKey, question, narration, answered,
  isCorrect }: UsePlayTestNarrationAudioOptions) {
  const [feedbackUrls, setFeedbackUrls] = useState<{ correctAudioUrl: string; wrongAudioUrl: string }>()
  const [feedbackLoading, setFeedbackLoading] = useState(false)
  const [feedbackError, setFeedbackError] = useState<string>()
  const [playbackError, setPlaybackError] = useState<string>()
  const [retryVersion, setRetryVersion] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const requestRef = useRef<{ key: string; promise: ReturnType<typeof postGenerateNarrationFeedback> } | null>(null)

  const stopCurrentAudio = useCallback(() => {
    const audio = audioRef.current
    audioRef.current = null
    if (!audio) return
    audio.onended = null
    audio.onerror = null
    audio.pause()
    audio.currentTime = 0
  }, [])

  const playUrl = useCallback(async (url: string) => {
    stopCurrentAudio()
    setPlaybackError(undefined)
    const audio = new Audio(url)
    audioRef.current = audio
    audio.onended = () => {
      if (audioRef.current !== audio) return
      audioRef.current = null
    }
    audio.onerror = () => {
      if (audioRef.current !== audio) return
      audioRef.current = null
      setPlaybackError(PLAYBACK_ERROR)
    }
    try {
      await audio.play()
    } catch {
      if (audioRef.current === audio) {
        audioRef.current = null
        setPlaybackError(PLAYBACK_ERROR)
      }
    }
  }, [stopCurrentAudio])

  useEffect(() => {
    if (!enabled || !gameId) {
      setFeedbackUrls(undefined)
      setFeedbackLoading(false)
      setFeedbackError(undefined)
      return
    }

    let active = true
    const key = `${gameId}:${retryVersion}`
    let promise = requestRef.current?.key === key ? requestRef.current.promise : undefined
    if (!promise) {
      promise = postGenerateNarrationFeedback(gameId)
      requestRef.current = { key, promise }
    }
    setFeedbackLoading(true)
    setFeedbackError(undefined)
    promise.then((result) => {
      if (active) setFeedbackUrls(result)
    }).catch(() => {
      if (active) {
        setFeedbackUrls(undefined)
        setFeedbackError(FEEDBACK_LOAD_ERROR)
      }
    }).finally(() => {
      if (active) setFeedbackLoading(false)
    })

    return () => { active = false }
  }, [enabled, gameId, retryVersion])

  const questionAudioUrl = question && narration
      && narration.gameId === gameId
      && narration.audioText === question.audioText
      && Boolean(question.audioText?.trim())
    ? narration.audioUrl
    : undefined

  useEffect(() => {
    if (!enabled || answered || !questionAudioUrl) return
    void playUrl(questionAudioUrl)
    return stopCurrentAudio
  }, [enabled, questionKey, answered, questionAudioUrl, playUrl, stopCurrentAudio])

  const feedbackUrl = answered && isCorrect !== null
    ? isCorrect ? feedbackUrls?.correctAudioUrl : feedbackUrls?.wrongAudioUrl
    : undefined

  useEffect(() => {
    if (!enabled || !feedbackUrl) return
    void playUrl(feedbackUrl)
    return stopCurrentAudio
  }, [enabled, questionKey, answered, isCorrect, feedbackUrl, playUrl, stopCurrentAudio])

  useEffect(() => () => stopCurrentAudio(), [stopCurrentAudio])

  const replayQuestion = useCallback(() => {
    if (questionAudioUrl) void playUrl(questionAudioUrl)
  }, [questionAudioUrl, playUrl])

  const replayFeedback = useCallback(() => {
    if (feedbackUrl) void playUrl(feedbackUrl)
  }, [feedbackUrl, playUrl])

  const retryFeedback = useCallback(() => setRetryVersion((version) => version + 1), [])

  return {
    questionAudioAvailable: Boolean(questionAudioUrl),
    feedbackAvailable: Boolean(feedbackUrls),
    feedbackLoading,
    feedbackError,
    playbackError,
    replayQuestion,
    replayFeedback,
    retryFeedback,
  }
}
