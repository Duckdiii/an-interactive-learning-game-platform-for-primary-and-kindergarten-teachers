import { describe, expect, it } from 'vitest'
import {
  computeDragDropLayout,
  CONFIRM_BUTTON_HEIGHT,
  isInsideZone,
  ITEM_SIZE,
  validateDragDropQuestion,
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
  it('validates unique items, drop zones, and non-empty questions', () => {
    expect(validateDragDropQuestion(sampleItems, sampleZones)).toBeNull()
    expect(validateDragDropQuestion([], sampleZones)).toBeTruthy()
    expect(validateDragDropQuestion(sampleItems, [])).toBeTruthy()
    expect(
      validateDragDropQuestion(
        sampleItems,
        [...sampleZones, { id: 'water', label: 'Trùng' }],
      ),
    ).toBeTruthy()
    expect(
      validateDragDropQuestion(
        [...sampleItems, { id: 'fish', text: 'Trùng' }],
        sampleZones,
      ),
    ).toBeTruthy()
  })

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
