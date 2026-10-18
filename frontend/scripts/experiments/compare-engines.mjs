/**
 * T7.1: so Konva với PixiJS trên cùng màn NUMBER_LINE bằng Chrome thật (playwright-core).
 *
 *   node scripts/experiments/compare-engines.mjs
 *
 * Với từng engine (Konva, Pixi vẽ khi cần, Pixi vẽ liên tục) × khung (390/768/1280) × CPU (thường, chậm 4×): thời gian từ
 * lúc chọn engine đến khi sẵn sàng (nạp lười gói Pixi + khởi tạo), số lần vẽ lúc đứng yên, FPS và số lần vẽ lúc kéo
 * điểm 3 giây, bộ nhớ JS sau khi kéo; ảnh chụp để so chữ tiếng Việt có dấu; dung lượng các gói của bản build.
 * Ghi `docs/experiments/results/t7-1/`. Dùng lại phần phân tích thuần của `analysis.mjs`.
 */
import { chromium } from 'playwright-core'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import zlib from 'node:zlib'
import { build, preview } from 'vite'
import { formatBytes, markdownTable, stableAssetName, summarizeFrames } from './analysis.mjs'

const ROOT = fileURLToPath(new URL('../../', import.meta.url))
const OUT_DIR = path.resolve(ROOT, '../docs/experiments/results/t7-1')
const SHOT_DIR = path.join(OUT_DIR, 'shots')
const PORT = 4179
const WINDOW = { width: 1440, height: 1000 }
const FRAMES = [390, 768, 1280]
const ENGINES = [
  { id: 'konva', button: 'Konva' },
  { id: 'pixi-demand', button: 'Pixi (vẽ khi cần)' },
  { id: 'pixi-continuous', button: 'Pixi (vẽ liên tục)' },
]
const IDLE_MS = 2000
const DRAG_MS = 3000

// ---------------------------------------------------------------------------------------------- build
function assetSizes(dir) {
  const assets = path.join(dir, 'assets')
  const files = []
  for (const file of fs.existsSync(assets) ? fs.readdirSync(assets) : []) {
    if (!/\.(js|css)$/.test(file)) continue
    const bytes = fs.readFileSync(path.join(assets, file))
    files.push({ name: stableAssetName(file), raw: bytes.length, gzip: zlib.gzipSync(bytes).length })
  }
  return files.sort((a, b) => b.gzip - a.gzip)
}

async function buildTo(dir, experiments) {
  delete process.env.ANALYZE
  if (experiments) process.env.VITE_EXPERIMENTS = '1'
  else delete process.env.VITE_EXPERIMENTS
  await build({ root: ROOT, logLevel: 'warn', envDir: false, build: { outDir: dir, emptyOutDir: true } })
  return assetSizes(dir)
}

// ---------------------------------------------------------------------------------------------- trong trang
/** Chạy trong trang: vùng tương tác của Konva (xem measure.mjs), px màn hình tương đối với canvas. */
const readKonvaTargets = () => {
  const stage = window.Konva?.stages?.[0]
  if (!stage) return null
  const out = []
  stage.find(() => true).forEach((node) => {
    const listeners = node.eventListeners || {}
    const handles = ['click', 'tap'].some((type) => listeners[type] && listeners[type].length)
    const draggable = Boolean(node.draggable && node.draggable())
    if (!(handles || draggable) || !node.isListening() || !node.isVisible()) return
    const rect = node.getClientRect({ skipShadow: true, skipStroke: true })
    out.push({ label: node.className, width: rect.width, height: rect.height, cx: rect.x + rect.width / 2, cy: rect.y + rect.height / 2, draggable })
  })
  return { targets: out, scale: stage.scaleX() }
}

