import { viText } from '../../constants/viText'
import { useUiProfile } from '../profile/useUiProfile'
import { useTheme } from '../theme/useTheme'
import ShellFooter from './ShellFooter'
import type { ShellProps } from './types'

/** Khung Bé (Mầm non, lớp 1): sao thay số, nhân vật ở góc, vùng chơi chiếm cả màn, không đồng hồ, không điểm. Không có nút tạm dừng (phím Esc vẫn chạy). */
export default function BeShell({ title, progress, mascot, feedback, showHotkeyHint, embedded, children }: ShellProps) {
  const { band } = useUiProfile()
  const theme = useTheme()
  const { progress: icons } = theme
  const { current, total } = progress

  return (
    <div data-band={band} className={`relative flex flex-col bg-play-page text-play-ink ${embedded ? 'h-full min-h-0 overflow-y-auto' : 'min-h-screen'}`}>
      {/* Background layer thế giới game đa tầng Stage 2.5 (Parallax / Subtle drift, 35% opacity) */}
      {theme.bgUrl ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
        >
          <div
            className="h-full w-full bg-cover bg-center opacity-35 animate-subtle-drift"
            style={{ backgroundImage: `url(${theme.bgUrl})` }}
          />
        </div>
      ) : null}

      <header className="relative z-10 flex items-center justify-between gap-4 pb-3 play-safe-x play-safe-t">
        {/* Nhúng trong trình soạn thảo thì không thêm h1 thứ hai vào trang giáo viên. */}
        {embedded ? <p className="sr-only">{title}</p> : <h1 className="sr-only">{title}</h1>}
        <p role="img" aria-label={viText.player.progressLabel(current, total)} className="flex flex-wrap gap-1 text-3xl text-play-accent">
          {Array.from({ length: total }, (_, index) => (
            <span key={index} aria-hidden="true">
              {index < current ? icons.filled : icons.empty}
            </span>
          ))}
        </p>
        {mascot ? <div>{mascot}</div> : null}
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
