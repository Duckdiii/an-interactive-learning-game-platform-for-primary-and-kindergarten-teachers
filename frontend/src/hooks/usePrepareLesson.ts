import { useMutation } from '@tanstack/react-query'
import { postPrepareLesson } from '../api/lessonPreparationApi'
import type { PrepareLessonInput } from '../api/lessonPreparationApi'

export function usePrepareLesson() {
  const mutation = useMutation({
    mutationFn: (input: PrepareLessonInput & { signal?: AbortSignal }) => {
      const { signal, ...lesson } = input
      return postPrepareLesson(lesson, signal)
    },
  })

  return {
    error: mutation.error,
    preparing: mutation.isPending,
    prepare: (input: PrepareLessonInput, signal?: AbortSignal) => mutation.mutateAsync({ ...input, signal }),
    reset: mutation.reset,
  }
}
