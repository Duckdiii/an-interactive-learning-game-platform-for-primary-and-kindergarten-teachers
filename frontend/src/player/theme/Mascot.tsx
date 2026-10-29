import { viText } from '../../constants/viText'
import { PLATFORM_MASCOT } from './themes'
import type { MascotState } from './types'
import { useTheme } from './useTheme'

// Dấu hiệu cảm xúc cạnh nhân vật, chung cho mọi theme (hình thật theo trạng thái thay vào đây sau).
const STATE_BADGE: Readonly<Record<MascotState, string>> = {
  greet: '👋',
  speak: '💬',
  ask: '❓',
  happy: '✨',
  comfort: '💛',
  celebrate: '🎉',
}

/** Chỗ chừa cho nhân vật theo theme của game; theme chưa có nhân vật thì dùng biểu tượng nền tảng. */
export default function Mascot({ state, className = 'text-4xl' }: { state: MascotState; /** Cỡ chữ của biểu tượng, ví dụ to hơn trên tivi. */ className?: string }) {
  const theme = useTheme()

  return (
    <span role="img" aria-label={viText.player.mascot[state]} data-mascot-state={state} className={className}>
      {theme.mascotBase ?? PLATFORM_MASCOT}
      <span aria-hidden="true">{STATE_BADGE[state]}</span>
    </span>
  )
}
