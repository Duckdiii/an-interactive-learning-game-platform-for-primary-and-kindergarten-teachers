import { useEffect, useState } from 'react'

/** Câu mẫu có đủ dấu tiếng Việt: ép trình duyệt tải đúng các tập con (latin + vietnamese) của font, không chỉ tập đầu. */
export const FONT_SAMPLE_TEXT = 'Đặt chú ong vào số 3. Giỏi quá! Xong rồi! Thử lại, Câu tiếp theo. ă â ê ô ơ ư đ'

const SYSTEM_FONTS = new Set(['arial', 'helvetica', 'sans-serif', 'serif', 'system-ui', 'inter'])

/** Chuỗi họ phông cho Konva/CSS: font tùy chỉnh chỉ vào danh sách khi đã nạp xong, nếu không dùng Arial (Konva đo và vẽ lần đầu bằng font dự phòng rồi mới đổi, nên đổi chuỗi này làm Konva đo lại). */
export function fontStack(family: string, ready: boolean): string {
  const clean = family.replace(/["'\\]/g, '').trim()
  if (!clean || SYSTEM_FONTS.has(clean.toLowerCase())) return 'Arial, sans-serif'
  return ready ? `"${clean}", Arial, sans-serif` : 'Arial, sans-serif'
}

const DEFAULT_WEIGHTS: readonly number[] = [700, 800]

/**
 * Đã nạp xong font tùy chỉnh `family` (các độ đậm `weights`) chưa. Canvas không tự vẽ lại khi font về muộn, nên renderer đọc cờ này để đổi
 * `fontFamily` (làm Konva đo lại chữ và vẽ lại). Font hệ thống, trình duyệt không có `document.fonts` (jsdom) thì coi như xong ngay;
 * nạp lỗi thì cờ ở lại `false` và chữ vẫn đọc được bằng Arial.
 */
export function useFontReady(family: string, weights: readonly number[] = DEFAULT_WEIGHTS): boolean {
  const isSystem = SYSTEM_FONTS.has(family.trim().toLowerCase()) || family.trim() === ''
  const supported = typeof document !== 'undefined' && typeof document.fonts?.load === 'function'
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (isSystem || !supported) return
    let alive = true
    const clean = family.replace(/["'\\]/g, '').trim()
    void Promise.all(weights.map((weight) => document.fonts.load(`${weight} 24px "${clean}"`, FONT_SAMPLE_TEXT)))
      .then((faces) => {
        if (alive) setLoaded(faces.every((list) => list.length > 0))
      })
      .catch(() => {
        // Nạp lỗi: giữ font dự phòng.
      })
    return () => {
      alive = false
    }
  }, [family, isSystem, supported, weights])

  return isSystem || !supported ? true : loaded
}
