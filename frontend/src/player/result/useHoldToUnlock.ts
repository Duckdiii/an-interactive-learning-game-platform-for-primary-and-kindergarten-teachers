import { useCallback, useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'

const TICK_MS = 100

/** Giữ (chuột, chạm hoặc Enter/Space) đủ `durationMs` thì mở khóa; thả sớm thì hủy. Khóa nhẹ để trẻ nhỏ không vô tình vào phần của phụ huynh. */
export function useHoldToUnlock(durationMs = 3000) {
  const [unlocked, setUnlocked] = useState(false)
  const [progress, setProgress] = useState(0)
  const timers = useRef<{ done?: ReturnType<typeof setTimeout>; tick?: ReturnType<typeof setInterval> }>({})
  // Con trỏ đang giữ: nhấc ngón khác (chạm hai ngón) không được hủy lượt giữ.
  const holder = useRef<number | null>(null)

  const cancel = useCallback(() => {
    clearTimeout(timers.current.done)
    clearInterval(timers.current.tick)
    timers.current = {}
    holder.current = null
    setProgress(0)
  }, [])

  const begin = useCallback(() => {
    if (timers.current.done) return

    const startedAt = Date.now()

    timers.current.tick = setInterval(() => setProgress(Math.min(1, (Date.now() - startedAt) / durationMs)), TICK_MS)
    timers.current.done = setTimeout(() => {
      clearInterval(timers.current.tick)
      timers.current = {}
      setProgress(1)
      setUnlocked(true)
    }, durationMs)
  }, [durationMs])

  useEffect(() => cancel, [cancel])

  const isHoldKey = (event: KeyboardEvent) => event.key === 'Enter' || event.key === ' '

  const releaseIfHolder = (event: PointerEvent) => {
    if (holder.current === null || holder.current === event.pointerId) cancel()
  }

  const bind = {
    onPointerDown: (event: PointerEvent) => {
      // Chỉ nút chuột trái (chuột phải/giữa không tính); chạm và bút luôn có button 0.
      if (event.button !== 0 || timers.current.done) return

      holder.current = event.pointerId
      begin()
    },
    onPointerUp: releaseIfHolder,
    onPointerLeave: releaseIfHolder,
    onPointerCancel: releaseIfHolder,
    // Giữ phím rồi Tab sang chỗ khác thì keyup không về nút: hủy khi mất focus.
    onBlur: cancel,
    onKeyDown: (event: KeyboardEvent) => {
      if (!isHoldKey(event)) return

      event.preventDefault()
      if (!event.repeat) begin()
    },
    onKeyUp: (event: KeyboardEvent) => {
      if (isHoldKey(event)) cancel()
    },
    onContextMenu: (event: { preventDefault: () => void }) => event.preventDefault(),
  }

  return { unlocked, progress, bind }
}
