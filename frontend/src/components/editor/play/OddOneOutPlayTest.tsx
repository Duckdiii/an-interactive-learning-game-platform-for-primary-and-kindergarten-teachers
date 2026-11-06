import { viText } from '../../../constants/viText'
import QuizRenderer from '../../../games/quiz/QuizRenderer'
import type { OddOneOutQuestion } from '../../../types/game-dsl.types'
import type { PlayTestProps } from './playTestRegistry'

export default function OddOneOutPlayTest({ question, onResult }: PlayTestProps) {
  const odd = question as OddOneOutQuestion

  return (
    <QuizRenderer
      mode="preview"
      question={{
        ...odd,
        questionText: viText.player.oddOneOutPrompt,
        options: odd.items,
        correctOptionId: odd.oddOneOutId,
      }}
      onAnswered={(optionId) => onResult(optionId === odd.oddOneOutId)}
    />
  )
}
