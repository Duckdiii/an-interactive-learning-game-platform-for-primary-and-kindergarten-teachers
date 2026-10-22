import { DECORATION_LIMITS } from '../../../theme/themeTypes'

/** Kiểu vẽ của một vật trang trí theo độ sâu: vật xa nhỏ và nhạt hơn (như bị phủ sương), vật gần to và đậm màu hơn. */
export interface DepthStyle {
  /** Hệ số nhân lên `size` của dữ liệu theme (cỡ khi ở gần nhất). */
  scale: number
  /** Độ đục của hình: dưới 1 thì hòa vào nền trời, tức giảm độ bão hòa mà không cần bộ lọc theo từng khung hình. */
  opacity: number
  /** Độ đậm bóng đổ dưới chân (chỉ vật trên cỏ vẽ bóng): vật gần có bóng đậm hơn. */
  shadowOpacity: number
}

/** `depth` từ 0 (xa nhất) đến 1 (gần nhất); bỏ trống hoặc ngoài khoảng thì coi là gần (1). */
export function depthStyle(depth: number | undefined): DepthStyle {
  const d = depth === undefined || !Number.isFinite(depth) ? 1 : Math.min(1, Math.max(0, depth))
  const { minScale, minOpacity, minShadow, maxShadow } = DECORATION_LIMITS.depth
  return {
    scale: minScale + (1 - minScale) * d,
    opacity: minOpacity + (1 - minOpacity) * d,
    shadowOpacity: minShadow + (maxShadow - minShadow) * d,
  }
}
