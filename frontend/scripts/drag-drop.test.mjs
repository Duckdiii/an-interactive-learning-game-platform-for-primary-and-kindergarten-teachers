import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createBoardLayout, isInsideZone, ITEM_SIZE, resolveDrop, validateQuestion } from '../src/components/game/renderers/drag-drop/geometry.ts'
import { dragDropQuestion as question } from '../src/demo/dragDropQuestion.ts'

test('validates unique items, target zones, and nonempty questions', () => {
  assert.equal(validateQuestion(question), null)
  assert.ok(validateQuestion({ ...question, draggableItems: [] }))
  assert.ok(validateQuestion({ ...question, dropZones: [...question.dropZones, question.dropZones[0]] }))
  assert.ok(validateQuestion({ ...question, draggableItems: [...question.draggableItems, question.draggableItems[0]] }))
  assert.ok(validateQuestion({ ...question, dropZones: question.dropZones.slice(1) }))
})

test('uses item center, including rectangular boundaries', () => {
  const layout = createBoardLayout(question, 800)
  const zone = layout.zones[0].bounds
  const position = { x: zone.x - ITEM_SIZE / 2, y: zone.y - ITEM_SIZE / 2 }
  assert.equal(isInsideZone(position, zone), false)
  assert.equal(resolveDrop(layout, question, {}, 'fish', position).outcome, 'correct')
  assert.equal(isInsideZone({ x: zone.x + zone.width, y: zone.y + zone.height }, zone), true)
})

test('correct drops lock; wrong drops and misses return to tray', () => {
  const layout = createBoardLayout(question, 800)
  const correct = resolveDrop(layout, question, {}, 'fish', layout.zonePositions.fish)
  assert.equal(correct.outcome, 'correct')
  assert.equal(correct.zoneId, 'water')
  const wrong = resolveDrop(layout, question, {}, 'fish', layout.zonePositions.rabbit)
  assert.equal(wrong.outcome, 'wrong')
  assert.deepEqual(wrong.position, layout.trayPositions.fish)
  assert.equal(wrong.zoneId, 'water')
  const miss = resolveDrop(layout, question, {}, 'fish', { x: -100, y: -100 })
  assert.equal(miss.outcome, 'miss')
  assert.deepEqual(miss.position, layout.trayPositions.fish)
  const locked = resolveDrop(layout, question, { fish: { zoneId: 'water', correct: true } }, 'fish', { x: -100, y: -100 })
  assert.equal(locked.outcome, 'locked')
  assert.deepEqual(locked.position, layout.zonePositions.fish)
})

test('responsive layouts retain touch size and keep all slots inside distinct zones', () => {
  for (const width of [240, 288, 320, 390, 560, 736, 800]) {
    const layout = createBoardLayout(question, width)
    assert.ok(ITEM_SIZE >= 64)
    for (const item of question.draggableItems) {
      const zone = layout.zones.find((candidate) => candidate.zoneId === item.correctZoneId)
      const point = layout.zonePositions[item.itemId]
      assert.ok(isInsideZone(point, zone.bounds))
      assert.ok(isInsideZone({ x: point.x + ITEM_SIZE, y: point.y + ITEM_SIZE }, zone.bounds))
      const tray = layout.trayPositions[item.itemId]
      assert.ok(isInsideZone(tray, layout.trayBounds))
      assert.ok(isInsideZone({ x: tray.x + ITEM_SIZE, y: tray.y + ITEM_SIZE }, layout.trayBounds))
    }
    assert.equal(new Set(Object.values(layout.zonePositions).map((point) => `${point.x}:${point.y}`)).size, question.draggableItems.length)
  }
})

test('many items in a zone receive separate rows rather than overlapping', () => {
  const many = { ...question, draggableItems: Array.from({ length: 12 }, (_, index) => ({ ...question.draggableItems[0], itemId: `item-${index}` })) }
  const layout = createBoardLayout(many, 320)
  for (const position of Object.values(layout.zonePositions)) {
    assert.ok(isInsideZone({ x: position.x + ITEM_SIZE, y: position.y + ITEM_SIZE }, layout.zones[0].bounds))
  }
  assert.equal(new Set(Object.values(layout.zonePositions).map((point) => `${point.x}:${point.y}`)).size, 12)
})
