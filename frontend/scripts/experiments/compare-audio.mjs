/**
 * T7.4: so Howler (phát từ tệp) với Web Audio (tổng hợp bằng AudioService của T2.1) bằng Chrome thật (playwright-core).
 *
 *   node scripts/experiments/compare-audio.mjs
 *
 * Đo: dung lượng đóng gói (minify + gzip) của từng bên; độ trễ từ lúc gọi phát đến lúc có mẫu âm đầu tiên ở đầu ra
 * (bộ phân tích gắn vào `destination`), với Howler đã nạp, Howler tạo mới (gồm tải + giải mã) và Web Audio; độ trễ
 * `baseLatency/outputLatency` do API báo; mở khóa (không cử chỉ, sau cử chỉ, giả lập cảm ứng di động); tệp thiếu; 20 lần
 * phát chồng nhau (đỉnh biên độ, số nguồn âm tạo ra). Ghi `docs/experiments/results/t7-4/`.
 */
import { chromium, devices } from 'playwright-core'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import zlib from 'node:zlib'
import { build, preview } from 'vite'
import { markdownTable, percentile } from './analysis.mjs'

const ROOT = fileURLToPath(new URL('../../', import.meta.url))
const OUT_DIR = path.resolve(ROOT, '../docs/experiments/results/t7-4')
const PORT = 4182
const WINDOW = { width: 1440, height: 1100 }
const TRIALS_WARM = 30
const TRIALS_COLD = 20
const SERVICE_PATH = path.join(ROOT, 'src/experiments/audio/audioService.ts').replace(/\\/g, '/')

const round = (n) => (n === null || n === undefined || !Number.isFinite(n) ? null : Math.round(n * 100) / 100)
const stats = (values) => ({
  n: values.length,
  min: round(Math.min(...values)),
  p50: round(percentile(values, 50)),
  p95: round(percentile(values, 95)),
  max: round(Math.max(...values)),
})

// ---------------------------------------------------------------------------------------------- dung lượng
async function bundleSize(code) {
  // Tệp vào tạm đặt trong node_modules/.tmp (để 'howler' phân giải được và không lọt vào git).
  const dir = path.join(ROOT, 'node_modules/.tmp')
  fs.mkdirSync(dir, { recursive: true })
  const entry = path.join(dir, `t74-entry-${Math.random().toString(36).slice(2)}.mjs`)
  fs.writeFileSync(entry, code)
  try {
    const result = await build({
      root: ROOT,
      configFile: false,
      logLevel: 'silent',
      build: { write: false, minify: true, lib: { entry, formats: ['es'], fileName: 'entry' } },
    })
    const outputs = (Array.isArray(result) ? result : [result]).flatMap((r) => r.output)
    const js = outputs.filter((o) => o.type === 'chunk').map((o) => o.code).join('')
    return { raw: Buffer.byteLength(js), gzip: zlib.gzipSync(js).length }
  } finally {
    fs.rmSync(entry, { force: true })
  }
}

