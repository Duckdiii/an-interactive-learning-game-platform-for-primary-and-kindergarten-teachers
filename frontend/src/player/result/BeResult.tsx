import { viText } from '../../constants/viText'
import PlayButton from '../components/PlayButton'
import { useUiProfile } from '../profile/useUiProfile'
import Mascot from '../theme/Mascot'
import { useTheme } from '../theme/useTheme'
import ParentGate from './ParentGate'
import { beHeadline, buildParentMessage, starCount } from './resultText'
import { ConfettiEffect } from '../../games/common/ConfettiEffect'
import type { ResultProps } from './types'

const STARS = 5

// Be-Result (máy tính bảng, cột giữa) và Be-Phone-Result (điện thoại ngang, hai cột) là một component: chỉ khác bố cục bằng CSS.
// Không điểm, không số câu sai.
export default function BeResult({ info, correctCount, total, onReplay }: ResultProps) {
  const { tokens } = useUiProfile()
  const { progress: icons } = useTheme()
  const stars = starCount(correctCount, total)
  const message = buildParentMessage({ correct: correctCount, total, topic: info.metadata.topic, subject: info.metadata.subject })

  return (
    <main data-band="be" className="grid min-h-screen place-items-center bg-play-page play-safe-x play-safe-y [--play-pad-y:1.5rem] text-center [@media(max-height:500px)]:[--play-pad-y:0.75rem] text-play-ink">
      <ConfettiEffect active={correctCount > 0} />
      <div className="flex w-full max-w-2xl flex-col items-center gap-5 [@media(max-height:500px)]:max-w-4xl [@media(max-height:500px)]:flex-row [@media(max-height:500px)]:gap-8 [@media(max-height:500px)]:text-left">
        {tokens.decoration ? (
          <div className="text-6xl [@media(max-height:500px)]:shrink-0">
            <Mascot state="celebrate" />
          </div>
        ) : null}
        <div className="flex w-full flex-col items-center gap-4 [@media(max-height:500px)]:items-start [@media(max-height:500px)]:gap-3">
          <h1 className="text-3xl font-bold">{beHeadline(correctCount, total)}</h1>
          <p role="img" aria-label={viText.player.result.starsLabel(stars)} className="flex gap-1 text-5xl text-play-accent [@media(max-height:500px)]:text-4xl">
            {Array.from({ length: STARS }, (_, index) => (
              <span key={index} aria-hidden="true">
                {index < stars ? icons.filled : icons.empty}
              </span>
            ))}
          </p>
          <PlayButton className="min-h-[calc(var(--play-min-touch)*1.5)] w-full max-w-md text-2xl [@media(max-height:500px)]:min-h-[var(--play-min-touch)]" onClick={onReplay}>
            {viText.player.replay}
          </PlayButton>
          <ParentGate message={message} />
        </div>
      </div>
    </main>
  )
}
