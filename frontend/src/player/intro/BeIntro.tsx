import { viText } from '../../constants/viText'
import PlayButton from '../components/PlayButton'
import Mascot from '../theme/Mascot'
import type { IntroProps } from './types'

// Be-Intro: nhân vật chào và một nút Bắt đầu thật to. Bé luôn tự đọc đề (theo profile) nên không có công tắc.
export default function BeIntro({ info, playable, onStart }: IntroProps) {
  return (
    <main data-band="be" className="grid min-h-screen place-items-center bg-play-page play-safe-x play-safe-y [--play-pad-y:0px] text-center text-play-ink">
      <section className="flex max-w-md flex-col items-center gap-6">
        <Mascot state="greet" />
        <h1 className="text-3xl font-bold">{viText.player.intro.beGreeting(info.gameTitle)}</h1>
        {playable ? (
          <PlayButton className="min-h-[calc(var(--play-min-touch)*1.5)] w-full text-2xl" onClick={onStart}>
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
