import { act } from '@testing-library/react'
import type { TimelineClock } from './useFeedbackTimeline'

/** Đồng hồ giả cho test: chỉ chạy các khung đã xếp hàng khi test gọi `advance`. Không import từ mã chạy thật. */
export function makeClock() {
  let time = 0
  let nextHandle = 0
  const queue = new Map<number, () => void>()
  const clock: TimelineClock = {
    now: () => time,
    requestFrame: (callback) => {
      nextHandle += 1
      queue.set(nextHandle, callback)
      return nextHandle
    },
    cancelFrame: (handle) => {
      queue.delete(handle)
    },
  }
  return {
    clock,
    pending: () => queue.size,
    advance(ms: number) {
      time += ms
      const callbacks = [...queue.values()]
      queue.clear()
      act(() => callbacks.forEach((callback) => callback()))
    },
  }
}
