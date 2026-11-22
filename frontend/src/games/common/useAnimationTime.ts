import { useEffect, useState } from 'react'

/** Người dùng bật "giảm chuyển động" của hệ điều hành thì không chạy hoạt ảnh (vẫn hiện trạng thái đúng/sai tĩnh). */
export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Đồng hồ hoạt ảnh (giây kể từ khi gắn), cập nhật mỗi khung hình. Giảm chuyển động hoặc `enabled = false` thì đứng ở 0. */
export function useAnimationTime(enabled = true): number {
  const [time, setTime] = useState(0)
  useEffect(() => {
    if (!enabled || prefersReducedMotion() || typeof requestAnimationFrame !== 'function') return
    const start = performance.now()
    let last = 0
    let frame = requestAnimationFrame(function tick(now) {
      // Khoảng 30 khung/giây là đủ cho nhấp nhô nhẹ, giảm một nửa số lần vẽ lại trên máy yếu của lớp học.
      if (now - last >= 33) {
        last = now
        setTime((now - start) / 1000)
      }
      frame = requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(frame)
  }, [enabled])
  return time
}
