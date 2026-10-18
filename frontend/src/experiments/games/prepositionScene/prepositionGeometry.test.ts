import { describe, expect, it } from 'vitest'
import {
  classifyPlacement,
  clampCenter,
  describePlacement,
  GROUND_Y,
  horizontalOverlap,
  idealCenter,
  itemRect,
  landmarkRect,
  PREPOSITIONS,
  SCENE_HEIGHT,
  SCENE_WIDTH,
  satisfies,
  supportedPrepositions,
  TABLE_SLAB,
  verticalOverlap,
  type Landmark,
  type LandmarkKind,
  type Preposition,
  type Size,
} from './prepositionGeometry'

const TABLE: Landmark = { kind: 'TABLE', label: 'table', x: 230, y: 150, width: 260, height: 190 } // 230..490 × 150..340, mặt bàn đến y 186
const BOX: Landmark = { kind: 'BOX', label: 'box', x: 250, y: 180, width: 220, height: 160 } // 250..470 × 180..340
const SIZE: Size = { width: 100, height: 100 }

const at = (preposition: Preposition, landmark: Landmark, x: number, y: number) => satisfies(preposition, landmark, SIZE, { x, y })

describe('itemRect / landmarkRect / chồng lấn', () => {
  it('hộp bao quanh tâm', () => {
    expect(itemRect({ x: 100, y: 50 }, { width: 40, height: 20 })).toEqual({ left: 80, right: 120, top: 40, bottom: 60 })
    expect(landmarkRect(TABLE)).toEqual({ left: 230, right: 490, top: 150, bottom: 340 })
  })

  it('tỉ lệ chồng lấn ngang và dọc', () => {
    const mark = landmarkRect(BOX)
    expect(horizontalOverlap(itemRect({ x: 360, y: 0 }, SIZE), mark)).toBe(1)
    expect(horizontalOverlap(itemRect({ x: 250, y: 0 }, SIZE), mark)).toBe(0.5)
    expect(horizontalOverlap(itemRect({ x: 100, y: 0 }, SIZE), mark)).toBe(0)
    expect(verticalOverlap(itemRect({ x: 0, y: 330 }, SIZE), mark)).toBe(0.6)
    expect(horizontalOverlap(itemRect({ x: 0, y: 0 }, { width: 0, height: 10 }), mark)).toBe(0)
  })
})

describe('satisfies: ON (đặt lên mặt bàn / miệng hộp)', () => {
  it.each([
    [360, 100, true], // đáy đúng bằng mặt bàn
    [360, 110, true], // chìm 10
    [360, 125, true], // chìm đúng 25 (biên)
    [360, 126, false], // chìm quá
    [360, 50, true], // nổi đúng 50 (biên)
    [360, 49, false], // nổi quá cao
    [230, 100, true], // đúng nửa chiều rộng nằm trên mặt (biên)
    [229, 100, false],
    [490, 100, true],
    [491, 100, false],
    [100, 100, false], // hoàn toàn bên ngoài
  ])('bàn: tâm (%s, %s) → %s', (x, y, expected) => {
    expect(at('ON', TABLE, x, y)).toBe(expected)
  })

  it('hộp: đặt lên miệng hộp (y = 180 - 50), nhưng nằm trong hộp thì không', () => {
    expect(at('ON', BOX, 360, 130)).toBe(true)
    expect(at('ON', BOX, 360, 290)).toBe(false)
  })
})

describe('satisfies: UNDER (chui xuống gầm bàn)', () => {
  it.each([
    [360, 290, true], // đứng trên đất giữa hai chân
    [360, 226, true], // đỉnh vật lấn lên mặt bàn đúng 10 (biên)
    [360, 225, false],
    [360, 315, true], // đáy chìm dưới đất đúng 25 (biên)
    [360, 316, false],
    [255, 290, true], // tối thiểu 75% chiều rộng nằm dưới bàn (biên)
    [254, 290, false],
    [465, 290, true],
    [466, 290, false],
    [360, 100, false], // ở trên bàn
  ])('bàn: tâm (%s, %s) → %s', (x, y, expected) => {
    expect(at('UNDER', TABLE, x, y)).toBe(expected)
  })

  it('gầm bàn tính từ đáy mặt bàn: dải y hợp lệ bắt đầu ở 150 + TABLE_SLAB - 10 + 50', () => {
    expect(TABLE_SLAB).toBe(36)
    expect(at('UNDER', TABLE, 360, 150 + TABLE_SLAB - 10 + 50)).toBe(true)
  })

  it('hộp không có «under»', () => {
    expect(at('UNDER', BOX, 360, 290)).toBe(false)
  })
})

