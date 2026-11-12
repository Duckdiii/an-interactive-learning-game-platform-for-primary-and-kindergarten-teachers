#!/usr/bin/env node
// Chạy kịch bản tạo game qua GIAO DIỆN THẬT (như giáo viên) và chụp ảnh sắc nét từng bước, kể cả lúc có hiệu ứng.
// Điều khiển Chrome có sẵn trên máy qua Chrome DevTools Protocol (không cần puppeteer/playwright).
// GỌI GEMINI THẬT qua backend: mỗi kịch bản tốn 1-2 lần phân tích yêu cầu + 1-3 lần sinh game.
//
//   EVAL_EMAIL=... EVAL_PASSWORD=... node scripts/eval/capture-scenarios.mjs [--from 1] [--count 12] [--folder "Thử nghiệm lần 3"]
//
// Cần frontend (http://localhost:5173) và backend đang chạy. Tài khoản lấy từ biến môi trường (không ghi vào code).
// Mỗi kịch bản ghi vào docs/Kịch bản/Kịch bản tạo game/<NNN - tên>/<folder>/: ảnh PNG (2x), tuong-tac.json, kết quả.md.

import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { parseScenarios } from './checks.mjs'

const ROOT = join(import.meta.dirname, '..', '..')
const SCENARIO_DIR = join(ROOT, 'docs', 'Kịch bản', 'Kịch bản tạo game')
const option = (name, fallback) => {
  const index = process.argv.indexOf(`--${name}`)
  return index > 0 ? process.argv[index + 1] : fallback
}
const APP = option('app', 'http://localhost:5173')
const FROM = Number(option('from', '1'))
const COUNT = Number(option('count', '12'))
const FOLDER = option('folder', 'Thử nghiệm lần 3')
const CHROME = option('chrome', 'C:/Program Files/Google/Chrome/Application/chrome.exe')
const PORT = 9333
// 1440x900 CSS px, nhân 2: ảnh 2880x1800, chữ và hình sắc nét khi phóng to.
const VIEW = { width: 1440, height: 900, deviceScaleFactor: 2 }
const { EVAL_EMAIL, EVAL_PASSWORD } = process.env
if (!EVAL_EMAIL || !EVAL_PASSWORD) {
  console.error('Thiếu EVAL_EMAIL / EVAL_PASSWORD (tài khoản giáo viên thử nghiệm).')
  process.exit(1)
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const GRADE = { KINDERGARTEN: 'Mầm non', GRADE_1: 'Lớp 1', GRADE_2: 'Lớp 2', GRADE_3: 'Lớp 3', GRADE_4: 'Lớp 4', GRADE_5: 'Lớp 5' }
const SUBJECT = { MATH: 'Toán', VIETNAMESE: 'Tiếng Việt', ENGLISH: 'Tiếng Anh' }

// ---------------- Chrome + CDP ----------------

class Cdp {
  constructor(ws) {
    this.ws = ws
    this.id = 0
    this.pending = new Map()
    this.listeners = []
    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data)
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id)
        this.pending.delete(msg.id)
        msg.error ? reject(new Error(`${msg.error.message}`)) : resolve(msg.result)
      } else if (msg.method) {
        for (const listener of this.listeners) listener(msg)
      }
    })
  }

  send(method, params = {}) {
    const id = ++this.id
    this.ws.send(JSON.stringify({ id, method, params }))
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }))
  }

  on(listener) {
    this.listeners.push(listener)
  }
}

async function launchChrome() {
  const profile = join(tmpdir(), `capture-chrome-${Date.now()}`)
  const chrome = spawn(CHROME, [
    '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check',
    '--hide-scrollbars', '--mute-audio', '--autoplay-policy=no-user-gesture-required', `--window-size=${VIEW.width},${VIEW.height}`, 'about:blank',
  ], { stdio: 'ignore' })
  for (let i = 0; i < 50; i++) {
    try {
      const pages = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
      const page = pages.find((p) => p.type === 'page')
      if (page) {
        const ws = new WebSocket(page.webSocketDebuggerUrl)
        await new Promise((resolve, reject) => {
          ws.addEventListener('open', resolve)
          ws.addEventListener('error', reject)
        })
        return { chrome, cdp: new Cdp(ws), profile }
      }
    } catch {
      // Chrome chưa sẵn sàng.
    }
    await sleep(300)
  }
  throw new Error('Không mở được Chrome')
}

// ---------------- thao tác trang ----------------

