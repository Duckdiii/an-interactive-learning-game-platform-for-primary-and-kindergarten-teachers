import { describe, expect, it } from 'vitest'
import {
  computeDragDropLayout,
  CONFIRM_BUTTON_HEIGHT,
  isInsideZone,
  ITEM_SIZE,
  TRAY_LABEL_HEIGHT,
} from './dragDropLayout'
import { canSubmit, createDragDropState, dragDropReducer } from './dragDropReducer'
import type { DragDropDisplayItem } from './dragDropTypes'
import type { DropZone } from '../../types/game-dsl.types'

const sampleZones: DropZone[] = [
  { id: 'water', label: 'Dưới nước' },
  { id: 'land', label: 'Trên cạn' },
]

const sampleItems: DragDropDisplayItem[] = [
  { id: 'fish', text: 'Cá chép', targetZoneId: 'water' },
  { id: 'crab', text: 'Cua đồng', targetZoneId: 'water' },
  { id: 'rabbit', text: 'Thỏ trắng', targetZoneId: 'land' },
  { id: 'cat', text: 'Mèo con', targetZoneId: 'land' },
]

describe('Drag & Drop Layout & Geometry', () => {

  it('verifies points inside rectangular zone boundaries', () => {
    const layout = computeDragDropLayout({
      items: sampleItems,
      dropZones: sampleZones,
      hasAudio: false,
      hasIllustration: false,
    })
    const zone = layout.zones[0].bounds
    expect(isInsideZone({ x: zone.x + 10, y: zone.y + 10 }, zone)).toBe(true)
    expect(isInsideZone({ x: zone.x + zone.width, y: zone.y + zone.height }, zone)).toBe(true)
    expect(isInsideZone({ x: zone.x - 5, y: zone.y }, zone)).toBe(false)
    expect(isInsideZone({ x: zone.x, y: zone.y - 5 }, zone)).toBe(false)
  })

  it('guarantees touch target sizes >= 64px for children UX', () => {
    expect(ITEM_SIZE).toBeGreaterThanOrEqual(64)
    expect(CONFIRM_BUTTON_HEIGHT).toBeGreaterThanOrEqual(64)
  })

  it('guarantees touch target sizes >= 64px AFTER scaling across various scales', () => {
    const scales = [1.0, 0.85, 0.75, 0.4875, 0.35]

    for (const scale of scales) {
      const layout = computeDragDropLayout({
        items: sampleItems,
        dropZones: sampleZones,
        hasAudio: false,
        hasIllustration: false,
        minTouchPx: 64,
        scale,
      })

      // Kích thước vật sau khi scale hiển thị trên màn hình
      const renderedItemSize = layout.itemSize * scale
      expect(renderedItemSize).toBeGreaterThanOrEqual(64 - 1e-4)

      // Chiều cao nút xác nhận sau khi scale
      const renderedConfirmHeight = layout.confirmHeight * scale
      expect(renderedConfirmHeight).toBeGreaterThanOrEqual(64 - 1e-4)
    }
  })

  it('keeps all items strictly inside zone bounds in worst-case single-basket placement', () => {
    const itemCounts = [1, 2, 4, 6, 8]
    const zoneCounts = [1, 2, 3, 4]

    for (const itemCount of itemCounts) {
      for (const zoneCount of zoneCounts) {
        const testItems: DragDropDisplayItem[] = Array.from({ length: itemCount }, (_, i) => ({
          id: `item_${i}`,
          text: `Vật ${i}`,
        }))
        const testZones: DropZone[] = Array.from({ length: zoneCount }, (_, i) => ({
          id: `zone_${i}`,
          label: `Rổ ${i}`,
        }))

        const layout = computeDragDropLayout({
          items: testItems,
          dropZones: testZones,
          hasAudio: false,
          hasIllustration: false,
        })

        // Kiểm tra toạ độ từng slot trong mọi rổ đều nằm trọn trong rổ
        for (const zone of layout.zones) {
          const positions = layout.zoneItemPositions[zone.id]
          for (let i = 0; i < itemCount; i++) {
            const slot = positions[i]
            expect(slot.x).toBeGreaterThanOrEqual(zone.bounds.x)
            expect(slot.x + ITEM_SIZE).toBeLessThanOrEqual(zone.bounds.x + zone.bounds.width)
            expect(slot.y).toBeGreaterThanOrEqual(zone.bounds.y)
            expect(slot.y + ITEM_SIZE).toBeLessThanOrEqual(zone.bounds.y + zone.bounds.height)
          }
        }
      }
    }
  })

  it('positions drop zones and tray without overlap', () => {
    const layout = computeDragDropLayout({
      items: sampleItems,
      dropZones: sampleZones,
      hasAudio: true,
      hasIllustration: true,
    })

    // Drop zones don't overlap each other
    for (let i = 0; i < layout.zones.length; i++) {
      for (let j = i + 1; j < layout.zones.length; j++) {
        const a = layout.zones[i].bounds
        const b = layout.zones[j].bounds
        const overlap =
          a.x < b.x + b.width &&
          a.x + a.width > b.x &&
          a.y < b.y + b.height &&
          a.y + a.height > b.y
        expect(overlap).toBe(false)
      }
    }

    // Tray is below drop zones
    const maxZoneY = Math.max(...layout.zones.map((z) => z.bounds.y + z.bounds.height))
    expect(layout.trayBounds.y).toBeGreaterThanOrEqual(maxZoneY)

    // Confirm button is below tray
    expect(layout.confirmY).toBeGreaterThanOrEqual(
      layout.trayBounds.y + layout.trayBounds.height,
    )
  })

  it('keeps tray items below the tray label and inside the tray', () => {
    for (const scale of [1, 0.75, 0.4875]) {
      const layout = computeDragDropLayout({
        items: sampleItems,
        dropZones: sampleZones,
        hasAudio: false,
        hasIllustration: false,
        scale,
      })
      const trayBottom = layout.trayBounds.y + layout.trayBounds.height
      for (const pos of Object.values(layout.trayPositions)) {
        expect(pos.y).toBeGreaterThanOrEqual(layout.trayBounds.y + TRAY_LABEL_HEIGHT)
        expect(pos.y + layout.itemSize).toBeLessThanOrEqual(trayBottom)
      }
    }
  })
})

