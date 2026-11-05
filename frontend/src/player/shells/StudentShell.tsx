import { viText } from '../../constants/viText'
import { useUiProfile } from '../profile/useUiProfile'
import { useTheme } from '../theme/useTheme'
import ShellFooter from './ShellFooter'
import type { ShellProps } from './types'

/** Khung Học sinh (lớp 2 đến 5): tên game và "Câu x/y", đồng hồ và điểm ở thanh trên, thanh phản hồi dính đáy. */
export default function StudentShell({ title, progress, score, remainingSeconds, mascot, feedback, showHotkeyHint, onPause, embedded, children }: ShellProps) {
  const { band } = useUiProfile()
  const theme = useTheme()
  const showTimer = typeof remainingSeconds === 'number'

  return (
    <div data-band={band} className={`relative flex flex-col bg-play-page text-play-ink ${embedded ? 'h-full min-h-0 overflow-y-auto' : 'min-h-screen'}`}>
      {/* Background layer thế giới game Stage 2.5 */}
      {theme.bgUrl ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 bg-cover bg-center opacity-25"
          style={{ backgroundImage: `url(${theme.bgUrl})` }}
        />
      ) : null}

      <header className="relative z-10 flex items-center justify-between gap-4 pb-3 play-safe-x play-safe-t">
        <div>
          {/* Nhúng trong trình soạn thảo thì không thêm h1 thứ hai vào trang giáo viên. */}
          {embedded ? <p className="text-xl font-bold">{title}</p> : <h1 className="text-xl font-bold">{title}</h1>}
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
      <main className="relative z-10 flex flex-1 flex-col play-safe-x [--play-pad-x:0px]">
        <div className="flex flex-1 flex-col w-full rounded-3xl border-4 border-play-outline bg-play-surface/90 shadow-xl backdrop-blur-xs overflow-hidden">
          {children}
        </div>
      </main>
      <ShellFooter feedback={feedback} showHotkeyHint={showHotkeyHint} />

      {/* Linh vật Mascot đồng hành góc dưới màn hình có hiệu ứng thở nhẹ (Idle Breathing) */}
      {theme.mascotAvatar ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-3 right-3 z-20 select-none animate-mascot-idle"
        >
          <img
            src={theme.mascotAvatar}
            alt=""
            aria-hidden="true"
            className="h-14 w-14 drop-shadow-md sm:h-18 sm:w-18"
          />
        </div>
      ) : null}
    </div>
  )
}