class Page {
  constructor(cdp) {
    this.cdp = cdp
    this.console = []
    this.responses = []
    this.requests = new Map()
    cdp.on((msg) => {
      if (msg.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(msg.params.type)) {
        this.console.push(`${msg.params.type}: ${msg.params.args.map((a) => a.value ?? a.description ?? '').join(' ')}`.slice(0, 500))
      }
      if (msg.method === 'Runtime.exceptionThrown') this.console.push(`exception: ${msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text}`.slice(0, 500))
      if (msg.method === 'Network.responseReceived' && /\/api\/games/.test(msg.params.response.url)) {
        this.requests.set(msg.params.requestId, { url: msg.params.response.url, status: msg.params.response.status, method: this.methods?.get(msg.params.requestId) })
      }
      if (msg.method === 'Network.requestWillBeSent' && /\/api\/games/.test(msg.params.request.url)) {
        this.methods ??= new Map()
        this.methods.set(msg.params.requestId, msg.params.request.method)
        this.requests.set(msg.params.requestId, { url: msg.params.request.url, method: msg.params.request.method, body: msg.params.request.postData, started: Date.now() })
      }
      if (msg.method === 'Network.loadingFinished' && this.requests.has(msg.params.requestId)) {
        const info = this.requests.get(msg.params.requestId)
        this.cdp.send('Network.getResponseBody', { requestId: msg.params.requestId }).then((body) => {
          this.responses.push({ ...info, finished: Date.now(), seconds: info.started ? (Date.now() - info.started) / 1000 : null, response: safeJson(body.body) })
        }).catch(() => {})
      }
    })
  }

  async init() {
    await this.cdp.send('Page.enable')
    await this.cdp.send('Runtime.enable')
    await this.cdp.send('Network.enable', { maxPostDataSize: 65536 })
    await this.cdp.send('Emulation.setDeviceMetricsOverride', { ...VIEW, mobile: false })
  }

