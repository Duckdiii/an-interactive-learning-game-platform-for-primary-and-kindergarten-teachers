import { readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import type { CpfGame } from '../src/types/cpf-game.types'
import { center, layoutGroup, CPF_HUD_HEIGHT, CPF_STAGE_HEIGHT } from '../src/games/cpf/cpfLayout'
import { clickCanvas, createGame, dragCanvas } from './gameplay-helpers'

const source = (name: string): CpfGame => JSON.parse(readFileSync(`../backend/src/test/resources/cpf-examples/${name}.json`, 'utf8'))
test.use({ actionTimeout: 10000 })

async function openCpf(page: Page, name: string, motion?: string) {
  const fixture = source(name)
  await page.clock.install()
  const response = await createGame(page, 'CUSTOM', `E2E CPF: ${name}${motion ? '/' + motion : ''}`, fixture.metadata.subject, fixture.metadata.gradeLevel)
  if (response.gameType !== 'CUSTOM') throw new Error('Expected CPF fixture')
  await expect(page.locator('canvas').first()).toBeVisible()
  await page.clock.pauseAt(new Date(Date.now() + 1000))
  await page.getByRole('button', { name: 'Chơi lại từ đầu', exact: true }).click()
  await page.clock.runFor(16)
  return response.cpf
}

function boxes(game: CpfGame, round: number, bind: 'choices' | 'zones') {
  const entity = game.entities.find(e => e.bindTo === bind)!
  const count = bind === 'choices' ? game.content.rounds[round].choices.length : game.content.rounds[round].zones!.length
  return layoutGroup(entity.placement.region, entity.placement.arrangement, count, round)
}

function correctChoices(game: CpfGame, round: number) {
  const key = game.answerKey.rounds[round]
  if (!('correctChoiceIds' in key)) throw new Error('Expected choice answer key')
  return key.correctChoiceIds
}

for (const motion of ['STATIC', 'FALL', 'FLOAT_UP', 'PATROL_X', 'BOB', 'SWAY_UP', 'ORBIT', 'CROSS']) {
  test(`CPF TAP ${motion}: motion, answer each round and restart (preview)`, async ({ page }) => {
    const game = await openCpf(page, 'fishing-compound-words', motion)
    expect(game.entities[0].motion?.type).toBe(motion)
    const canvas = page.locator('canvas').first()
    await page.waitForLoadState('networkidle')
    const before = await canvas.screenshot()
    await page.clock.runFor(500)
    const after = await canvas.screenshot()
    expect(before.equals(after)).toBe(motion === 'STATIC')
    await page.getByRole('button', { name: 'Chơi lại từ đầu', exact: true }).click()
    await page.clock.runFor(16)
    for (let r = 0; r < game.content.rounds.length; r++) {
      await expect(page.getByText(game.content.rounds[r].prompt, { exact: true })).toBeAttached()
      const index = game.content.rounds[r].choices.findIndex(c => c.id === correctChoices(game, r)[0])
      const box = boxes(game, r, 'choices')[index]
      let y = box.y
      if (['FLOAT_UP', 'SWAY_UP'].includes(motion)) {
        const loop = CPF_STAGE_HEIGHT - CPF_HUD_HEIGHT + box.h
        y = CPF_HUD_HEIGHT - box.h + ((box.y - CPF_HUD_HEIGHT + box.h + index * loop / game.content.rounds[r].choices.length) % loop)
      }
      await clickCanvas(canvas, box.x + box.w / 2, y + box.h / 2, 1280)
      // A wrong PICK_ONE answer waits for reveal; only 32ms passes, so it cannot masquerade as an immediate correct advance.
      await page.clock.runFor(32)
    }
    await expect(page.getByRole('button', { name: 'Chơi lại', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Chơi lại', exact: true }).click()
    await expect(page.getByText(game.content.rounds[0].prompt, { exact: true })).toBeAttached()
  })
}

test('CPF DRAG_FREE SORT/DROP: every item, completion and reset', async ({ page }) => {
  const game = await openCpf(page, 'sort-land-water-animals')
  const canvas = page.locator('canvas').first()
  const key = game.answerKey.rounds[0]
  if (!('placements' in key)) throw new Error('Expected placement answer key')
  for (const placement of key.placements) {
    const r = game.content.rounds[0]
    const item = boxes(game, 0, 'choices')[r.choices.findIndex(c => c.id === placement.choiceId)]
    const zone = boxes(game, 0, 'zones')[r.zones!.findIndex(z => z.id === placement.zoneId)]
    await dragCanvas(page, canvas, center(item), center(zone), 1280)
    await page.clock.runFor(32)
  }
  await expect(page.getByRole('button', { name: 'Chơi lại', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Chơi lại', exact: true }).click()
  await expect(page.getByText(game.content.rounds[0].prompt, { exact: true })).toBeAttached()
})

for (const name of ['archery-addition', 'rabbit-pick-carrots']) {
  test(`CPF ${name}: pointer control, collision and completion`, async ({ page }) => {
    const game = await openCpf(page, name)
    const canvas = page.locator('canvas').first()
    for (let r = 0; r < game.content.rounds.length; r++) {
      await expect(page.getByText(game.content.rounds[r].prompt, { exact: true })).toBeAttached()
      const target = boxes(game, r, 'choices')[game.content.rounds[r].choices.findIndex(c => c.id === correctChoices(game, r)[0])]
      const p = center(target)
      const actor = game.entities.find(e => e.control)!
      const from = center(layoutGroup(actor.placement.region, actor.placement.arrangement, 1, r)[0])
      if (actor.control === 'AIM_SHOOT') {
        const length = Math.hypot(p.x - from.x, p.y - from.y)
        await dragCanvas(page, canvas, from, { x: from.x - (p.x - from.x) / length * 65, y: from.y - (p.y - from.y) / length * 65 }, 1280)
        await page.clock.runFor(900)
      } else {
        await clickCanvas(canvas, p.x, p.y, 1280)
        await page.clock.runFor(1900)
      }
    }
    await expect(page.getByRole('button', { name: 'Chơi lại', exact: true })).toBeVisible()
  })
}

test('CPF DRAG_X FALL/STREAM PICK_ALL: catch the correct choices', async ({ page }) => {
  const game = await openCpf(page, 'catch-even-apples')
  const canvas = page.locator('canvas').first()
  const actor = game.entities.find(e => e.control === 'DRAG_X')!
  let from = center(layoutGroup(actor.placement.region, actor.placement.arrangement, 1)[0])
  for (let r = 0; r < game.content.rounds.length; r++) {
    await expect(page.getByText(game.content.rounds[r].prompt, { exact: true })).toBeAttached()
    for (const id of correctChoices(game, r)) {
      const target = boxes(game, r, 'choices')[game.content.rounds[r].choices.findIndex(c => c.id === id)]
      const to = { x: center(target).x, y: from.y }
      await dragCanvas(page, canvas, from, to, 1280)
      from = to
      await page.clock.runFor(25000)
    }
    from = center(layoutGroup(actor.placement.region, actor.placement.arrangement, 1, r + 1)[0])
  }
  await expect(page.getByRole('button', { name: 'Chơi lại', exact: true })).toBeVisible()
})

test('CPF asset failure: broken images retain playable labelled fallback', async ({ page }, testInfo) => {
  let failed = 0
  // Observe the browser painting API, not Konva/game state: invisible hit boxes cannot satisfy the label assertion.
  await page.addInitScript(() => {
    const drawn = new Set<string>()
    ;(window as unknown as { __cpfText: Set<string> }).__cpfText = drawn
    const paint = CanvasRenderingContext2D.prototype.fillText
    CanvasRenderingContext2D.prototype.fillText = function (...args: Parameters<typeof paint>) {
      drawn.add(args[0])
      return paint.apply(this, args)
    }
  })
  await page.route('**/assets/**', route => { failed++; return route.abort() })
  const game = await openCpf(page, 'fishing-compound-words', 'STATIC')
  const canvas = page.locator('canvas').first()
  await expect.poll(() => page.evaluate(labels => {
    const painted = [...(window as unknown as { __cpfText: Set<string> }).__cpfText]
    return labels.every(label => painted.some(text => text.includes(label)))
  }, game.content.rounds[0].choices.map(c => c.label))).toBe(true)
  await testInfo.attach('cpf-asset-fallback', { body: await canvas.screenshot(), contentType: 'image/png' })
  for (let r = 0; r < game.content.rounds.length; r++) {
    const target = boxes(game, r, 'choices')[game.content.rounds[r].choices.findIndex(c => c.id === correctChoices(game, r)[0])]
    await clickCanvas(canvas, center(target).x, center(target).y, 1280)
    await page.clock.runFor(32)
  }
  expect(failed).toBeGreaterThan(0)
  await expect(page.getByRole('button', { name: 'Chơi lại', exact: true })).toBeVisible()
})

for (const width of [360, 768]) {
  test(`CPF TAP responsive ${width}px: completion after scaled pointer input`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 })
    const game = await openCpf(page, 'fishing-compound-words', 'STATIC')
    for (let r = 0; r < game.content.rounds.length; r++) {
      await expect(page.getByText(game.content.rounds[r].prompt, { exact: true })).toBeAttached()
      const target = boxes(game, r, 'choices')[game.content.rounds[r].choices.findIndex(c => c.id === correctChoices(game, r)[0])]
      await clickCanvas(page.locator('canvas').first(), center(target).x, center(target).y, 1280)
      await page.clock.runFor(32)
    }
    await expect(page.getByRole('button', { name: 'Chơi lại', exact: true })).toBeVisible()
  })
}
