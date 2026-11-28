import { expect, test, type Page } from '@playwright/test'
import { buildMockGameContents } from '../src/services/mock/gameFixtures'
import type { GameDsl, GameType, QuizQuestion, MatchingQuestion, DragDropQuestion, WordScrambleQuestion, OrderingQuestion, MemoryCardQuestion, SpotTheTargetQuestion, AudioVisualMatchQuestion, OddOneOutQuestion, VisualClozeQuestion } from '../src/types/game-dsl.types'
import { seededDerangement, seededShuffle } from '../src/games/common/seededDerangement'
import { computeDragDropLayout } from '../src/games/drag-drop/dragDropLayout'
import { computeWordScrambleLayout } from '../src/games/word-scramble/wordScrambleLayout'
import { getOddOneOutLayout } from '../src/games/odd-one-out/oddOneOutLayout'
import { API, clickCanvas, createGame, dragCanvas } from './gameplay-helpers'

const TYPES: GameType[] = ['QUIZ', 'MATCHING', 'DRAG_DROP', 'AUDIO_VISUAL_MATCH', 'ORDERING', 'MEMORY_CARD', 'SPOT_THE_TARGET', 'WORD_SCRAMBLE', 'ODD_ONE_OUT', 'VISUAL_CLOZE']

// Geometry/shuffle helpers locate fixture input only; assertions use visible feedback and progression, never renderer state or its grader.
async function answer(page: Page, game: GameDsl, index: number, student: boolean) {
  const q = game.questions[index]
  const seed = `mock-session-1:${q.id}`
  const canvas = page.locator('canvas').first()
  if (['QUIZ', 'ODD_ONE_OUT', 'VISUAL_CLOZE'].includes(game.gameType)) {
    let position = 0, count = 0
    if (game.gameType === 'QUIZ') {
      const quiz = q as QuizQuestion
      const options = student ? seededShuffle(quiz.options, seed) : quiz.options
      position = options.findIndex(o => o.id === quiz.correctOptionId); count = options.length
    } else if (game.gameType === 'ODD_ONE_OUT') {
      const odd = q as OddOneOutQuestion
      const options = seededShuffle(odd.items, student ? seed : `preview-${q.id}`)
      if (odd.questionText) {
        const layout = getOddOneOutLayout(options.length)!
        const target = layout.positions[options.findIndex(o => o.id === odd.oddOneOutId)]
        await clickCanvas(canvas, target.x + layout.itemSize / 2, target.y - 72 + layout.itemSize / 2)
        return
      }
      position = options.findIndex(o => o.id === odd.oddOneOutId); count = options.length
    } else {
      const cloze = q as VisualClozeQuestion
      const options = seededShuffle([cloze.correctAnswer, ...cloze.distractors], student ? seed : `preview-${q.id}`)
      position = options.indexOf(cloze.correctAnswer); count = options.length
    }
    expect(position).toBeGreaterThanOrEqual(0)
    if (student) await page.keyboard.press(String(position + 1))
    else {
      const box = (await canvas.boundingBox())!
      const rows = Math.ceil(count / 2)
      const origin = box.height / (box.width / 800) - 40 - (rows * 200 + (rows - 1) * 40)
      await clickCanvas(canvas, 210 + (position % 2) * 380, origin + Math.floor(position / 2) * 240 + 100)
    }
  } else if (game.gameType === 'MATCHING') {
    const matching = q as MatchingQuestion
    const right = seededDerangement(matching.pairs, student ? seed : q.id)
    const box = (await canvas.boundingBox())!
    const scale = box.width / 800
    const height = box.height / scale
    const rowHeight = Math.max(112, student ? Math.ceil(64 / scale) : 110)
    const origin = height - 40 - 96 - 32 - matching.pairs.length * rowHeight - (matching.pairs.length - 1) * 24
    for (let i = 0; i < matching.pairs.length; i++) {
      await clickCanvas(canvas, 180, origin + i * (rowHeight + 24) + rowHeight / 2)
      const target = right.findIndex(p => p.pairId === matching.pairs[i].pairId)
      await clickCanvas(canvas, 620, origin + target * (rowHeight + 24) + rowHeight / 2)
    }
    if (!student) await clickCanvas(canvas, 400, height - 40 - 48)
  } else if (game.gameType === 'DRAG_DROP') {
    const drag = q as DragDropQuestion
    const items = student ? seededShuffle(drag.items, seed) : drag.items
    const box = (await canvas.boundingBox())!
    const layout = computeDragDropLayout({ items, dropZones: drag.dropZones, hasAudio: Boolean(q.audioUrl), hasIllustration: Boolean(q.imageUrl), promptHeight: 24, scale: box.width / 800 })
    for (const item of items) {
      const start = layout.trayPositions[item.id]
      const zone = layout.zones.find(z => z.id === item.targetZoneId)!
      await dragCanvas(page, canvas, { x: start.x + layout.itemSize / 2, y: start.y + layout.itemSize / 2 }, { x: zone.bounds.x + zone.bounds.width / 2, y: zone.bounds.y + zone.bounds.height / 2 })
    }
    await clickCanvas(canvas, 400, layout.confirmY + layout.confirmHeight / 2)
  } else if (game.gameType === 'WORD_SCRAMBLE') {
    const word = q as WordScrambleQuestion
    const box = (await canvas.boundingBox())!
    const tiles = word.scrambledLetters.map((character, i) => ({ tileId: `tile_${i}`, character }))
    const layout = computeWordScrambleLayout({ tiles, wordLength: tiles.length, hasAudio: Boolean(q.audioUrl), hasIllustration: Boolean(q.imageUrl), promptHeight: 24, scale: box.width / 800 })
    const used = new Set<number>()
    for (const [i, char] of [...word.correctWord].entries()) {
      const target = tiles.findIndex((t, n) => !used.has(n) && t.character === char)
      expect(target).toBeGreaterThanOrEqual(0); used.add(target)
      const p = layout.trayPositions[tiles[target].tileId], slot = layout.slotBounds[i]
      await clickCanvas(canvas, p.x + layout.tileSize / 2, p.y + layout.tileSize / 2)
      await clickCanvas(canvas, slot.x + slot.width / 2, slot.y + slot.height / 2)
    }
    await clickCanvas(canvas, 400, layout.confirmY + layout.confirmHeight / 2)
  } else if (game.gameType === 'MEMORY_CARD') {
    const memory = q as MemoryCardQuestion
    const cards = page.getByRole('button', { name: /Thẻ (?:chưa lật số|\d+:)/ })
    for (let i = 0; i < memory.pairs.length; i++) {
      await cards.nth(i).click()
      await cards.nth(i + memory.pairs.length).click()
      await expect(cards.nth(i)).toBeDisabled()
    }
  } else if (game.gameType === 'ORDERING') {
    const ordered = [...(q as OrderingQuestion).steps].sort((a, b) => a.correctPosition - b.correctPosition)
    for (let i = 0; i < ordered.length; i++) {
      const cards = page.getByRole('button', { name: /^Vị trí \d+:/ })
      const names = await cards.evaluateAll(elements => elements.map(e => e.getAttribute('aria-label')))
      const target = names.findIndex(n => n === `Vị trí ${names.indexOf(n) + 1}: ${ordered[i].text}`)
      expect(target).toBeGreaterThanOrEqual(0)
      if (target !== i) { await cards.nth(target).click(); await cards.nth(i).click() }
    }
    await page.getByRole('button', { name: /^Xong rồi!/ }).click()
  } else if (game.gameType === 'AUDIO_VISUAL_MATCH') {
    const visual = q as AudioVisualMatchQuestion
    const choices = seededShuffle([visual.correct, ...visual.distractors], student ? seed : q.id)
    const target = choices.indexOf(visual.correct)
    const startX = (800 - (choices.length * 160 + (choices.length - 1) * 32)) / 2
    await clickCanvas(canvas, startX + target * 192 + 80, 250)
  } else if (game.gameType === 'SPOT_THE_TARGET') {
    const spot = q as SpotTheTargetQuestion
    const target = page.getByRole('button', { name: `Bức tranh tìm kiếm ${spot.targetDescription}` })
    const box = (await target.boundingBox())!
    await target.click({ position: { x: box.width * spot.hitRegion!.x, y: box.height * spot.hitRegion!.y } })
  }
}

