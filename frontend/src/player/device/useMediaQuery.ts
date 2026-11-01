import { useCallback, useSyncExternalStore } from 'react'

const listOf = (query: string) => (typeof window.matchMedia === 'function' ? window.matchMedia(query) : null)

/** Theo dõi một media query (nghe `change`). Môi trường không có `matchMedia` thì luôn false. */
export function useMediaQuery(query: string): boolean {
  // Ổn định theo query: hàm subscribe mới mỗi render làm React gỡ rồi gắn lại listener mỗi lần.
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = listOf(query)

      if (!list) return () => undefined

      // Safari < 14 chỉ có addListener/removeListener.
      if (typeof list.addEventListener === 'function') {
        list.addEventListener('change', onChange)

        return () => list.removeEventListener('change', onChange)
      }

      list.addListener(onChange)

      return () => list.removeListener(onChange)
    },
    [query],
  )

  return useSyncExternalStore(subscribe, () => listOf(query)?.matches ?? false)
}
