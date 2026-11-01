import { Link } from 'react-router-dom'
import { viText } from '../../constants/viText'
import { ROUTES } from '../../routes/paths'
import PlayButton from '../components/PlayButton'
import type { ErrorScreenProps } from './types'
import { useFocusTitle } from './useFocusTitle'

const text = viText.player.errors

export default function StudentError({ kind, code, onRetry, busy = false }: ErrorScreenProps) {
  const { title, description } = viText.player.publishError[kind]
  const titleRef = useFocusTitle()

  return (
    <main data-band="hocSinh" className="grid min-h-screen place-items-center bg-play-page play-safe-x play-safe-y [--play-pad-y:0px] text-play-ink">
      <section role="alert" className="flex w-full max-w-md flex-col gap-4">
        <h1 ref={titleRef} tabIndex={-1} className="text-3xl font-bold outline-none">
          {title}
        </h1>
        <p className="text-lg text-play-ink-soft">{description}</p>
        <div>
          <p className="font-bold">{text.tryChecking}</p>
          <ul className="mt-1 list-disc pl-6 text-play-ink-soft">
            {text.checks.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
        <p className="text-play-ink-soft">{text.progressKept}</p>
        <div className="flex flex-wrap gap-3">
          {onRetry ? <PlayButton onClick={onRetry} disabled={busy} aria-busy={busy}>{viText.player.retry}</PlayButton> : null}
          <Link
            to={ROUTES.join}
            className="inline-flex min-h-[var(--play-min-touch)] items-center justify-center rounded-xl border-2 border-play-outline px-6 text-lg font-bold text-play-ink"
          >
            {text.enterCodeAgain}
          </Link>
        </div>
        <p className="text-sm text-play-ink-soft">{text.codeLine(code)}</p>
      </section>
    </main>
  )
}
