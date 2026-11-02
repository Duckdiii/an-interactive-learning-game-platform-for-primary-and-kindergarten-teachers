import { useCallback, useEffect, useRef, useState } from 'react'

export const AUTO_HIDE_MS = 3000

/**
 * Thanh điều khiển của giáo viên khi trình chiếu: hiện khi rê chuột, chạm hoặc bấm phím, tự ẩn sau `delayMs` không thao tác.
 * Không ẩn khi chuột đang đặt trên thanh, hoặc tiêu điểm BÀN PHÍM đang ở trong thanh (đang dùng thì không được biến mất).
 * Tiêu điểm do bấm chuột vào nút thì không tính: nút vẫn giữ tiêu điểm sau khi bấm, tính vào thì thanh không bao giờ tự ẩn nữa.
 */
export function useAutoHide(delayMs: number = AUTO_HIDE_MS) {
  const [visible, setVisible] = useState(true)
  const barRef = useRef<HTMLDivElement>(null)
  const hovering = useRef(false)
  const keyboardFocus = useRef(false)
  // Thao tác gần nhất là phím hay chuột: để biết tiêu điểm vào thanh do Tab hay do bấm chuột.
  const lastInput = useRef<'keyboard' | 'pointer'>('pointer')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const schedule = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      // Kiểm lại lúc hết giờ: nút đang có tiêu điểm bị gỡ đi thì không có blur, chỉ dựa vào cờ sẽ kẹt thanh hiện mãi.
      const focusInside = keyboardFocus.current && Boolean(barRef.current?.contains(document.activeElement))

      if (!hovering.current && !focusInside) setVisible(false)
    }, delayMs)
  }, [delayMs])

  const show = useCallback(() => {
    setVisible(true)
    schedule()
  }, [schedule])

  useEffect(() => {
    const onKey = () => {
      lastInput.current = 'keyboard'
      show()
    }
    const onPointer = () => {
      lastInput.current = 'pointer'
      show()
    }

    schedule()
    window.addEventListener('mousemove', show)
    window.addEventListener('pointerdown', onPointer)
    window.addEventListener('keydown', onKey)

    return () => {
      window.removeEventListener('mousemove', show)
      window.removeEventListener('pointerdown', onPointer)
      window.removeEventListener('keydown', onKey)
      if (timer.current) clearTimeout(timer.current)
    }
  }, [schedule, show])

  return {
    visible,
    barRef,
    barProps: {
      onMouseEnter: () => {
        hovering.current = true
        setVisible(true)
      },
      onMouseLeave: () => {
        hovering.current = false
        schedule()
      },
      onFocus: () => {
        keyboardFocus.current = lastInput.current === 'keyboard'
        setVisible(true)
        schedule()
      },
      onBlur: () => {
        keyboardFocus.current = false
        schedule()
      },
    },
  }
}
