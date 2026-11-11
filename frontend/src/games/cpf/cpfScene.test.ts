import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { CpfEntity, CpfGame } from '../../types/cpf-game.types'
import { CPF_HUD_HEIGHT, CPF_STAGE_HEIGHT, CPF_STAGE_WIDTH, regionBox } from './cpfLayout'
import { MIN_DRAG, SNAP_DISTANCE, WALK_SPEED, buildInstances, instanceAt, snapZone, stepMotion, stepToward, stepWalker, touching, traceShot, type CpfInstance, type WalkGoal } from './cpfScene'

const EXAMPLES_DIR = join(__dirname, '../../../../backend/src/test/resources/cpf-examples')
const load = (name: string) => JSON.parse(readFileSync(join(EXAMPLES_DIR, `${name}.json`), 'utf8')) as CpfGame
const entities = (game: CpfGame) => new Map<string, CpfEntity>(game.entities.map((e) => [e.id, e]))

describe('buildInstances', () => {
  it('nhân vật bindTo choices theo lựa chọn của màn và mang nhãn', () => {
    const game = load('catch-even-apples')
    const insts = buildInstances(game, 0)

    expect(insts.filter((i) => i.entityId === 'apples').map((i) => i.label)).toEqual(['2', '3', '4', '7', '8'])
    expect(insts.filter((i) => i.entityId === 'basket')).toHaveLength(1)
  })

  it('lựa chọn có assetId riêng thì dùng, không thì dùng hình của vật', () => {
    const insts = buildInstances(load('sort-land-water-animals'), 0)

    expect(insts.find((i) => i.choiceId === 'c1')?.assetId).toBe('animal.cat')
    expect(insts.filter((i) => i.entityId === 'homes').map((i) => i.zoneId)).toEqual(['z1', 'z2'])
  })

  it('vật PROGRESS đứng theo số nấc đã đi', () => {
    const game = load('race-multiplication')
    const start = buildInstances(game, 0, 0).find((i) => i.entityId === 'car')!
    const end = buildInstances(game, 0, game.content.rounds.length).find((i) => i.entityId === 'car')!

    expect(start.x).toBe(regionBox('BOTTOM').x)
    expect(end.x).toBeGreaterThan(start.x)
  })

  it('màn không tồn tại thì rỗng', () => {
    expect(buildInstances(load('race-multiplication'), 99)).toEqual([])
  })
})

describe('stepMotion', () => {
  it('vật rơi ra khỏi đáy được sinh lại phía trên, không bao giờ mất hẳn', () => {
    const game = load('catch-even-apples')
    let insts = buildInstances(game, 0)
    for (let t = 0; t < 600; t++) insts = stepMotion(insts, entities(game), 1 / 30, t / 30)

    for (const i of insts.filter((x) => x.entityId === 'apples')) {
      expect(i.y).toBeGreaterThanOrEqual(CPF_HUD_HEIGHT - i.h - 1)
      expect(i.y).toBeLessThanOrEqual(CPF_STAGE_HEIGHT)
      expect(Number.isFinite(i.y)).toBe(true)
    }
  })

  it('PATROL_X luôn trong vùng của nó', () => {
    const game = load('fishing-compound-words')
    const area = regionBox('MIDDLE')
    let insts = buildInstances(game, 0)
    for (let t = 0; t < 900; t++) insts = stepMotion(insts, entities(game), 1 / 30, t / 30)

    for (const i of insts.filter((x) => x.entityId === 'fish')) {
      expect(i.x).toBeGreaterThanOrEqual(area.x)
      expect(i.x + i.w).toBeLessThanOrEqual(area.x + area.w + 0.001)
    }
  })

  it('không di chuyển vật đang kéo hoặc đã xong', () => {
    const game = load('catch-even-apples')
    const insts = buildInstances(game, 0).map((i, n) => (n === 1 ? { ...i, locked: true } : i))
    const moved = stepMotion(insts, entities(game), 0.5, 1, insts[0].key)

    expect(moved[0]).toBe(insts[0])
    expect(moved[1]).toBe(insts[1])
  })
})

