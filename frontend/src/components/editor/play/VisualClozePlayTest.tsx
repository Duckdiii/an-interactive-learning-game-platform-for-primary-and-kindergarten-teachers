import ListenPreviewButton from '../forms/ListenPreviewButton'
import VisualClozePlayable from '../../../player/renderers/VisualClozePlayable'
import { PROFILES } from '../../../player/profile/profiles'
import type { StudentQuestionByType } from '../../../types/game-student.types'
import { toPreviewStudentQuestion } from '../preview/previewModel'
import { usePreviewGrader } from '../preview/usePreviewGrader'
import type { PlayTestProps } from './playTestRegistry'

export default function VisualClozePlayTest({ question, onResult }: PlayTestProps) {
  const grade = usePreviewGrader('VISUAL_CLOZE', question, 0)
  return <>
    {question.audioUrl ? <audio aria-label="Giọng đọc câu hỏi" controls src={question.audioUrl} />
      : <ListenPreviewButton id="visual-cloze-playtest-audio" text={question.audioText} />}
    <VisualClozePlayable
      question={toPreviewStudentQuestion('VISUAL_CLOZE', question) as StudentQuestionByType['VISUAL_CLOZE']}
      profile={PROFILES.be}
      onSubmit={async (answer) => {
        const result = grade(answer)
        if (!result.retryable) onResult(result.isCorrect)
        return result
      }}
    />
  </>
}
