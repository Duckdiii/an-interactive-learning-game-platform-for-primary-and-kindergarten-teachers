import { useUiProfile } from '../../../player/profile/useUiProfile'
import AudioVisualMatchPlayable from '../../../player/renderers/AudioVisualMatchPlayable'
import type { StudentAudioVisualMatchQuestion } from '../../../types/game-student.types'
import { gradePreviewAnswer, toPreviewStudentQuestion } from '../preview/previewModel'
import type { PlayTestProps } from './playTestRegistry'

export default function AudioVisualMatchPlayTest({ question, onResult }: PlayTestProps) {
  const profile = useUiProfile()
  const studentQ = toPreviewStudentQuestion('AUDIO_VISUAL_MATCH', question) as StudentAudioVisualMatchQuestion

  return (
    <AudioVisualMatchPlayable
      question={studentQ}
      profile={profile}
      onSubmit={async (answer) => {
        const graded = gradePreviewAnswer('AUDIO_VISUAL_MATCH', question, answer)
        onResult(graded.isCorrect)
        return graded
      }}
    />
  )
}
