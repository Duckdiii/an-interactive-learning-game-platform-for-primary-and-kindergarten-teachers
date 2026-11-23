import { expect, test, type Page } from '@playwright/test'

// Luồng giáo viên trên giao diện thật (bước 1–9 trong docs/harness-evals/C1-ui-flow.md). Backend dùng AI giả của
// test luồng: hiểu ý tưởng luôn đề xuất QUIZ, sinh game luôn ra quiz mẫu, sửa thì đổi "con chó" thành "con gà".
const API = 'http://localhost:18080/api'

// Mật khẩu sinh mỗi lần chạy, theo quy tắc đăng ký (8–72 ký tự, hoa, thường, số, ký tự đặc biệt); không lưu ở đâu.
function newTeacher() {
  const id = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`
  return { name: 'Giao vien E2E', email: `e2e-${id}@example.test`, password: `E2e-${id}-Aa1!` }
}

async function api(page: Page, path: string) {
  const token = await page.evaluate(() => localStorage.getItem('accessToken'))
  const response = await page.request.get(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } })
  return { status: response.status(), body: await response.json() }
}

test('giáo viên đăng ký, sinh game, sửa bằng trò chuyện và thấy game trong danh sách', async ({ page, browser }) => {
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
    await edit.click()
    const title = page.getByRole('textbox', { name: /Tên trò chơi/ })
    await expect(title).toBeVisible()
    await title.fill('Bé đếm con gà')
    await expect.poll(async () => (await api(page, `/games/${gameId}`)).body.data.metadata.title).toBe('Bé đếm con gà')
    await page.reload()
    await expect(page.getByRole('textbox', { name: /Tên trò chơi/ })).toHaveValue('Bé đếm con gà')
  })
  await test.step('kiểm duyệt chữ trước khi cập nhật bản nháp', async () => {
    const field = page.getByRole('textbox', { name: /Nội dung câu hỏi/ })
    const readQuestion = async () => (await api(page, `/games/${gameId}`)).body.data.questions[0].questionText
    const original = await readQuestion()
    const rejected = page.waitForResponse((response) =>
      response.url() === `${API}/games/validate-text` && response.request().method() === 'POST')
    await field.fill('Câu hỏi có từ ma túy')
    expect((await rejected).status()).toBe(422)
    await expect(field).toHaveAttribute('aria-invalid', 'true')
    await expect(field).toHaveValue('Câu hỏi có từ ma túy')
    expect(await readQuestion()).toBe(original)

    await field.fill('Bé thấy mấy con gà?')
    await expect(field).not.toHaveAttribute('aria-invalid', 'true')
    await expect.poll(readQuestion).toBe('Bé thấy mấy con gà?')
  })
  await test.step('tải ảnh thật, tự lưu URL và mở lại ảnh', async () => {
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+X2gAAAABJRU5ErkJggg==', 'base64')
    await page.getByLabel('Tải ảnh lên').setInputFiles({ name: 'illustration.png', mimeType: 'image/png', buffer: png })
    await page.getByRole('button', { name: 'Xác nhận tải lên' }).click()
    const readImage = async () => (await api(page, `/games/${gameId}`)).body.data.questions[0].imageUrl
    await expect.poll(readImage).toMatch(/^http:\/\/localhost:18080\/media\/uploads\//)
    const url: string = await readImage()
    const downloaded = await page.request.get(url)
    expect(downloaded.ok()).toBe(true)
    expect(downloaded.headers()['content-type']).toBe('image/png')
    await page.reload()
    const uploaded = page.locator(`img[src="${url}"]`).first()
    await expect(uploaded).toBeVisible()
    await expect.poll(() => uploaded.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(1)
  })
  await test.step('mở phòng gắn lớp, học sinh nộp đáp án và giáo viên xem kết quả', async () => {
    const token = await page.evaluate(() => localStorage.getItem('accessToken'))
    const headers = { Authorization: `Bearer ${token}` }
    const publish = await page.request.post(`${API}/games/${gameId}/publish`, { headers })
    expect(publish.ok(), await publish.text()).toBe(true)
    const first = await page.request.post(`${API}/classrooms`, { headers, data: { className: 'Lớp Ong Vàng' } })
    const other = await page.request.post(`${API}/classrooms`, { headers, data: { className: 'Lớp Cánh Cam' } })
    expect(first.status()).toBe(201)
    expect(other.status()).toBe(201)
    const { classroomId } = (await first.json()).data
    const otherId = (await other.json()).data.classroomId

    await page.goto(`/rooms/host/${gameId}`)
    await page.getByLabel('Lớp học').selectOption({ label: 'Lớp Ong Vàng' })
    await page.getByRole('button', { name: 'Mở phòng', exact: true }).click()
    const guestContext = await browser.newContext({ baseURL: new URL(page.url()).origin })
    try {
      const guest = await guestContext.newPage()
      const joinPath = await page.getByRole('link', { name: 'Đường dẫn cho học sinh' }).getAttribute('href')
      expect(joinPath).toMatch(/^\/join\/\d{6}$/)
      await guest.goto(joinPath!)
      await guest.getByLabel('Biệt danh').fill('Ong Vàng')
      await guest.getByRole('button', { name: 'Vào phòng', exact: true }).click()
      await expect(guest.getByText('Đang đợi giáo viên bắt đầu')).toBeVisible()
      await expect(page.getByText(/Ong Vàng · 0 điểm/)).toBeVisible()
      await page.getByRole('button', { name: 'Bắt đầu', exact: true }).click()
      await guest.getByRole('button', { name: 'Vào chơi', exact: true }).click()
      await expect(guest.locator('canvas').first()).toBeVisible()
      const submitted = guest.waitForResponse((response) => response.url().endsWith('/interactions'))
      await guest.keyboard.press('1')
      expect((await submitted).ok()).toBe(true)
      await expect(page.getByText(/Ong Vàng · .* · 1 câu/)).toBeVisible()

      await page.getByRole('button', { name: 'Kết thúc phòng', exact: true }).click()
      await page.getByRole('link', { name: 'Xem kết quả', exact: true }).click()
      await expect(page).toHaveURL(new RegExp(`classroomId=${classroomId}`))
      const insights = await api(page, `/games/${gameId}/insights?sessionType=SOLO&classroomId=${classroomId}`)
      expect(insights.body.data.playCount).toBe(1)
      const excluded = await api(page, `/games/${gameId}/insights?sessionType=SOLO&classroomId=${otherId}`)
      expect(excluded.body.data.playCount).toBe(0)
    } finally {
      await guestContext.close()
    }
  })


})
