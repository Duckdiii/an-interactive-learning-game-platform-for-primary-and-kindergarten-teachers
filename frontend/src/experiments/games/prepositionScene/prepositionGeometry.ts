/**
 * Hình học 2D thuần của PREPOSITION_SCENE: «đặt vật ở trên / dưới / trong / cạnh» một vật mốc, kiểm bằng quy tắc hình
 * học trên hộp bao (toạ độ cảnh, gốc ở góc trên trái, y hướng xuống). Mọi dung sai là hằng số có tên để chỉnh và test.
 * Các quy tắc là bản đơn giản hóa 2D, CHƯA được giáo viên tiếng Anh xác nhận (đặc biệt «on» khi vật hơi nổi/chìm).
 */
export type Preposition = 'ON' | 'UNDER' | 'IN' | 'NEXT_TO'
export const PREPOSITIONS: readonly Preposition[] = ['ON', 'UNDER', 'IN', 'NEXT_TO']

/** TABLE: mặt bàn + chân (đặt lên, chui xuống, đứng cạnh); BOX: hộp mở nắp (bỏ vào, đặt lên, đứng cạnh). */
export type LandmarkKind = 'TABLE' | 'BOX'

export interface Point {
  x: number
  y: number
}

export interface Size {
  width: number
  height: number
}

/** Vật mốc: hình chữ nhật (x, y là góc trên trái) gồm cả chân bàn. */
export interface Landmark {
  kind: LandmarkKind
  label: string
  x: number
  y: number
  width: number
  height: number
}

export interface Rect {
  left: number
  right: number
  top: number
  bottom: number
}

export const SCENE_WIDTH = 720
export const SCENE_HEIGHT = 380
/** Mặt đất: vật đứng trên đường y này. */
export const GROUND_Y = 340
/** Độ dày mặt bàn (phần trên cùng của hình chữ nhật bàn). */
export const TABLE_SLAB = 36

/** Dung sai theo cỡ vật (nhân với cạnh tương ứng của vật). */
export const FLOAT_TOLERANCE = 0.5 // «on»: vật được nổi cao hơn mặt tối đa 0,5 chiều cao
export const SINK_TOLERANCE = 0.25 // «on»: vật được chìm xuống dưới mặt tối đa 0,25 chiều cao
export const ON_MIN_OVERLAP = 0.5 // «on»: tối thiểu một nửa chiều rộng vật nằm trên mặt
export const UNDER_MIN_OVERLAP = 0.75 // «under»: gần như nằm trọn giữa hai chân
export const UNDER_TOP_SLACK = 0.1 // «under»: đỉnh vật được lấn lên mặt bàn tối đa 0,1 chiều cao
export const GROUND_SLACK = 0.25 // «under»: đáy vật được chìm dưới đáy bàn tối đa 0,25 chiều cao
export const NEXT_TO_MAX_GAP = 1 // «next to»: khoảng hở tối đa bằng 1 chiều rộng vật
export const NEXT_TO_MAX_OVERLAP = 0.1 // «next to»: được chạm lấn tối đa 0,1 chiều rộng vật
export const NEXT_TO_MIN_V_OVERLAP = 0.5 // «next to»: chiều cao vật phải nằm ít nhất một nửa trong dải của vật mốc
/** Khoảng hở dùng khi tính vị trí lý tưởng «next to» (nhỏ hơn mức tối đa để còn dư lề). */
export const NEXT_TO_IDEAL_GAP = 0.3

export function itemRect(center: Point, size: Size): Rect {
  return { left: center.x - size.width / 2, right: center.x + size.width / 2, top: center.y - size.height / 2, bottom: center.y + size.height / 2 }
}

export function landmarkRect(landmark: Landmark): Rect {
  return { left: landmark.x, right: landmark.x + landmark.width, top: landmark.y, bottom: landmark.y + landmark.height }
}

const overlapLength = (a0: number, a1: number, b0: number, b1: number) => Math.max(0, Math.min(a1, b1) - Math.max(a0, b0))

/** Tỉ lệ chiều rộng của vật nằm trong dải ngang của vật mốc, 0 đến 1. */
export function horizontalOverlap(item: Rect, mark: Rect): number {
  const width = item.right - item.left
  return width > 0 ? overlapLength(item.left, item.right, mark.left, mark.right) / width : 0
}

/** Tỉ lệ chiều cao của vật nằm trong dải dọc của vật mốc, 0 đến 1. */
export function verticalOverlap(item: Rect, mark: Rect): number {
  const height = item.bottom - item.top
  return height > 0 ? overlapLength(item.top, item.bottom, mark.top, mark.bottom) / height : 0
}

/** Preposition mà từng loại vật mốc hỗ trợ. */
export function supportedPrepositions(kind: LandmarkKind): readonly Preposition[] {
  if (kind === 'TABLE') return ['ON', 'UNDER', 'NEXT_TO']
  if (kind === 'BOX') return ['IN', 'ON', 'NEXT_TO']
  return [] // loại vật mốc lạ (dữ liệu hỏng): không hỗ trợ quy tắc nào
}