describe('satisfies: IN (bỏ vào hộp)', () => {
  // Hộp 250..470 × 180..340; vật 100×100 vừa hộp; chỉ cần TÂM vật nằm trong hộp.
  it.each([
    [360, 290, true],
    [360, 180, true], // thả vào miệng hộp: tâm đúng mép trên, nửa vật còn thò ra (biên)
    [360, 179, false],
    [360, 200, true], // vùng mà trước đây bị chấm sai (giữa ON và IN)
    [250, 290, true], // tâm đúng mép trái (biên)
    [249, 290, false],
    [470, 340, true], // tâm đúng góc dưới phải (biên)
    [471, 340, false],
    [470, 341, false],
    [360, 130, false], // nằm trên miệng hộp: là «on», không phải «in»
    [100, 290, false],
  ])('hộp: tâm (%s, %s) → %s', (x, y, expected) => {
    expect(at('IN', BOX, x, y)).toBe(expected)
  })

  it('bàn không có «in»', () => {
    expect(at('IN', TABLE, 360, 290)).toBe(false)
  })

  it('vật to hơn hộp (rộng hoặc cao) thì không bao giờ «in», dù tâm nằm trong hộp', () => {
    for (const big of [{ width: 300, height: 100 }, { width: 100, height: 200 }]) {
      for (let x = 0; x <= SCENE_WIDTH; x += 10) expect(satisfies('IN', BOX, big, { x, y: 290 })).toBe(false)
    }
    expect(satisfies('IN', BOX, { width: 220, height: 160 }, { x: 360, y: 260 })).toBe(true) // vừa khít thì được
  })
})

describe('satisfies: NEXT_TO (đứng cạnh)', () => {
  it.each([
    [560, 290, true], // bên phải, hở 40
    [510, 290, true], // lấn vào 10 (biên)
    [509, 290, false],
    [620, 290, true], // hở đúng 100 (biên)
    [621, 290, false],
    [210, 290, true], // bên trái, lấn 10 (biên)
    [211, 290, false],
    [100, 290, true], // bên trái, hở 100 (biên)
    [99, 290, false],
    [560, 180, true], // chồng dọc đúng một nửa (biên)
    [560, 179, false],
    [560, 330, true],
    [360, 290, false], // nằm trong hộp
  ])('hộp: tâm (%s, %s) → %s', (x, y, expected) => {
    expect(at('NEXT_TO', BOX, x, y)).toBe(expected)
  })

  it('đứng cạnh bàn trên đất', () => {
    expect(at('NEXT_TO', TABLE, 560, 290)).toBe(true) // hở 20
    expect(at('NEXT_TO', TABLE, 640, 290)).toBe(true) // hở đúng 100 (biên)
    expect(at('NEXT_TO', TABLE, 641, 290)).toBe(false)
  })

  it('bay lơ lửng cao hơn dải của vật mốc thì không phải «cạnh»', () => {
    expect(at('NEXT_TO', BOX, 560, 100)).toBe(false)
  })
})

describe('đầu vào hỏng', () => {
  it('NaN, Infinity hoặc kích thước hỏng thì không bao giờ đúng', () => {
    for (const preposition of PREPOSITIONS) {
      expect(satisfies(preposition, BOX, SIZE, { x: Number.NaN, y: 290 })).toBe(false)
      expect(satisfies(preposition, BOX, SIZE, { x: 360, y: Number.POSITIVE_INFINITY })).toBe(false)
      expect(satisfies(preposition, BOX, { width: Number.NaN, height: 100 }, { x: 360, y: 290 })).toBe(false)
    }
  })
})

