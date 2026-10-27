import PlayButton from '../components/PlayButton'
import LoadingSpinner from '../../components/LoadingSpinner'
import { viText } from '../../constants/viText'
import { feedbackRules } from '../policies/feedback'
import { useUiProfile } from '../profile/useUiProfile'
import Mascot from '../theme/Mascot'

// Các màn quanh lượt chơi (vào, đang chuẩn bị, lỗi, xong). Bản tối thiểu của P1; màn đầy đủ theo wireframe làm ở P2.

const screen = 'grid min-h-screen place-items-center bg-play-page px-4 text-center text-play-ink'

export function PlayIntro({ title, playable, onStart }: { title: string; playable: boolean; onStart: () => void }) {
  const { tokens, band } = useUiProfile()

  return (
    <main data-band={band} className={screen}>
      <section className="flex max-w-md flex-col items-center gap-6">
        {tokens.decoration ? <Mascot state="greet" /> : null}
        <h1 className="text-3xl font-bold">{title}</h1>
        {playable ? (
          <PlayButton onClick={onStart}>
            {viText.player.startButton}
          </PlayButton>
        ) : (
          <p role="alert" className="text-lg text-play-ink-soft">
            {viText.player.unsupported}
          </p>
        )}
      </section>
    </main>
  )
}

export function PlayStarting() {
  return (
    <main className={screen}>
      <LoadingSpinner label={viText.player.starting} />
    </main>
  )
}

export function PlayStartFailed({ onRetry }: { onRetry: () => void }) {
  return (
    <main className={screen}>
      <section role="alert" className="flex max-w-md flex-col items-center gap-4">
        <h1 className="text-3xl font-bold">{viText.player.startErrorTitle}</h1>
        <p className="text-lg text-play-ink-soft">{viText.player.loadErrorDescription}</p>
        <PlayButton onClick={onRetry}>
          {viText.player.retry}
        </PlayButton>
      </section>
    </main>
  )
}

export function PlayFinished({ correctCount, total, score, onReplay }: { correctCount: number; total: number; score: number; onReplay: () => void }) {
  const { tokens, feedback } = useUiProfile()

  return (
    <main className={screen}>
      <section className="flex flex-col items-center gap-4">
        {tokens.decoration ? <Mascot state="celebrate" /> : null}
        <h1 className="text-3xl font-bold">{viText.player.finishedTitle}</h1>
        <p className="text-xl">{viText.player.correctCount(correctCount, total)}</p>
        {feedbackRules(feedback).showScore ? <p className="text-xl font-bold">{viText.player.score(score)}</p> : null}
        <PlayButton onClick={onReplay}>
          {viText.player.replay}
        </PlayButton>
      </section>
    </main>
  )
}
