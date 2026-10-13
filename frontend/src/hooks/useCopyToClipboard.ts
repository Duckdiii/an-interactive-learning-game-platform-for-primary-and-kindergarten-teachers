import { useCallback, useEffect, useRef, useState } from 'react'

const RESET_AFTER_MS = 2000

/**
 * Sao chép văn bản vào clipboard. `copiedValue` là giá trị vừa sao chép (tự xóa sau 2 giây) để nút hiện "Đã sao chép".
 * Trả về false khi trình duyệt không cho phép (ví dụ trang không an toàn), nơi gọi nên báo cho giáo viên biết.
 */
export function useCopyToClipboard() {
  const [copiedValue, setCopiedValue] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true

    return () => {
      mounted.current = false
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  const copy = useCallback(async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
    } catch {
      return false
    }

    // Thẻ có thể đã bị gỡ khỏi trang trong lúc chờ clipboard: không đặt lại bộ đếm cho thẻ không còn.
    if (!mounted.current) return true

    setCopiedValue(value)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopiedValue(null), RESET_AFTER_MS)

    return true
  }, [])

  return { copiedValue, copy }
}
