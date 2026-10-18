import type { Landmark, Point, Size } from './prepositionGeometry'

/** Đầu vào mô phỏng thả vật: vật mốc, cỡ vật và chỗ trẻ buông tay (tâm vật, toạ độ cảnh). */
export interface DropInput {
  landmark: Landmark
  size: Size
  start: Point
}

/**
 * Kết quả thả: chuỗi vị trí (tâm vật) mỗi 1/60 giây để vẽ lại, và vị trí cuối. ĐÁP ÁN chỉ phụ thuộc `final` qua hàm thuần
 * `satisfies`, không phụ thuộc cách mô phỏng chạy hay màn hình vẽ nhanh hay chậm.
 */
export interface DropResult {
  frames: Point[]
  final: Point
  /** `false` nếu hết số bước tối đa mà vật vẫn còn chuyển động (vị trí cuối là vị trí tại bước đó). */
  settled: boolean
}

/** Cổng mô phỏng: renderer chỉ biết hợp đồng này, không biết thư viện vật lý phía sau (để thay/giả khi test). */
export type DropSimulator = (input: DropInput) => DropResult

export const DROP_FRAME_MS = 1000 / 60
