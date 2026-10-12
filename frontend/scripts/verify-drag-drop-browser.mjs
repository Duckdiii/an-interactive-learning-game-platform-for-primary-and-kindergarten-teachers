import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createBoardLayout, ITEM_SIZE } from '../src/components/game/renderers/drag-drop/geometry.ts'
import { dragDropQuestion } from '../src/demo/dragDropQuestion.ts'

const { chromium } = await import('../node_modules/.drag-drop-test-tools/node_modules/playwright/index.mjs')
const origin = process.argv[2] ?? process.env.DRAG_DROP_TEST_URL ?? 'http://127.0.0.1:5173'
const output = fileURLToPath(new URL('../node_modules/.drag-drop-test-tools/screenshots/', import.meta.url))
mkdirSync(output, { recursive: true })
const browser = await chromium.launch({ headless: true })
const errors = []

async function openFixture(viewport, touch = false, preview = false) {
  const context = await browser.newContext({ viewport, hasTouch: touch, isMobile: touch })
  const page = await context.newPage()
  page.on('pageerror', (error) => { errors.push(error.message); console.error(error.message) })
  await page.goto(`${origin}/tests/fixtures/drag-drop.html${preview ? '?preview' : ''}`)
  await page.waitForFunction(() => window.testKonva?.stages[0]?.find('.drag-item').length === 4)
  await page.waitForFunction(() => window.testKonva.stages[0].find('Image').every((node) => node.image()?.complete))
  await page.waitForFunction(() => window.testKonva.stages[0].width() === Math.min(800, window.innerWidth - 32))
  const audioSupported = await page.evaluate(async () => {
    const audio = new AudioContext()
    try {
      const response = await fetch('/sounds/correct-drop.wav')
      const decoded = await audio.decodeAudioData(await response.arrayBuffer())
      return decoded.duration > 0
    } finally { await audio.close() }
  })
  assert.ok(audioSupported)
  assert.equal(await page.getByText('Âm thanh tạm thời không khả dụng.', { exact: true }).count(), 0)
  return { context, page }
}

async function nodeState(page, id) {
  return page.evaluate((itemId) => {
    const node = window.testKonva.stages[0].findOne(`#${itemId}`)
    return { x: node.x(), y: node.y(), draggable: node.draggable() }
  }, id)
}

async function drag(page, itemId, destination, touch = false) {
  const metrics = await page.evaluate((id) => {
    const stage = window.testKonva.stages[0]
    const node = stage.findOne(`#${id}`)
    const rect = stage.container().getBoundingClientRect()
    return { left: rect.left, top: rect.top, x: node.x(), y: node.y() }
  }, itemId)
  const from = { x: metrics.left + metrics.x + ITEM_SIZE / 2, y: metrics.top + metrics.y + ITEM_SIZE / 2 }
  const to = { x: metrics.left + destination.x + ITEM_SIZE / 2, y: metrics.top + destination.y + ITEM_SIZE / 2 }
  if (touch) {
    const client = await page.context().newCDPSession(page)
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [from] })
    for (let step = 1; step <= 16; step++) {
      await client.send('Input.dispatchTouchEvent', {
        type: 'touchMove', touchPoints: [{ x: from.x + (to.x - from.x) * step / 16, y: from.y + (to.y - from.y) * step / 16 }],
      })
    }
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await client.detach()
  } else {
    await page.mouse.move(from.x, from.y)
    await page.mouse.down()
    await page.mouse.move(to.x, to.y, { steps: 16 })
    await page.mouse.up()
  }
}

async function checkPixels(page) {
  const info = await page.evaluate(() => {
    const canvas = document.querySelector('canvas')
    const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data
    const colors = new Set()
    for (let index = 0; index < pixels.length; index += 16) colors.add(`${pixels[index]}:${pixels[index + 1]}:${pixels[index + 2]}:${pixels[index + 3]}`)
    return { colors: colors.size, overflow: document.documentElement.scrollWidth > window.innerWidth }
  })
  assert.ok(info.colors > 100, `Canvas blank or assets missing: ${info.colors} colors`)
  assert.equal(info.overflow, false)
}

async function finish(page, layout, touch = false) {
  for (const item of dragDropQuestion.draggableItems) await drag(page, item.itemId, layout.zonePositions[item.itemId], touch)
  await page.waitForFunction(() => window.answers.length + window.previews.length > 0)
}