describe('Drag & Drop Reducer', () => {
  it('places, moves, and unplaces items correctly', () => {
    let state = createDragDropState()
    expect(canSubmit(state.placements, sampleItems.length)).toBe(false)

    // Place item
    state = dragDropReducer(state, { type: 'PLACE_ITEM', itemId: 'fish', zoneId: 'water' })
    expect(state.placements['fish']).toBe('water')
    expect(canSubmit(state.placements, sampleItems.length)).toBe(false)

    // Move to another zone
    state = dragDropReducer(state, { type: 'PLACE_ITEM', itemId: 'fish', zoneId: 'land' })
    expect(state.placements['fish']).toBe('land')

    // Unplace back to tray
    state = dragDropReducer(state, { type: 'UNPLACE_ITEM', itemId: 'fish' })
    expect(state.placements['fish']).toBeUndefined()
  })

  it('supports 2-tap interaction (select then place)', () => {
    let state = createDragDropState()

    // Tap item to select
    state = dragDropReducer(state, { type: 'SELECT_ITEM', itemId: 'crab' })
    expect(state.selectedItemId).toBe('crab')

    // Tap again to deselect
    state = dragDropReducer(state, { type: 'SELECT_ITEM', itemId: 'crab' })
    expect(state.selectedItemId).toBeNull()

    // Select then place
    state = dragDropReducer(state, { type: 'SELECT_ITEM', itemId: 'crab' })
    state = dragDropReducer(state, { type: 'PLACE_ITEM', itemId: 'crab', zoneId: 'water' })
    expect(state.placements['crab']).toBe('water')
    expect(state.selectedItemId).toBeNull()
  })

  it('allows submission only when all items are placed', () => {
    let state = createDragDropState()

    sampleItems.forEach((item) => {
      state = dragDropReducer(state, { type: 'PLACE_ITEM', itemId: item.id, zoneId: 'water' })
    })

    expect(canSubmit(state.placements, sampleItems.length)).toBe(true)

    // Submitting locks state
    state = dragDropReducer(state, {
      type: 'SUBMIT_SUCCESS',
      result: { isCorrect: true },
    })
    expect(state.locked).toBe(true)
    expect(state.result?.isCorrect).toBe(true)

    // Once locked, no more moves allowed
    const lockedState = dragDropReducer(state, {
      type: 'PLACE_ITEM',
      itemId: 'fish',
      zoneId: 'land',
    })
    expect(lockedState.placements['fish']).toBe('water')
  })
})
