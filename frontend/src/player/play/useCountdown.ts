import { useEffect, useState } from 'react'

/**
 * Đếm ngược từng giây. `totalSeconds = null` là không đếm giờ (khung Bé) và trả `null`. Dừng khi `running = false` hoặc khi về 0.
 * Dùng với `key` theo câu hỏi để mỗi câu bắt đầu lại từ đầu.
 */
export function useCountdown(totalSeconds: number | null, running: boolean) {
  const [remaining, setRemaining] = useState(totalSeconds)
  const expired = remaining !== null && remaining <= 0

  useEffect(() => {
    if (!running || totalSeconds === null || expired) return

    const id = setInterval(() => setRemaining((seconds) => (seconds === null ? seconds : Math.max(0, seconds - 1))), 1000)

    return () => clearInterval(id)
  }, [running, totalSeconds, expired])

  return totalSeconds === null ? null : remaining
}
