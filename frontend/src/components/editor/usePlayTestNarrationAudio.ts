import { useCallback, useEffect, useRef, useState } from 'react'
import { postGenerateNarrationFeedback, postGenerateNarrationPreview } from '../../api/gamesApi'
import type { Subject } from '../../types/game-dsl.types'
import { hasSourceAudio } from '../../utils/audioUrl'

export interface PlayTestQuestionNarration {
  gameId: string
  audioText: string
  audioUrl: string
}

export interface PlayTestNarrationQuestion {
  id: string
  audioText?: string
  audioUrl?: string
  saved?: boolean
}

interface UsePlayTestNarrationAudioOptions {
  enabled: boolean
  gameId?: string
  subject?: Subject
  questionKey: string
  question?: PlayTestNarrationQuestion
  narration?: PlayTestQuestionNarration
  answered: boolean
  isCorrect: boolean | null
}

const FEEDBACK_LOAD_ERROR = 'Không tải được giọng đọc phản hồi. Kết quả vẫn hiển thị bằng chữ.'
const PLAYBACK_ERROR = 'Không phát được lời đọc. Trò chơi vẫn dùng được; bạn có thể chọn nghe lại.'
// The correct-answer chime lasts 539 ms. Leave its tail clear of the first syllable.
const CORRECT_CHIME_MS = 550
const ENGLISH_CORRECT_SPEECH_RATE = 0.85
const QUESTION_AUDIO_START_DELAY_MS = 500

export function usePlayTestNarrationAudio({ enabled, gameId, subject = 'VIETNAMESE', questionKey, question, narration, answered,
  isCorrect }: UsePlayTestNarrationAudioOptions) {
  const [feedbackUrls, setFeedbackUrls] = useState<{ correctAudioUrl: string; wrongAudioUrl: string }>()
  const [feedbackLoading, setFeedbackLoading] = useState(false)
  const [feedbackError, setFeedbackError] = useState<string>()
  const [playbackError, setPlaybackError] = useState<string>()
  const [retryVersion, setRetryVersion] = useState(0)
  const correctSpeechRate = subject === 'ENGLISH' ? ENGLISH_CORRECT_SPEECH_RATE : 1
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
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

  const playUrl = useCallback(async (url: string, rate = 1) => {
    stopCurrentAudio()
    setPlaybackError(undefined)
    const audio = new Audio(url)
    audio.playbackRate = rate
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

  const localUrl = question && narration
      && narration.gameId === gameId
      && narration.audioText === question.audioText
      && Boolean(question.audioText?.trim())
    ? narration.audioUrl
    : undefined

  const id = question?.id
  const text = question?.audioText
  const sourceUrl = hasSourceAudio(question?.audioUrl) ? question?.audioUrl?.trim() : undefined
  const requestKey = enabled && !answered && gameId && id && text?.trim() && question?.saved && !sourceUrl && !localUrl
    ? JSON.stringify([gameId, id, text]) : undefined
  const [loaded, setLoaded] = useState<{ key: string; url?: string }>()
  useEffect(() => {
    if (!requestKey || !gameId || !id) return
    const controller = new AbortController()
    postGenerateNarrationPreview(gameId, id, controller.signal).then(({ audioUrl }) => {
      if (!controller.signal.aborted) setLoaded({ key: requestKey, url: audioUrl })
    }).catch(() => {
      if (!controller.signal.aborted) setLoaded({ key: requestKey })
    })
    return () => controller.abort()
  }, [requestKey, gameId, id])
  const questionAudioUrl = sourceUrl || localUrl || (loaded?.key === requestKey ? loaded?.url : undefined)
  const questionStatus = requestKey && !questionAudioUrl
    ? loaded?.key === requestKey ? 'Không tải được giọng đọc câu hỏi. Hãy mở lại Chơi thử để thử lại.' : 'Đang tải giọng đọc câu hỏi…'
    : undefined

  useEffect(() => {
    if (!enabled || answered || !questionAudioUrl) return
    const timeout = setTimeout(() => void playUrl(questionAudioUrl), QUESTION_AUDIO_START_DELAY_MS)
    return () => {
      clearTimeout(timeout)
      stopCurrentAudio()
    }
  }, [enabled, questionKey, answered, questionAudioUrl, playUrl, stopCurrentAudio])

  const feedbackUrl = answered && isCorrect !== null
    ? isCorrect ? feedbackUrls?.correctAudioUrl : feedbackUrls?.wrongAudioUrl
    : undefined

  useEffect(() => {
    if (!enabled || !feedbackUrl) return
    if (isCorrect) {
      feedbackTimer.current = setTimeout(() => void playUrl(feedbackUrl, correctSpeechRate), CORRECT_CHIME_MS)
    } else {
      void playUrl(feedbackUrl)
    }
    return () => {
      clearTimeout(feedbackTimer.current)
      stopCurrentAudio()
    }
  }, [enabled, questionKey, answered, isCorrect, feedbackUrl, correctSpeechRate, playUrl, stopCurrentAudio])

  useEffect(() => () => stopCurrentAudio(), [stopCurrentAudio])

  const replayQuestion = useCallback(() => {
    if (questionAudioUrl) void playUrl(questionAudioUrl)
  }, [questionAudioUrl, playUrl])

  const replayFeedback = useCallback(() => {
    clearTimeout(feedbackTimer.current)
    if (feedbackUrl) void playUrl(feedbackUrl, isCorrect ? correctSpeechRate : 1)
  }, [feedbackUrl, isCorrect, correctSpeechRate, playUrl])

  const retryFeedback = useCallback(() => setRetryVersion((version) => version + 1), [])

  return {
    playPairFeedback: (correct: boolean) => {
      if (feedbackUrls) void playUrl(correct ? feedbackUrls.correctAudioUrl : feedbackUrls.wrongAudioUrl,
        correct ? correctSpeechRate : 1)
    },
    questionStatus,
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
