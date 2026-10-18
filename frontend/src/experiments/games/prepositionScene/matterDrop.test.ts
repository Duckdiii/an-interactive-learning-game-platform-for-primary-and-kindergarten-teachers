import { describe, expect, it } from 'vitest'
import { landmarkSolids, liftOutOfSolids, sceneBounds } from './dropSolids'
import { MAX_STEPS, simulateDrop } from './matterDrop'
import { mockPrepositionIn, mockPrepositionNextTo, mockPrepositionOn, mockPrepositionUnder } from './prepositionFixtures'
import { classifyPlacement, itemRect, SCENE_HEIGHT, SCENE_WIDTH, satisfies, type Landmark, type Rect } from './prepositionGeometry'

const TABLE = mockPrepositionOn.landmark
const BOX = mockPrepositionIn.landmark
const SIZE = { width: 100, height: 100 }
const drop = (landmark: Landmark, x: number, y: number) => simulateDrop({ landmark, size: SIZE, start: { x, y } })

/** Độ lún (đơn vị cảnh) của hai hình chữ nhật vào nhau; 0 nếu không chồng. */
function overlapDepth(a: Rect, b: Rect): number {
  const w = Math.min(a.right, b.right) - Math.max(a.left, b.left)
  const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
  return w > 0 && h > 0 ? Math.min(w, h) : 0
}

describe('simulateDrop: tính tất định', () => {
  it('cùng đầu vào luôn ra đúng cùng kết quả, từng khung một', () => {
    expect(drop(TABLE, 360, 40)).toEqual(drop(TABLE, 360, 40))
  })

  it('không phụ thuộc lịch sử: chạy xen kẽ đầu vào khác vẫn ra cùng kết quả', () => {
    const first = drop(BOX, 360, 30)
    drop(TABLE, 100, 100)
    drop(BOX, 300, 200)
    expect(drop(BOX, 360, 30)).toEqual(first)
  })

  it('vị trí cuối là khung cuối, đã làm tròn 0,1', () => {
    const r = drop(TABLE, 360, 40)
    expect(r.frames[r.frames.length - 1]).toEqual(r.final)
    expect(Math.round(r.final.x * 10) / 10).toBe(r.final.x)
    expect(Math.round(r.final.y * 10) / 10).toBe(r.final.y)
  })

  it('nằm yên trong dưới 1 giây và có nhiều khung để vẽ', () => {
    const r = drop(TABLE, 360, 40)
    expect(r.settled).toBe(true)
    expect(r.frames.length).toBeGreaterThan(10)
    expect(r.frames.length).toBeLessThan(60)
    expect(r.frames.length).toBeLessThanOrEqual(MAX_STEPS + 1)
  })
})

describe('simulateDrop: kết quả vật lý', () => {
  it('thả từ trên cao xuống giữa mặt bàn: nằm trên bàn (ON)', () => {
    const { final } = drop(TABLE, 360, 40)
    expect(Math.abs(final.y - 100)).toBeLessThan(1)
    expect(final.x).toBe(360)
    expect(satisfies('ON', TABLE, SIZE, final)).toBe(true)
  })

  it('thả vào gầm bàn: rơi xuống đất (UNDER)', () => {
    const { final } = drop(TABLE, 360, 260)
    expect(final.y).toBeGreaterThan(285)
    expect(satisfies('UNDER', TABLE, SIZE, final)).toBe(true)
  })

  it('thả từ trên miệng hộp: lọt vào hộp, nằm trên đáy (IN)', () => {
    const { final } = drop(BOX, 360, 40)
    expect(final.y).toBeGreaterThan(260)
    expect(satisfies('IN', BOX, SIZE, final)).toBe(true)
  })

  it('thả bên cạnh hộp: rơi xuống đất cạnh hộp (NEXT_TO)', () => {
    const { final } = drop(mockPrepositionNextTo.landmark, 560, 100)
    expect(satisfies('NEXT_TO', BOX, SIZE, final)).toBe(true)
  })

  it('buông đè lên mặt bàn từ phía dưới: được đưa ra dưới mặt bàn rồi rơi xuống đất (UNDER)', () => {
    expect(satisfies('UNDER', TABLE, SIZE, drop(TABLE, 360, 190).final)).toBe(true)
  })

  it('buông đè lên chân bàn: dịch vào gầm, không bị ném lên bàn', () => {
    expect(satisfies('UNDER', TABLE, SIZE, drop(TABLE, 270, 250).final)).toBe(true)
  })

  it('vật không xoay hay lật (khớp hộp bao dùng để chấm): chồng nửa trên mép bàn vẫn nằm yên ở đó', () => {
    // Giới hạn đã biết: vật thật sẽ trượt/lật khỏi mép; ở đây nó "treo" nửa trên bàn và có thể không thuộc quy tắc nào.
    const { final } = drop(TABLE, 215, 60)
    expect(Math.abs(final.y - 100)).toBeLessThan(1)
    expect(final.x).toBe(215)
  })

  it('đầu hoạt ảnh là rơi xuống: y không giảm trong nửa đầu', () => {
    const { frames } = drop(TABLE, 360, 40)
    for (let i = 1; i < Math.floor(frames.length / 2); i += 1) expect(frames[i].y).toBeGreaterThanOrEqual(frames[i - 1].y - 0.01)
  })

  it('quét lưới vị trí buông trên bàn và hộp: luôn nằm yên, trong cảnh, không lún vào khối đặc quá 2 đơn vị', () => {
    for (const landmark of [TABLE, BOX]) {
      const solids = [...landmarkSolids(landmark), ...sceneBounds()]
      for (let x = 50; x <= SCENE_WIDTH - 50; x += 40) {
        for (let y = 50; y <= 290; y += 60) {
          const r = drop(landmark, x, y)
          const box = itemRect(r.final, SIZE)
          const where = `${landmark.kind} (${x},${y}) → (${r.final.x},${r.final.y})`
          expect(r.settled, where).toBe(true)
          expect(box.left >= 0 && box.right <= SCENE_WIDTH && box.top >= 0 && box.bottom <= SCENE_HEIGHT, where).toBe(true)
          for (const solid of solids) expect(overlapDepth(box, solid), where).toBeLessThan(2)
        }
      }
    }
  })

  it('mỗi vị trí cuối thoả tối đa MỘT quy tắc (quy tắc rời nhau)', () => {
    for (let x = 50; x <= SCENE_WIDTH - 50; x += 40) {
      for (let y = 50; y <= 290; y += 60) {
        expect(classifyPlacement(TABLE, SIZE, drop(TABLE, x, y).final).length).toBeLessThanOrEqual(1)
      }
    }
  })
})

