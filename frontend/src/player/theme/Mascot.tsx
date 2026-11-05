import { viText } from '../../constants/viText'
import { PLATFORM_MASCOT } from './themes'
import type { MascotState } from './types'
import { useTheme } from './useTheme'

// Dấu hiệu cảm xúc cạnh nhân vật, chung cho mọi theme
const STATE_BADGE: Readonly<Record<MascotState, string>> = {
  greet: '👋',
  speak: '💬',
  ask: '❓',
  happy: '✨',
  comfort: '💛',
  celebrate: '🎉',
}

/** Chỗ chừa cho nhân vật theo theme của game; hỗ trợ SVG Vector linh vật chuyển động (Idle breathing 2-3%, Squash & Stretch). */
export default function Mascot({
  state,
  className = 'text-4xl',
}: {
  state: MascotState
  /** Cỡ chữ của biểu tượng, ví dụ to hơn trên tivi. */
  className?: string
}) {
  const theme = useTheme()
  const isHappy = state === 'happy' || state === 'celebrate'
  const isComfort = state === 'comfort'

  return (
    <span
      role="img"
      aria-label={viText.player.mascot[state]}
      data-mascot-state={state}
      className={`inline-flex items-center gap-1.5 ${className}`}
    >
      {theme.mascotAvatar ? (
        <span className="relative inline-block" aria-hidden="true">
          <img
            src={theme.mascotAvatar}
            alt=""
            aria-hidden="true"
            className={`h-11 w-11 object-contain inline-block transition-transform duration-300 drop-shadow-sm ${
              isHappy ? 'animate-bounce scale-110' : isComfort ? 'opacity-85 scale-95' : 'hover:scale-105'
            }`}
            style={{
              animation: isHappy ? 'bounce 0.6s infinite' : undefined,
            }}
          />
        </span>
      ) : null}
      <span>{theme.mascotBase ?? PLATFORM_MASCOT}</span>
      <span aria-hidden="true" className="text-xl">
        {STATE_BADGE[state]}
      </span>
    </span>
  )
}
