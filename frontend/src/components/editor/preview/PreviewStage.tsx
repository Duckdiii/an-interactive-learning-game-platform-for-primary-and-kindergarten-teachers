import { useState } from 'react'
import { viText } from '../../../constants/viText'
import PlayButton from '../../../player/components/PlayButton'
import { feedbackRules } from '../../../player/policies/feedback'
import { useUiProfile } from '../../../player/profile/useUiProfile'
import type { AnyPlayableRenderer } from '../../../player/renderers'
import PlayerShell from '../../../player/shells/PlayerShell'
import type { GameType, QuestionDsl, Subject } from '../../../types/game-dsl.types'
import type { AnswerPayload, AnswerResult } from '../../../types/game-student.types'
import { toPreviewStudentQuestion } from './previewModel'
import { usePreviewGrader } from './usePreviewGrader'

interface PreviewStageProps {
  gameType: GameType
  Renderer: AnyPlayableRenderer
  question: QuestionDsl
  subject: Subject
  title: string
  index: number
  total: number
}

// Khung + renderer thật của phần chơi, nhúng vào khung thiết bị của LivePreview.
// Không chạy đồng hồ thật: khung Học sinh hiện tĩnh số giây của câu, khung Bé không có đồng hồ.
export default function PreviewStage({ gameType, Renderer, question, subject, title, index, total }: PreviewStageProps) {
  const profile = useUiProfile()
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<AnswerResult | null>(null)
  const grade = usePreviewGrader(gameType, question, attempt)

  const onSubmit = async (answer: AnswerPayload) => {
    const graded = grade(answer)

    if (!graded.retryable) setResult(graded)

    return graded
  }

  return (
    <PlayerShell
      embedded
      title={title}
      progress={{ current: index + 1, total }}
      remainingSeconds={profile.interaction.timer ? question.timeLimitSeconds : null}
      feedback={
        result ? (
          <div className="flex flex-wrap items-center justify-center gap-4 pb-2">
            <span>{feedbackRules(profile.feedback).message(result, 0)}</span>
            <PlayButton
              type="button"
              onClick={() => {
                setResult(null)
                setAttempt((value) => value + 1)
              }}
            >
              {viText.editor.preview.replay}
            </PlayButton>
          </div>
        ) : undefined
      }
    >
      <Renderer key={attempt} question={toPreviewStudentQuestion(gameType, question)} profile={profile} subject={subject} onSubmit={onSubmit} />
    </PlayerShell>
  )
}
