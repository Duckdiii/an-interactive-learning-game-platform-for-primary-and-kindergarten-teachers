import OddOneOutPlayable from '../../../player/renderers/OddOneOutPlayable'
import { useUiProfile } from '../../../player/profile/useUiProfile'
import type { StudentOddOneOutQuestion } from '../../../types/game-student.types'
import { toPreviewStudentQuestion } from '../preview/previewModel'
import { usePreviewGrader } from '../preview/usePreviewGrader'
import type { PlayTestProps } from './playTestRegistry'

export default function OddOneOutPlayTest({ question, subject, onResult }: PlayTestProps) {
  const profile = useUiProfile()
  const grade = usePreviewGrader('ODD_ONE_OUT', question, 0)
  return <OddOneOutPlayable
    question={toPreviewStudentQuestion('ODD_ONE_OUT', question) as StudentOddOneOutQuestion}
    profile={profile} subject={subject}
    onSubmit={async (answer) => {
      const result = grade(answer)
      onResult(result.isCorrect)
      return result
    }}
  />
}