/** Vật đặt tại `center` (kích thước `size`) có thoả quy tắc `preposition` đối với `landmark` không. Hàm thuần. */
export function satisfies(preposition: Preposition, landmark: Landmark, size: Size, center: Point): boolean {
  if (![center.x, center.y, size.width, size.height].every(Number.isFinite)) return false
  if (!supportedPrepositions(landmark.kind).includes(preposition)) return false
  const item = itemRect(center, size)
  const mark = landmarkRect(landmark)
  const { width, height } = size

  switch (preposition) {
    case 'ON': {
      const floating = mark.top - item.bottom // dương: nổi cao hơn mặt; âm: chìm xuống dưới mặt
      return horizontalOverlap(item, mark) >= ON_MIN_OVERLAP && floating >= -SINK_TOLERANCE * height && floating <= FLOAT_TOLERANCE * height
    }
    case 'UNDER': {
      const slabBottom = mark.top + TABLE_SLAB
      return (
        horizontalOverlap(item, mark) >= UNDER_MIN_OVERLAP &&
        item.top >= slabBottom - UNDER_TOP_SLACK * height &&
        item.bottom <= mark.bottom + GROUND_SLACK * height
      )
    }
    case 'IN': {
      // Vật phải vừa hộp và TÂM vật nằm trong hộp: thả vào miệng hộp (nửa vật còn thò ra) vẫn tính là «in»,
      // đúng với cách trẻ thả. Tâm trong hộp nên luôn rời «on» (tâm phía trên miệng hộp) và «next to» (chồng ngang ≥ 0,5).
      const fits = width <= mark.right - mark.left && height <= mark.bottom - mark.top
      return fits && center.x >= mark.left && center.x <= mark.right && center.y >= mark.top && center.y <= mark.bottom
    }
    case 'NEXT_TO': {
      const gap = item.left >= mark.right ? item.left - mark.right : mark.left >= item.right ? mark.left - item.right : -horizontalOverlap(item, mark) * width
      return gap >= -NEXT_TO_MAX_OVERLAP * width && gap <= NEXT_TO_MAX_GAP * width && verticalOverlap(item, mark) >= NEXT_TO_MIN_V_OVERLAP
    }
  }
}

/** Mọi preposition mà vị trí này thoả (rỗng nếu chưa thoả cái nào). Các quy tắc được thiết kế rời nhau, nên tối đa một. */
export function classifyPlacement(landmark: Landmark, size: Size, center: Point): Preposition[] {
  return PREPOSITIONS.filter((preposition) => satisfies(preposition, landmark, size, center))
}

/** Kẹp tâm vật sao cho toàn bộ vật nằm trong cảnh. Đầu vào không hữu hạn thì về giữa cảnh. */
export function clampCenter(center: Point, size: Size): Point {
  const clamp = (value: number, min: number, max: number) => (Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : (min + max) / 2)
  return {
    x: clamp(center.x, size.width / 2, SCENE_WIDTH - size.width / 2),
    y: clamp(center.y, size.height / 2, SCENE_HEIGHT - size.height / 2),
  }
}

/**
 * Vị trí lý tưởng (tâm vật) để chỉ cho trẻ khi sai: ở giữa vùng đúng. `null` nếu vật mốc không hỗ trợ preposition
 * hoặc không có chỗ nào trong cảnh. «next to» ưu tiên bên phải; hết chỗ thì sang bên trái; cả hai bên đều không vừa thì `null`.
 */
export function idealCenter(preposition: Preposition, landmark: Landmark, size: Size): Point | null {
  if (!supportedPrepositions(landmark.kind).includes(preposition)) return null
  const mark = landmarkRect(landmark)
  const centerX = (mark.left + mark.right) / 2
  switch (preposition) {
    case 'ON':
      return { x: centerX, y: mark.top - size.height / 2 }
    case 'UNDER':
    case 'IN':
      return { x: centerX, y: mark.bottom - size.height / 2 }
    case 'NEXT_TO': {
      const offset = NEXT_TO_IDEAL_GAP * size.width + size.width / 2
      const y = mark.bottom - size.height / 2
      const right = { x: mark.right + offset, y }
      if (right.x + size.width / 2 <= SCENE_WIDTH) return right
      const left = { x: mark.left - offset, y }
      return left.x - size.width / 2 >= 0 ? left : null
    }
  }
}

const RELATION_WORDS: Record<Preposition, string> = { ON: 'on', UNDER: 'under', IN: 'in', NEXT_TO: 'next to' }

/** Câu tiếng Anh ngắn cho trình đọc màn hình: vật đang ở đâu so với vật mốc. */
export function describePlacement(landmark: Landmark, itemLabel: string, size: Size, center: Point): string {
  const [relation] = classifyPlacement(landmark, size, center)
  if (relation) return `The ${itemLabel} is ${RELATION_WORDS[relation]} the ${landmark.label}.`
  const mark = landmarkRect(landmark)
  const horizontal = center.x < mark.left ? 'to the left of' : center.x > mark.right ? 'to the right of' : 'over'
  const vertical = center.y < mark.top ? 'above' : 'below'
  return `The ${itemLabel} is ${horizontal === 'over' ? vertical : `${vertical} and ${horizontal}`} the ${landmark.label}.`
}
