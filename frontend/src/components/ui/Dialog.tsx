import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface DialogProps {
  title: string
  // Id của phần tử nhận tiêu điểm đầu tiên khi mở; không có thì lấy phần tử có thể tab đầu tiên.
  initialFocusId?: string
  // Bấm Esc. Hộp thoại KHÔNG đóng khi bấm ra ngoài vùng tối (gõ dở gợi ý dài mà lỡ tay là mất), nên đóng luôn qua nút hoặc Esc.
  onEscape: () => void
  children: ReactNode
}

const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

const focusableIn = (root: HTMLElement) => Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((element) => element.getAttribute('aria-hidden') !== 'true')

/**
 * Hộp thoại chặn (modal) dùng được bằng bàn phím và trình đọc màn hình: \`role="dialog"\` + \`aria-modal\`, tiêu điểm vào trong khi mở, Tab quay vòng trong hộp,
 * Esc để đóng, đóng xong trả tiêu điểm về phần tử đã mở nó, khóa cuộn trang nền. Vẽ ra \`document.body\` để không bị bố cục cha cắt hoặc che.
 */
export default function Dialog({ title, initialFocusId, onEscape, children }: DialogProps) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  // Chỉ dùng lúc mở: đổi `initialFocusId` sau đó không kéo tiêu điểm đi nữa.
  const initialFocusRef = useRef(initialFocusId)

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    const panel = panelRef.current

    document.body.style.overflow = 'hidden'

    const initial = initialFocusRef.current ? document.getElementById(initialFocusRef.current) : null

    ;(initial ?? (panel ? focusableIn(panel)[0] : null) ?? panel)?.focus()

    return () => {
      document.body.style.overflow = previousOverflow
      // Phần tử đã mở hộp có thể đã bị vẽ lại trong lúc hộp mở: chỉ trả tiêu điểm nếu nó còn trong trang.
      if (opener && document.contains(opener)) opener.focus()
    }
    // Chỉ chạy lúc mở và lúc đóng.
  }, [])

  // Bàn phím xử lý ở cấp tài liệu thay vì trên hộp: tiêu điểm có rơi ra ngoài (ví dụ nút đang giữ tiêu điểm vừa bị gỡ khỏi trang) thì Esc và Tab vẫn đúng.
  const onEscapeRef = useRef(onEscape)

  useEffect(() => {
    onEscapeRef.current = onEscape
  })

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const panel = panelRef.current

      if (!panel) return

      if (event.key === 'Escape') {
        // Đang gõ dở bằng bộ gõ (Telex...) hoặc giữ phím Esc: không coi là yêu cầu đóng (kẻo mất chữ đã gõ).
        if (event.isComposing || event.repeat) return

        event.stopPropagation()
        onEscapeRef.current()

        return
      }

      if (event.key !== 'Tab') return

      const items = focusableIn(panel)

      if (items.length === 0) {
        event.preventDefault()

        return
      }

      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      const inside = panel.contains(active)

      if (event.shiftKey && (active === first || !inside)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (active === last || !inside)) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-0 sm:items-center sm:p-4">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-xl sm:rounded-3xl sm:p-6"
      >
        <h2 id={titleId} className="text-xl font-extrabold">
          {title}
        </h2>
        {children}
      </div>
    </div>,
    document.body,
  )
}
