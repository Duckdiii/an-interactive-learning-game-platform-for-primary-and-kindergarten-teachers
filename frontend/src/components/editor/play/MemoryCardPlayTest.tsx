import { useUiProfile } from '../../../player/profile/useUiProfile'
import MemoryCardPlayable from '../../../player/renderers/MemoryCardPlayable'
import type { MemoryCardQuestion } from '../../../types/game-dsl.types'
import type { PlayTestProps } from './playTestRegistry'

export default function MemoryCardPlayTest({ question, onResult }: PlayTestProps) {
  const profile = useUiProfile()
  const mem = question as MemoryCardQuestion

  return (
    <MemoryCardPlayable
      question={mem}
      profile={profile}
      onSubmit={async ({ matchedPairIds }) => {
        const isCorrect = matchedPairIds.length === mem.pairs.length
        onResult(isCorrect)
        return {
          status: isCorrect ? 'CORRECT' : 'INCORRECT',
          isCorrect,
          pointsEarned: isCorrect ? mem.points : 0,
          totalScore: isCorrect ? mem.points : 0,
          correctAnswer: null,
        }
      }}
    />
  )
}
