import { useEffect, useState } from 'react'

/**
 * Bật gợi ý một lần sau `delayMs` kể từ lúc `waiting` (chưa trả lời) bắt đầu. `delayMs = null` là không bao giờ gợi ý.
 * `waiting` về false thì gợi ý tắt và đếm lại từ đầu lần sau. Dùng với `key` theo câu hỏi.
 */
export function useHint(delayMs: number | null, waiting: boolean) {
  const [shown, setShown] = useState(false)

  useEffect(() => {
    if (delayMs === null || !waiting) return

    const id = setTimeout(() => setShown(true), delayMs)

    return () => {
      clearTimeout(id)
      setShown(false)
    }
  }, [delayMs, waiting])

  return shown && waiting
}