// ---------------------------------------------------------------------------------------------- trong trang
/** Chạy trước mọi script của trang: bọc AudioContext để gắn bộ phân tích vào destination và đếm nguồn âm. */
const tapInit = () => {
  const Orig = window.AudioContext
  window.__taps = []
  window.__counts = { oscillators: 0, bufferSources: 0 }
  window.__sound = { armedAt: 0, firstAt: null, max: 0, reads: 0 }
  function Patched(...args) {
    const ctx = new Orig(...args)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 2048
    analyser.smoothingTimeConstant = 0
    ctx.__analyser = analyser
    window.__taps.push(ctx)
    return ctx
  }
  Patched.prototype = Orig.prototype
  window.AudioContext = Patched
  window.__lastPointerAt = 0
  document.addEventListener('pointerdown', () => (window.__lastPointerAt = performance.now()), true)
  const connect = AudioNode.prototype.connect
  AudioNode.prototype.connect = function (dest, ...rest) {
    const out = connect.call(this, dest, ...rest)
    try {
      if (dest && this.context && dest === this.context.destination && this.context.__analyser && this !== this.context.__analyser) connect.call(this, this.context.__analyser)
    } catch {
      /* bỏ qua */
    }
    return out
  }
  const osc = BaseAudioContext.prototype.createOscillator
  BaseAudioContext.prototype.createOscillator = function (...a) {
    window.__counts.oscillators += 1
    return osc.apply(this, a)
  }
  const src = BaseAudioContext.prototype.createBufferSource
  BaseAudioContext.prototype.createBufferSource = function (...a) {
    window.__counts.bufferSources += 1
    return src.apply(this, a)
  }
  // Vòng đọc bộ phân tích liên tục bằng MessageChannel (nhịp dưới 1ms), ghi mẫu đầu tiên và đỉnh biên độ.
  const channel = new MessageChannel()
  const buffer = new Float32Array(2048)
  channel.port1.onmessage = () => {
    const s = window.__sound
    for (const ctx of window.__taps) {
      if (ctx.state !== 'running') continue
      ctx.__analyser.getFloatTimeDomainData(buffer)
      let peak = 0
      for (let i = 0; i < buffer.length; i += 1) peak = Math.max(peak, Math.abs(buffer[i]))
      s.reads += 1
      if (s.armedAt && peak > 0.001 && s.firstAt === null) s.firstAt = performance.now()
      if (s.armedAt) s.max = Math.max(s.max, peak)
    }
    channel.port2.postMessage(0)
  }
  channel.port2.postMessage(0)
}

/** Chạy trong trang: bắt đầu ghi (xóa mốc cũ); trả hàm không có. */
const arm = () => {
  window.__sound.armedAt = performance.now()
  window.__sound.firstAt = null
  window.__sound.max = 0
}
const readSound = () => ({ firstAt: window.__sound.firstAt, max: window.__sound.max, counts: { ...window.__counts } })
const contextInfo = () =>
  window.__taps.map((ctx) => ({ state: ctx.state, sampleRate: ctx.sampleRate, baseLatency: ctx.baseLatency, outputLatency: ctx.outputLatency }))

// ---------------------------------------------------------------------------------------------- ca đo
async function openLab(browser, options = {}) {
  const context = await browser.newContext({ viewport: WINDOW, deviceScaleFactor: 1, ...options.device })
  await context.addInitScript(tapInit)
  const page = await context.newPage()
  const errors = []
  const external = []
  page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && errors.push(m.text().slice(0, 200)))
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message.slice(0, 200)}`))
  page.on('request', (r) => {
    const url = new URL(r.url())
    if (!['localhost', '127.0.0.1'].includes(url.hostname) && !['data:', 'blob:'].some((p) => r.url().startsWith(p))) external.push(r.url())
  })
  const cdp = await context.newCDPSession(page)
  await page.goto(`http://127.0.0.1:${PORT}/dev/experiments`, { waitUntil: 'networkidle' })
  if (options.noGesture) {
    // Bấm bằng mã qua CDP với userGesture:false (Playwright `evaluate` mặc định coi là cử chỉ người dùng nên không dùng được ở đây).
    await cdpEval(cdp, "[...document.querySelectorAll('button')].find((b) => /T7\\.4/.test(b.textContent ?? ''))?.click()")
  } else if (options.tap) {
    await page.getByRole('button', { name: /T7\.4/ }).tap()
  } else {
    await page.getByRole('button', { name: /T7\.4/ }).click()
  }
  if (options.noGesture) {
    // `waitForFunction` của Playwright chạy kèm cử chỉ người dùng: thăm dò bằng CDP không cử chỉ.
    for (let i = 0; i < 100 && !(await cdpEval(cdp, 'Boolean(window.__audioCompare)')); i += 1) await page.waitForTimeout(50)
  } else {
    await page.waitForFunction(() => Boolean(window.__audioCompare))
  }
  return { context, page, cdp, errors, external }
}

