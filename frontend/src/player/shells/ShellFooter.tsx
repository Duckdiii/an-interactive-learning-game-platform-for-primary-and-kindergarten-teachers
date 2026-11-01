import type { ReactNode } from 'react'
import { viText } from '../../constants/viText'

// Chỉ thiết bị có chuột mới hiện (điện thoại, máy tính bảng cảm ứng không có bàn phím để gợi ý).
const MOUSE_ONLY = 'hidden [@media(hover:hover)_and_(pointer:fine)]:block'

interface ShellFooterProps {
  feedback?: ReactNode
  /** Hiện dòng gợi ý phím tắt (chỉ trên thiết bị có chuột). */
  showHotkeyHint?: boolean
}

/**
 * Chân khung dùng chung hai khung: dính đáy để nút "Câu tiếp theo" luôn thấy dù canvas cao hơn màn hình (trang vẫn cuộn bình thường),
 * chừa vùng an toàn phía dưới. Không có phản hồi thì chân khung chỉ hiện (cùng dòng gợi ý) trên thiết bị có chuột.
 */
export default function ShellFooter({ feedback, showHotkeyHint }: ShellFooterProps) {
  if (!feedback && !showHotkeyHint) return null

  return (
    <footer
      role="status"
      className={[
        'sticky bottom-0 z-10 border-t border-play-outline bg-play-page pt-3 text-center font-bold play-safe-x play-safe-b',
        feedback ? '' : MOUSE_ONLY,
      ].join(' ')}
    >
      {feedback}
      {showHotkeyHint ? <p className={`${MOUSE_ONLY} text-sm font-normal text-play-ink-soft`}>{viText.player.hotkeys.hint}</p> : null}
    </footer>
  )
}
