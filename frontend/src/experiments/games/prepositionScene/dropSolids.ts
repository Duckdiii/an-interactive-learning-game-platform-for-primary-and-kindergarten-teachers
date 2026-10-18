import type { Landmark, Point, Rect, Size } from './prepositionGeometry'
import { GROUND_Y, itemRect, SCENE_HEIGHT, SCENE_WIDTH, TABLE_SLAB } from './prepositionGeometry'

/** Độ dày thành hộp và đáy hộp (đơn vị cảnh). */
export const BOX_WALL = 16
/** Khoảng từ mép bàn đến chân bàn và độ rộng chân bàn: khớp hình vẽ trong renderer. */
export const TABLE_LEG_INSET = 16
export const TABLE_LEG_WIDTH = 24

/** Các khối đặc của vật mốc để vật rơi chạm vào (hình chữ nhật, toạ độ cảnh). Hàm thuần, không dùng thư viện vật lý. */
export function landmarkSolids(landmark: Landmark): Rect[] {
  const { x, y, width, height } = landmark
  const right = x + width
  const bottom = y + height
  if (landmark.kind === 'TABLE') {
    return [
      { left: x, right, top: y, bottom: y + TABLE_SLAB },
      { left: x + TABLE_LEG_INSET, right: x + TABLE_LEG_INSET + TABLE_LEG_WIDTH, top: y + TABLE_SLAB, bottom },
      { left: right - TABLE_LEG_INSET - TABLE_LEG_WIDTH, right: right - TABLE_LEG_INSET, top: y + TABLE_SLAB, bottom },
    ]
  }
  // Hộp mở nắp: đáy và hai thành; bên trong rỗng để vật rơi lọt vào.
  return [
    { left: x, right, top: bottom - BOX_WALL, bottom },
    { left: x, right: x + BOX_WALL, top: y, bottom },
    { left: right - BOX_WALL, right, top: y, bottom },
  ]
}

/** Mặt đất và hai vách ngoài cảnh (chặn vật rơi ra ngoài). Dày 200 để không xuyên. */
export function sceneBounds(): Rect[] {
  return [
    { left: -200, right: SCENE_WIDTH + 200, top: GROUND_Y, bottom: SCENE_HEIGHT + 200 },
    { left: -200, right: 0, top: -2000, bottom: SCENE_HEIGHT + 200 },
    { left: SCENE_WIDTH, right: SCENE_WIDTH + 200, top: -2000, bottom: SCENE_HEIGHT + 200 },
  ]
}

/** Chồng nhau dưới ngưỡng này coi như chỉ chạm (vật nằm yên lún khoảng 0,1 do thư viện vật lý; không được tính là chồng khối). */
const TOUCH_EPSILON = 0.5
const intersects = (a: Rect, b: Rect) =>
  a.left < b.right - TOUCH_EPSILON && b.left < a.right - TOUCH_EPSILON && a.top < b.bottom - TOUCH_EPSILON && b.top < a.bottom - TOUCH_EPSILON

/**
 * Đưa vật ra khỏi các khối đặc nếu buông tay lúc đang chồng lên chúng (nếu không, thư viện vật lý sẽ đẩy vật văng đi
 * khó đoán). Thử đặt TRÊN, DƯỚI, bên TRÁI hoặc bên PHẢI khối; chọn cách dịch ngắn nhất mà không chồng khối nào và còn trong
 * cảnh (hoà thì ưu tiên theo thứ tự trên, dưới, trái, phải); không cách nào được thì đặt trên. Hàm thuần.
 */
export function liftOutOfSolids(center: Point, size: Size, solids: readonly Rect[]): Point {
  const free = (p: Point) => {
    const box = itemRect(p, size)
    return box.left >= 0 && box.right <= SCENE_WIDTH && box.top >= 0 && box.bottom <= SCENE_HEIGHT && !solids.some((s) => intersects(box, s))
  }
  let current = center
  for (let round = 0; round < solids.length + 1; round += 1) {
    const box = itemRect(current, size)
    const hit = solids.filter((solid) => intersects(box, solid))
    if (hit.length === 0) return current
    const above = { x: current.x, y: Math.min(...hit.map((s) => s.top)) - size.height / 2 }
    const candidates: Point[] = [
      above,
      { x: current.x, y: Math.max(...hit.map((s) => s.bottom)) + size.height / 2 },
      { x: Math.min(...hit.map((s) => s.left)) - size.width / 2, y: current.y },
      { x: Math.max(...hit.map((s) => s.right)) + size.width / 2, y: current.y },
    ]
    const distance = (p: Point) => Math.abs(p.x - current.x) + Math.abs(p.y - current.y)
    let best: Point | undefined
    for (const candidate of candidates) {
      if (free(candidate) && (best === undefined || distance(candidate) < distance(best))) best = candidate
    }
    current = best ?? above
  }
  return current
}