/** Chạy biểu thức trong trang qua CDP KHÔNG kèm cử chỉ người dùng (khác `page.evaluate`). */
async function cdpEval(cdp, expression) {
  const response = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: false })
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description ?? 'lỗi trong trang')
  return response.result.value
}
const fnExpr = (fn) => `(${fn.toString()})()`

/** Chờ tối đa `ms` cho tới khi có mẫu đầu tiên; trả ms từ `t0` hoặc null. `read` mặc định là `page.evaluate`; truyền hàm CDP khi không được tạo cử chỉ. */
async function waitFirstSound(page, t0, ms, read = () => page.evaluate(readSound)) {
  const deadline = Date.now() + ms
  while (Date.now() < deadline) {
    const sound = await read()
    if (sound.firstAt !== null) return { latency: sound.firstAt - t0, max: sound.max, counts: sound.counts }
    await page.waitForTimeout(10)
  }
  const sound = await read()
  return { latency: null, max: sound.max, counts: sound.counts }
}

async function latencyTrials(page, label, trials, gapMs, start) {
  const values = []
  let silent = 0
  for (let i = 0; i < trials; i += 1) {
    await page.evaluate(arm)
    const t0 = await page.evaluate(start)
    const got = await waitFirstSound(page, t0, 3000)
    if (got.latency === null) silent += 1
    else values.push(got.latency)
    await page.waitForTimeout(gapMs)
  }
  return { label, ...(values.length ? stats(values) : { n: 0 }), silent }
}

async function runLatency(browser) {
  const lab = await openLab(browser)
  const { page } = lab
  try {
    // Mở khóa cả hai bên bằng cử chỉ thật, rồi mồi: Howler phát một lần để nạp, Web Audio phát một lần để dựng context.
    await page.getByRole('button', { name: 'Howler: phát (dùng lại)' }).click()
    await page.getByRole('button', { name: 'Web Audio: phát «Đúng»' }).click()
    await page.waitForTimeout(1500)
    const rows = []
    rows.push(await latencyTrials(page, 'Howler (đã nạp, phát lại)', TRIALS_WARM, 600, () => window.__audioCompare.howlerPlay(false)))
    rows.push(await latencyTrials(page, 'Howler (tạo mới: tải + giải mã + phát)', TRIALS_COLD, 800, () => window.__audioCompare.howlerPlay(true)))
    rows.push(await latencyTrials(page, 'Web Audio (AudioService, tổng hợp)', TRIALS_WARM, 800, () => window.__audioCompare.synthPlayNow('correct')))
    const contexts = await page.evaluate(contextInfo)
    return { rows, contexts, errors: lab.errors, external: [...new Set(lab.external)] }
  } finally {
    await lab.context.close()
  }
}

async function runOverlap(browser) {
  const out = []
  for (const engine of ['howler', 'synth']) {
    const lab = await openLab(browser)
    const { page } = lab
    try {
      await page.getByRole('button', { name: 'Howler: phát (dùng lại)' }).click()
      await page.getByRole('button', { name: 'Web Audio: phát «Đúng»' }).click()
      await page.waitForTimeout(1800)
      const before = (await page.evaluate(readSound)).counts
      await page.evaluate(arm)
      await page.evaluate(
        (kind) =>
          new Promise((resolve) => {
            let n = 0
            const timer = setInterval(() => {
              if (kind === 'howler') window.__audioCompare.howlerPlay(false)
              else window.__audioCompare.synthPlayNow('correct')
              n += 1
              if (n >= 20) {
                clearInterval(timer)
                resolve(null)
              }
            }, 50)
          }),
        engine,
      )
      await page.waitForTimeout(1500)
      const sound = await page.evaluate(readSound)
      const oscillators = sound.counts.oscillators - before.oscillators
      const bufferSources = sound.counts.bufferSources - before.bufferSources
      // Mỗi lần phát «Đúng» của AudioService dựng 3 dao động; mỗi lần phát của Howler dựng 1 nguồn đệm.
      out.push({ engine, calls: 20, accepted: engine === 'howler' ? bufferSources : oscillators / 3, peak: round(sound.max), oscillators, bufferSources, errors: lab.errors, external: [...new Set(lab.external)] })
    } finally {
      await lab.context.close()
    }
  }
  return out
}

