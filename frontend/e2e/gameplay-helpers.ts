import { expect, type Locator, type Page } from '@playwright/test'
import type { ApiGameType, AnyGameResponse } from '../src/types/game-response.types'

export const API = 'http://localhost:18080/api'

export async function createGame(page: Page, gameType: ApiGameType, idea = 'Browser fixture', subject = 'MATH', gradeLevel = 'GRADE_1') {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
  const email = `browser-${id}@example.test`
  const password = `Play-${id}-Aa1!`
  expect((await page.request.post(`${API}/auth/register`, { data: { fullName: 'Browser fixture', email, password, acceptedPolicy: true } })).status()).toBe(201)
  await page.goto('/login')
  await page.getByPlaceholder('giaovien@example.com').fill(email)
  await page.getByPlaceholder('Nhập mật khẩu').fill(password)
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
  const token = await page.evaluate(() => localStorage.getItem('accessToken'))
  const headers = { Authorization: `Bearer ${token}` }
  const response = await page.request.post(`${API}/games/generate`, { headers, data: { gameType, subject, gradeLevel, idea } })
  expect(response.status(), await response.text()).toBe(200)
  const game = (await response.json()).data as AnyGameResponse
  if (game.gameType !== 'CUSTOM') {
    const { gameId, status: _status, updatedAt: _updatedAt, ...body } = game
    body.metadata.presentation = { world: 'farm', carrier: 'balloon', layout: 'row' }
    if (body.gameType === 'SPOT_THE_TARGET') for (const q of body.questions) q.hitRegion = { x: 0.5, y: 0.5, radius: 0.2 }
    expect((await page.request.put(`${API}/games/${gameId}`, { headers, data: body })).status()).toBe(200)
    Object.assign(game, body)
  }
  await page.goto(`/workspace/editor?gameId=${game.gameId}`)
  return game
}

export async function clickCanvas(canvas: Locator, x: number, y: number, designWidth = 800) {
  await expect(canvas).toBeVisible()
  const box = await canvas.boundingBox()
  expect(box).not.toBeNull()
  await canvas.click({ position: { x: x * box!.width / designWidth, y: y * box!.width / designWidth } })
}

export async function dragCanvas(page: Page, canvas: Locator, from: { x: number; y: number }, to: { x: number; y: number }, designWidth = 800) {
  await canvas.scrollIntoViewIfNeeded()
  const box = (await canvas.boundingBox())!
  const scale = box.width / designWidth
  await page.mouse.move(box.x + from.x * scale, box.y + from.y * scale)
  await page.mouse.down()
  await page.mouse.move(box.x + to.x * scale, box.y + to.y * scale, { steps: 12 })
  await page.mouse.up()
}