/** Chạy trong trang: bắt đầu đếm số lần vẽ (Konva: `layer.draw`; Pixi: sự kiện postrender qua tín hiệu của renderer). */
const startCounting = () => {
  window.__draws = 0
  window.__moves = 0
  if (!window.__moveListener) {
    window.__moveListener = true
    window.addEventListener('pointermove', () => (window.__moves += 1), { capture: true })
  }
  window.__pixiRendersAtStart = window.__pixiHarness ? window.__pixiHarness.renders() : 0
  const stage = window.Konva?.stages?.[0]
  if (stage && !window.__konvaPatched) {
    window.__konvaPatched = true
    for (const layer of stage.getLayers()) {
      const original = layer.draw
      layer.draw = function (...args) {
        window.__draws += 1
        return original.apply(this, args)
      }
    }
  }
}
const readMoves = () => window.__moves
const readDraws = () => (window.__pixiHarness ? window.__pixiHarness.renders() - window.__pixiRendersAtStart : window.__draws)

/** Chạy trong trang: đo khoảng thời gian rAF trong `ms` mili giây (dùng cho cửa sổ đứng yên). */
const sampleFrames = (ms) =>
  new Promise((resolve) => {
    const frames = []
    const t0 = performance.now()
    const loop = () => {
      frames.push(performance.now())
      if (performance.now() - t0 < ms) requestAnimationFrame(loop)
      else resolve(frames)
    }
    requestAnimationFrame(loop)
  })

/** Chạy trong trang: ms đến khi có canvas Konva (null nếu quá 10 giây). */
const waitKonvaCanvas = () =>
  new Promise((resolve) => {
    const t0 = performance.now()
    const check = () => {
      if (document.querySelector('[data-testid="experiment-frame"] .konvajs-content canvas')) resolve(performance.now() - t0)
      else if (performance.now() - t0 > 10000) resolve(null)
      else requestAnimationFrame(check)
    }
    requestAnimationFrame(check)
  })

/** Chạy trong trang: ms đến khi Pixi khởi tạo xong (có tín hiệu và canvas Pixi); null nếu quá 10 giây. */
const waitPixiCanvas = () =>
  new Promise((resolve) => {
    const t0 = performance.now()
    const check = () => {
      if (window.__pixiHarness && document.querySelector('[data-engine="pixi"] canvas')) resolve(performance.now() - t0)
      else if (performance.now() - t0 > 10000) resolve(null)
      else requestAnimationFrame(check)
    }
    requestAnimationFrame(check)
  })

/** Chạy trong trang (Konva): hộp các nút theo px màn hình tương đối với canvas. */
const readKonvaButtons = () => {
  const stage = window.Konva.stages[0]
  const rect = (node) => {
    const r = node.getClientRect({ skipShadow: true, skipStroke: true })
    return { cx: r.x + r.width / 2, cy: r.y + r.height / 2 }
  }
  const byText = (text) => stage.find('Text').find((t) => t.text() === text)
  const marker = stage.find('Circle').find((c) => c.draggable())
  return { plus: rect(byText('+')), minus: rect(byText('−')), confirm: rect(byText('Xong rồi!')), marker: rect(marker), scale: stage.scaleX() }
}

// Toạ độ thiết kế của thang 0..10 (xem numberLineLayout): vạch v ở x = LINE_LEFT + v / 10 * (LINE_RIGHT - LINE_LEFT).
const designX = (value) => 90 + (value / 10) * 620