/** Một cử chỉ thật (chuột hoặc chạm) tại điểm (5, 5), sau đó đọc mốc pointerdown trong trang. */
async function realGesture(page, device) {
  if (device) await page.touchscreen.tap(5, 5)
  else await page.mouse.click(5, 5)
}

async function runUnlock(browser, label, device) {
  const result = { label, errors: [], external: [] }
  const collect = (lab) => {
    result.errors.push(...lab.errors)
    result.external.push(...lab.external)
  }
  // 1) Howler: phát bằng mã (không cử chỉ), chờ `wait` ms, rồi một cử chỉ thật tại (5, 5): âm chờ có tự phát không?
  result.howlerQueued = []
  for (const wait of [1500, 4000]) {
    const lab = await openLab(browser, { noGesture: true, device })
    const { page, cdp } = lab
    const read = () => cdpEval(cdp, fnExpr(readSound))
    try {
      await cdpEval(cdp, fnExpr(arm))
      const t0 = await cdpEval(cdp, 'window.__audioCompare.howlerPlay(true)')
      const early = await waitFirstSound(page, t0, wait, read)
      const ctxBefore = await cdpEval(cdp, 'window.__audioCompare.howlerContextState()')
      await cdpEval(cdp, fnExpr(arm))
      await realGesture(page, device)
      const gestureAt = await cdpEval(cdp, 'window.__lastPointerAt')
      const after = await waitFirstSound(page, gestureAt, 2500, read)
      result.howlerQueued.push({ waitMs: wait, soundBeforeGesture: early.latency !== null, ctxBeforeGesture: ctxBefore, soundAfterGesture: after.latency !== null, latencyAfterGestureMs: round(after.latency), ctxAfter: await cdpEval(cdp, 'window.__audioCompare.howlerContextState()') })
      collect(lab)
    } finally {
      await lab.context.close()
    }
  }
  // 2) Web Audio: phát bằng mã (xếp hàng, chưa dựng context), chờ `wait` ms (hàng đợi sống 2 giây), rồi bấm nút.
  result.synthQueued = []
  for (const wait of [1500, 2600, null]) {
    const lab = await openLab(browser, { noGesture: true, device })
    const { page, cdp } = lab
    const read = () => cdpEval(cdp, fnExpr(readSound))
    try {
      let soundBeforeGesture = null
      let contexts = 0
      if (wait !== null) {
        await cdpEval(cdp, fnExpr(arm))
        const t0 = await cdpEval(cdp, "window.__audioCompare.synthPlayNow('correct')")
        soundBeforeGesture = (await waitFirstSound(page, t0, wait, read)).latency !== null
        contexts = (await cdpEval(cdp, fnExpr(contextInfo))).length
      }
      const oscBefore = (await cdpEval(cdp, fnExpr(readSound))).counts.oscillators
      await cdpEval(cdp, fnExpr(arm))
      const button = page.getByRole('button', { name: 'Web Audio: phát «Đúng»' })
      if (device) await button.tap()
      else await button.click()
      const gestureAt = await cdpEval(cdp, 'window.__lastPointerAt')
      const after = await waitFirstSound(page, gestureAt, 2500, read)
      await page.waitForTimeout(1200)
      const oscAfter = (await cdpEval(cdp, fnExpr(readSound))).counts.oscillators
      result.synthQueued.push({ waitMs: wait, soundBeforeGesture, contextsBeforeGesture: contexts, soundAfterTap: after.latency !== null, latencyAfterTapMs: round(after.latency), oscillatorsCreatedByTap: oscAfter - oscBefore, unlocked: await cdpEval(cdp, 'window.__audioCompare.synthUnlocked()') })
      collect(lab)
    } finally {
      await lab.context.close()
    }
  }
  // 3) Một cử chỉ duy nhất vào nút của từng bên (đường dùng thật), mốc là pointerdown trong trang.
  for (const [key, name] of [['howlerSingleTapMs', 'Howler: phát (dùng lại)'], ['synthSingleTapMs', 'Web Audio: phát «Đúng»']]) {
    const values = []
    for (let i = 0; i < 5; i += 1) {
      const lab = await openLab(browser, { device })
      const { page } = lab
      try {
        await page.evaluate(arm)
        const button = page.getByRole('button', { name })
        if (device) await button.tap()
        else await button.click()
        const gestureAt = await page.evaluate(() => window.__lastPointerAt)
        const got = await waitFirstSound(page, gestureAt, 3000)
        if (got.latency !== null) values.push(got.latency)
        collect(lab)
      } finally {
        await lab.context.close()
      }
    }
    result[key] = values.map(round)
  }
  return result
}

