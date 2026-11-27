import QuizRenderer from '../../games/quiz/QuizRenderer'
import VisualClozeImageRenderer from '../../games/visual-cloze-image/VisualClozeImageRenderer'
import type { PlayableRendererProps } from './types'

/** Chọn một từ điền vào chỗ trống nên dùng lại `QuizRenderer`. Lựa chọn của contract chỉ là chuỗi không trùng nhau, nên chính chuỗi làm id. */
export default function VisualClozePlayable({ question, onSubmit }: PlayableRendererProps<'VISUAL_CLOZE'>) {
  if ('sceneImageUrl' in question) {
    return <VisualClozeImageRenderer question={question} onSubmit={onSubmit} />
  }

  const { options, sentenceTemplate, ...rest } = question

  return (
    <QuizRenderer
      mode="play"
      question={{ ...rest, questionText: sentenceTemplate, options: options.map((option) => ({ id: option, text: option })) }}
      onAnswered={async (answer) => {
        const result = await onSubmit({ answer })
        const correct = result.correctAnswer?.answer

        return { isCorrect: result.isCorrect, correctAnswer: typeof correct === 'string' ? { selectedOptionId: correct } : undefined }
      }}
    />
  )
}
