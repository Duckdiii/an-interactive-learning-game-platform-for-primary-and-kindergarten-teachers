import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { CpfEntity, CpfGame } from '../../types/cpf-game.types'
import { CPF_HUD_HEIGHT, CPF_STAGE_HEIGHT, regionBox } from './cpfLayout'
import { buildInstances, instanceAt, stepMotion, touching } from './cpfScene'

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