async function runMissing(browser) {
  const lab = await openLab(browser)
  try {
    const result = await lab.page.evaluate(() => window.__audioCompare.howlerMissing(2000))
    // Máy chủ `vite preview` có thể trả index.html (SPA) cho đường dẫn không có tệp: ghi mã trạng thái và loại nội dung thật.
    const fetched = await lab.page.evaluate(() => fetch('/khong-co-tep-am-thanh.mp3').then((r) => `${r.status} ${r.headers.get('content-type')}`))
    return { threw: result.threw, playReturned: result.playReturned, events: result.events.map((e) => `${e.type}${e.detail ? `: ${e.detail.replace(/.$/, '')}` : ''}`), fetched, consoleMessages: lab.errors }
  } finally {
    await lab.context.close()
  }
}

// ---------------------------------------------------------------------------------------------- chạy
async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 't74-'))
  const result = { startedAt: new Date().toISOString(), node: process.version }
  const save = () => {
    fs.writeFileSync(path.join(OUT_DIR, 'results.json'), JSON.stringify(result, null, 2))
    fs.writeFileSync(path.join(OUT_DIR, 'measurements.md'), renderReport(result))
  }
  let server = null
  let browser = null
  try {
    result.bundle = {
      howler: await bundleSize("import { Howl, Howler } from 'howler'; export const x = [new Howl({ src: ['a.wav'] }), Howler]"),
      webAudio: await bundleSize(`import { AudioService } from '${SERVICE_PATH}'; export const x = new AudioService()`),
    }
    console.log('dung lượng', JSON.stringify(result.bundle))
    delete process.env.ANALYZE
    process.env.VITE_EXPERIMENTS = '1'
    await build({ root: ROOT, logLevel: 'error', envDir: false, build: { outDir: path.join(tmp, 'exp'), emptyOutDir: true } })
    server = await preview({ root: ROOT, logLevel: 'warn', envDir: false, build: { outDir: path.join(tmp, 'exp') }, preview: { port: PORT, strictPort: true, host: '127.0.0.1' } })
    browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=document-user-activation-required'] })
    result.chrome = browser.version()
    result.latency = await runLatency(browser)
    for (const row of result.latency.rows) console.log(`${row.label}: p50 ${row.p50} p95 ${row.p95} im lặng ${row.silent}`)
    result.overlap = await runOverlap(browser)
    console.log('chồng nhau', JSON.stringify(result.overlap))
    result.unlock = [await runUnlock(browser, 'Desktop (chuột)', undefined), await runUnlock(browser, 'Giả lập Pixel 5 (cảm ứng)', devices['Pixel 5'])]
    console.log('mở khóa', JSON.stringify(result.unlock))
    result.missing = await runMissing(browser)
    console.log('thiếu tệp', JSON.stringify(result.missing))
  } finally {
    if (browser) await browser.close().catch(() => {})
    if (server) await new Promise((resolve) => server.httpServer.close(resolve))
    fs.rmSync(tmp, { recursive: true, force: true })
    save()
  }
  console.log(`Đã ghi ${OUT_DIR}`)
}