try {
  const { context, page } = await openFixture({ width: 1000, height: 850 })
  const layout = createBoardLayout(dragDropQuestion, 800)
  await checkPixels(page)
  await drag(page, 'fish', layout.zonePositions.rabbit)
  assert.deepEqual(await nodeState(page, 'fish'), { ...layout.trayPositions.fish, draggable: true })
  assert.ok(await page.getByText('Bé thử lại nhé!', { exact: false }).isVisible())
  await drag(page, 'fish', { x: 2, y: layout.trayBounds.y })
  assert.deepEqual(await nodeState(page, 'fish'), { ...layout.trayPositions.fish, draggable: true })
  await drag(page, 'fish', layout.zonePositions.fish)
  assert.deepEqual(await nodeState(page, 'fish'), { ...layout.zonePositions.fish, draggable: false })
  await drag(page, 'fish', layout.trayPositions.fish)
  assert.equal((await nodeState(page, 'fish')).draggable, false)
  await page.evaluate(() => { window.failSubmission = true })
  for (const item of dragDropQuestion.draggableItems.slice(1)) await drag(page, item.itemId, layout.zonePositions[item.itemId])
  await page.getByRole('button', { name: 'Thử lại', exact: true }).waitFor()
  assert.equal(await page.evaluate(() => window.answers.length), 1)
  const answer = await page.evaluate(() => window.answers[0])
  assert.equal(answer.participantId, 'test-participant')
  assert.equal(answer.questionId, 'demo-habitats')
  assert.equal(answer.placements.length, 4)
  assert.ok(answer.timeSpentMs > 0)
  await page.evaluate(() => { window.failSubmission = false })
  await page.getByRole('button', { name: 'Thử lại', exact: true }).click()
  await page.waitForFunction(() => window.answers.length === 2)
  assert.deepEqual(await page.evaluate(() => window.answers[1]), answer)
  await page.screenshot({ path: `${output}/desktop-complete.png`, fullPage: true })
  await page.getByRole('button', { name: 'Chơi lại', exact: true }).click()
  await page.waitForFunction(() => window.testKonva.stages[0].findOne('#fish').draggable())
  assert.ok(await page.getByText('0 / 4 vật thể', { exact: true }).isVisible())
  await context.close()
  console.log('Desktop: wrong drop, miss, lock, completion, stable retry payload, and reset passed.')

  const tablet = await openFixture({ width: 768, height: 1024 }, true)
  const tabletLayout = createBoardLayout(dragDropQuestion, 736)
  await checkPixels(tablet.page)
  await finish(tablet.page, tabletLayout, true)
  assert.equal(await tablet.page.evaluate(() => window.answers.length), 1)
  await tablet.page.screenshot({ path: `${output}/tablet.png`, fullPage: true })
  await tablet.context.close()
  console.log('Tablet: four real touch drags and a single completion callback passed.')

  const mobile = await openFixture({ width: 390, height: 844 }, true, true)
  await checkPixels(mobile.page)
  const mobileLayout = createBoardLayout(dragDropQuestion, 358)
  await mobile.page.screenshot({ path: `${output}/mobile.png`, fullPage: true })
  await finish(mobile.page, mobileLayout, true)
  assert.equal(await mobile.page.evaluate(() => window.answers.length), 0)
  assert.equal(await mobile.page.evaluate(() => window.previews.length), 1)
  await mobile.context.close()
  console.log('Mobile: responsive assets and touch drags passed; preview made no submission.')

  const app = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  app.on('pageerror', (error) => errors.push(error.message))
  await app.goto(`${origin}/login`)
  await app.getByRole('button', { name: 'Đăng nhập demo', exact: true }).click()
  await app.getByRole('link', { name: 'Editor', exact: true }).first().click()
  await app.getByRole('group', { name: 'Bảng kéo thả phân loại', exact: true }).waitFor()
  await app.waitForFunction(() => document.querySelector('canvas')?.width > 0)
  await checkPixels(app)
  await app.screenshot({ path: `${output}/editor-desktop.png`, fullPage: true })
  await app.setViewportSize({ width: 390, height: 844 })
  await app.screenshot({ path: `${output}/editor-mobile.png`, fullPage: true })
  await checkPixels(app)
  await app.close()
  assert.deepEqual(errors, [])
  console.log(`Editor integration passed. Screenshots: ${output}`)
} finally {
  await browser.close()
}
