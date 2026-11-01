import { useEffect, useRef } from 'react'

// Space/Enter trên nút hay liên kết đang có tiêu điểm thì trình duyệt tự bấm nút đó: không xử lý thêm kẻo chạy hai lần.
const ACTIVATION_KEYS = new Set([' ', 'Enter'])

/**
 * Phím tắt của giáo viên khi trình chiếu (Space bắt đầu, ← → chuyển câu, R đọc lại…). Không nhận khi đang gõ trong ô nhập hoặc có Ctrl/Alt/Meta.
 * `handlers` theo `event.key` (phím chữ so không phân biệt hoa thường); trả `false` nếu không xử lý để không chặn hành vi mặc định.
 */
export function usePresentKeys(handlers: Readonly<Record<string, () => boolean | void>>) {
  const latest = useRef(handlers)

  useEffect(() => {
    latest.current = handlers
  })

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.defaultPrevented) return
      // Không dùng isPlainShortcut: hàm đó còn tắt phím khi có khung xem trước của trình soạn thảo, điều không áp ở trang trình chiếu.
      if (event.ctrlKey || event.altKey || event.metaKey) return

      const target = event.target instanceof HTMLElement ? event.target : null

      if (target?.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]')) return
      if (ACTIVATION_KEYS.has(event.key) && target?.closest('button, a[href]')) return

      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key
      const handler = latest.current[key]

      if (handler && handler() !== false) event.preventDefault()
    }

    window.addEventListener('keydown', onKeyDown)

    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
