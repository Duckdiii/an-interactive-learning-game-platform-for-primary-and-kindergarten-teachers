import MatchingRenderer from '../../games/matching/MatchingRenderer'
import type { MatchingCorrectAnswer } from '../../games/matching/matchingTypes'
import { interactionRules } from '../policies/interaction'
import type { PlayableRendererProps } from './types'

/** Adapter: đưa `MatchingRenderer` (mode play, nộp một lần sau «Xong rồi!») về hợp đồng chung. Id trong `matches` là mã mờ của dạng học sinh. */
export default function MatchingPlayable({ question, profile, onSubmit }: PlayableRendererProps<'MATCHING'>) {
  return (
    <MatchingRenderer
      mode="play"
      question={question}
      submitOnComplete={interactionRules(profile).autoSubmitWhenComplete}
      onAnswered={async (matches) => {
        const result = await onSubmit({ matches })

        return { isCorrect: result.isCorrect, correctAnswer: (result.correctAnswer ?? undefined) as MatchingCorrectAnswer | undefined }
      }}
    />
  )
}
