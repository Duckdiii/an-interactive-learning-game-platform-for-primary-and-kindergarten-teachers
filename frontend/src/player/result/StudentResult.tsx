import { viText } from '../../constants/viText'
import PlayButton from '../components/PlayButton'
import { feedbackRules } from '../policies/feedback'
import { useUiProfile } from '../profile/useUiProfile'
import { ConfettiEffect } from '../../games/common/ConfettiEffect'
import type { ResultProps } from './types'

const STREAK_MIN = 2

// Hs-Result: biệt danh, số câu đúng, điểm (nếu profile có điểm), chuỗi dài nhất.
export default function StudentResult({ nickname, correctCount, total, score, bestStreak, onReplay, onReview }: ResultProps) {
  const { feedback } = useUiProfile()

  return (
    <main data-band="hocSinh" className="grid min-h-screen place-items-start bg-play-page play-safe-x play-safe-y text-center text-play-ink md:place-items-center">
      <ConfettiEffect active={correctCount > 0} />
      <section className="flex w-full min-w-0 flex-col items-center gap-3 md:max-w-md md:rounded-2xl md:border md:border-play-outline md:bg-play-surface md:p-8">
        <p className="text-play-ink-soft">{nickname}</p>
        <h1 className="text-3xl font-bold">{viText.player.finishedTitle}</h1>
        <p className="text-xl">{viText.player.correctCount(correctCount, total)}</p>
        {feedbackRules(feedback).showScore ? <p className="text-xl font-bold">{viText.player.score(score)}</p> : null}
        {bestStreak >= STREAK_MIN ? <p className="text-play-ink-soft">{viText.player.result.bestStreak(bestStreak)}</p> : null}
        {onReview ? (
          <PlayButton className="mt-3 w-full" onClick={onReview}>
            {viText.player.review.open}
          </PlayButton>
        ) : null}
        <PlayButton className="w-full" onClick={onReplay}>
          {viText.player.replay}
        </PlayButton>
      </section>
    </main>
  )
}