  // Runtime.evaluate của CDP: chỉ chạy đoạn JS do chính script này viết, trong Chrome thử nghiệm cục bộ (không nhận dữ liệu từ ngoài).
  async eval(expression) {
    const result = await this.cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? 'eval lỗi')
    return result.result.value
  }

  async goto(url) {
    await this.cdp.send('Page.navigate', { url })
    await sleep(2500)
  }

  async waitFor(expression, timeoutMs, label) {
    const start = Date.now()
    while (Date.now() - start < timeoutMs) {
      try {
        if (await this.eval(expression)) return true
      } catch {
        // Trang đang chuyển.
      }
      await sleep(500)
    }
    if (label) console.log(`   (hết giờ chờ: ${label})`)
    return false
  }

  /** Bấm chuột thật vào tâm phần tử (sự kiện con trỏ thật, cần cho canvas Konva). */
  async clickAt(x, y) {
    for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) {
      await this.cdp.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1, pointerType: 'mouse' })
      await sleep(30)
    }
  }

  /** Tìm phần tử theo đoạn JS trả về phần tử, cuộn vào giữa màn hình rồi bấm. */
  async clickElement(finder) {
    const box = await this.eval(`(() => { const el = (${finder})(); if (!el) return null; el.scrollIntoView({block:'center'}); const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } })()`)
    if (!box) return false
    await sleep(250)
    await this.clickAt(box.x, box.y)
    return true
  }

  clickButtonText(text, scope = 'document') {
    return this.clickElement(`() => [...${scope}.querySelectorAll('button, a')].find(b => b.offsetParent !== null && !b.disabled && b.textContent.replace(/\\s+/g,' ').trim().includes(${JSON.stringify(text)}))`)
  }

  async type(selector, text) {
    await this.eval(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); el.scrollIntoView({block:'center'}); el.focus(); return true })()`)
    await this.cdp.send('Input.insertText', { text })
  }

  async shot(file, { full = false } = {}) {
    let params = { format: 'png' }
    if (full) {
      const metrics = await this.cdp.send('Page.getLayoutMetrics')
      const { width, height } = metrics.cssContentSize ?? metrics.contentSize
      params = { ...params, captureBeyondViewport: true, clip: { x: 0, y: 0, width: Math.ceil(width), height: Math.min(Math.ceil(height), 9000), scale: 1 } }
    }
    const { data } = await this.cdp.send('Page.captureScreenshot', params)
    writeFileSync(file, Buffer.from(data, 'base64'))
  }

  /** Chuỗi khung hình liên tiếp để thấy chuyển động (bóng bay, lật thẻ, pháo hoa...). */
  async burst(prefix, delays) {
    let last = 0
    for (let i = 0; i < delays.length; i++) {
      await sleep(Math.max(0, delays[i] - last))
      last = delays[i]
      await this.shot(`${prefix}-${String(i + 1).padStart(2, '0')}.png`)
    }
  }
}

const safeJson = (text) => {
  try {
    return JSON.parse(text)
  } catch {
    return text?.slice?.(0, 2000)
  }
}

// ---------------- một kịch bản ----------------

function scenarioFolder(id) {
  const prefix = String(id).padStart(3, '0') + ' - '
  const name = readdirSync(SCENARIO_DIR).find((entry) => entry.startsWith(prefix))
  if (!name) throw new Error(`Không thấy thư mục kịch bản ${prefix}`)
  return join(SCENARIO_DIR, name)
}

async function login(page) {
  await page.goto(`${APP}/login`)
  if (!(await page.eval(`location.pathname === '/login'`))) return
  await page.type('input[type=email]', EVAL_EMAIL)
  await page.type('input[type=password]', EVAL_PASSWORD)
  await page.clickButtonText('Đăng nhập', 'document.querySelector("form")')
  await page.waitFor(`location.pathname !== '/login'`, 20_000, 'đăng nhập')
}

async function runScenario(page, scenario) {
  const dir = join(scenarioFolder(scenario.id), FOLDER)
  if (existsSync(dir)) rmSync(dir, { recursive: true })
  mkdirSync(dir, { recursive: true })
  const img = (name) => join(dir, name)
  const log = { scenario, startedAt: new Date().toISOString(), steps: [], chat: [], card: null, gameId: null, errors: [] }
  const step = (text) => {
    log.steps.push({ at: new Date().toISOString(), text })
    console.log(`   - ${text}`)
  }
  page.console = []
  page.responses = []
  const started = Date.now()

  await login(page)
  await page.goto(`${APP}/games/new`)
  await page.waitFor(`!!document.querySelector('#create-idea')`, 20_000, 'trang tạo game')

  // Môn, lớp, mô tả của giáo viên.
  await page.clickElement(`() => [...document.querySelectorAll('[aria-labelledby="create-subject-title"] button')].find(b => b.textContent.includes(${JSON.stringify(SUBJECT[scenario.subject])}))`)
  const grade = GRADE[scenario.gradeLevel]
  if (['GRADE_2', 'GRADE_3', 'GRADE_4', 'GRADE_5'].includes(scenario.gradeLevel)) {
    await page.clickElement(`() => [...document.querySelectorAll('[aria-labelledby="create-grade-title"] button')].find(b => b.textContent.includes('Lớp 2–5'))`)
    await sleep(300)
    await page.clickElement(`() => [...document.querySelectorAll('[aria-labelledby="create-grade-upper-title"] button')].find(b => b.textContent.trim() === ${JSON.stringify(grade)})`)
  } else {
    await page.clickElement(`() => [...document.querySelectorAll('[aria-labelledby="create-grade-title"] button')].find(b => b.textContent.trim() === ${JSON.stringify(grade)})`)
  }
  await page.type('#create-idea', scenario.idea)
  await sleep(500)
  await page.eval(`window.scrollTo(0,0)`)
  await page.shot(img('01-nhap-mo-ta.png'))
  step(`Nhập mô tả, chọn ${SUBJECT[scenario.subject]} · ${grade}`)

  // Trò chuyện với trợ lý.
  await page.clickButtonText('Để AI soạn giúp')
  await sleep(700)
  await page.shot(img('02-tro-ly-dang-doc.png'))
  const assistantDone = `(() => { const items = [...document.querySelectorAll('ol[role=log] li p')]; return document.querySelector('[role=alert]') || items.some(p => p.textContent.startsWith('Trợ lý') && !p.textContent.includes('đang')) })()`
  await page.waitFor(assistantDone, 120_000, 'trợ lý trả lời')
  await sleep(1200)
  await page.shot(img('03-tro-ly-tra-loi-va-the-hieu.png'), { full: true })
  step('Trợ lý trả lời, thẻ "Hệ thống hiểu như sau"')

  // Câu hỏi lại: giáo viên bấm câu trả lời nhanh đầu tiên.
  for (let round = 1; round <= 2; round++) {
    const reply = await page.eval(`(() => { const g = document.querySelector('[aria-label="Trả lời nhanh"]'); const b = g && [...g.querySelectorAll('button')].find(x => !x.disabled); return b ? b.textContent.trim() : null })()`)
    if (!reply) break
    const before = await page.eval(`[...document.querySelectorAll('ol[role=log] li p')].filter(p => !p.textContent.includes('đang đọc')).length`)
    await page.clickElement(`() => [...document.querySelectorAll('[aria-label="Trả lời nhanh"] button')].find(x => !x.disabled)`)
    step(`Trả lời câu hỏi lại: "${reply}"`)
    // Dòng "Trợ lý đang đọc yêu cầu..." cũng là một <p>: chỉ coi là xong khi nó biến mất và có thêm câu trả lời thật.
    await page.waitFor(`(() => { const items = [...document.querySelectorAll('ol[role=log] li p')].map(p => p.textContent); return !!document.querySelector('[role=alert]') || (!items.some(t => t.includes('đang đọc')) && items.length >= ${before + 2}) })()`, 120_000, 'trợ lý trả lời lượt sau')
    await sleep(1200)
    await page.shot(img(`04-tra-loi-cau-hoi-lai-${round}.png`), { full: true })
  }
  log.chat = await page.eval(`[...document.querySelectorAll('ol[role=log] li p')].map(p => p.textContent.trim()).filter(Boolean)`)
  log.card = await page.eval(`(() => { const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Đúng rồi, tạo game')); const sec = btn && (btn.closest('section') || btn.parentElement.parentElement); return sec ? sec.innerText : null })()`)
  const chatError = await page.eval(`document.querySelector('[role=alert]')?.innerText ?? null`)
  if (chatError) log.errors.push(`Trò chuyện: ${chatError}`)

  // Tạo game: nút khóa trong lúc trợ lý còn đang trả lời.
  await page.waitFor(`[...document.querySelectorAll('button')].some(b => b.textContent.includes('Đúng rồi, tạo game') && !b.disabled)`, 60_000, 'nút tạo game mở khóa')
  const creating = await page.clickButtonText('Đúng rồi, tạo game')
  if (!creating) throw new Error('Không bấm được "Đúng rồi, tạo game"')
  step('Bấm "Đúng rồi, tạo game"')
  await page.burst(img('05-dang-tao-game'), [600, 2500, 6000])
  const created = await page.waitFor(`location.pathname.startsWith('/workspace/editor') || /không tạo được|thất bại|chưa tạo được/i.test(document.body.innerText)`, 240_000, 'tạo game')
  if (!created || !(await page.eval(`location.pathname.startsWith('/workspace/editor')`))) {
    await page.shot(img('05-loi-tao-game.png'), { full: true })
    log.errors.push(`Tạo game: ${await page.eval(`document.querySelector('main')?.innerText.slice(0, 1500)`)}`)
    return finish(dir, log, page, started)
  }
  log.gameId = await page.eval(`new URLSearchParams(location.search).get('gameId')`)
  await page.waitFor(`!!document.querySelector('h1') && !document.body.innerText.includes('Đang tải')`, 20_000)
  await sleep(2500)
  step(`Game đã tạo: ${log.gameId}`)

  const isCpf = await page.eval(`document.body.innerText.includes('Trò chơi tự do ·')`)
  if (isCpf) await playCpf(page, img, step)
  else await playDsl(page, img, step)
  return finish(dir, log, page, started)
}

async function playDsl(page, img, step) {
  await page.eval(`window.scrollTo(0,0)`)
  await page.shot(img('06-trinh-soan-toan-trang.png'), { full: true })
  // Khung "Bé sẽ thấy" (xem trước) đang chạy hiệu ứng.
  await page.clickElement(`() => [...document.querySelectorAll('h2,h3')].find(h => /Bé sẽ thấy|Xem trước/i.test(h.textContent))`)
  await page.burst(img('07-xem-truoc-hieu-ung'), [200, 500, 900, 1500])
  step('Trình soạn và khung xem trước')

  if (!(await page.clickButtonText('Chơi thử'))) return step('Không thấy nút "Chơi thử"')
  await page.waitFor(`!!document.querySelector('[aria-label="Màn chơi thử"]')`, 15_000, 'màn chơi thử')
  await page.eval(`document.querySelector('[aria-label="Màn chơi thử"]').scrollIntoView({block:'start'})`)
  step('Mở "Chơi thử"')

  for (let q = 1; q <= 3; q++) {
    await page.burst(img(`08-choi-thu-cau${q}-mo-man`), [100, 400, 900, 1600])
    // Chạm lần lượt vào các vị trí lựa chọn tới khi có kết quả.
    for (let attempt = 1; attempt <= 8; attempt++) {
      const answered = await page.eval(`!!document.querySelector('[aria-label="Màn chơi thử"] [role=status] button')`)
      if (answered) break
      const point = await page.eval(`(() => {
        const panel = document.querySelector('[aria-label="Màn chơi thử"]'); if (!panel) return null
        const canvases = [...panel.querySelectorAll('canvas')].filter(c => c.getBoundingClientRect().width > 100)
        const spots = [[0.28,0.62],[0.72,0.62],[0.28,0.84],[0.72,0.84],[0.5,0.72],[0.5,0.93],[0.25,0.45],[0.75,0.45]]
        if (canvases.length) { const r = canvases[canvases.length-1].getBoundingClientRect(); const s = spots[${attempt - 1}]; return { x: r.x + r.width*s[0], y: r.y + r.height*s[1], kind: 'canvas' } }
        const buttons = [...panel.querySelectorAll('button')].filter(b => !b.disabled && b.offsetParent && !/Thoát|Câu tiếp|Thử lại|Xem kết quả|Nghe/.test(b.textContent))
        const b = buttons[(${attempt - 1}) % Math.max(1, buttons.length)]; if (!b) return null
        b.scrollIntoView({block:'center'}); const r = b.getBoundingClientRect(); return { x: r.x + r.width/2, y: r.y + r.height/2, kind: 'button' }
      })()`)
      if (!point) break
      await page.clickAt(point.x, point.y)
      await page.burst(img(`09-choi-thu-cau${q}-cham${attempt}`), [80, 300, 700, 1400])
    }
    const feedback = await page.eval(`document.querySelector('[aria-label="Màn chơi thử"] [role=status]')?.innerText ?? null`)
    step(`Câu ${q}: ${feedback ? feedback.split('\n')[0] : 'chưa có kết quả sau 8 lần chạm'}`)
    if (!feedback) break
    await page.eval(`document.querySelector('[aria-label="Màn chơi thử"] [role=status]').scrollIntoView({block:'center'})`)
    await page.shot(img(`10-choi-thu-cau${q}-ket-qua.png`))
    const hasNext = await page.clickButtonText('Câu tiếp theo')
    if (!hasNext) {
      await page.clickButtonText('Xem kết quả')
      await sleep(1500)
      await page.shot(img('11-choi-thu-tong-ket.png'), { full: true })
      break
    }
    await page.eval(`document.querySelector('[aria-label="Màn chơi thử"]').scrollIntoView({block:'start'})`)
  }
}

async function playCpf(page, img, step) {
  await page.eval(`window.scrollTo(0,0)`)
  await page.shot(img('06-trinh-xem-game-tu-do-toan-trang.png'), { full: true })
  await page.eval(`document.querySelector('canvas')?.scrollIntoView({block:'center'})`)
  await page.burst(img('07-game-tu-do-chuyen-dong'), [100, 400, 800, 1300, 2000, 3000])
  step('Game tự do (CPF): xem trước và chuyển động')
  // Chạm/kéo thử vào vùng vật lựa chọn (trên, giữa) và vùng nhân vật (dưới).
  const spots = [[0.3, 0.35], [0.5, 0.35], [0.7, 0.35], [0.5, 0.55], [0.35, 0.8], [0.65, 0.8]]
  for (let i = 0; i < spots.length; i++) {
    const box = await page.eval(`(() => { const c = document.querySelector('canvas'); if (!c) return null; const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } })()`)
    if (!box) break
    await page.clickAt(box.x + box.w * spots[i][0], box.y + box.h * spots[i][1])
    await page.burst(img(`08-game-tu-do-cham${i + 1}`), [80, 350, 800, 1500])
  }
  step('Chạm thử 6 vị trí trong game tự do')
}

async function finish(dir, log, page, started) {
  await sleep(800)
  log.seconds = Math.round((Date.now() - started) / 1000)
  log.console = page.console
  log.api = page.responses.map((r) => ({ method: r.method, url: r.url.replace(/^.*\/api/, '/api'), status: r.status, seconds: r.seconds, request: safeJson(r.body), response: r.response }))
  writeFileSync(join(dir, 'tuong-tac.json'), JSON.stringify(log, null, 2))
  console.log(`   => ${log.errors.length ? 'CÓ LỖI' : 'xong'} (${log.seconds}s)`)
  return log
}

// ---------------- chạy ----------------

const scenarios = parseScenarios(readFileSync(join(SCENARIO_DIR, '100 kịch bản tạo game.md'), 'utf8'))
  .filter((s) => s.id >= FROM && s.id < FROM + COUNT)
const { chrome, cdp, profile } = await launchChrome()
const page = new Page(cdp)
await page.init()
try {
  for (const scenario of scenarios) {
    console.log(`Kịch bản ${scenario.id}: ${scenario.idea}`)
    try {
      await runScenario(page, scenario)
    } catch (error) {
      console.log(`   => LỖI: ${error.message}`)
    }
  }
} finally {
  chrome.kill()
  await sleep(500)
  try {
    rmSync(profile, { recursive: true, force: true })
  } catch {
    // Chrome còn giữ tệp, bỏ qua.
  }
}
