import MatchingRenderer from '../../../games/matching/MatchingRenderer'
import { useState } from 'react'
import { useAnswerAudio } from '../../../games/common/useAnswerAudio'
import { isCorrectLocally } from '../../../games/matching/matchingView'
import type { MatchingQuestion } from '../../../types/game-dsl.types'
import type { PlayTestProps } from './playTestRegistry'

// Chơi thử MATCHING bằng renderer thật ở mode `preview`: nối tự do rồi bấm "Xong rồi!"; renderer chấm cục bộ, không gọi API.
export default function MatchingPlayTest({ question, onResult, playPairFeedback }: PlayTestProps) {
  const matching = question as MatchingQuestion
  const [verdict, setVerdict] = useState<boolean>()
  const localFeedback = useAnswerAudio()

  return (
    <>
    <p aria-live="polite" className="text-center font-semibold">
      {verdict === undefined ? '' : verdict ? 'Đúng rồi!' : 'Sai rồi!'}
    </p>
    <MatchingRenderer
      mode="preview"
      question={matching}
      onPairLinked={(correct) => {
        setVerdict(correct)
        const play = playPairFeedback ?? localFeedback
        play(correct)
      }}
      onAnswered={(links) => onResult(isCorrectLocally(links, matching.pairs.length))}
    />
    </>
  )
}