describe('supportedPrepositions', () => {
  it('bàn: on, under, next to; hộp: in, on, next to', () => {
    expect([...supportedPrepositions('TABLE')]).toEqual(['ON', 'UNDER', 'NEXT_TO'])
    expect([...supportedPrepositions('BOX')]).toEqual(['IN', 'ON', 'NEXT_TO'])
  })
})

describe('các quy tắc rời nhau', () => {
  const scan = (landmark: Landmark, size: Size) => {
    const counts = new Map<Preposition, number>()
    let positions = 0
    let ambiguous = 0
    for (let x = size.width / 2; x <= SCENE_WIDTH - size.width / 2; x += 5) {
      for (let y = size.height / 2; y <= SCENE_HEIGHT - size.height / 2; y += 5) {
        positions += 1
        const matched = classifyPlacement(landmark, size, { x, y })
        if (matched.length > 1) ambiguous += 1
        for (const p of matched) counts.set(p, (counts.get(p) ?? 0) + 1)
      }
    }
    return { counts, positions, ambiguous }
  }

  it.each<[LandmarkKind, Landmark]>([
    ['TABLE', TABLE],
    ['BOX', BOX],
  ])('%s: quét cả cảnh, không vị trí nào thoả hai quy tắc cùng lúc', (_kind, landmark) => {
    const { ambiguous } = scan(landmark, SIZE)
    expect(ambiguous).toBe(0)
  })

  it('mỗi quy tắc được hỗ trợ có vùng đúng thật, và chỉ chiếm phần nhỏ của cảnh (không đúng bừa)', () => {
    for (const landmark of [TABLE, BOX]) {
      const { counts, positions } = scan(landmark, SIZE)
      for (const preposition of supportedPrepositions(landmark.kind)) {
        const share = (counts.get(preposition) ?? 0) / positions
        expect([landmark.kind, preposition, share > 0]).toEqual([landmark.kind, preposition, true])
        expect([landmark.kind, preposition, share < 0.25]).toEqual([landmark.kind, preposition, true])
      }
    }
  })

  it('vật nhỏ hơn, to hơn và hình chữ nhật dẹt (60×60, 140×140, 200×20, 20×140) vẫn rời nhau', () => {
    for (const size of [{ width: 60, height: 60 }, { width: 140, height: 140 }, { width: 200, height: 20 }, { width: 20, height: 140 }]) {
      for (const landmark of [TABLE, BOX]) expect(scan(landmark, size).ambiguous).toBe(0)
    }
  })

  it('tâm hình học (hai quy tắc khác nhau không trùng nhau)', () => {
    expect(classifyPlacement(BOX, SIZE, { x: 360, y: 290 })).toEqual(['IN'])
    expect(classifyPlacement(BOX, SIZE, { x: 360, y: 130 })).toEqual(['ON'])
    expect(classifyPlacement(BOX, SIZE, { x: 560, y: 290 })).toEqual(['NEXT_TO'])
    expect(classifyPlacement(TABLE, SIZE, { x: 360, y: 290 })).toEqual(['UNDER'])
    expect(classifyPlacement(TABLE, SIZE, { x: 100, y: 100 })).toEqual([])
  })
})