describe('chạm và va chạm', () => {
  it('instanceAt bỏ qua vật đã xong', () => {
    const insts = buildInstances(load('race-multiplication'), 0)
    const sign = insts.find((i) => i.entityId === 'signs')!
    const cx = sign.x + sign.w / 2
    const cy = sign.y + sign.h / 2

    expect(instanceAt(insts, cx, cy)?.key).toBe(sign.key)
    expect(instanceAt(insts.map((i) => (i.key === sign.key ? { ...i, locked: true } : i)), cx, cy)).toBeUndefined()
  })

  it('touching chỉ trả bản lựa chọn đang chồng lên hộp', () => {
    const insts = buildInstances(load('catch-even-apples'), 0)
    const apple = insts.find((i) => i.entityId === 'apples')!

    expect(touching(insts, 'apples', { x: apple.x, y: apple.y, w: 10, h: 10 }).map((i) => i.key)).toEqual([apple.key])
    expect(touching(insts, 'apples', { x: -500, y: -500, w: 10, h: 10 })).toEqual([])
  })
})

describe('chuyển động mới (Đợt 5)', () => {
  const withMotion = (type: 'SWAY_UP' | 'ORBIT' | 'CROSS') => {
    const game = load('rabbit-pick-carrots')
    game.entities[0].motion = { type, speed: 'FAST' }
    return game
  }
  const run = (game: CpfGame, seconds: number, check: (insts: CpfInstance[]) => void) => {
    let insts = buildInstances(game, 0)
    for (let t = 0; t < seconds; t += 1 / 30) {
      insts = stepMotion(insts, entities(game), 1 / 30, t)
      check(insts)
    }
    return insts
  }

  it('SWAY_UP bay lên, lắc ngang trong sân, ra khỏi đỉnh thì sinh lại ở đáy', () => {
    const game = withMotion('SWAY_UP')
    const xs = new Set<number>()
    let respawned = false
    run(game, 8, (insts) => {
      const c = insts.find((i) => i.choiceId === 'c1')!
      xs.add(Math.round(c.x))
      expect(c.x).toBeGreaterThanOrEqual(0)
      expect(c.x + c.w).toBeLessThanOrEqual(CPF_STAGE_WIDTH)
      if (c.y === CPF_STAGE_HEIGHT) respawned = true
    })
    expect(xs.size).toBeGreaterThan(5)
    expect(respawned).toBe(true)
  })

  it('ORBIT bay vòng quanh chỗ của mình, luôn trong sân và dưới HUD', () => {
    const game = withMotion('ORBIT')
    const home = buildInstances(game, 0).find((i) => i.choiceId === 'c1')!
    run(game, 6, (insts) => {
      const c = insts.find((i) => i.choiceId === 'c1')!
      expect(c.y).toBeGreaterThanOrEqual(CPF_HUD_HEIGHT)
      expect(c.y + c.h).toBeLessThanOrEqual(CPF_STAGE_HEIGHT)
      expect(Math.hypot(c.x - home.homeX, c.y - home.homeY)).toBeLessThanOrEqual(51)
    })
  })

  it('CROSS chạy sang phải rồi vào lại từ mép trái, giữ hàng', () => {
    const game = withMotion('CROSS')
    const start = buildInstances(game, 0).find((i) => i.choiceId === 'c1')!
    let wrapped = false
    run(game, 12, (insts) => {
      const c = insts.find((i) => i.choiceId === 'c1')!
      expect(c.y).toBe(start.y)
      if (c.x < 0) wrapped = true
    })
    expect(wrapped).toBe(true)
  })

  it('SCATTER đổi chỗ vật lựa chọn giữa các màn', () => {
    const game = load('rabbit-pick-carrots')
    const spots = (round: number) => buildInstances(game, round).filter((i) => i.choiceId).map((i) => [i.x, i.y])
    expect(spots(1)).not.toEqual(spots(0))
  })
})

