import { useLayoutEffect, useRef, useState } from 'react'
import { sampleFeedback, type FeedbackPlan, type FeedbackSample } from './feedbackEffects'

export interface TimelineClock {
  now: () => number
  requestFrame: (callback: () => void) => number
  cancelFrame: (handle: number) => void
}

const browserClock = (): TimelineClock => ({
  now: () => performance.now(),
  requestFrame: (callback) => requestAnimationFrame(callback),
  cancelFrame: (handle) => cancelAnimationFrame(handle),
})

/**
 * Chạy một kế hoạch hiệu ứng theo thời gian và trả trạng thái hiện tại để vẽ. `runId` đổi (kể cả khi kế hoạch
 * giữ nguyên) thì chạy lại từ đầu; `plan === null` hoặc `runId === 0` nghĩa là chưa phát gì. Dừng khi hết
 * `duration` (không còn vòng lặp nào chạy nền) hoặc khi component bị gỡ. `clock` để test thay đồng hồ giả
 * (cần danh tính ổn định giữa các lần render).
 *
 * Kế hoạch được so theo NỘI DUNG, không theo danh tính: người gọi dựng kế hoạch mới mỗi lần render (ví dụ gọi
 * `buildPlan` ngay trong thân component) cũng không làm hiệu ứng khởi động lại và không gây vòng lặp cập nhật vô hạn.
 */
export function useFeedbackTimeline(
  plan: FeedbackPlan | null,
  runId: number,
  clock: TimelineClock | undefined = undefined,
): FeedbackSample | null {
  const [state, setState] = useState<{ runId: number; sample: FeedbackSample } | null>(null)
  const planKey = plan ? JSON.stringify(plan) : ''
  const planRef = useRef(plan)
  // Cùng loại effect với effect chính bên dưới và khai báo trước nó: nhờ đó effect chính luôn đọc kế hoạch mới nhất
  // (effect thường chạy SAU layout effect nên sẽ để lại kế hoạch cũ trong ref).
  useLayoutEffect(() => {
    planRef.current = plan
  })

  // useLayoutEffect: mẫu t = 0 được đặt trước khi trình duyệt vẽ, nên chạm lại không có khung trống/nhấp tắt.
  useLayoutEffect(() => {
    const current = planRef.current
    if (!current || runId === 0) return
    const plan = current
    const { now, requestFrame, cancelFrame } = clock ?? browserClock()
    const startedAt = now()
    let handle = 0
    let cancelled = false

    const tick = () => {
      if (cancelled) return
      const t = (now() - startedAt) / 1000
      const sample = sampleFeedback(plan, t)
      setState({ runId, sample })
      if (sample.active) handle = requestFrame(tick)
    }
    tick()
    return () => {
      cancelled = true
      cancelFrame(handle)
    }
  }, [planKey, runId, clock])

  // Chỉ trả mẫu của lần chạy hiện tại; lần chạy cũ (hoặc chưa chạy) thì không có gì để vẽ.
  return state !== null && state.runId === runId && plan !== null ? state.sample : null
}
