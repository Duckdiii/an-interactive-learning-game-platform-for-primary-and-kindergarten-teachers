import QuizRenderer from '../../../games/quiz/QuizRenderer'
import type { QuizQuestion } from '../../../types/game-dsl.types'
import type { PlayTestProps } from './playTestRegistry'

// Chơi thử QUIZ bằng renderer thật ở mode `preview`: renderer tự so đáp án cục bộ (giáo viên đã biết đáp án) và không gọi API.
export default function QuizPlayTest({ question, onResult }: PlayTestProps) {
  const quiz = question as QuizQuestion

  return (
    <QuizRenderer
      mode="preview"
      question={quiz}
      onAnswered={(optionId) => onResult(optionId === quiz.correctOptionId)}
    />
  )
}