describe('idealCenter', () => {
  it.each<[Preposition, Landmark]>([
    ['ON', TABLE],
    ['UNDER', TABLE],
    ['NEXT_TO', TABLE],
    ['IN', BOX],
    ['ON', BOX],
    ['NEXT_TO', BOX],
  ])('%s %s: tâm lý tưởng thoả đúng quy tắc, nằm trong cảnh', (preposition, landmark) => {
    const center = idealCenter(preposition, landmark, SIZE)!
    expect(satisfies(preposition, landmark, SIZE, center)).toBe(true)
    expect(clampCenter(center, SIZE)).toEqual(center)
    expect(classifyPlacement(landmark, SIZE, center)).toEqual([preposition])
  })

  it('vật đứng trên đất: UNDER, IN, NEXT_TO có đáy ở mặt đất', () => {
    expect(GROUND_Y).toBe(TABLE.y + TABLE.height)
    for (const [p, l] of [['UNDER', TABLE], ['IN', BOX], ['NEXT_TO', BOX]] as const) {
      expect(idealCenter(p, l, SIZE)!.y + SIZE.height / 2).toBe(GROUND_Y)
    }
  })

  it('«next to» ưu tiên bên phải; hết chỗ bên phải thì sang bên trái', () => {
    expect(idealCenter('NEXT_TO', BOX, SIZE)!.x).toBeGreaterThan(BOX.x + BOX.width)
    const nearEdge: Landmark = { kind: 'BOX', label: 'box', x: 500, y: 180, width: 200, height: 160 }
    const ideal = idealCenter('NEXT_TO', nearEdge, SIZE)!
    expect(ideal.x).toBeLessThan(nearEdge.x)
    expect(satisfies('NEXT_TO', nearEdge, SIZE, ideal)).toBe(true)
  })

  it('«next to» không còn chỗ ở cả hai bên thì null', () => {
    const wide: Landmark = { kind: 'BOX', label: 'box', x: 10, y: 180, width: 700, height: 160 }
    expect(idealCenter('NEXT_TO', wide, SIZE)).toBeNull()
  })

  it('preposition mà vật mốc không hỗ trợ thì null', () => {
    expect(idealCenter('IN', TABLE, SIZE)).toBeNull()
    expect(idealCenter('UNDER', BOX, SIZE)).toBeNull()
  })

  it('đúng với nhiều cỡ vật (60 đến 120)', () => {
    for (const side of [60, 80, 100, 120]) {
      const size = { width: side, height: side }
      for (const [p, l] of [['ON', TABLE], ['UNDER', TABLE], ['NEXT_TO', TABLE], ['IN', BOX], ['ON', BOX], ['NEXT_TO', BOX]] as const) {
        const center = idealCenter(p, l, size)!
        expect([side, p, l.kind, satisfies(p, l, size, center)]).toEqual([side, p, l.kind, true])
      }
    }
  })
})

describe('loại vật mốc lạ (dữ liệu hỏng)', () => {
  it('không hỗ trợ quy tắc nào và không bao giờ đúng', () => {
    const weird = { ...BOX, kind: 'SHELF' } as unknown as Landmark
    expect(supportedPrepositions(weird.kind)).toEqual([])
    for (const p of PREPOSITIONS) expect(satisfies(p, weird, SIZE, { x: 360, y: 290 })).toBe(false)
  })
})

describe('describePlacement (đọc cho trình đọc màn hình)', () => {
  it.each([
    [{ x: 360, y: 100 }, 'The cat is on the table.'],
    [{ x: 360, y: 290 }, 'The cat is under the table.'],
    [{ x: 560, y: 290 }, 'The cat is next to the table.'],
    [{ x: 110, y: 110 }, 'The cat is above and to the left of the table.'],
    [{ x: 600, y: 50 }, 'The cat is above and to the right of the table.'],
    [{ x: 360, y: 40 }, 'The cat is above the table.'],
  ])('tâm %j → %s', (center, expected) => {
    expect(describePlacement(TABLE, 'cat', SIZE, center)).toBe(expected)
  })

  it('hộp: «in the box»', () => {
    expect(describePlacement(BOX, 'ball', SIZE, { x: 360, y: 290 })).toBe('The ball is in the box.')
  })
})

describe('clampCenter', () => {
  it('kẹp để cả vật nằm trong cảnh', () => {
    expect(clampCenter({ x: -100, y: -100 }, SIZE)).toEqual({ x: 50, y: 50 })
    expect(clampCenter({ x: 9999, y: 9999 }, SIZE)).toEqual({ x: SCENE_WIDTH - 50, y: SCENE_HEIGHT - 50 })
    expect(clampCenter({ x: 300, y: 200 }, SIZE)).toEqual({ x: 300, y: 200 })
  })

  it('không hữu hạn thì về giữa vùng cho phép', () => {
    expect(clampCenter({ x: Number.NaN, y: Number.POSITIVE_INFINITY }, SIZE)).toEqual({ x: SCENE_WIDTH / 2, y: SCENE_HEIGHT / 2 })
  })
})
