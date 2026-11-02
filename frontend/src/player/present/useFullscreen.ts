import { useCallback, useEffect, useState } from 'react'

/** Bật/tắt toàn màn hình cho cả trang (Fullscreen API). Trình duyệt không hỗ trợ thì `supported` là false và nút ẩn đi. */
export function useFullscreen() {
  const supported = typeof document !== 'undefined' && typeof document.documentElement.requestFullscreen === 'function'
  const [active, setActive] = useState(() => typeof document !== 'undefined' && Boolean(document.fullscreenElement))

  useEffect(() => {
    const update = () => setActive(Boolean(document.fullscreenElement))

    document.addEventListener('fullscreenchange', update)

    return () => {
      document.removeEventListener('fullscreenchange', update)
      // Rời trang trình chiếu (Kết thúc) thì trả màn hình về bình thường.
      if (document.fullscreenElement) void document.exitFullscreen?.().catch(() => undefined)
    }
  }, [])

  const toggle = useCallback(() => {
    // Trình duyệt có thể từ chối (không phải do người bấm): bỏ qua, nút vẫn bấm lại được.
    try {
      const request = document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()

      void request?.catch(() => undefined)
    } catch {
      // Một số trình duyệt ném lỗi ngay thay vì trả promise bị từ chối.
    }
  }, [])

  return { supported, active, toggle }
}