// ---------------------------------------------------------------------------------------------- báo cáo
const kb = (n) => `${(n / 1024).toFixed(1)} KB`
function renderReport(result) {
  const lines = [`# T7.4: Howler và Web Audio (${result.startedAt.slice(0, 10)}, giờ UTC)`, '']
  lines.push(`Chạy bằng \`node scripts/experiments/compare-audio.mjs\`: Chrome ${result.chrome ?? '?'} (headless, playwright-core), Node ${result.node}, Windows. «Tệp» âm thanh là WAV tự sinh trong trang; không tải tài nguyên ngoài. Độ trễ đo là tới ĐẦU RA của đồ thị âm (trước thiết bị); \`outputLatency\` do API báo (bảng dưới) KHÔNG được cộng vào.`, '')
  if (result.bundle) {
    lines.push('## 1. Dung lượng đóng gói (minify + gzip, tree-shake riêng từng bên)', '')
    lines.push(
      markdownTable(
        ['Bên', 'Thô', 'Gzip'],
        [
          ['Howler 2.2.4', kb(result.bundle.howler.raw), kb(result.bundle.howler.gzip)],
          ['AudioService + tones (Web Audio tổng hợp, T2.1)', kb(result.bundle.webAudio.raw), kb(result.bundle.webAudio.gzip)],
        ],
      ),
      '',
    )
  }
  if (result.latency) {
    lines.push('## 2. Độ trễ từ lúc gọi phát đến mẫu âm đầu tiên ở đầu ra (ms)', '')
    lines.push(
      markdownTable(
        ['Cách phát', 'Số lần', 'Nhỏ nhất', 'p50', 'p95', 'Lớn nhất', 'Không nghe thấy'],
        result.latency.rows.map((r) => [r.label, r.n, r.min, r.p50, r.p95, r.max, r.silent]),
      ),
      '',
      'Mốc đầu là lúc gọi hàm phát trong trang, mốc cuối là lúc bộ phân tích gắn vào `destination` thấy biên độ > 0,001 (đọc mỗi < 1ms); cả hai bên cùng chịu một độ trễ cố định của bộ phân tích (khoảng một khối 128 mẫu). Web Audio tự cố ý trễ 20ms (`START_LEAD_SECONDS`) để lịch envelope kịp áp dụng. Howler «tạo mới» gồm cả tải blob và giải mã.',
      '',
    )
    lines.push(
      markdownTable(
        ['Ngữ cảnh', 'Trạng thái', 'Sample rate', 'baseLatency (s)', 'outputLatency (s)'],
        result.latency.contexts.map((c, i) => [`#${i + 1}`, c.state, c.sampleRate, round(c.baseLatency), round(c.outputLatency)]),
      ),
      '',
    )
  }
  if (result.overlap) {
    lines.push('## 3. Phát chồng: 20 lần gọi trong 1 giây (cách nhau 50ms)', '')
    lines.push(
      markdownTable(
        ['Bên', 'Số lần gọi', 'Số lần thực sự phát', 'Đỉnh biên độ ở đầu ra', 'Dao động tạo', 'Nguồn đệm tạo'],
        result.overlap.map((o) => [o.engine === 'howler' ? 'Howler (tệp đỉnh 0,5, âm lượng 1)' : 'Web Audio (AudioService)', o.calls, o.accepted, o.peak, o.oscillators, o.bufferSources]),
      ),
      '',
      '«Số lần thực sự phát» của Web Audio nhỏ hơn số lần gọi vì `AudioService` bỏ lệnh cùng âm trong 60ms và lệnh khi đã đủ 8 nốt; Howler phát cả 20. Đỉnh thấp của Web Audio vì thế một phần do bỏ lệnh, không chỉ do chừa khoảng trống ở master. Hai bên dùng biên độ khác nhau (do tác giả chọn) nên không so trực tiếp được mức to nhỏ. Đỉnh > 1,0 nghĩa là bị cắt đỉnh.',
      '',
    )
  }
  if (result.unlock) {
    lines.push('## 4. Mở khóa âm thanh (chính sách autoplay)', '')
    lines.push('Bốn ca không cử chỉ dùng CDP `userGesture:false`, rồi một cử chỉ thật tại điểm (5, 5) của trang; mốc «sau cử chỉ» là sự kiện `pointerdown` đo TRONG trang (không gồm thời gian Playwright kiểm khả thao tác).', '')
    for (const u of result.unlock) {
      lines.push(`### ${u.label}`, '')
      lines.push(
        markdownTable(
          ['Howler: chờ trước cử chỉ (ms)', 'Có tiếng trước cử chỉ', 'Trạng thái ngữ cảnh trước', 'Âm chờ tự phát sau cử chỉ', 'Trễ sau cử chỉ (ms)', 'Trạng thái sau'],
          u.howlerQueued.map((q) => [q.waitMs, q.soundBeforeGesture ? 'có' : 'không', q.ctxBeforeGesture ?? '—', q.soundAfterGesture ? 'có' : 'không', q.latencyAfterGestureMs ?? '—', q.ctxAfter ?? '—']),
        ),
        '',
        markdownTable(
          ['Web Audio: chờ giữa lệnh phát bằng mã và lần bấm (ms)', 'Có tiếng trước cử chỉ', 'Số context dựng trước cử chỉ', 'Có tiếng sau khi bấm', 'Trễ sau pointerdown (ms)', 'Dao động tạo ra do lần bấm (3 = chỉ âm của lần bấm; 6 = cả âm xếp hàng cũ)'],
          u.synthQueued.map((q) => [q.waitMs ?? '(không phát trước)', q.soundBeforeGesture === null ? '—' : q.soundBeforeGesture ? 'có' : 'không', q.contextsBeforeGesture, q.soundAfterTap ? 'có' : 'không', q.latencyAfterTapMs ?? '—', q.oscillatorsCreatedByTap]),
        ),
        '',
        `Một cử chỉ vào nút rồi có tiếng (ms, 5 lần, mốc pointerdown): Howler ${u.howlerSingleTapMs.join(', ')}; Web Audio ${u.synthSingleTapMs.join(', ')}.`,
        '',
      )
    }
    lines.push('Giả lập cảm ứng chỉ đổi kích thước, UA và sự kiện chạm của Chrome; KHÔNG thay được iOS Safari (nơi chính sách mở khóa và trạng thái `interrupted` khác). iOS/Android thật chưa được thử.', '')
  }
  if (result.missing) {
    lines.push('## 5. Tệp âm thanh không tồn tại (Howler)', '')
    lines.push(
      `- Ném lỗi: ${result.missing.threw ? 'CÓ' : 'không'}; \`play()\` trả: ${JSON.stringify(result.missing.playReturned)}.`,
      `- Máy chủ trả cho đường dẫn không có tệp: ${result.missing.fetched} (nếu là text/html thì Howler gặp lỗi giải mã chứ không phải 404).`,
      `- Sự kiện Howler thấy: ${result.missing.events.length ? result.missing.events.join('; ') : '(không có)'}.`,
      `- Thông báo console của trang: ${result.missing.consoleMessages.length ? [...new Set(result.missing.consoleMessages)].join(' | ') : '(không có)'}.`,
      '',
    )
  }
  const cases = [result.latency, ...(result.overlap ?? []), ...(result.unlock ?? [])].filter(Boolean)
  const allErrors = cases.flatMap((r) => r.errors ?? [])
  const allExternal = cases.flatMap((r) => r.external ?? [])
  lines.push('## 6. Lỗi console và yêu cầu ra ngoài máy (mọi ca trừ «tệp thiếu»; ca «không cử chỉ» có cảnh báo autoplay của Chrome là đúng kỳ vọng)', '')
  lines.push(allErrors.length === 0 ? 'Không có lỗi hay cảnh báo console.' : [...new Set(allErrors)].map((e) => `- ${e}`).join('\n'), '')
  lines.push(allExternal.length === 0 ? 'Không có yêu cầu mạng ra ngoài máy.' : [...new Set(allExternal)].map((e) => `- ${e}`).join('\n'), '')
  return lines.join('\n')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
