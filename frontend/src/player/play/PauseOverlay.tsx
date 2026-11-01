import { useEffect, useRef } from 'react'
import { viText } from '../../constants/viText'
import PlayButton from '../components/PlayButton'

/**
 * Lớp phủ "Tạm dừng": che cả màn; nền phía sau được QuestionStage đặt `inert` nên Tab không ra ngoài và renderer không nhận chạm.
 * Focus vào "Chơi tiếp" khi mở, trả về chỗ cũ khi đóng (Esc lần nữa cũng chơi tiếp, do phím tắt của khung lo).
 */
export default function PauseOverlay({ onResume }: { onResume: () => void }) {
  const dialog = useRef<HTMLDivElement>(null)
  const text = viText.player.pause

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null

    dialog.current?.querySelector('button')?.focus()

    return () => previous?.focus()
  }, [])

  return (
    <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="player-pause-title" className="fixed inset-0 z-20 grid place-items-center bg-play-page/95 play-safe-x play-safe-y">
      <div className="flex flex-col items-center gap-4 text-center text-play-ink">
        <h2 id="player-pause-title" className="text-3xl font-bold">{text.title}</h2>
        <PlayButton onClick={onResume}>{text.resume}</PlayButton>
      </div>
    </div>
  )
}
