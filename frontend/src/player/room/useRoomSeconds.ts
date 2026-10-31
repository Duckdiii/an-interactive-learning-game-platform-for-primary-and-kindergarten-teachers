import { useEffect, useState } from 'react'
import type { RoomQuestion } from './RoomClient'

const TICK_MS = 250

const localDeadline = ({ endsAt, serverNow }: RoomQuestion) => Date.now() + Date.parse(endsAt) - Date.parse(serverNow)

/** Mốc hết giờ theo đồng hồ máy này; đếm bằng hiệu thời gian, không trừ dần từng nhịp, nên tab nền hay máy chậm không làm lệch. Đang tạm dừng thì hiện `remainingMs`. */
export function useRoomSeconds(question: RoomQuestion, remainingMs: number | null, paused: boolean) {
  const stamp = `${question.endsAt}|${question.serverNow}`
  const [anchor, setAnchor] = useState(() => ({ stamp, deadline: localDeadline(question) }))
  const [now, setNow] = useState(() => Date.now())

  // Đổi câu, tiếp tục sau tạm dừng hay nối lại thì lấy lại mốc ngay trong lượt vẽ, không đợi effect.
  if (anchor.stamp !== stamp) {
    setAnchor({ stamp, deadline: localDeadline(question) })
    setNow(Date.now())
  }

  useEffect(() => {
    if (paused) return

    const id = setInterval(() => setNow(Date.now()), TICK_MS)

    return () => clearInterval(id)
  }, [paused])

  return Math.ceil(Math.max(paused && remainingMs !== null ? remainingMs : anchor.deadline - now, 0) / 1000)
}
