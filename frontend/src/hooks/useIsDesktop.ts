import { useSyncExternalStore } from 'react'

// Khớp với điểm gãy `lg` của Tailwind: từ đây trở lên trình soạn thảo hiện hai khung cạnh nhau (không còn tab).
const DESKTOP_QUERY = '(min-width: 1024px)'

function subscribe(onChange: () => void) {
  const query = window.matchMedia?.(DESKTOP_QUERY)

  query?.addEventListener('change', onChange)

  return () => query?.removeEventListener('change', onChange)
}

const getSnapshot = () => window.matchMedia?.(DESKTOP_QUERY).matches ?? false

/** Đang ở bố cục máy tính (hai khung cạnh nhau)? Môi trường không có `matchMedia` (jsdom) coi như điện thoại. */
export function useIsDesktop() {
  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}
