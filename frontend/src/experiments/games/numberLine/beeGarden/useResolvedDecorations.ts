import { useMemo } from 'react'
import { resolveImage } from '../../../assets/imageResolver/resolveImage'
import type { ThemeDecoration } from '../../../theme/themeTypes'

export interface ResolvedDecoration extends ThemeDecoration {
  src: string
  alt: string
}

/**
 * Tra hình cho từng vật trang trí của theme qua `resolveImage` (bộ Fluent Emoji cục bộ). Từ khóa chưa có hình thì BỎ vật đó
 * (không vẽ hình dự phòng lên cảnh) và được ghi vào sổ hình thiếu để bổ sung thư viện sau.
 */
export function useResolvedDecorations(decorations: readonly ThemeDecoration[] | undefined): readonly ResolvedDecoration[] {
  return useMemo(
    () =>
      (decorations ?? []).flatMap((item) => {
        const image = resolveImage(item.keyword)
        return image.tier === 'fluent' ? [{ ...item, src: image.src, alt: image.alt }] : []
      }),
    [decorations],
  )
}
