import { viText } from '../../constants/viText'
import { useUiProfile } from '../profile/useUiProfile'
import ShellFooter from './ShellFooter'
import type { ShellProps } from './types'

/** Khung Học sinh (lớp 2 đến 5): tên game và "Câu x/y", đồng hồ và điểm ở thanh trên, thanh phản hồi dính đáy. */
export default function StudentShell({ title, progress, score, remainingSeconds, mascot, feedback, showHotkeyHint, onPause, children }: ShellProps) {
  const { band } = useUiProfile()
  const showTimer = typeof remainingSeconds === 'number'

  return (
    <div data-band={band} className="flex min-h-screen flex-col bg-play-page text-play-ink">
      <header className="flex items-center justify-between gap-4 pb-3 play-safe-x play-safe-t">
        <div>
          <h1 className="text-xl font-bold">{title}</h1>
          <p className="text-play-ink-soft">{viText.player.progressLabel(progress.current, progress.total)}</p>
        </div>
        <div className="flex items-center gap-4 font-bold">
          {showTimer ? <p role="timer">{viText.player.secondsLeft(remainingSeconds)}</p> : null}
          {typeof score === 'number' ? <p>{viText.player.score(score)}</p> : null}
          {onPause ? (
            <button type="button" onClick={onPause} className="min-h-[var(--play-min-touch)] rounded-xl border-2 border-play-outline px-4 text-base">
              {viText.player.pause.button}
            </button>
          ) : null}
          {mascot ? <div>{mascot}</div> : null}
        </div>
      </header>
      <main className="flex flex-1 flex-col play-safe-x [--play-pad-x:0px]">{children}</main>
      <ShellFooter feedback={feedback} showHotkeyHint={showHotkeyHint} />
    </div>
  )
}
