import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { CpfEntity, CpfGame, CpfRule } from '../../types/cpf-game.types'
import { CPF_HUD_HEIGHT, CPF_MIN_ITEM_SIZE, CPF_STAGE_HEIGHT, CPF_STAGE_WIDTH } from './cpfLayout'
import { boxOf, buildInstances, clampX, snapZone, stepMotion, stepWalker, touching, traceShot, type CpfInstance, type WalkGoal } from './cpfScene'

/**
 * "Bé ảo": với mọi ví dụ (và biến thể dùng khối chuyển động mới), mô phỏng cảnh theo thời gian bằng đúng các hàm runtime
 * dùng, rồi kiểm từng đáp án đúng của từng màn có thao tác được bằng tay không (chạm tới, hứng được, bắn trúng, chạy tới,
 * thả vào). Engine (cpfEngine.test) đã kiểm luật chấm; ở đây kiểm phần "chơi được" về không gian và thời gian.
 */
const EXAMPLES_DIR = join(__dirname, '../../../../backend/src/test/resources/cpf-examples')
const examples: [string, CpfGame][] = readdirSync(EXAMPLES_DIR)
  .filter((f) => f.endsWith('.json'))
  .map((f) => [f.replace('.json', ''), JSON.parse(readFileSync(join(EXAMPLES_DIR, f), 'utf8')) as CpfGame])
const load = (name: string) => structuredClone(examples.find(([f]) => f === name)![1])

const DT = 1 / 30
// Hàng vật STREAM chậm (60px/s) cần khoảng 25 giây để vật cuối rơi tới giỏ; vẫn chơi được, chỉ phải chờ.
const MAX_SECONDS = 40

const center = (i: CpfInstance) => ({ x: i.x + i.w / 2, y: i.y + i.h / 2 })
const onStage = (i: CpfInstance) => i.y >= CPF_HUD_HEIGHT && i.y + i.h <= CPF_STAGE_HEIGHT && i.x >= 0 && i.x + i.w <= CPF_STAGE_WIDTH

/** Chạy cảnh tới khi `reached` đúng (trả true) hoặc hết giờ. Vật kéo/điều khiển do `reached` tự đặt lại vị trí. */
function simulate(game: CpfGame, roundIndex: number, reached: (insts: CpfInstance[]) => boolean): boolean {
  const entities = new Map<string, CpfEntity>(game.entities.map((e) => [e.id, e]))
  let insts = buildInstances(game, roundIndex)
  for (let t = 0; t < MAX_SECONDS; t += DT) {
    insts = stepMotion(insts, entities, DT, t)
    if (reached(insts)) return true
  }
  return false
}

/** Đáp án đúng thao tác được qua luật `rule` không. */
function reachable(game: CpfGame, roundIndex: number, rule: CpfRule, choiceId: string, zoneId?: string): boolean {
  const entities = new Map<string, CpfEntity>(game.entities.map((e) => [e.id, e]))
  const on = rule.on
  const choiceOf = (insts: CpfInstance[], entityId: string) => insts.find((i) => i.entityId === entityId && i.choiceId === choiceId)

  if (on.type === 'TAP') {
    // Chạm được: vật hiện trọn trên sân (dưới HUD) và đủ lớn cho ngón tay.
    return simulate(game, roundIndex, (insts) => {
      const target = choiceOf(insts, on.target)
      return Boolean(target && onStage(target) && target.w >= CPF_MIN_ITEM_SIZE)
    })
  }

  if (on.type === 'DROP') {
    // Kéo vật tới tâm ô đúng thì ô hút vào phải chính là ô đó.
    const insts = buildInstances(game, roundIndex)
    const item = choiceOf(insts, on.item)
    const zone = insts.find((i) => i.entityId === on.zone && i.zoneId === zoneId)
    if (!item || !zone) return false
    const dropped = { ...item, x: zone.x + (zone.w - item.w) / 2, y: zone.y + (zone.h - item.h) / 2 }
    return snapZone(insts, on.zone, dropped)?.zoneId === zoneId
  }

  if (on.type !== 'COLLIDE') return false
  const controllerId = entities.get(on.a)?.control ? on.a : on.b
  const targetId = controllerId === on.a ? on.b : on.a
  const control = entities.get(controllerId)?.control

  if (control === 'DRAG_X') {
    // Trẻ kéo giỏ ngang tới ngay dưới/trên vật lúc vật đi qua hàng của giỏ.
    return simulate(game, roundIndex, (insts) => {
      const mover = insts.find((i) => i.entityId === controllerId)!
      const target = choiceOf(insts, targetId)
      if (!target) return false
      const placed = { ...mover, x: clampX(center(target).x - mover.w / 2, mover.w) }
      return touching(insts, targetId, boxOf(placed)).some((i) => i.choiceId === choiceId)
    })
  }

  if (control === 'AIM_SHOOT') {
    // Có một hướng bắn (thử 72 hướng) mà viên bắn chạm đúng vật này. Viên bắn bay nhanh (900px/s) nên coi như tức thì.
    return simulate(game, roundIndex, (insts) => {
      const bow = insts.find((i) => i.entityId === controllerId)!
      for (let k = 0; k < 72; k++) {
        const angle = (k / 72) * Math.PI * 2
        const hit = traceShot(insts, targetId, center(bow), { x: Math.cos(angle), y: Math.sin(angle) }).hit
        if (hit?.choiceId === choiceId) return true
      }
      return false
    })
  }

  if (control === 'TAP_MOVE') {
    // Trẻ chạm một lần vào vật đúng: nhân vật đuổi theo đúng vật đó (đi ngang vật khác không bị chấm) cho tới khi chạm nó.
    let walker: CpfInstance | undefined
    let goal: WalkGoal | null = null
    return simulate(game, roundIndex, (insts) => {
      const target = choiceOf(insts, targetId)
      walker ??= insts.find((i) => i.key === controllerId)
      if (!target || !walker) return false
      goal ??= { x: 0, y: 0, targetKey: target.key }
      const step = stepWalker(walker, insts, goal, DT)
      walker = step.walker
      goal = step.goal ?? goal
      return step.hit?.choiceId === choiceId
    })
  }
  return false
}

