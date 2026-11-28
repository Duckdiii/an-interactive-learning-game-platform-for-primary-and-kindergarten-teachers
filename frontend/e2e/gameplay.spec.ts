import { expect, test, type Locator, type Page } from '@playwright/test'

const API = 'http://localhost:18080/api'

async function login(page: Page) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
  const email = `play-${id}@example.test`
  const password = `Play-${id}-Aa1!`
  const registered = await page.request.post(`${API}/auth/register`, { data: { fullName: 'Gameplay fixture', email, password, acceptedPolicy: true } })
  expect(registered.status()).toBe(201)
  await page.goto('/login')
  await page.getByPlaceholder('giaovien@example.com').fill(email)
  await page.getByPlaceholder('Nhập mật khẩu').fill(password)
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
  return page.evaluate(() => localStorage.getItem('accessToken'))
}

async function generate(page: Page, token: string | null, custom = false) {
  const headers = { Authorization: `Bearer ${token}` }
  const response = await page.request.post(`${API}/games/generate`, { headers, data: {
    gameType: custom ? 'CUSTOM' : 'QUIZ', subject: custom ? 'VIETNAMESE' : 'MATH',
    gradeLevel: custom ? 'GRADE_2' : 'GRADE_1', idea: custom ? 'Nhận biết từ ghép' : 'Đếm con vật từ 1 đến 5',
  } })
  expect(response.status()).toBe(200)
  const game = (await response.json()).data
  if (!custom) {
    const { gameId, status: _status, updatedAt: _updatedAt, ...body } = game
    body.metadata.presentation = { world: 'farm', carrier: 'balloon', layout: 'row' }
    expect((await page.request.put(`${API}/games/${gameId}`, { headers, data: body })).status()).toBe(200)
  }
  await page.goto(`/workspace/editor?gameId=${game.gameId}`)
  return game
}

// shortcut: coordinates target the fixed ROW fixture, not arbitrary moving layouts; update with the layout contract.
async function quizOption(canvas: Locator, index: number, count: number) {
  const box = await canvas.boundingBox()
  expect(box).not.toBeNull()
  const scale = box!.width / 800
  const rows = Math.ceil(count / 2)
  const origin = box!.height / scale - 40 - (rows * 200 + (rows - 1) * 40)
  await canvas.click({ position: { x: (210 + (index % 2) * 380) * scale, y: (origin + Math.floor(index / 2) * 240 + 100) * scale } })
}

for (const width of [360, 768, 1280]) {
  test(`QUIZ feedback, retry, completion and restart at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 })
    const token = await login(page)
    const game = await generate(page, token)
    await page.getByRole('button', { name: 'Chơi thử', exact: true }).click()
    const panel = page.getByRole('region', { name: 'Màn chơi thử' })
    await expect(panel.getByText('Câu 1 trên 2', { exact: true })).toBeVisible()
    const first = game.questions[0].options as Array<{ text: string }>
    await quizOption(panel.locator('canvas').first(), first.findIndex(o => o.text !== '3'), first.length)
    await expect(panel.getByText('Chưa đúng. Đáp án đúng đã được đánh dấu trên màn hình.', { exact: true })).toBeVisible()
    await panel.getByRole('button', { name: 'Thử lại câu này' }).click()
    await quizOption(panel.locator('canvas').first(), first.findIndex(o => o.text === '3'), first.length)
    await expect(panel.getByText('Đúng rồi!', { exact: true })).toBeVisible()
    await panel.getByRole('button', { name: 'Câu tiếp theo' }).click()
    await expect(panel.getByText('Câu 2 trên 2', { exact: true })).toBeVisible()
    const second = game.questions[1].options as Array<{ text: string }>
    await quizOption(panel.locator('canvas').first(), second.findIndex(o => o.text === '1'), second.length)
    await expect(panel.getByText('Đúng rồi!', { exact: true })).toBeVisible()
    await panel.getByRole('button', { name: 'Xem kết quả' }).click()
    await expect(page.getByRole('heading', { name: 'Kết quả chơi thử' })).toBeVisible()
    await expect(page.getByText('Đúng 2/2 câu', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Chơi lại', exact: true }).click()
    await expect(page.getByText('Câu 1 trên 2', { exact: true })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  })
}

test('CPF real generation/save/load, pointer gameplay, completion and restart', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1000 })
  const token = await login(page)
  const game = await generate(page, token, true)
  expect(game.cpf.content.rounds).toHaveLength(2)
  await expect(page.getByText('Màn 1: Từ nào là từ ghép?', { exact: true })).toBeAttached()
  const canvas = page.locator('canvas').first()
  // The static ROW fixture has three centers at x=245/640/1035 and y=415 on a 1280x720 stage.
  for (const [round, x] of [[1, 245], [2, 640]]) {
    await expect(page.getByText(`Màn ${round}: Từ nào là từ ghép?`, { exact: true })).toBeAttached()
    const box = await canvas.boundingBox()
    expect(box).not.toBeNull()
    await canvas.click({ position: { x: x * box!.width / 1280, y: 415 * box!.width / 1280 } })
    if (round === 1) await expect(page.getByText('Màn 2: Từ nào là từ ghép?', { exact: true })).toBeAttached()
  }
  await expect(page.getByRole('button', { name: 'Chơi lại', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Chơi lại', exact: true }).click()
  await expect(page.getByText('Màn 1: Từ nào là từ ghép?', { exact: true })).toBeAttached()
})