for (const type of TYPES) {
  test(`preview ${type}: feedback, all questions, completion and restart (local grading, real persistence)`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1000 })
    const game = await createGame(page, type)
    if (game.gameType === 'CUSTOM') throw new Error('Expected DSL fixture')
    await page.getByRole('button', { name: 'Chơi thử', exact: true }).click()
    const panel = page.getByRole('region', { name: 'Màn chơi thử' })
    for (let i = 0; i < game.questions.length; i++) {
      await expect(panel.getByText(`Câu ${i + 1} trên ${game.questions.length}`, { exact: true })).toBeVisible()
      await answer(page, game, i, false)
      await expect(panel.getByRole('status').getByText('Đúng rồi!', { exact: true })).toBeVisible()
      await panel.getByRole('button', { name: i === game.questions.length - 1 ? 'Xem kết quả' : 'Câu tiếp theo', exact: true }).click()
    }
    await page.getByRole('button', { name: 'Chơi lại', exact: true }).click()
    await expect(panel.getByText(`Câu 1 trên ${game.questions.length}`, { exact: true })).toBeVisible()
  })
}

test.describe('mock player suite', () => {
  for (const [index, game] of buildMockGameContents().entries()) {
    test(`player mock ${game.gameType}: submitted answers, completion and restart`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 1000 })
      await page.goto(`/play/MOCK${String(index).padStart(2, '0')}`)
      await page.getByRole('button', { name: 'Bắt đầu', exact: true }).click()
      for (let i = 0; i < game.questions.length; i++) {
        await expect(page.getByRole('img', { name: `Câu ${i + 1}/${game.questions.length}`, exact: true })).toBeVisible()
        await answer(page, game, i, true)
        await expect(page.getByText('Giỏi quá!', { exact: true })).toBeVisible()
        await page.getByRole('button', { name: i === game.questions.length - 1 ? 'Xem kết quả' : 'Câu tiếp theo', exact: true }).click()
      }
      await expect(page.getByText('Chơi lại', { exact: true })).toBeVisible()
      await page.getByRole('button', { name: 'Chơi lại', exact: true }).click()
      await page.getByRole('button', { name: 'Bắt đầu', exact: true }).click()
      await expect(page.getByRole('img', { name: `Câu 1/${game.questions.length}`, exact: true })).toBeVisible()
    })
  }

  test('landscape renderer: portrait rotate prompt and landscape continuation', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 })
    await page.goto('/play/MOCK01')
    await page.getByRole('button', { name: 'Bắt đầu', exact: true }).click()
    await expect(page.getByText('Xoay ngang điện thoại để chơi nhé!', { exact: true })).toBeVisible()
    await page.setViewportSize({ width: 740, height: 360 })
    await expect(page.getByText('Xoay ngang điện thoại để chơi nhé!', { exact: true })).toHaveCount(0)
    await expect(page.getByRole('img', { name: 'Câu 1/3', exact: true })).toBeVisible()
    await expect(page.locator('canvas').first()).toBeVisible()
  })
})

