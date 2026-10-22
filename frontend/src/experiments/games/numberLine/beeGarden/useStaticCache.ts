import Konva from 'konva'
import { useLayoutEffect, type RefObject } from 'react'

interface StaticCacheOptions {
  /** Góc trên trái của vùng chụp, trong toạ độ của nhóm (mặc định 0, 0). */
  x?: number
  y?: number
  /** Làm mờ ảnh đệm một lần ngay sau khi chụp (bán kính Gaussian, đơn vị điểm ảnh của ảnh đệm): đồi xa mờ nhẹ cho cảm giác xa mà KHÔNG tốn gì lúc vẽ lại mỗi khung hình. */
  blur?: number
  /** Đổi giá trị này thì chụp lại (ví dụ đổi nhãn hoặc phông chữ nằm trong nhóm). */
  version?: string | number
}

/**
 * Chụp một nhóm hình TĨNH (trời, đồi, bụi cây, đầu hoa) thành một ảnh đệm một lần: mỗi khung hình Konva chỉ dán ảnh này thay vì vẽ lại hàng chục đường cong.
 * Nhóm vẫn xoay, co, dịch được (biến đổi của chính nó áp lên ảnh đệm); chỉ KHÔNG được đổi node con bên trong sau khi chụp.
 * Ảnh đệm chụp ở độ phân giải gấp ≥ 2 để không bị mờ khi sân phóng lên (`maxScale`) hay trên màn hình mật độ cao.
 */
export function useStaticCache(ref: RefObject<Konva.Group | null>, width: number, height: number, options: StaticCacheOptions = {}): void {
  const { x = 0, y = 0, version, blur } = options
  useLayoutEffect(() => {
    const node = ref.current
    if (!node) return
    const pixelRatio = Math.max(2, typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1)
    node.cache({ x, y, width, height, pixelRatio })
    if (blur && blur > 0 && typeof node.filters === 'function') {
      node.filters([Konva.Filters.Blur])
      node.blurRadius(blur)
    }
    node.getLayer()?.batchDraw()
    return () => {
      node.clearCache()
    }
  }, [ref, width, height, x, y, version, blur])
}
