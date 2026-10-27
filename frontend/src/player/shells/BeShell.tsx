import { viText } from '../../constants/viText'
import { useUiProfile } from '../profile/useUiProfile'
import { useTheme } from '../theme/useTheme'
import type { ShellProps } from './types'

/** Khung Bé (Mầm non, lớp 1): sao thay số, nhân vật ở góc, vùng chơi chiếm cả màn, không đồng hồ, không điểm. */
export default function BeShell({ title, progress, mascot, feedback, children }: ShellProps) {
  const { band } = useUiProfile()
  const { progress: icons } = useTheme()
  const { current, total } = progress

  return (
    <div data-band={band} className="flex min-h-screen flex-col bg-play-page text-play-ink">
      <header className="flex items-center justify-between gap-4 px-4 py-3">
        <h1 className="sr-only">{title}</h1>
        <p role="img" aria-label={viText.player.progressLabel(current, total)} className="flex flex-wrap gap-1 text-3xl text-play-accent">
          {Array.from({ length: total }, (_, index) => (
            <span key={index} aria-hidden="true">
              {index < current ? icons.filled : icons.empty}
            </span>
          ))}
        </p>
        {mascot ? <div>{mascot}</div> : null}
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
      {feedback ? <footer role="status" className="px-4 py-3 text-center font-bold">{feedback}</footer> : null}
    </div>
  )
}
