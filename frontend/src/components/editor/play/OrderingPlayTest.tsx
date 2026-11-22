import { useUiProfile } from '../../../player/profile/useUiProfile'
import OrderingPlayable from '../../../player/renderers/OrderingPlayable'
import type { StudentOrderingQuestion } from '../../../types/game-student.types'
import { gradePreviewAnswer, toPreviewStudentQuestion } from '../preview/previewModel'
import type { PlayTestProps } from './playTestRegistry'

export default function OrderingPlayTest({ question, onResult }: PlayTestProps) {
  const profile = useUiProfile()
  const studentQ = toPreviewStudentQuestion('ORDERING', question) as StudentOrderingQuestion

  return (
    <OrderingPlayable
      question={studentQ}
      profile={profile}
      onSubmit={async (answer) => {
        const graded = gradePreviewAnswer('ORDERING', question, answer)
        onResult(graded.isCorrect)
        return graded
      }}
    />
  )
}