async function runFunctional(browser, engine) {
  const context = await browser.newContext({ viewport: WINDOW, deviceScaleFactor: 1 })
  const page = await context.newPage()
  try {
    await page.goto(`http://127.0.0.1:${PORT}/dev/experiments`, { waitUntil: 'networkidle' })
    await page.getByRole('group', { name: 'Chiều rộng khung' }).getByRole('button', { name: '1280px', exact: true }).click()
    await page.getByRole('button', { name: /T7\.1/ }).click()
    await page.waitForSelector('[data-testid="experiment-frame"] .konvajs-content canvas')
    if (engine.id !== 'konva') {
      await page.getByRole('group', { name: 'Engine' }).getByRole('button', { name: engine.button, exact: true }).click()
      await page.waitForFunction(() => window.__pixiHarness)
    }
    await page.waitForTimeout(400)
    const box = await page.locator('[data-testid="experiment-frame"] canvas').first().boundingBox()
    const buttons = async () => {
      if (engine.id === 'konva') return page.evaluate(readKonvaButtons)
      const info = await page.evaluate(() => window.__pixiHarness.getTargets())
      const at = (label) => info.targets.find((t) => t.label === label)
      return { plus: at('plus'), minus: at('minus'), confirm: at('confirm'), marker: at('marker'), scale: info.scale }
    }
    const slider = () => page.getByLabel('Số trên trục').inputValue()
    const click = async (label) => {
      const b = (await buttons())[label]
      await page.mouse.click(box.x + b.cx, box.y + b.cy)
      await page.waitForTimeout(80)
    }
    const values = { start: await slider() }
    await click('plus')
    await click('plus')
    await click('plus')
    values.afterPlus3 = await slider()
    await click('minus')
    values.afterMinus = await slider()
    let b = await buttons()
    await page.mouse.click(box.x + designX(7) * b.scale, box.y + b.marker.cy)
    await page.waitForTimeout(80)
    values.afterBandTap7 = await slider()
    b = await buttons()
    await page.mouse.move(box.x + b.marker.cx, box.y + b.marker.cy)
    await page.mouse.down()
    await page.mouse.move(box.x + designX(3) * b.scale, box.y + b.marker.cy, { steps: 12 })
    await page.mouse.up()
    await page.waitForTimeout(150)
    values.afterDrag3 = await slider()
    b = await buttons()
    const markerY = b.marker.cy // sau khi nộp điểm không còn kéo được nên nhớ vị trí ở đây
    const scale = b.scale
    await click('confirm')
    await page.waitForTimeout(200)
    values.statusWrong = await page.locator('p[role=status]').first().textContent()
    // Sau khi nộp mọi thao tác bị khóa: chạm dải ở vạch 9 không được đổi số (kiểm hành vi, không đếm vùng chạm vì Konva
    // vẫn gắn trình xử lý nhưng bỏ qua khi khóa).
    await page.mouse.click(box.x + designX(9) * scale, box.y + markerY)
    await page.waitForTimeout(100)
    values.afterLockedBandTap9 = await slider()
    values.sliderDisabled = await page.getByLabel('Số trên trục').isDisabled()
    return { engine: engine.id, values }
  } catch (error) {
    return { engine: engine.id, error: String(error?.message ?? error).slice(0, 300) }
  } finally {
    await context.close()
  }
}

