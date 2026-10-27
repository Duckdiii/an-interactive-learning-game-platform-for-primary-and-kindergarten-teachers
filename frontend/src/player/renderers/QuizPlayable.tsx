import QuizRenderer from '../../games/quiz/QuizRenderer'
import type { QuizCorrectAnswer } from '../../games/quiz/QuizRenderer'
import type { PlayableRendererProps } from './types'

/** Adapter: đưa `QuizRenderer` (mode play, trả đúng/sai) về hợp đồng chung `onSubmit(answer) → AnswerResult`. */
export default function QuizPlayable({ question, onSubmit }: PlayableRendererProps<'QUIZ'>) {
  return (
    <QuizRenderer
      mode="play"
      question={question}
      onAnswered={async (selectedOptionId) => {
        const result = await onSubmit({ selectedOptionId })

        return { isCorrect: result.isCorrect, correctAnswer: (result.correctAnswer ?? undefined) as QuizCorrectAnswer | undefined }
      }}
    />
  )
}
