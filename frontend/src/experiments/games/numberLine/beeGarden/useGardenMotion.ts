import Konva from 'konva'
import { useEffect, type RefObject } from 'react'
import { applyGardenMotion, type MotionHost, type MotionState } from './gardenMotion'

/**
 * Chạy chuyển động nền bằng `Konva.Animation` trên layer: mỗi khung hình chỉ đặt lại thuộc tính của các node có tên, rồi Konva vẽ lại layer;
 * React không vẽ lại gì. Tắt (`enabled = false`: «giảm chuyển động», xem lại bài) thì không chạy vòng lặp nào, mọi thứ đứng yên ở dáng tĩnh.
 * `stateRef` được renderer cập nhật khi có kết quả/đang bay; đọc ở mỗi khung nên không cần đăng ký lại.
 */
export function useGardenMotion(layerRef: RefObject<Konva.Layer | null>, enabled: boolean, stateRef: RefObject<MotionState>): void {
  useEffect(() => {
    const layer = layerRef.current
    if (!enabled || !layer) return
    const animation = new Konva.Animation(() => {
      applyGardenMotion(layer as unknown as MotionHost, performance.now() / 1000, stateRef.current)
    }, layer)
    animation.start()
    return () => {
      animation.stop()
    }
  }, [layerRef, enabled, stateRef])
}
