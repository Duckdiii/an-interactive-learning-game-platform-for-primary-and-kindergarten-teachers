// Cảnh của một màn CPF: dựng các bản vật từ entities (nhân bindTo theo lựa chọn/nhóm) và bước chuyển động. Hàm thuần.
import type { CpfEntity, CpfStudentGame, CpfSpeed } from '../../types/cpf-game.types'
import { CPF_HUD_HEIGHT, CPF_STAGE_HEIGHT, CPF_STAGE_WIDTH, type Box, layoutGroup, overlaps, progressX, regionBox } from './cpfLayout'

export interface CpfInstance {
  /** Khóa duy nhất trong màn: entityId, hoặc entityId:choiceId / entityId:zoneId. */
  key: string
  entityId: string
  choiceId?: string
  zoneId?: string
  label?: string
  assetId: string
  x: number
  y: number
  w: number
  h: number
  homeX: number
  homeY: number
  /** Vận tốc ngang (PATROL_X) px/giây, có dấu. */
  vx: number
  /** Lệch pha để các vật BOB không nhún cùng nhịp. */
  phase: number
  visible: boolean
  /** Đã xong (tìm đúng / thả đúng): không nhận chạm, không va chạm nữa. */
  locked: boolean
}

const SPEED: Record<CpfSpeed, number> = { SLOW: 60, MEDIUM: 110, FAST: 170 }
const BOB_AMPLITUDE = 8
const STREAM_GAP = 60

export const speedOf = (entity: CpfEntity) => SPEED[entity.motion?.speed ?? 'SLOW']

export function buildInstances(game: CpfStudentGame, roundIndex: number, progressStep = 0): CpfInstance[] {
  const round = game.content.rounds[roundIndex]
  if (!round) return []
  const out: CpfInstance[] = []
  for (const entity of game.entities) {
    const copies =
      entity.bindTo === 'choices'
        ? round.choices.map((c) => ({ key: `${entity.id}:${c.id}`, choiceId: c.id, label: c.label, assetId: c.assetId ?? entity.assetId }))
        : entity.bindTo === 'zones'
          ? (round.zones ?? []).map((z) => ({ key: `${entity.id}:${z.id}`, zoneId: z.id, label: z.label, assetId: entity.assetId }))
          : [{ key: entity.id, assetId: entity.assetId }]
    const boxes = layoutGroup(entity.placement.region, entity.placement.arrangement, copies.length)
    copies.forEach((copy, i) => {
      const box = boxes[i]
      let y = box.y
      // STREAM: xếp nối đuôi phía trên (FALL) hoặc phía dưới (FLOAT_UP) để rơi/bay lần lượt.
      if (entity.motion?.spawn === 'STREAM' && entity.motion.type === 'FALL') y = CPF_HUD_HEIGHT - box.h - i * (box.h + STREAM_GAP)
      if (entity.motion?.spawn === 'STREAM' && entity.motion.type === 'FLOAT_UP') y = CPF_STAGE_HEIGHT + i * (box.h + STREAM_GAP)
      const x = entity.role === 'PROGRESS' ? progressX(box, entity.placement.region, progressStep, game.content.rounds.length) : box.x
      out.push({
        ...copy,
        entityId: entity.id,
        x,
        y,
        w: box.w,
        h: box.h,
        homeX: x,
        homeY: box.y,
        vx: i % 2 === 0 ? speedOf(entity) : -speedOf(entity),
        phase: i * 1.3,
        visible: true,
        locked: false,
      })
    })
  }
  return out
}

/**
 * Bước chuyển động `dt` giây. Vật rơi/bay ra khỏi màn được sinh lại ở mép bên kia, nên màn PICK_ALL luôn hoàn thành
 * được (docs/cpf-game-v2.0.0.md mục 3.5). Không đổi vật đang bị kéo (`dragging`).
 */
export function stepMotion(
  instances: CpfInstance[],
  entities: Map<string, CpfEntity>,
  dt: number,
  timeSec: number,
  dragging?: string,
): CpfInstance[] {
  return instances.map((inst) => {
    const entity = entities.get(inst.entityId)
    if (!entity?.motion || inst.key === dragging || inst.locked || !inst.visible) return inst
    const speed = speedOf(entity)
    switch (entity.motion.type) {
      case 'FALL': {
        const y = inst.y + speed * dt
        return y > CPF_STAGE_HEIGHT ? { ...inst, y: CPF_HUD_HEIGHT - inst.h } : { ...inst, y }
      }
      case 'FLOAT_UP': {
        const y = inst.y - speed * dt
        return y + inst.h < CPF_HUD_HEIGHT ? { ...inst, y: CPF_STAGE_HEIGHT } : { ...inst, y }
      }
      case 'PATROL_X': {
        const area = regionBox(entity.placement.region)
        let x = inst.x + inst.vx * dt
        let vx = inst.vx
        if (x < area.x) [x, vx] = [area.x, Math.abs(vx)]
        if (x + inst.w > area.x + area.w) [x, vx] = [area.x + area.w - inst.w, -Math.abs(vx)]
        return { ...inst, x, vx }
      }
      case 'BOB':
        return { ...inst, y: inst.homeY + Math.sin(timeSec * 2.5 + inst.phase) * BOB_AMPLITUDE }
      default:
        return inst
    }
  })
}

export const boxOf = (inst: CpfInstance): Box => ({ x: inst.x, y: inst.y, w: inst.w, h: inst.h })

/** Bản vật đang nhận chạm/va chạm được tại điểm (vật vẽ sau nằm trên). */
export function instanceAt(instances: CpfInstance[], px: number, py: number): CpfInstance | undefined {
  for (let i = instances.length - 1; i >= 0; i--) {
    const inst = instances[i]
    if (inst.visible && !inst.locked && px >= inst.x && px <= inst.x + inst.w && py >= inst.y && py <= inst.y + inst.h) return inst
  }
  return undefined
}

/** Các bản lựa chọn của `entityId` đang chạm `box`. */
export function touching(instances: CpfInstance[], entityId: string, box: Box): CpfInstance[] {
  return instances.filter((i) => i.entityId === entityId && i.visible && !i.locked && i.choiceId && overlaps(boxOf(i), box))
}

/** Giữ vật kéo ngang trong sân khấu (DRAG_X). */
export const clampX = (x: number, w: number) => Math.max(0, Math.min(CPF_STAGE_WIDTH - w, x))