describe('simulateDrop: mỗi câu hỏi mẫu trả lời đúng được bằng thả rơi', () => {
  it.each([
    ['ON', mockPrepositionOn, { x: 360, y: 40 }],
    ['UNDER', mockPrepositionUnder, { x: 360, y: 260 }],
    ['IN', mockPrepositionIn, { x: 360, y: 40 }],
    ['NEXT_TO', mockPrepositionNextTo, { x: 560, y: 100 }],
  ] as const)('%s', (_name, question, start) => {
    const { final } = simulateDrop({ landmark: question.landmark, size: SIZE, start })
    expect(satisfies(question.preposition, question.landmark, SIZE, final)).toBe(true)
  })
})

/**
 * Mốc đối chiếu viết tay, KHÔNG dùng thư viện vật lý: ra khỏi khối chồng, rồi rơi thẳng xuống đến khối đỡ cao nhất bên dưới.
 * Với vật không xoay và không trượt ngang (đúng cảnh này) kết quả phải trùng với mô phỏng.
 */
function straightDrop(landmark: Landmark, start: { x: number; y: number }) {
  const solids = [...landmarkSolids(landmark), ...sceneBounds()]
  const first = liftOutOfSolids(start, SIZE, solids)
  const box = itemRect(first, SIZE)
  const tops = solids.filter((s) => s.left < box.right && box.left < s.right && s.top >= box.bottom - 1e-9).map((s) => s.top)
  return { x: first.x, y: Math.min(...tops) - SIZE.height / 2 }
}

describe('lối bàn phím khi bật vật lý (nút nhích chỉ dời vật, «Let go» mới thả, dùng mô phỏng thật)', () => {
  const NUDGE = 20
  /** Bấm các nút nhích (dời tâm vật, không rơi) rồi «Let go»: chỉ lúc đó mới mô phỏng. */
  const nudgeThenRelease = (landmark: Landmark, moves: Array<[number, number, number]>) => {
    let at = { x: 110, y: 110 }
    for (const [dx, dy, times] of moves) at = { x: at.x + dx * NUDGE * times, y: at.y + dy * NUDGE * times }
    return simulateDrop({ landmark, size: SIZE, start: at }).final
  }

  it('chỉ bằng nút nhích + «Let go» tới được gầm bàn (UNDER)', () => {
    expect(satisfies('UNDER', TABLE, SIZE, nudgeThenRelease(TABLE, [[0, 1, 7], [1, 0, 13]]))).toBe(true)
  })

  it('tới được mặt bàn (ON) và vào hộp (IN)', () => {
    expect(satisfies('ON', TABLE, SIZE, nudgeThenRelease(TABLE, [[1, 0, 13]]))).toBe(true)
    expect(satisfies('IN', BOX, SIZE, nudgeThenRelease(BOX, [[1, 0, 13]]))).toBe(true)
  })

  it('cạnh hộp (NEXT_TO): nhích sang phải rồi thả', () => {
    expect(satisfies('NEXT_TO', BOX, SIZE, nudgeThenRelease(BOX, [[1, 0, 24]]))).toBe(true)
  })
})

describe('simulateDrop so với rơi thẳng viết tay (không thư viện)', () => {
  it('trùng nhau trong 1 đơn vị cảnh ở mọi điểm buông của lưới trên bàn và hộp', () => {
    for (const landmark of [TABLE, BOX]) {
      for (let x = 50; x <= SCENE_WIDTH - 50; x += 20) {
        for (let y = 50; y <= 290; y += 30) {
          const physics = drop(landmark, x, y).final
          const manual = straightDrop(landmark, { x, y })
          const where = `${landmark.kind} (${x},${y}): matter (${physics.x},${physics.y}) tay (${manual.x},${manual.y})`
          expect(Math.abs(physics.x - manual.x), where).toBeLessThan(1)
          expect(Math.abs(physics.y - manual.y), where).toBeLessThan(1)
        }
      }
    }
  })
})
