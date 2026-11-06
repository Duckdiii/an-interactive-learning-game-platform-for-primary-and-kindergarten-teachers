import QuizRenderer from '../../../games/quiz/QuizRenderer'
import type { VisualClozeQuestion } from '../../../types/game-dsl.types'
import type { PlayTestProps } from './playTestRegistry'

export default function VisualClozePlayTest({ question, onResult }: PlayTestProps) {
  const cloze = question as VisualClozeQuestion

  return (
    <QuizRenderer
      mode="preview"
      question={{
        ...cloze,
        questionText: cloze.sentenceTemplate,
        options: [cloze.correctAnswer, ...cloze.distractors].map((opt) => ({ id: opt, text: opt })),
        correctOptionId: cloze.correctAnswer,
      }}
      onAnswered={(optionId) => onResult(optionId === cloze.correctAnswer)}
    />
  )
}
