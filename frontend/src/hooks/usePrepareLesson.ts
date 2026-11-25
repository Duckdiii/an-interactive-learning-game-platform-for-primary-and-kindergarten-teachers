import { useCallback, useEffect, useRef, useState } from 'react'
import { postPrepareLesson } from '../api/lessonPreparationApi'
import type { PrepareLessonInput, PreparedLesson } from '../api/lessonPreparationApi'

type PrepareState =
  | { status: 'idle' | 'pending'; lesson: null; error: null }
  | { status: 'success'; lesson: PreparedLesson; error: null }
  | { status: 'error'; lesson: null; error: unknown }

const idle: PrepareState = { status: 'idle', lesson: null, error: null }

/** Keeps only the newest parse result and cancels work when the teacher edits or leaves the form. */
export function usePrepareLesson() {
  const [state, setState] = useState<PrepareState>(idle)
  const sequence = useRef(0)
  const controller = useRef<AbortController | null>(null)

  useEffect(() => () => {
    sequence.current += 1
    controller.current?.abort()
  }, [])

  const prepare = useCallback(async (input: PrepareLessonInput) => {
    controller.current?.abort()
    const current = ++sequence.current
    const next = new AbortController()
    controller.current = next
    setState({ status: 'pending', lesson: null, error: null })
    try {
      const lesson = await postPrepareLesson(input, next.signal)
      if (current !== sequence.current) return null
      setState({ status: 'success', lesson, error: null })
      return lesson
    } catch (error) {
      if (current !== sequence.current || next.signal.aborted) return null
      setState({ status: 'error', lesson: null, error })
      return null
    } finally {
      if (current === sequence.current) controller.current = null
    }
  }, [])

  const reset = useCallback(() => {
    sequence.current += 1
    controller.current?.abort()
    controller.current = null
    setState(idle)
  }, [])

  return { ...state, prepare, reset }
}
