import { expect, test, type Page } from '@playwright/test'

// Luồng giáo viên trên giao diện thật (bước 1–9 trong docs/harness-evals/C1-ui-flow.md). Backend dùng AI giả của
// test luồng: hiểu ý tưởng luôn đề xuất QUIZ, sinh game luôn ra quiz mẫu, sửa thì đổi "con chó" thành "con gà".
const API = 'http://localhost:18080/api'

// Mật khẩu sinh mỗi lần chạy, theo quy tắc đăng ký (8–72 ký tự, hoa, thường, số, ký tự đặc biệt); không lưu ở đâu.
function newTeacher() {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  return { name: 'Giao vien E2E', email: `e2e-${id}@example.test`, password: `E2e-${id}-Aa1!` }
}

async function api(page: Page, path: string) {
  const token = await page.evaluate(() => localStorage.getItem('accessToken'))
  const response = await page.request.get(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } })
  return { status: response.status(), body: await response.json() }
}

test('giáo viên đăng ký, sinh game, sửa bằng trò chuyện và thấy game trong danh sách', async ({ page }) => {
  const teacher = newTeacher()

  await test.step('đăng ký rồi đăng nhập', async () => {
    await page.goto('/register')
    await page.getByPlaceholder('Nguyễn Văn An').fill(teacher.name)
    await page.getByPlaceholder('giaovien@example.com').fill(teacher.email)
    await page.getByLabel('Mật khẩu', { exact: true }).fill(teacher.password)
    await page.getByPlaceholder('Nhập lại mật khẩu').fill(teacher.password)
    await page.getByRole('button', { name: 'Tạo tài khoản', exact: true }).click()
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByText('Đăng ký thành công, mời đăng nhập')).toBeVisible()

    await page.getByPlaceholder('giaovien@example.com').fill(teacher.email)
    await page.getByPlaceholder('Nhập mật khẩu').fill(teacher.password)
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
    await expect(page).toHaveURL(/\/dashboard$/)
  })

  let gameId = ''
  await test.step('mô tả ý tưởng, xác nhận với AI và sinh game', async () => {
    await page.getByPlaceholder('Ví dụ: Bé đếm số con vật từ 1 đến 5').fill('Bé đếm số con vật từ 1 đến 5')
    await page.getByRole('button', { name: 'Tạo trò chơi' }).click()
    await expect(page).toHaveURL(/\/games\/new/)
    // Từ ô ý tưởng ở trang chủ, app chỉ đoán môn học; khối lớp giáo viên phải chọn.
    await page.getByRole('button', { name: 'Mầm non', exact: true }).click()
    await page.getByRole('button', { name: 'Để AI soạn giúp' }).click()
    await expect(page.getByRole('button', { name: 'Trắc nghiệm', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await page.getByRole('button', { name: 'Đúng rồi, tạo game' }).click()
    await expect(page).toHaveURL(/\/workspace\/editor\?gameId=/)
    gameId = new URL(page.url()).searchParams.get('gameId') ?? ''
    expect(gameId).not.toBe('')

    const game = await api(page, `/games/${gameId}`)
    expect(game.status).toBe(200)
    expect(game.body.data.gameType).toBe('QUIZ')
    const review = await api(page, `/games/${gameId}/curriculum-review`)
    expect(review.status).toBe(200)
    expect(review.body.data.status).toBe('UNAVAILABLE')
  })

  await test.step('sửa bằng trò chuyện, bản sửa được tự lưu', async () => {
    await page.getByPlaceholder('Cô muốn sửa gì?').fill('Đổi con chó thành con gà')
    await page.getByRole('button', { name: 'Gửi', exact: true }).click()
    // Game DSL (khác game CPF): bản sửa áp ngay, có nút hoàn tác, rồi editor tự lưu (PUT) sau một nhịp.
    await expect(page.getByRole('button', { name: 'Hoàn tác lần sửa bằng trò chuyện' })).toBeVisible()
    await expect
      .poll(async () => JSON.stringify((await api(page, `/games/${gameId}`)).body.data.questions), { timeout: 30_000 })
      .toContain('con gà')

    const review = await api(page, `/games/${gameId}/curriculum-review`)
    expect(review.body.data.status).toBe('STALE')
  })

  await test.step('game nằm trong danh sách, mở lại được', async () => {
    await page.getByRole('link', { name: 'Trò chơi của tôi' }).click()
    await expect(page).toHaveURL(/\/workspace$/)
    const edit = page.getByRole('link', { name: 'Soạn tiếp' })
    await expect(edit).toHaveCount(1)
    await expect(edit).toHaveAttribute('href', `/workspace/editor?gameId=${gameId}`)
  })
})
