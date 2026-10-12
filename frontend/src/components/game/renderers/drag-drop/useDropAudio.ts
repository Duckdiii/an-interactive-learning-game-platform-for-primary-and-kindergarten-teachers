import { useEffect, useRef, useState } from 'react'
import { Howl } from 'howler'

export default function useDropAudio(enabled: boolean, prompt: string, promptAudioUrl?: string) {
  const sounds = useRef<{ correct: Howl; retry: Howl; prompt?: Howl } | null>(null)
  const utterance = useRef<SpeechSynthesisUtterance | null>(null)
  const [audioFailed, setAudioFailed] = useState(false)
  useEffect(() => {
    let disposed = false
    const options = { volume: 0.35, onloaderror: () => { if (!disposed) setAudioFailed(true) } }
    const audio = {
      correct: new Howl({ ...options, src: ['/sounds/correct-drop.wav'] }),
      retry: new Howl({ ...options, src: ['/sounds/try-again.wav'] }),
      prompt: promptAudioUrl ? new Howl({ ...options, src: [promptAudioUrl], volume: 0.7 }) : undefined,
    }
    sounds.current = audio
    return () => {
      disposed = true
      Object.values(audio).forEach((sound) => sound?.unload())
      sounds.current = null
      if (utterance.current) window.speechSynthesis?.cancel()
    }
  }, [promptAudioUrl])

  const play = (kind: 'correct' | 'retry') => {
    if (enabled) sounds.current?.[kind].play()
  }
  const replayPrompt = () => {
    if (sounds.current?.prompt) {
      sounds.current.prompt.stop()
      sounds.current.prompt.play()
    } else if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const speech = new SpeechSynthesisUtterance(prompt)
      speech.lang = 'vi-VN'
      speech.rate = 0.85
      utterance.current = speech
      window.speechSynthesis.speak(speech)
    }
  }
  return { play, replayPrompt, audioFailed, canReplay: Boolean(promptAudioUrl) || 'speechSynthesis' in window }
}
