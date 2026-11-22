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
const SWAY_AMPLITUDE = 30
const ORBIT_RADIUS = 50
/** Tốc độ nhân vật TAP_MOVE (px/giây): đủ nhanh để trẻ không phải chờ, đủ chậm để thấy nhân vật chạy. */
export const WALK_SPEED = 360

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
    const boxes = layoutGroup(entity.placement.region, entity.placement.arrangement, copies.length, roundIndex)
    copies.forEach((copy, i) => {
      const box = boxes[i]
      let y = box.y
      // STREAM: xếp nối đuôi phía trên (FALL) hoặc phía dưới (FLOAT_UP) để rơi/bay lần lượt.
      if (entity.motion?.spawn === 'STREAM' && entity.motion.type === 'FALL') y = CPF_HUD_HEIGHT - box.h - i * (box.h + STREAM_GAP)
      if (entity.motion?.spawn === 'STREAM' && (entity.motion.type === 'FLOAT_UP' || entity.motion.type === 'SWAY_UP')) y = CPF_STAGE_HEIGHT + i * (box.h + STREAM_GAP)
      // Bay lên cùng lúc mà cùng một hàng thì cả nhóm ra khỏi màn cùng lúc, màn trống hẳn (thử nghiệm lần 3, kịch bản 006):
      // rải độ cao xuất phát đều trên một vòng bay để lúc nào cũng còn vật trên màn.
      else if (entity.bindTo && copies.length > 1 && (entity.motion?.type === 'FLOAT_UP' || entity.motion?.type === 'SWAY_UP')) {
        const loop = CPF_STAGE_HEIGHT - CPF_HUD_HEIGHT + box.h
        y = CPF_HUD_HEIGHT - box.h + ((box.y - CPF_HUD_HEIGHT + box.h + (i * loop) / copies.length) % loop)
      }
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
      case 'SWAY_UP': {
        // Bay lên như FLOAT_UP và lắc ngang quanh cột của mình (bóng bay, bong bóng).
        const y = inst.y - speed * dt
        const x = clampX(inst.homeX + Math.sin(timeSec * 1.6 + inst.phase) * SWAY_AMPLITUDE, inst.w)
        return y + inst.h < CPF_HUD_HEIGHT ? { ...inst, x, y: CPF_STAGE_HEIGHT } : { ...inst, x, y }
      }
      case 'ORBIT': {
        // Bay vòng (dẹt) quanh chỗ của mình; giữ trong sân, dưới HUD.
        const angle = timeSec * (speed / 120) + inst.phase
        return {
          ...inst,
          x: clampX(inst.homeX + Math.cos(angle) * ORBIT_RADIUS, inst.w),
          y: clampY(inst.homeY + Math.sin(angle) * ORBIT_RADIUS * 0.6, inst.h),
        }
      }
      case 'CROSS': {
        // Chạy một chiều sang phải, ra khỏi mép phải thì vào lại từ mép trái.
        const x = inst.x + Math.abs(inst.vx) * dt
        return { ...inst, x: x > CPF_STAGE_WIDTH ? -inst.w : x }
      }
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
/** Giữ vật trong sân theo chiều dọc, dưới dải HUD. */
export const clampY = (y: number, h: number) => Math.max(CPF_HUD_HEIGHT, Math.min(CPF_STAGE_HEIGHT - h, y))

/** Nhân vật TAP_MOVE bước về phía điểm (tx, ty) (tâm nhân vật tới đó), không vượt quá đích, luôn trong sân. */
export function stepToward(inst: CpfInstance, tx: number, ty: number, dt: number): CpfInstance {
  const dx = tx - (inst.x + inst.w / 2)
  const dy = ty - (inst.y + inst.h / 2)
  const dist = Math.hypot(dx, dy)
  const step = Math.min(dist, WALK_SPEED * dt)
  if (dist === 0) return inst
  return { ...inst, x: clampX(inst.x + (dx / dist) * step, inst.w), y: clampY(inst.y + (dy / dist) * step, inst.h) }
}

/** Đích của nhân vật TAP_MOVE: một điểm trên sân, kèm vật lựa chọn trẻ đã chạm vào (nếu có) để nhân vật đuổi theo vật đó. */
export interface WalkGoal {
  x: number
  y: number
  targetKey?: string
}

/**
 * Một bước của nhân vật TAP_MOVE. Chỉ chấm vật trẻ đã chạm vào (`targetKey`): đi ngang qua vật khác trên đường không bị
 * tính là chọn. Vật đích đang chuyển động thì nhân vật đuổi theo tâm hiện tại của nó. Tới nơi (hoặc vật đích đã biến mất)
 * thì hết đích (`goal` trả về null).
 */
export function stepWalker(
  walker: CpfInstance,
  instances: CpfInstance[],
  goal: WalkGoal | null,
  dt: number,
): { walker: CpfInstance; goal: WalkGoal | null; hit?: CpfInstance } {
  if (!goal) return { walker, goal }
  const target = goal.targetKey ? instances.find((i) => i.key === goal.targetKey && i.visible && !i.locked) : undefined
  if (goal.targetKey && !target) return { walker, goal: null }
  const tx = target ? target.x + target.w / 2 : goal.x
  const ty = target ? target.y + target.h / 2 : goal.y
  const moved = stepToward(walker, tx, ty, dt)
  if (target && overlaps(boxOf(moved), boxOf(target))) return { walker: moved, goal: null, hit: target }
  const arrived = moved.x === walker.x && moved.y === walker.y
  return { walker: moved, goal: arrived && !target ? null : goal }
}

/**
 * Đường ngắm của ná (AIM_SHOOT): viên bắn đi thẳng từ `from` theo hướng `dir` tới mép sân. Trả điểm cuối và vật lựa chọn
 * của `targetEntityId` đầu tiên nằm trên đường đi (dò từng bước bằng đúng ô va chạm 24px của viên bắn).
 */
export function traceShot(
  instances: CpfInstance[],
  targetEntityId: string,
  from: { x: number; y: number },
  dir: { x: number; y: number },
): { end: { x: number; y: number }; hit?: CpfInstance } {
  const length = Math.hypot(dir.x, dir.y)
  if (length === 0) return { end: from }
  const ux = dir.x / length
  const uy = dir.y / length
  let x = from.x
  let y = from.y
  for (let i = 0; i < 200; i++) {
    x += ux * 12
    y += uy * 12
    if (x < 0 || x > CPF_STAGE_WIDTH || y < 0 || y > CPF_STAGE_HEIGHT) break
    const hit = touching(instances, targetEntityId, { x: x - 12, y: y - 12, w: 24, h: 24 })[0]
    if (hit) return { end: { x, y }, hit }
  }
  return { end: { x, y } }
}

/** Khoảng cách tối đa (px, tâm tới tâm) để vật thả gần một ô vẫn được hút vào ô đó: trẻ nhỏ thả chưa trúng hẳn. */
export const SNAP_DISTANCE = 180

/** Vật phải được kéo xa chỗ cũ ít nhất chừng này (px) mới tính là thả: chạm rồi nhả tại chỗ không bị chấm. */
export const MIN_DRAG = 24

/**
 * Ô thả (vật của `zoneEntityId`) mà vật đang kéo sẽ rơi vào: ô chứa tâm vật, không có thì ô gần nhất trong SNAP_DISTANCE.
 * Vật chưa rời chỗ cũ quá MIN_DRAG thì không có ô nào.
 */
export function snapZone(instances: CpfInstance[], zoneEntityId: string, item: CpfInstance): CpfInstance | undefined {
  if (Math.hypot(item.x - item.homeX, item.y - item.homeY) < MIN_DRAG) return undefined
  const cx = item.x + item.w / 2
  const cy = item.y + item.h / 2
  let best: CpfInstance | undefined
  let bestDist = SNAP_DISTANCE
  for (const zone of instances) {
    if (zone.entityId !== zoneEntityId || !zone.visible) continue
    if (cx >= zone.x && cx <= zone.x + zone.w && cy >= zone.y && cy <= zone.y + zone.h) return zone
    const dist = Math.hypot(cx - (zone.x + zone.w / 2), cy - (zone.y + zone.h / 2))
    if (dist <= bestDist) [best, bestDist] = [zone, dist]
  }
  return best
}
