import { useCallback, useEffect, useRef } from 'react'
import { Howl } from 'howler'

/**
 * Âm thanh đọc câu hỏi (`audioUrl`) cho nút «Nghe lại». Tạo `Howl` một lần theo `audioUrl` rồi dùng lại cho
 * mọi lần bấm (nút không giới hạn số lần bấm, tạo mới mỗi lần sẽ làm bộ nhớ audio tăng dần); dọn
 * (`unload`) khi đổi câu hoặc đóng component. Nếu có `ttsText`, dùng TTS khi không có URL hoặc file phát lỗi.
 *
 * Trả về hàm `play`: `stop()` trước `play()` để trẻ bấm liên tục thì phát lại từ đầu, không chồng nhiều
 * giọng đọc lên nhau.
 */
interface QuestionAudioOptions {
  autoPlayOnMount?: boolean
  html5?: boolean
  questionId?: string
  ttsText?: string
  ttsLanguage?: string
}

export function useQuestionAudio(audioUrl: string | undefined, options: QuestionAudioOptions = {}) {
  const audioRef = useRef<Howl | null>(null)
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null)
  const failedAudioRef = useRef(false)
  const audioAttemptedRef = useRef(false)
  const autoPlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { autoPlayOnMount = false, html5 = false, questionId, ttsText, ttsLanguage = 'vi-VN' } = options

  const playSpeech = useCallback(() => {
    if (!ttsText?.trim() || typeof globalThis.speechSynthesis === 'undefined' || typeof SpeechSynthesisUtterance === 'undefined') return
    try {
      if (speechRef.current) globalThis.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(ttsText)
      utterance.lang = ttsLanguage
      utterance.onend = utterance.onerror = () => {
        if (speechRef.current === utterance) speechRef.current = null
      }
      speechRef.current = utterance
      globalThis.speechSynthesis.speak(utterance)
    } catch {
      speechRef.current = null
    }
  }, [ttsText, ttsLanguage])

  useEffect(() => {
    if (!audioUrl && !ttsText?.trim()) return
    let active = true
    failedAudioRef.current = false
    audioAttemptedRef.current = false
    const onLoadError = () => {
      if (!active || failedAudioRef.current) return
      failedAudioRef.current = true
      if (audioAttemptedRef.current) playSpeech()
    }
    // A play error can be a temporary autoplay restriction. Keep the file available
    // so the next user gesture can try it again.
    const onPlayError = () => {
      if (active && !failedAudioRef.current && audioAttemptedRef.current) playSpeech()
    }
    const howl = audioUrl ? new Howl({ src: [audioUrl], ...(html5 ? { html5: true } : {}),
      ...(ttsText?.trim() ? { onloaderror: onLoadError, onplayerror: onPlayError } : {}) }) : null
    audioRef.current = howl
    if (autoPlayOnMount) {
      autoPlayTimerRef.current = setTimeout(() => {
        autoPlayTimerRef.current = null
        if (howl && !failedAudioRef.current) { audioAttemptedRef.current = true; howl.play() }
        else playSpeech()
      }, 300)
    }
    return () => {
      active = false
      if (autoPlayTimerRef.current !== null) {
        clearTimeout(autoPlayTimerRef.current)
        autoPlayTimerRef.current = null
      }
      howl?.unload()
      audioRef.current = null
      if (speechRef.current && typeof globalThis.speechSynthesis !== 'undefined') {
        speechRef.current = null
        globalThis.speechSynthesis.cancel()
      }
    }
  }, [audioUrl, autoPlayOnMount, html5, questionId, ttsText, playSpeech])

  return () => {
    if (autoPlayTimerRef.current !== null) {
      clearTimeout(autoPlayTimerRef.current)
      autoPlayTimerRef.current = null
    }
    if (audioRef.current && !failedAudioRef.current) {
      if (speechRef.current && typeof globalThis.speechSynthesis !== 'undefined') {
        speechRef.current = null
        globalThis.speechSynthesis.cancel()
      }
      audioAttemptedRef.current = true
      audioRef.current.stop()
      audioRef.current.play()
    } else if (!audioUrl || failedAudioRef.current) {
      playSpeech()
    }
  }
}
