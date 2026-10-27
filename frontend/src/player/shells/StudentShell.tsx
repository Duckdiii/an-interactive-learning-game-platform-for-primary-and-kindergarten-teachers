import { viText } from '../../constants/viText'
import { useUiProfile } from '../profile/useUiProfile'
import type { ShellProps } from './types'

/** Khung Học sinh (lớp 2 đến 5): tên game và "Câu x/y", đồng hồ và điểm ở thanh trên, thanh phản hồi ở dưới. */
export default function StudentShell({ title, progress, score, remainingSeconds, mascot, feedback, children }: ShellProps) {
  const { band } = useUiProfile()
  const showTimer = typeof remainingSeconds === 'number'

  return (
    <div data-band={band} className="flex min-h-screen flex-col bg-play-page text-play-ink">
      <header className="flex items-center justify-between gap-4 px-4 py-3">
        <div>
          <h1 className="text-xl font-bold">{title}</h1>
          <p className="text-play-ink-soft">{viText.player.progressLabel(progress.current, progress.total)}</p>
        </div>
        <div className="flex items-center gap-4 font-bold">
          {showTimer ? <p role="timer">{viText.player.secondsLeft(remainingSeconds)}</p> : null}
          {typeof score === 'number' ? <p>{viText.player.score(score)}</p> : null}
          {mascot ? <div>{mascot}</div> : null}
        </div>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
      {feedback ? <footer role="status" className="px-4 py-3 text-center font-bold">{feedback}</footer> : null}
    </div>
  )
}
