/**
 * Vệt lấp lánh sau chú ong khi bay: một vòng đệm cố định `TRAIL_SLOTS` ngôi sao nhỏ. Khi ong bay, cứ mỗi `SPAWN_EVERY` giây thả một hạt tại chỗ ong;
 * mỗi hạt sống `LIFE_SECONDS` giây, trôi nhẹ xuống, nhỏ dần và mờ dần. Thuần theo thời gian (không đụng Konva), test được bằng đồng hồ giả.
 * Không cấp phát thêm trong lúc chạy: cùng một mảng hạt được tái sử dụng (đỡ rác bộ nhớ ở máy yếu).
 */
export const TRAIL_SLOTS = 10
export const TRAIL_SPAWN_EVERY = 0.05
export const TRAIL_LIFE_SECONDS = 0.55
/** Hạt trôi xuống bấy nhiêu đơn vị thiết kế suốt đời của nó. */
const DRIFT_DOWN = 18

export interface TrailPose {
  x: number
  y: number
  opacity: number
  scale: number
  rotation: number
}

interface Particle {
  x: number
  y: number
  born: number
}

export class SparkleTrail {
  private readonly particles: Particle[] = Array.from({ length: TRAIL_SLOTS }, () => ({ x: 0, y: 0, born: Number.NEGATIVE_INFINITY }))
  private next = 0
  private lastSpawn = Number.NEGATIVE_INFINITY

  /** Gọi mỗi khung hình. `flying` thì thả hạt mới (không quá một hạt mỗi `TRAIL_SPAWN_EVERY` giây) tại (x, y). */
  update(now: number, flying: boolean, x: number, y: number): void {
    if (!flying || now - this.lastSpawn < TRAIL_SPAWN_EVERY) return
    this.lastSpawn = now
    const slot = this.particles[this.next]
    slot.x = x
    slot.y = y
    slot.born = now
    this.next = (this.next + 1) % TRAIL_SLOTS
  }

  /** Dáng của hạt ở ô `slot` lúc `now`; hết đời hoặc chưa dùng thì vô hình (`opacity` 0). */
  pose(slot: number, now: number): TrailPose {
    const particle = this.particles[slot]
    const age = particle ? now - particle.born : Number.POSITIVE_INFINITY
    if (!particle || !(age >= 0) || age >= TRAIL_LIFE_SECONDS) return { x: 0, y: 0, opacity: 0, scale: 0, rotation: 0 }
    const life = age / TRAIL_LIFE_SECONDS
    return { x: particle.x, y: particle.y + life * DRIFT_DOWN, opacity: 1 - life, scale: 1 - 0.6 * life, rotation: life * 90 }
  }

  /** Xóa hết hạt (đổi câu hoặc dừng bay). */
  clear(): void {
    for (const particle of this.particles) particle.born = Number.NEGATIVE_INFINITY
    this.lastSpawn = Number.NEGATIVE_INFINITY
  }
}
