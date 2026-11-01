import { viText } from '../../constants/viText'
import QuizRenderer from '../../games/quiz/QuizRenderer'
import type { PlayableRendererProps } from './types'

/** Cùng dạng "chọn một ô chữ" với QUIZ nên dùng lại `QuizRenderer` (bố cục, phản hồi, phím số), chỉ đổi tên trường theo contract. */
export default function OddOneOutPlayable({ question, onSubmit }: PlayableRendererProps<'ODD_ONE_OUT'>) {
  const { items, ...rest } = question

  return (
    <QuizRenderer
      mode="play"
      question={{ ...rest, questionText: viText.player.oddOneOutPrompt, options: items }}
      onAnswered={async (selectedItemId) => {
        const result = await onSubmit({ selectedItemId })
        const correctId = result.correctAnswer?.selectedItemId

        return { isCorrect: result.isCorrect, correctAnswer: typeof correctId === 'string' ? { selectedOptionId: correctId } : undefined }
      }}
    />
  )
}