// ---------------------------------------------------------------------------------------------- một ca
async function runCase(browser, engine, frame, throttle) {
  const context = await browser.newContext({ viewport: WINDOW, deviceScaleFactor: 1 })
  const page = await context.newPage()
  const errors = []
  page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && errors.push(m.text()))
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  try {
    const cdp = await context.newCDPSession(page)
    await page.goto(`http://127.0.0.1:${PORT}/dev/experiments`, { waitUntil: 'networkidle' })
    await page.getByRole('group', { name: 'Chiều rộng khung' }).getByRole('button', { name: `${frame}px`, exact: true }).click()
    // Thời gian từ lúc bấm tạo canvas đến khi sẵn sàng: Konva = bấm chọn phòng so engine (canvas Konva là mặc định);
    // Pixi = bấm chọn engine Pixi (gồm nạp lười gói Pixi và khởi tạo; sẵn sàng khi có tín hiệu `__pixiHarness`).
    let readyMs
    if (engine.id === 'konva') {
      const pending = page.evaluate(waitKonvaCanvas)
      await page.getByRole('button', { name: /T7\.1/ }).click()
      readyMs = await pending
    } else {
      await page.getByRole('button', { name: /T7\.1/ }).click()
      await page.waitForSelector('[data-testid="experiment-frame"] .konvajs-content canvas')
      const pending = page.evaluate(waitPixiCanvas)
      await page.getByRole('group', { name: 'Engine' }).getByRole('button', { name: engine.button, exact: true }).click()
      readyMs = await pending
    }
    await page.evaluate(() => document.fonts.ready)
    await page.waitForTimeout(500)

    const canvasBox = await page.locator('[data-testid="experiment-frame"] canvas').first().boundingBox()
    if (!canvasBox) throw new Error('không có canvas')
    await page.screenshot({ path: path.join(SHOT_DIR, `${engine.id}-${frame}.jpg`), type: 'jpeg', quality: 80, clip: canvasBox }).catch(() => {})

    // Vùng chạm thật (cùng bộ đọc cho hai engine để so được).
    const info = engine.id === 'konva' ? await page.evaluate(readKonvaTargets) : await page.evaluate(() => window.__pixiHarness?.getTargets() ?? null)
    if (!info) throw new Error('không đọc được vùng chạm')
    const marker = info.targets.find((t) => t.draggable)
    if (!marker) throw new Error('không thấy điểm kéo')

    await cdp.send('Performance.enable')
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle })

    // 1) Đứng yên.
    await page.evaluate(startCounting)
    const idleFrames = await page.evaluate(sampleFrames, IDLE_MS)
    const idleDraws = await page.evaluate(readDraws)

    // 2) Kéo điểm.
    await page.evaluate(startCounting)
    await page.evaluate(() => {
      window.__frames = []
      window.__stop = false
      const loop = () => {
        window.__frames.push(performance.now())
        if (!window.__stop) requestAnimationFrame(loop)
      }
      requestAnimationFrame(loop)
    })
    const x = canvasBox.x + marker.cx
    const y = canvasBox.y + marker.cy
    const deadline = Date.now() + DRAG_MS
    await page.mouse.move(x, y)
    await page.mouse.down()
    while (Date.now() < deadline) {
      await page.mouse.move(x + 90, y, { steps: 30 })
      await page.mouse.move(Math.max(canvasBox.x + 10, x - 90), y, { steps: 30 })
    }
    await page.mouse.up()
    const dragFrames = await page.evaluate(() => {
      window.__stop = true
      return window.__frames
    })
    const dragDraws = await page.evaluate(readDraws)
    const dragMoves = await page.evaluate(readMoves)
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 })
    await cdp.send('HeapProfiler.enable')
    await cdp.send('HeapProfiler.collectGarbage')
    const metrics = await cdp.send('Performance.getMetrics')
    const heap = metrics.metrics.find((m) => m.name === 'JSHeapUsedSize')?.value ?? null
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 })

    return {
      engine: engine.id,
      frame,
      throttle,
      // Đo trước khi bật giảm tốc CPU, nên chỉ ghi ở hàng CPU thường.
      readyMs: throttle !== 1 || readyMs === null ? null : Math.round(readyMs * 10) / 10,
      renderer: engine.id === 'konva' ? 'canvas 2D' : await page.evaluate(() => window.__pixiHarness?.renderer ?? null),
      idle: { rafFps: summarizeFrames(idleFrames).fps, drawsPerSecond: Math.round((idleDraws / (IDLE_MS / 1000)) * 10) / 10 },
      drag: { ...summarizeFrames(dragFrames), drawsPerSecond: Math.round((dragDraws / (DRAG_MS / 1000)) * 10) / 10, movesPerSecond: Math.round((dragMoves / (DRAG_MS / 1000)) * 10) / 10 },
      heapMB: heap === null ? null : Math.round((heap / 1048576) * 10) / 10,
      markerPx: Math.round(Math.min(marker.width, marker.height) * 10) / 10,
      errors,
    }
  } catch (error) {
    return { engine: engine.id, frame, throttle, error: String(error?.message ?? error).slice(0, 300), errors }
  } finally {
    await context.close()
  }
}