test('audio request failure: can replay twice and still answer', async ({ page }) => {
  let failures = 0
  await page.route('**/sounds/e2e-missing.wav', route => { failures++; return route.abort() })
  const game = await createGame(page, 'AUDIO_VISUAL_MATCH')
  if (game.gameType !== 'AUDIO_VISUAL_MATCH') throw new Error('Expected audio fixture')
  const { gameId, status: _status, updatedAt: _updatedAt, ...body } = game
  body.questions[0].audioUrl = '/sounds/e2e-missing.wav'
  const token = await page.evaluate(() => localStorage.getItem('accessToken'))
  const saved = await page.request.put(API + '/games/' + gameId, {
    headers: { Authorization: 'Bearer ' + token }, data: body,
  })
  expect(saved.status(), await saved.text()).toBe(200)
  await page.reload()
  await page.getByRole('button', { name: 'Chơi thử', exact: true }).click()
  const panel = page.getByRole('region', { name: 'Màn chơi thử' })
  const listen = panel.getByRole('button', { name: 'Nghe lại câu hỏi', exact: true })
  await expect.poll(() => failures).toBeGreaterThan(0)
  for (let attempt = 0; attempt < 2; attempt++) {
    const before = failures
    await listen.click()
    await expect.poll(() => failures).toBeGreaterThan(before)
  }
  await answer(page, game, 0, false)
  await expect(panel.getByRole('status').getByText('Đúng rồi!', { exact: true })).toBeVisible()
})
