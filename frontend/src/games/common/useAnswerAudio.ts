import { useCallback, useEffect, useRef } from 'react'
import { Howl } from 'howler'

/** One verdict channel: a quick retry replaces the previous spoken feedback. */
export function useAnswerAudio() {
  const clips = useRef<{ correct: Howl; wrong: Howl } | null>(null)
  useEffect(() => {
    const pair = {
      correct: new Howl({ src: ['/sounds/feedback/correct.mp3'], html5: true }),
      wrong: new Howl({ src: ['/sounds/feedback/try-again.mp3'], html5: true }),
    }
    clips.current = pair
    return () => {
      clips.current = null
      pair.correct.unload()
      pair.wrong.unload()
    }
  }, [])
  return useCallback((isCorrect: boolean) => {
    const pair = clips.current
    if (!pair) return
    try {
      pair.correct.stop()
      pair.wrong.stop()
      ;(isCorrect ? pair.correct : pair.wrong).play()
    } catch { /* Unavailable audio must not change a grading result. */ }
  }, [])
}