// ---------------------------------------------------------------------------------------------- chạy
async function main() {
  fs.mkdirSync(SHOT_DIR, { recursive: true })
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 't71-'))
  const result = { startedAt: new Date().toISOString(), node: process.version, bundle: null, cases: [] }
  const save = () => {
    fs.writeFileSync(path.join(OUT_DIR, 'results.json'), JSON.stringify(result, null, 2))
    fs.writeFileSync(path.join(OUT_DIR, 'measurements.md'), renderReport(result))
  }
  let server = null
  let browser = null
  try {
    const normal = await buildTo(path.join(tmp, 'normal'), false)
    const experiments = await buildTo(path.join(tmp, 'exp'), true)
    result.bundle = { normal, experiments }
    server = await preview({ root: ROOT, logLevel: 'warn', envDir: false, build: { outDir: path.join(tmp, 'exp') }, preview: { port: PORT, strictPort: true, host: '127.0.0.1' } })
    browser = await chromium.launch({ channel: 'chrome', headless: true })
    result.chrome = browser.version()
    result.functional = []
    for (const engine of ENGINES) {
      const row = await runFunctional(browser, engine)
      result.functional.push(row)
      console.log(`${row.error ? 'FAIL' : 'ok  '} chức năng ${engine.id}${row.error ? `: ${row.error}` : ''}`)
    }
    for (const frame of FRAMES) {
      for (const engine of ENGINES) {
        for (const throttle of [1, 4]) {
          const row = await runCase(browser, engine, frame, throttle)
          result.cases.push(row)
          console.log(`${row.error ? 'FAIL' : 'ok  '} ${engine.id} ${frame} x${throttle}${row.error ? `: ${row.error}` : ` drag ${row.drag.fps} fps`}`)
        }
      }
    }
  } finally {
    if (browser) await browser.close().catch(() => {})
    if (server) await new Promise((resolve) => server.httpServer.close(resolve))
    fs.rmSync(tmp, { recursive: true, force: true })
    save()
  }
  console.log(`Đã ghi ${OUT_DIR}`)
}

