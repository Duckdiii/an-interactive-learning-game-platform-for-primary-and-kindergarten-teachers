import { describe, expect, it } from 'vitest'
import { SparkleTrail, TRAIL_LIFE_SECONDS, TRAIL_SLOTS, TRAIL_SPAWN_EVERY } from './sparkleTrail'

const visible = (trail: SparkleTrail, now: number) => Array.from({ length: TRAIL_SLOTS }, (_, i) => trail.pose(i, now)).filter((pose) => pose.opacity > 0)

describe('SparkleTrail', () => {
  it('chưa bay thì không có hạt nào', () => {
    const trail = new SparkleTrail()
    trail.update(1, false, 100, 200)
    expect(visible(trail, 1.01)).toHaveLength(0)
  })

  it('đang bay: thả hạt tại chỗ ong, không quá một hạt mỗi TRAIL_SPAWN_EVERY giây', () => {
    const trail = new SparkleTrail()
    trail.update(1, true, 100, 200)
    trail.update(1 + TRAIL_SPAWN_EVERY / 2, true, 150, 200) // quá sớm: bỏ qua
    expect(visible(trail, 1.01)).toHaveLength(1)
    expect(visible(trail, 1.01)[0]).toMatchObject({ x: 100 })
    trail.update(1 + TRAIL_SPAWN_EVERY, true, 160, 200)
    expect(visible(trail, 1 + TRAIL_SPAWN_EVERY + 0.01)).toHaveLength(2)
  })

  it('hạt mờ dần, nhỏ dần, trôi xuống và tắt hẳn sau TRAIL_LIFE_SECONDS', () => {
    const trail = new SparkleTrail()
    trail.update(0, true, 10, 20)
    const early = trail.pose(0, 0.05)
    const late = trail.pose(0, TRAIL_LIFE_SECONDS * 0.9)
    expect(late.opacity).toBeLessThan(early.opacity)
    expect(late.scale).toBeLessThan(early.scale)
    expect(late.y).toBeGreaterThan(early.y)
    expect(trail.pose(0, TRAIL_LIFE_SECONDS).opacity).toBe(0)
  })

  it('vòng đệm cố định: thả nhiều hơn số ô thì ghi đè hạt cũ nhất, không bao giờ quá TRAIL_SLOTS hạt', () => {
    const trail = new SparkleTrail()
    let t = 0
    for (let i = 0; i < TRAIL_SLOTS * 3; i += 1) {
      trail.update(t, true, i, 0)
      t += TRAIL_SPAWN_EVERY
    }
    expect(visible(trail, t - TRAIL_SPAWN_EVERY + 0.001).length).toBeLessThanOrEqual(TRAIL_SLOTS)
  })

  it('ô lạ hoặc clear() thì vô hình', () => {
    const trail = new SparkleTrail()
    trail.update(0, true, 1, 1)
    expect(trail.pose(99, 0.1).opacity).toBe(0)
    trail.clear()
    expect(visible(trail, 0.1)).toHaveLength(0)
  })
})