describe('hỗ trợ điều khiển', () => {
  it('stepToward chạy đúng tốc độ, không vượt đích, giữ trong sân', () => {
    const rabbit = buildInstances(load('rabbit-pick-carrots'), 0).find((i) => i.entityId === 'rabbit')!
    const cx = rabbit.x + rabbit.w / 2
    const cy = rabbit.y + rabbit.h / 2
    const moved = stepToward(rabbit, cx + 1000, cy, 0.1)
    expect(moved.x - rabbit.x).toBeCloseTo(WALK_SPEED * 0.1)
    const arrived = stepToward(rabbit, cx + 5, cy, 1)
    expect(arrived.x - rabbit.x).toBeCloseTo(5)
    const clamped = stepToward(rabbit, cx, -500, 10)
    expect(clamped.y).toBe(CPF_HUD_HEIGHT)
  })

  it('traceShot dừng ở vật đầu tiên trên đường bay, trượt thì tới mép sân', () => {
    const insts = buildInstances(load('archery-addition'), 0)
    const bow = insts.find((i) => i.entityId === 'bow')!
    const target = insts.find((i) => i.choiceId === 'c2')!
    const from = { x: bow.x + bow.w / 2, y: bow.y + bow.h / 2 }
    const toward = { x: target.x + target.w / 2 - from.x, y: target.y + target.h / 2 - from.y }
    expect(traceShot(insts, 'targets', from, toward).hit?.choiceId).toBe('c2')
    const miss = traceShot(insts, 'targets', from, { x: 0, y: 1 })
    expect(miss.hit).toBeUndefined()
    expect(miss.end.y).toBeGreaterThan(CPF_STAGE_HEIGHT - 12)
  })

  it('stepWalker chỉ chấm vật trẻ đã chạm, đi ngang vật khác trên đường không bị tính', () => {
    const box = (key: string, x: number, y: number): CpfInstance => ({
      key, entityId: key === 'rabbit' ? 'rabbit' : 'carrots', choiceId: key === 'rabbit' ? undefined : key,
      assetId: 'x', x, y, w: 100, h: 100, homeX: x, homeY: y, vx: 0, phase: 0, visible: true, locked: false,
    })
    // Thỏ ở dưới, củ sai nằm chắn giữa đường tới củ đúng.
    const insts = [box('c_wrong', 600, 380), box('c_right', 600, 150), box('rabbit', 600, 600)]
    let walker = insts[2]
    let goal: WalkGoal | null = { x: 0, y: 0, targetKey: 'c_right' }
    const hits: string[] = []
    for (let i = 0; i < 200 && goal; i++) {
      const step = stepWalker(walker, insts, goal, 1 / 30)
      walker = step.walker
      goal = step.goal
      if (step.hit) hits.push(step.hit.key)
    }
    expect(hits).toEqual(['c_right'])
  })

  it('stepWalker: chạm chỗ trống thì chạy tới rồi dừng; vật đích biến mất thì thôi đuổi', () => {
    const insts = buildInstances(load('rabbit-pick-carrots'), 0)
    const rabbit = insts.find((i) => i.entityId === 'rabbit')!
    let step = stepWalker(rabbit, insts, { x: rabbit.x + rabbit.w / 2 + 10, y: rabbit.y + rabbit.h / 2 }, 1)
    expect(step.goal).not.toBeNull()
    step = stepWalker(step.walker, insts, step.goal, 1)
    expect(step.goal).toBeNull()
    const gone = insts.map((i) => (i.choiceId === 'c1' ? { ...i, visible: false } : i))
    expect(stepWalker(rabbit, gone, { x: 0, y: 0, targetKey: 'carrots:c1' }, 1 / 30).goal).toBeNull()
  })

  it('snapZone: chạm rồi nhả tại chỗ (chưa kéo quá MIN_DRAG) thì không thả vào ô nào', () => {
    const insts = buildInstances(load('sort-land-water-animals'), 0)
    const item = insts.find((i) => i.choiceId === 'c1')!
    const [z1] = insts.filter((i) => i.entityId === 'homes')
    const nearZoneHome = { ...item, x: z1.x, y: z1.y, homeX: z1.x + MIN_DRAG / 2, homeY: z1.y }
    expect(snapZone(insts, 'homes', nearZoneHome)).toBeUndefined()
  })

  it('snapZone hút vật vào ô chứa tâm, hoặc ô gần nhất trong tầm, xa quá thì không', () => {
    const insts = buildInstances(load('sort-land-water-animals'), 0)
    const item = insts.find((i) => i.choiceId === 'c1')!
    const [z1, z2] = insts.filter((i) => i.entityId === 'homes')
    const at = (x: number, y: number) => ({ ...item, x: x - item.w / 2, y: y - item.h / 2 })
    expect(snapZone(insts, 'homes', at(z2.x + z2.w / 2, z2.y + z2.h / 2))?.zoneId).toBe('z2')
    expect(snapZone(insts, 'homes', at(z1.x + z1.w / 2, z1.y - z1.h / 2 - 20))?.zoneId).toBe('z1')
    expect(snapZone(insts, 'homes', at(z1.x + z1.w / 2, z1.y + z1.h / 2 - SNAP_DISTANCE - z1.h))).toBeUndefined()
  })
})
