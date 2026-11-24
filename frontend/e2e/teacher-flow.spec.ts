import { expect, test, type Page } from '@playwright/test'

// Luồng giáo viên trên giao diện thật (bước 1–9 trong docs/harness-evals/C1-ui-flow.md). Backend dùng AI giả của
// test luồng: hiểu ý tưởng luôn đề xuất QUIZ, sinh game luôn ra quiz mẫu, sửa thì đổi "con chó" thành "con gà".
const API = 'http://localhost:18080/api'
const guestNavigation = { waitUntil: 'domcontentloaded', timeout: 20_000 } as const

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
  test.setTimeout(240_000)
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
  await test.step('SOLO giữ câu và điểm qua tạm dừng, mất mạng và đóng phòng', async () => {
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
    await page.getByLabel('Số học sinh tối đa (không bắt buộc)').fill('1')
    await page.getByRole('button', { name: 'Mở phòng', exact: true }).click()
    const guestContext = await browser.newContext({ baseURL: new URL(page.url()).origin })
    try {
      const guest = await guestContext.newPage()
      const joinPath = await page.getByRole('link', { name: 'Đường dẫn cho học sinh' }).getAttribute('href')
      expect(joinPath).toMatch(/^\/join\/\d{6}$/)
      const unknownPin = joinPath === '/join/000000' ? '000001' : '000000'
      await guest.goto(`/join/${unknownPin}`, guestNavigation)
      await expect(guest.getByRole('alert')).toHaveText(/Không tìm thấy phòng.*mã PIN/)
      await guest.goto(joinPath!, guestNavigation)
      await guest.getByLabel('Biệt danh').fill('ma túy')
      await guest.getByRole('button', { name: 'Vào phòng', exact: true }).click()
      await expect(guest.getByRole('alert')).toHaveText(/từ ngữ không phù hợp/)
      await guest.getByLabel('Biệt danh').fill('Ong Vàng')
      await guest.getByRole('button', { name: 'Vào phòng', exact: true }).click()
      await expect(guest.getByText('Đang đợi giáo viên bắt đầu')).toBeVisible()
      await expect(page.getByText(/Ong Vàng · 0 điểm/)).toBeVisible()
      const otherGuest = await guestContext.newPage()
      await otherGuest.goto(joinPath!, guestNavigation)
      await otherGuest.getByLabel('Biệt danh').fill('ong vàng')
      await otherGuest.getByRole('button', { name: 'Vào phòng', exact: true }).click()
      await expect(otherGuest.getByRole('alert')).toHaveText(/đã có bạn sử dụng/)
      await otherGuest.getByLabel('Biệt danh').fill('Cánh Cam')
      await otherGuest.getByRole('button', { name: 'Vào phòng', exact: true }).click()
      await expect(otherGuest.getByRole('alert')).toHaveText(/đã đủ số lượng học sinh/)
      await otherGuest.close()

      await page.getByRole('button', { name: 'Bắt đầu', exact: true }).click()
      const questions = guest.waitForResponse((response) => response.url().endsWith('/questions'))
      await guest.getByRole('button', { name: 'Vào chơi', exact: true }).click()
      await expect(guest.locator('canvas').first()).toBeVisible()
      const firstQuestion = (await (await questions).json()).data.questions[0]
      const correctPosition = firstQuestion.options.findIndex((option: { text: string }) => option.text === '3') + 1
      expect(correctPosition).toBeGreaterThan(0)
      const submitted = guest.waitForResponse((response) => response.url().endsWith('/interactions'))
      await guest.keyboard.press(String(correctPosition))
      const answerResponse = await submitted
      expect(answerResponse.ok()).toBe(true)
      const { totalScore } = (await answerResponse.json()).data
      expect(totalScore).toBeGreaterThan(0)
      const progress = page.getByText(`Ong Vàng · ${totalScore} điểm · 1 câu`)
      await expect(progress).toBeVisible()
      await guest.getByRole('button', { name: 'Câu tiếp theo' }).click()
      const secondQuestion = guest.getByRole('img', { name: 'Câu 2/2' })
      await expect(secondQuestion).toBeVisible()

      await page.getByRole('button', { name: 'Tạm dừng', exact: true }).click()
      await expect(guest.getByText(/Phòng đang tạm dừng/)).toBeVisible()
      await expect(secondQuestion).toHaveCount(0)
      await guest.keyboard.press('1')
      await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click()
      await expect(secondQuestion).toBeVisible()
      await expect(progress).toBeVisible()

      await guestContext.setOffline(true)
      await expect(guest.getByText(/Kết nối bị gián đoạn/)).toBeVisible()
      await guestContext.setOffline(false)
      await expect(secondQuestion).toBeVisible()
      await expect(progress).toBeVisible()
      await guest.reload(guestNavigation)
      await guest.getByRole('button', { name: 'Vào chơi', exact: true }).click()
      await expect(secondQuestion).toBeVisible()

      await guestContext.setOffline(true)
      await expect(guest.getByText(/Kết nối bị gián đoạn/)).toBeVisible()

      await page.getByRole('button', { name: 'Kết thúc phòng', exact: true }).click()
      await expect(page.getByRole('status')).toHaveText('Phòng đã kết thúc')
      await guestContext.setOffline(false)
      await expect(guest.getByText('Phòng chơi đã kết thúc.')).toBeVisible()
      await expect(guest.getByText(`${totalScore} điểm · 1/2 câu đã trả lời`)).toBeVisible()
      const closedGuest = await guestContext.newPage()
      await closedGuest.goto(joinPath!, guestNavigation)
      await expect(closedGuest.getByRole('status')).toHaveText('Phòng chơi đã kết thúc.')
      await expect(closedGuest.getByLabel('Biệt danh')).toHaveCount(0)
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

  for (const strategy of ['RANDOM', 'MANUAL_ASSIGN', 'FREE_CHOICE']) {
    await test.step(`TEAM chia đội theo ${strategy} và cập nhật bảng xếp hạng`, async () => {
      await page.goto(`/rooms/host/${gameId}`)
      await page.getByLabel('Chế độ chơi').selectOption('TEAM')
      await page.getByLabel('Số đội').selectOption('3')
      await page.getByLabel('Cách chia đội').selectOption(strategy)
      await page.getByRole('button', { name: 'Mở phòng', exact: true }).click()
      const joinPath = await page.getByRole('link', { name: 'Đường dẫn cho học sinh' }).getAttribute('href')
      const guestContext = await browser.newContext({ baseURL: new URL(page.url()).origin })
      try {
        const enterTeam = async (name: string) => {
          const guest = await guestContext.newPage()
          await guest.goto(joinPath!, guestNavigation)
          await guest.getByLabel('Biệt danh').fill(name)
          if (strategy === 'FREE_CHOICE') await guest.getByLabel('Chọn đội').selectOption({ label: 'Đội 1' })
          await guest.getByRole('button', { name: 'Vào phòng', exact: true }).click()
          await expect(guest.getByText('Đang đợi giáo viên bắt đầu')).toBeVisible()
          return guest
        }
        const firstGuest = await enterTeam('Ong Vàng')
        const secondGuest = await enterTeam('Cánh Cam')
        if (strategy === 'MANUAL_ASSIGN') {
          await expect(page.getByRole('button', { name: 'Bắt đầu', exact: true })).toBeDisabled()
          await page.getByLabel('Xếp đội cho Ong Vàng').selectOption({ label: 'Đội 1' })
          await page.getByLabel('Xếp đội cho Cánh Cam').selectOption({ label: 'Đội 1' })
        }
        if (strategy === 'FREE_CHOICE') {
          await secondGuest.getByLabel('Đổi đội').selectOption({ label: 'Đội 3' })
          await expect(secondGuest.getByLabel('Đổi đội').locator('option:checked')).toHaveText('Đội 3')
        }
        await page.getByRole('button', { name: 'Bắt đầu', exact: true }).click()
        const board = page.getByRole('heading', { name: 'Bảng xếp hạng đội' }).locator('..')
        const teamRows = board.getByRole('listitem')
        await expect(teamRows).toHaveCount(3)
        if (strategy === 'RANDOM') await expect(board.getByText(/· 1 học sinh/)).toHaveCount(2)
        if (strategy === 'FREE_CHOICE') await expect(board.getByText(/Đội 3 .*· 1 học sinh/)).toBeVisible()
        if (strategy === 'MANUAL_ASSIGN') {
          const questions = firstGuest.waitForResponse((response) => response.url().endsWith('/questions'))
          await firstGuest.getByRole('button', { name: 'Vào chơi', exact: true }).click()
          await expect(firstGuest.locator('canvas').first()).toBeVisible()
          const firstQuestion = (await (await questions).json()).data.questions[0]
          const correctPosition = firstQuestion.options.findIndex((option: { text: string }) => option.text === '3') + 1
          expect(correctPosition).toBeGreaterThan(0)
          const submitted = firstGuest.waitForResponse((response) => response.url().endsWith('/interactions'))
          await firstGuest.keyboard.press(String(correctPosition))
          const { totalScore } = (await (await submitted).json()).data
          expect(totalScore).toBeGreaterThan(0)
          const average = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(totalScore / 2)
          await expect(teamRows.first()).toHaveText(`Đội 1 · ${average} điểm trung bình · 2 học sinh`)
        }
        await page.getByRole('button', { name: 'Kết thúc phòng', exact: true }).click()
        await expect(page.getByRole('link', { name: 'Xem kết quả', exact: true })).toHaveAttribute('href', /type=TEAM/)
      } finally {
        await guestContext.close()
      }
    })
  }

})
