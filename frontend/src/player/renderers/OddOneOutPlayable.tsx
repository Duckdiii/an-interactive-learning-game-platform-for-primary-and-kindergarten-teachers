import { viText } from '../../constants/viText'
import QuizRenderer from '../../games/quiz/QuizRenderer'
import OddOneOutRenderer from '../../games/odd-one-out/OddOneOutRenderer'
import type { PlayableRendererProps } from './types'

/** IMAGE is an internal frontend fixture; published text games retain the QuizRenderer path. */
export default function OddOneOutPlayable({ question, onSubmit }: PlayableRendererProps<'ODD_ONE_OUT'>) {
  if (question.renderMode === 'IMAGE') return <OddOneOutRenderer question={question} onSubmit={onSubmit} />
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