/** Mọi đáp án đúng của mọi màn: có ít nhất một luật CHECK thao tác được tới nó. */
function unreachableAnswers(game: CpfGame): string[] {
  const missing: string[] = []
  const checkRules = game.rules.filter((r) => r.do.some((a) => a.type === 'CHECK'))
  game.content.rounds.forEach((round, roundIndex) => {
    const answer = game.answerKey.rounds[roundIndex]
    const targets =
      'placements' in answer ? answer.placements.map((p) => ({ choiceId: p.choiceId, zoneId: p.zoneId })) : answer.correctChoiceIds.map((choiceId) => ({ choiceId, zoneId: undefined }))
    for (const { choiceId, zoneId } of targets) {
      if (!checkRules.some((rule) => reachable(game, roundIndex, rule, choiceId, zoneId))) missing.push(`${round.id}/${choiceId}`)
    }
  })
  return missing
}

describe('bé ảo chơi được mọi ví dụ CPF', () => {
  it.each(examples.map(([name]) => name))('%s: mọi đáp án đúng thao tác được', (name) => {
    expect(unreachableAnswers(load(name))).toEqual([])
  })
})

describe('bé ảo chơi được các khối chuyển động mới', () => {
  it('hứng bóng bay lắc lư (SWAY_UP) bằng giỏ ở trên', () => {
    const game = load('catch-even-apples')
    game.entities[0].placement.region = 'BOTTOM'
    game.entities[0].motion = { type: 'SWAY_UP', speed: 'SLOW', spawn: 'STREAM' }
    game.entities[1].placement.region = 'TOP'
    expect(unreachableAnswers(game)).toEqual([])
  })

  it.each(['ORBIT', 'CROSS', 'PATROL_X'] as const)('bắn trúng bia %s', (type) => {
    const game = load('archery-addition')
    game.entities[1].motion = { type, speed: 'MEDIUM' }
    expect(unreachableAnswers(game)).toEqual([])
  })

  it.each(['ORBIT', 'CROSS', 'STATIC'] as const)('thỏ chạy tới nhặt cà rốt %s', (type) => {
    const game = load('rabbit-pick-carrots')
    game.entities[0].motion = { type, speed: 'SLOW' }
    expect(unreachableAnswers(game)).toEqual([])
  })

  it('chạm được bóng bay lắc lư và vật bay vòng', () => {
    for (const type of ['SWAY_UP', 'ORBIT'] as const) {
      const game = load('fishing-compound-words')
      const fish = game.entities.find((e) => e.bindTo === 'choices')!
      fish.motion = { type, speed: 'SLOW' }
      expect(unreachableAnswers(game), type).toEqual([])
    }
  })
})

describe('bé ảo bắt được game không chơi được', () => {
  it('cung bắn ngang vào một hàng bia: bia gần che bia sau', () => {
    const game = load('archery-addition')
    game.entities[0].placement.region = 'LEFT'
    game.entities[1].placement = { region: 'RIGHT', arrangement: 'ROW' }
    expect(unreachableAnswers(game)).not.toEqual([])
  })

  it('không báo nhầm: vật ở vùng TOP ngay dưới HUD vẫn chạm được', () => {
    const game = load('fishing-compound-words')
    const fish = game.entities.find((e) => e.bindTo === 'choices')!
    fish.placement.region = 'TOP'
    fish.motion = { type: 'STATIC' }
    expect(unreachableAnswers(game)).toEqual([])
  })
})
