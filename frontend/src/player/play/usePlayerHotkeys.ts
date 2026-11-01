import { useEffect, useRef } from 'react'
import { isPlainShortcut } from '../../games/common/keyboard'

interface PlayerHotkeys {
  /** Enter: sang câu sau. Trả true nếu đã xử lý (false thì Enter giữ hành vi mặc định). */
  onEnter: () => boolean
  /** R: phát lại đề. */
  onReplay: () => void
  /** Esc: tạm dừng hoặc chơi tiếp. */
  onTogglePause: () => void
}

/** Phím tắt cấp khung (Hs-Desk-Play) gắn lên `window`; bỏ qua khi đang gõ chữ hoặc có Ctrl/Alt/Meta. Phím riêng của từng loại game do renderer khai báo. */
export function usePlayerHotkeys(handlers: PlayerHotkeys) {
  const latest = useRef(handlers)

  useEffect(() => {
    latest.current = handlers
  })

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || !isPlainShortcut(event)) return

      if (event.key === 'Enter') {
        // Focus đang ở nút/liên kết thì Enter là của nút đó (ví dụ "Tạm dừng"); "Câu tiếp theo" đang focus cũng tự nhận Enter.
        if (event.target instanceof HTMLElement && event.target.closest('button, a[href]')) return
        if (latest.current.onEnter()) event.preventDefault()
      } else if (event.key === 'r' || event.key === 'R') latest.current.onReplay()
      else if (event.key === 'Escape') latest.current.onTogglePause()
    }

    window.addEventListener('keydown', onKeyDown)

    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