// ---------------------------------------------------------------------------------------------- báo cáo
function renderReport(result) {
  const lines = [`# T7.1: so Konva với PixiJS trên NUMBER_LINE (${result.startedAt.slice(0, 10)})`, '']
  lines.push(`Chạy bằng \`node scripts/experiments/compare-engines.mjs\`: Chrome ${result.chrome ?? '?'} (headless, playwright-core), Node ${result.node}, Windows. Số đo trên trình duyệt tự động; WebGL của Chrome headless chạy bằng phần mềm hoặc GPU của máy này, không đại diện máy của trẻ.`, '')

  if (result.bundle) {
    const total = (files) => files.reduce((acc, f) => acc + f.gzip, 0)
    lines.push('## 1. Dung lượng bundle (gzip)', '')
    lines.push(
      markdownTable(
        ['Bản build', 'Tổng JS+CSS gzip', 'Số tệp'],
        [
          ['Thường (không có trang thử nghiệm)', formatBytes(total(result.bundle.normal)), result.bundle.normal.length],
          ['Thử nghiệm (VITE_EXPERIMENTS=1)', formatBytes(total(result.bundle.experiments)), result.bundle.experiments.length],
        ],
      ),
      '',
      markdownTable(
        ['Tệp (bản thử nghiệm, bỏ băm)', 'Thô', 'Gzip'],
        result.bundle.experiments.map((f) => [f.name, formatBytes(f.raw), formatBytes(f.gzip)]),
      ),
      '',
      'Gói Pixi nằm trong các tệp nạp lười riêng (nhập động từ `EngineCompareLab`): bản build thường không chứa Pixi và người dùng không mở phòng so engine thì không tải.',
      '',
    )
  }

  const ok = result.cases.filter((c) => !c.error)
  lines.push('## 2. Thời gian sẵn sàng và lúc đứng yên', '')
  lines.push(
    markdownTable(
      ['Khung', 'Engine', 'CPU', 'Sẵn sàng sau khi bấm (ms)', 'rAF lúc đứng yên (fps)', 'Số lần vẽ/giây lúc đứng yên'],
      result.cases.map((c) => (c.error ? [c.frame, c.engine, c.throttle === 1 ? 'thường' : `chậm ${c.throttle}×`, 'LỖI', c.error, ''] : [c.frame, c.engine, c.throttle === 1 ? 'thường' : `chậm ${c.throttle}×`, c.throttle === 1 ? (c.readyMs ?? 'quá 10 giây') : '— (đo ở CPU thường)', c.idle.rafFps, c.idle.drawsPerSecond])),
    ),
    '',
  )
  lines.push('## 3. Kéo điểm liên tục (3 giây)', '')
  lines.push(
    markdownTable(
      ['Khung', 'Engine', 'CPU', 'FPS (rAF)', 'Số lần vẽ/giây', 'Sự kiện chuột nhận được/giây', 'p95 khung (ms)', 'Khung dài nhất (ms)', 'Khung rớt (>33,4ms)', 'Bộ nhớ JS sau GC (MB)', 'Điểm kéo (px)'],
      ok.map((c) => [c.frame, c.engine, c.throttle === 1 ? 'thường' : `chậm ${c.throttle}×`, c.drag.fps ?? '—', c.drag.drawsPerSecond, c.drag.movesPerSecond, c.drag.p95Ms ?? '—', c.drag.worstMs ?? '—', c.drag.dropped, c.heapMB ?? '—', c.markerPx]),
    ),
    '',
    'Ngưỡng «khung rớt» tính theo 60 Hz dù trình duyệt có thể chạy rAF ở 120 Hz. «Sự kiện chuột nhận được» cho biết tải đầu vào thật sự của từng ca: Playwright gửi sự kiện không theo nhịp cố định nên trang chậm hơn thì nhận ít hơn, vì vậy số vẽ/giây và FPS giữa các engine **không cùng tải** khi cột này khác nhau.',
    '',
    `Bộ vẽ Pixi: ${[...new Set(ok.filter((c) => c.engine !== 'konva').map((c) => c.renderer))].join(', ') || '—'}. Bộ nhớ là heap JS sau khi ép dọn rác, không gồm bộ nhớ GPU/texture.`,
    '',
  )
  if (result.functional) {
    lines.push('## 3b. Kiểm chức năng tương đương (chuột thật, khung 1280, mẫu «0 đến 10», chế độ preview)', '')
    const steps = ['start', 'afterPlus3', 'afterMinus', 'afterBandTap7', 'afterDrag3', 'statusWrong', 'afterLockedBandTap9', 'sliderDisabled']
    lines.push(markdownTable(['Bước', ...result.functional.map((f) => f.engine)], steps.map((step) => [step, ...result.functional.map((f) => (f.error ? 'LỖI' : JSON.stringify(f.values[step])))])), '')
    const ref = result.functional.find((f) => f.engine === 'konva')
    const same = result.functional.every((f) => !f.error && ref && JSON.stringify(f.values) === JSON.stringify(ref.values))
    lines.push(same ? 'Cả ba cấu hình cho cùng kết quả ở mọi bước.' : '**Có khác biệt giữa các cấu hình** (xem bảng).', '')
  }
  const withErrors = result.cases.filter((c) => c.errors?.length)
  lines.push('## 4. Lỗi/cảnh báo console', '')
  lines.push(withErrors.length === 0 ? 'Không có.' : withErrors.map((c) => `- ${c.engine} ${c.frame} x${c.throttle}: ${c.errors.slice(0, 2).join(' | ').slice(0, 200)}`).join('\n'), '')
  return lines.join('\n')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
