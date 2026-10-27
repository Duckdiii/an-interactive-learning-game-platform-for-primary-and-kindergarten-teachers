import { viText } from '../../constants/viText'
import { useUiProfile } from '../profile/useUiProfile'
import Mascot from '../theme/Mascot'

/** Điện thoại dọc: thân máy hẹp, nên loại game cần màn ngang thì nhắc bé xoay máy (Be-Phone-Rotate). Xoay xong, nơi gọi tự bỏ màn này. */
export const PORTRAIT_PHONE_QUERY = '(orientation: portrait) and (max-width: 767px)'

// TODO: giọng đọc nhắc bé xoay máy (chưa có tệp âm thanh).
export default function RotatePrompt({ onStayPortrait }: { onStayPortrait: () => void }) {
  const { tokens } = useUiProfile()
  const text = viText.player.device

  return (
    // Lớp phủ trên câu đang chơi (câu phía sau được giữ, đặt inert); aria-modal để phím của renderer phía sau bị bỏ qua.
    <main role="dialog" aria-modal="true" aria-labelledby="player-rotate-title" className="fixed inset-0 z-30 grid place-items-center overflow-auto bg-play-page play-safe-x play-safe-y [--play-pad-y:0px] text-center text-play-ink">
      <section className="flex max-w-md flex-col items-center gap-4">
        {tokens.decoration ? <Mascot state="speak" /> : null}
        <h1 id="player-rotate-title" className="text-3xl font-bold">
          {text.rotateTitle}
        </h1>
        <p className="text-lg text-play-ink-soft">{text.rotateHint}</p>
        <button type="button" onClick={onStayPortrait} className="mt-4 min-h-[var(--play-min-touch)] rounded-xl px-4 text-sm text-play-ink-soft underline">
          {text.stayPortrait}
        </button>
      </section>
    </main>
  )
}
