import Matter from 'matter-js'
import { liftOutOfSolids, landmarkSolids, sceneBounds } from './dropSolids'
import { DROP_FRAME_MS, type DropInput, type DropResult } from './dropTypes'
import { clampCenter, type Rect } from './prepositionGeometry'

/** Số bước tối đa (8 giây ở 60 bước/giây) và điều kiện «đã nằm yên»: vận tốc dưới ngưỡng liên tiếp đủ số bước. */
export const MAX_STEPS = 480
export const REST_SPEED = 0.05
export const REST_STEPS = 20
/** Làm tròn vị trí cuối đến 0,1 đơn vị cảnh để kết quả ổn định giữa các lần chạy. */
const roundTo = (value: number) => Math.round(value * 10) / 10

function staticBody(rect: Rect) {
  return Matter.Bodies.rectangle((rect.left + rect.right) / 2, (rect.top + rect.bottom) / 2, rect.right - rect.left, rect.bottom - rect.top, {
    isStatic: true,
    friction: 0.8,
    restitution: 0,
  })
}

/**
 * Thả vật từ chỗ trẻ buông tay: vật rơi theo trọng lực, nằm yên trên mặt đất, mặt bàn, đáy hộp... Mô phỏng chạy ngay (đồng
 * bộ, bước cố định 1/60 giây, không đọc đồng hồ) nên cùng đầu vào luôn ra cùng kết quả. Vật không xoay (khớp với hình học
 * hộp bao dùng để chấm). Vật lý chỉ cho biết vật NẰM Ở ĐÂU; đúng/sai vẫn do `satisfies` trên toạ độ cuối quyết định.
 */
export function simulateDrop({ landmark, size, start }: DropInput): DropResult {
  const solids = landmarkSolids(landmark)
  const first = liftOutOfSolids(clampCenter(start, size), size, [...solids, ...sceneBounds()])

  const engine = Matter.Engine.create({ gravity: { x: 0, y: 1, scale: 0.002 } })
  const item = Matter.Bodies.rectangle(first.x, first.y, size.width, size.height, {
    friction: 0.8,
    frictionStatic: 1,
    restitution: 0.05,
    inertia: Infinity,
    frictionAir: 0.01,
  })
  Matter.Composite.add(engine.world, [...solids, ...sceneBounds()].map(staticBody))
  Matter.Composite.add(engine.world, item)

  const frames = [{ x: first.x, y: first.y }]
  let calm = 0
  let settled = false
  for (let step = 0; step < MAX_STEPS; step += 1) {
    Matter.Engine.update(engine, DROP_FRAME_MS)
    frames.push({ x: item.position.x, y: item.position.y })
    calm = Math.hypot(item.velocity.x, item.velocity.y) < REST_SPEED ? calm + 1 : 0
    if (calm >= REST_STEPS) {
      settled = true
      break
    }
  }
  const last = frames[frames.length - 1]
  const final = clampCenter({ x: roundTo(last.x), y: roundTo(last.y) }, size)
  frames[frames.length - 1] = final
  return { frames, final, settled }
}
