import MatchingRenderer from '../../../games/matching/MatchingRenderer'
import { isCorrectLocally } from '../../../games/matching/matchingView'
import type { MatchingQuestion } from '../../../types/game-dsl.types'
import type { PlayTestProps } from './playTestRegistry'

// Chơi thử MATCHING bằng renderer thật ở mode `preview`: nối tự do rồi bấm "Xong rồi!"; renderer chấm cục bộ, không gọi API.
export default function MatchingPlayTest({ question, onResult }: PlayTestProps) {
  const matching = question as MatchingQuestion

  return (
    <MatchingRenderer
      mode="preview"
      question={matching}
      onAnswered={(links) => onResult(isCorrectLocally(links, matching.pairs.length))}
    />
  )
}
