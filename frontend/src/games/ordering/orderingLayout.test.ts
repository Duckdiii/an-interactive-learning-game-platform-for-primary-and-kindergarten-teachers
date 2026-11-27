import { describe, expect, it } from 'vitest'
import { computeOrderingLayout, findNearestSlot, isInsideSlot } from './orderingLayout'
import type { OrderingDisplayStep } from './orderingTypes'

describe('orderingLayout', () => {
  const sampleSteps: OrderingDisplayStep[] = [
    { id: 's1', text: 'Lấy bàn chải', correctPosition: 1 },
    { id: 's2', text: 'Bôi kem đánh răng', correctPosition: 2 },
    { id: 's3', text: 'Chải răng thật sạch', correctPosition: 3 },
  ]

  it('tính toán toạ độ các slot đều nhau và không đè lên nhau', () => {
    const layout = computeOrderingLayout({
      steps: sampleSteps,
      hasAudio: false,
      hasIllustration: false,
      promptHeight: 36,
    })

    expect(layout.slots).toHaveLength(3)
    expect(layout.slots[0].slotNumber).toBe(1)
    expect(layout.slots[1].slotNumber).toBe(2)
    expect(layout.slots[2].slotNumber).toBe(3)

    // Các slot nằm trên cùng một hàng ngang
    expect(layout.slots[0].bounds.y).toBe(layout.slots[1].bounds.y)
    expect(layout.slots[1].bounds.y).toBe(layout.slots[2].bounds.y)

    // Slot 2 nằm sau Slot 1, Slot 3 nằm sau Slot 2
    expect(layout.slots[1].bounds.x).toBeGreaterThan(layout.slots[0].bounds.x + layout.slots[0].bounds.width)
    expect(layout.slots[2].bounds.x).toBeGreaterThan(layout.slots[1].bounds.x + layout.slots[1].bounds.width)

    // Khay nằm dưới các slot
    expect(layout.trayBounds.y).toBeGreaterThan(layout.slots[0].bounds.y + layout.slots[0].bounds.height)
    expect(Object.keys(layout.trayPositions)).toHaveLength(3)
  })

  it('đáp ứng touch target tối thiểu 64px', () => {
    const layout = computeOrderingLayout({
      steps: sampleSteps,
      hasAudio: true,
      hasIllustration: false,
      minTouchPx: 72,
    })

    expect(layout.itemWidth).toBeGreaterThanOrEqual(64)
    expect(layout.itemHeight).toBeGreaterThanOrEqual(64)
  })

  it('isInsideSlot kiểm tra chính xác toạ độ nằm trong slot', () => {
    const bounds = { x: 100, y: 100, width: 200, height: 150 }

    expect(isInsideSlot({ x: 150, y: 150 }, bounds)).toBe(true)
    expect(isInsideSlot({ x: 100, y: 100 }, bounds)).toBe(true)
    expect(isInsideSlot({ x: 300, y: 250 }, bounds)).toBe(true)

    expect(isInsideSlot({ x: 99, y: 150 }, bounds)).toBe(false)
    expect(isInsideSlot({ x: 301, y: 150 }, bounds)).toBe(false)
    expect(isInsideSlot({ x: 150, y: 99 }, bounds)).toBe(false)
    expect(isInsideSlot({ x: 150, y: 251 }, bounds)).toBe(false)
  })

  it('findNearestSlot tìm đúng slot gần nhất khi thả vào vùng cho phép', () => {
    const layout = computeOrderingLayout({
      steps: sampleSteps,
      hasAudio: false,
      hasIllustration: false,
    })

    const slot1Center = {
      x: layout.slots[0].bounds.x + layout.slots[0].bounds.width / 2,
      y: layout.slots[0].bounds.y + layout.slots[0].bounds.height / 2,
    }

    const nearest = findNearestSlot(slot1Center, layout.slots)
    expect(nearest).not.toBeNull()
    expect(nearest?.slotNumber).toBe(1)

    // Thả xa hẳn ra ngoài
    const farAway = { x: 0, y: 0 }
    expect(findNearestSlot(farAway, layout.slots, 10)).toBeNull()
  })
})
