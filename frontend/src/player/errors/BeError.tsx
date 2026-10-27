import { viText } from '../../constants/viText'
import PlayButton from '../components/PlayButton'
import type { ErrorScreenProps } from './types'
import { useFocusTitle } from './useFocusTitle'

const text = viText.player.errors

// Be-Error: không nhân vật (theme có thể chưa tải), lời dịu dàng nhờ người lớn; chi tiết kỹ thuật chỉ ở dòng nhỏ cuối.
export default function BeError({ kind, code, onRetry, busy = false }: ErrorScreenProps) {
  const titleRef = useFocusTitle()

  return (
    <main data-band="be" className="grid min-h-screen place-items-center bg-play-page play-safe-x play-safe-y [--play-pad-y:0px] text-center text-play-ink">
      <section role="alert" className="flex max-w-md flex-col items-center gap-4">
        <h1 ref={titleRef} tabIndex={-1} className="text-3xl font-bold outline-none">
          {text.beTitle}
        </h1>
        <p className="text-xl text-play-ink-soft">{text.beHint}</p>
        {onRetry ? (
          <PlayButton className="min-h-[calc(var(--play-min-touch)*1.5)] w-full text-2xl" onClick={onRetry} disabled={busy} aria-busy={busy}>
            {viText.player.retry}
          </PlayButton>
        ) : null}
        <p className="mt-4 text-sm text-play-ink-soft">{text.adultNote(viText.player.publishError[kind].title, code)}</p>
      </section>
    </main>
  )
}
