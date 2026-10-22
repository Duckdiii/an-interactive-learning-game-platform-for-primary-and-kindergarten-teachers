import { useMemo } from 'react'
import { fontStack, useFontReady } from '../../../theme/useFontReady'
import { useTheme } from '../../../theme/useTheme'

/** Chuỗi họ phông của theme cho chữ vẽ trên canvas: font tùy chỉnh (Nunito) khi đã nạp xong, Arial trong lúc chờ (đổi chuỗi làm Konva đo lại chữ). */
export function useGardenFont(): string {
  const family = useTheme().font.family
  const ready = useFontReady(family)
  return useMemo(() => fontStack(family, ready), [family, ready])
}
