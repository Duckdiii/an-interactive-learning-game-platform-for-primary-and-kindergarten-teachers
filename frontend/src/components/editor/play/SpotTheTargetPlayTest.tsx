import { useUiProfile } from '../../../player/profile/useUiProfile'
import SpotTheTargetPlayable from '../../../player/renderers/SpotTheTargetPlayable'
import type { StudentSpotTheTargetQuestion } from '../../../types/game-student.types'
import { gradePreviewAnswer, toPreviewStudentQuestion } from '../preview/previewModel'
import type { PlayTestProps } from './playTestRegistry'

export default function SpotTheTargetPlayTest({ question, onResult }: PlayTestProps) {
  const profile = useUiProfile()
  const studentQ = toPreviewStudentQuestion('SPOT_THE_TARGET', question) as StudentSpotTheTargetQuestion

  return (
    <SpotTheTargetPlayable
      question={studentQ}
      profile={profile}
      onSubmit={async (answer) => {
        const graded = gradePreviewAnswer('SPOT_THE_TARGET', question, answer)
        onResult(graded.isCorrect)
        return graded
      }}
    />
  )
}
