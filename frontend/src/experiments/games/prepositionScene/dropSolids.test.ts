import { describe, expect, it } from 'vitest'
import { BOX_WALL, landmarkSolids, liftOutOfSolids, sceneBounds, TABLE_LEG_INSET, TABLE_LEG_WIDTH } from './dropSolids'
import { mockPrepositionIn, mockPrepositionOn } from './prepositionFixtures'
import { GROUND_Y, itemRect, SCENE_HEIGHT, SCENE_WIDTH, TABLE_SLAB, type Rect } from './prepositionGeometry'

const TABLE = mockPrepositionOn.landmark // x 230..490, y 150..340
const BOX = mockPrepositionIn.landmark // x 250..470, y 180..340
const SIZE = { width: 100, height: 100 }
const overlaps = (a: Rect, b: Rect) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom

describe('landmarkSolids', () => {
  it('bàn: mặt bàn và hai chân khớp hình vẽ, có gầm rỗng giữa hai chân', () => {
    const [slab, leftLeg, rightLeg] = landmarkSolids(TABLE)
    expect(slab).toEqual({ left: 230, right: 490, top: 150, bottom: 150 + TABLE_SLAB })
    expect(leftLeg).toEqual({ left: 230 + TABLE_LEG_INSET, right: 230 + TABLE_LEG_INSET + TABLE_LEG_WIDTH, top: 150 + TABLE_SLAB, bottom: 340 })
    expect(rightLeg).toEqual({ left: 490 - TABLE_LEG_INSET - TABLE_LEG_WIDTH, right: 490 - TABLE_LEG_INSET, top: 150 + TABLE_SLAB, bottom: 340 })
    expect(rightLeg.left - leftLeg.right).toBeGreaterThan(SIZE.width) // vật 100 chui lọt gầm
  })

  it('hộp: đáy và hai thành, bên trong rỗng để vật lọt vào', () => {
    const [floor, left, right] = landmarkSolids(BOX)
    expect(floor).toEqual({ left: 250, right: 470, top: 340 - BOX_WALL, bottom: 340 })
    expect(left).toEqual({ left: 250, right: 250 + BOX_WALL, top: 180, bottom: 340 })
    expect(right).toEqual({ left: 470 - BOX_WALL, right: 470, top: 180, bottom: 340 })
    expect(right.left - left.right).toBeGreaterThan(SIZE.width)
  })

  it('loại vật mốc lạ (dữ liệu hỏng) được coi như hộp, không ném lỗi', () => {
    expect(() => landmarkSolids({ ...TABLE, kind: 'LẠ' as never })).not.toThrow()
  })
})

describe('sceneBounds', () => {
  it('mặt đất ở GROUND_Y và hai vách ngoài mép cảnh', () => {
    const [ground, leftWall, rightWall] = sceneBounds()
    expect(ground.top).toBe(GROUND_Y)
    expect(leftWall.right).toBe(0)
    expect(rightWall.left).toBe(SCENE_WIDTH)
  })
})

describe('liftOutOfSolids', () => {
  const solids = [...landmarkSolids(TABLE), ...sceneBounds()]

  it('không chồng khối nào thì giữ nguyên', () => {
    const center = { x: 360, y: 60 }
    expect(liftOutOfSolids(center, SIZE, solids)).toBe(center)
  })

  it('chồng mặt bàn, tâm gần mép trên: đặt LÊN mặt bàn', () => {
    expect(liftOutOfSolids({ x: 360, y: 120 }, SIZE, solids)).toEqual({ x: 360, y: 100 })
  })

  it('chồng mặt bàn, tâm gần mép dưới: đặt DƯỚI mặt bàn (không ném lên bàn)', () => {
    expect(liftOutOfSolids({ x: 360, y: 190 }, SIZE, solids)).toEqual({ x: 360, y: 150 + TABLE_SLAB + 50 })
  })

  it('chồng một chân bàn: dịch ngang vào gầm thay vì ném lên bàn', () => {
    const lifted = liftOutOfSolids({ x: 270, y: 250 }, SIZE, solids)
    expect(lifted.y).toBe(250)
    expect(lifted.x).toBe(320) // sát mép phải chân trái (270) + nửa vật
  })

  it('vật nằm yên lún 0,1 vào mặt đất (độ lún của thư viện) không bị coi là chồng đất: chỉ tính chân bàn', () => {
    const lifted = liftOutOfSolids({ x: 210, y: 290.1 }, SIZE, solids)
    expect(lifted.y).toBe(290.1)
    expect(lifted.x).toBe(196) // sang trái chân bàn (gần hơn), không bị đẩy tới tận mép đất
  })

  it('chồng thành hộp: ra khỏi thành, không chui qua', () => {
    const boxSolids = [...landmarkSolids(BOX), ...sceneBounds()]
    const lifted = liftOutOfSolids({ x: 252, y: 250 }, SIZE, boxSolids)
    expect(boxSolids.some((s) => overlaps(itemRect(lifted, SIZE), s))).toBe(false)
  })

  it('chỉ có khối của vật mốc (không có đất/vách): ứng viên ngoài cảnh bị loại, kết quả vẫn trong cảnh', () => {
    const only = landmarkSolids(TABLE)
    // x = 258 nằm giữa chân trái: dịch xuống (ra ngoài cảnh) là cách ngắn nhất nếu không có kiểm tra trong cảnh.
    for (const [x, y] of [[258, 330], [258, 320], [270, 300]]) {
      const box = itemRect(liftOutOfSolids({ x, y }, SIZE, only), SIZE)
      expect(box.top >= 0 && box.bottom <= SCENE_HEIGHT && box.left >= 0 && box.right <= SCENE_WIDTH, `(${x},${y})`).toBe(true)
    }
  })

  it('quét mọi vị trí trong cảnh: kết quả luôn không chồng khối đặc nào và nằm trong cảnh', () => {
    for (const landmark of [TABLE, BOX]) {
      const all = [...landmarkSolids(landmark), ...sceneBounds()]
      for (let x = 50; x <= SCENE_WIDTH - 50; x += 10) {
        for (let y = 50; y <= GROUND_Y - 50; y += 10) {
          const lifted = liftOutOfSolids({ x, y }, SIZE, all)
          const box = itemRect(lifted, SIZE)
          expect(all.some((s) => overlaps(box, s)), `${landmark.kind} (${x},${y}) → (${lifted.x},${lifted.y})`).toBe(false)
          expect(box.left >= 0 && box.right <= SCENE_WIDTH && box.top >= 0 && box.bottom <= SCENE_HEIGHT).toBe(true)
        }
      }
    }
  })
})
