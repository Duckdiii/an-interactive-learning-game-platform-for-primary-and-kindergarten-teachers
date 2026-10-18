/**
 * T7.2: so cách phát hoạt ảnh phản hồi bằng Chrome thật (playwright-core): hiệu ứng Konva hiện có, lottie-web (SVG),
 * lottie-web (canvas) và dotlottie-web (canvas + WASM), cùng một hoạt ảnh tự sinh bằng code.
 *
 *   node scripts/experiments/compare-lottie.mjs
 *
 * Đo: dung lượng các gói (kể cả WASM), thời gian từ lúc chọn nguồn đến khi hiện hình, độ trễ đến khung hình đầu sau
 * khi bấm «Phát», thời gian chạy hết, FPS/khung rớt trong lúc phát ở CPU thường và chậm 4×, số nút DOM, heap JS sau
 * GC, ảnh chụp giữa hoạt ảnh. Ghi `docs/experiments/results/t7-2/`.
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
const OUT_DIR = path.resolve(ROOT, '../docs/experiments/results/t7-2')
const SHOT_DIR = path.join(OUT_DIR, 'shots')
const PORT = 4180
const WINDOW = { width: 1440, height: 1100 }
const FRAME = 768
const WINDOW_MS = 2500
const SOURCES = [
  { id: 'konva', button: 'Konva (hiệu ứng hiện có)' },
  { id: 'lottie-svg', button: 'lottie-web (SVG)' },
  { id: 'lottie-canvas', button: 'lottie-web (canvas)' },
  { id: 'dotlottie', button: 'dotlottie-web (canvas + WASM)' },
]
const KINDS = [
  { id: 'correct', button: 'Đúng (sao nảy)' },
  { id: 'tryAgain', button: 'Thử lại (gật đầu)' },
]

// ---------------------------------------------------------------------------------------------- build
function assetSizes(dir) {
  const assets = path.join(dir, 'assets')
  const files = []
  for (const file of fs.existsSync(assets) ? fs.readdirSync(assets) : []) {
    if (!/\.(js|css|wasm)$/.test(file)) continue
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
/**
 * Chạy trong trang: ms đến khi nguồn `sourceId` sẵn sàng trong vùng xem trước (null nếu quá 15 giây). Konva: có canvas của
 * sân; Lottie: tín hiệu `__lottieHarness` đúng engine và `ready()` (lottie-web: DOMLoaded; dotlottie: đã nạp WASM và dữ liệu).
 */
const waitSourceReady = (sourceId) =>
  new Promise((resolve) => {
    const t0 = performance.now()
    const check = () => {
      const box = document.querySelector('[data-testid="lottie-preview"]')
      const h = window.__lottieHarness
      const ready = sourceId === 'konva' ? Boolean(box && box.querySelector('.konvajs-content canvas') && !h) : Boolean(h && h.engine === sourceId && h.ready())
      if (ready) resolve(performance.now() - t0)
      else if (performance.now() - t0 > 15000) resolve(null)
      else requestAnimationFrame(check)
    }
    requestAnimationFrame(check)
  })

/** Chạy trong trang: bắt đầu đếm vẽ của Konva (patch `layer.draw` của sân xem trước). */
const startKonvaCounting = () => {
  window.__konvaDraws = 0
  const stages = window.Konva?.stages ?? []
  for (const stage of stages) {
    for (const layer of stage.getLayers()) {
      if (layer.__patched) continue
      layer.__patched = true
      const original = layer.draw
      layer.draw = function (...args) {
        window.__konvaDraws += 1
        return original.apply(this, args)
      }
    }
  }
}

/**
 * Chạy trong trang: sau khi bấm «Phát» (gọi NGAY trước khi bấm): ghi mốc rAF trong `ms`, và với Lottie đo độ trễ đến
 * khung hình đầu và đến khi chạy hết. Trả { frames, firstFrameMs, completeMs, harness }.
 */
const observePlayback = (ms) =>
  new Promise((resolve) => {
    const t0 = performance.now()
    const frames = []
    let firstFrameMs = null
    let completeMs = null
    const baseFrames = window.__lottieHarness ? window.__lottieHarness.frames() : 0
    const loop = () => {
      const now = performance.now()
      frames.push(now)
      const h = window.__lottieHarness
      if (h) {
        if (firstFrameMs === null && h.frames() > baseFrames) firstFrameMs = now - t0
        if (completeMs === null && h.completed()) completeMs = now - t0
      }
      if (now - t0 < ms) requestAnimationFrame(loop)
      else {
        const harness = h ? { engine: h.engine, frames: h.frames() - baseFrames, plays: h.plays(), completed: h.completed(), domNodes: h.domNodes() } : null
        resolve({ frames, firstFrameMs, completeMs, harness, konvaDraws: window.__konvaDraws ?? null })
      }
    }
    requestAnimationFrame(loop)
  })

// ---------------------------------------------------------------------------------------------- một ca
async function runCase(browser, source, kind, throttle, shot, copies = 1) {
  const context = await browser.newContext({ viewport: WINDOW, deviceScaleFactor: 1 })
  const page = await context.newPage()
  const errors = []
  page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && errors.push(m.text().slice(0, 200)))
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message.slice(0, 200)}`))
  const external = []
  page.on('request', (r) => {
    const url = new URL(r.url())
    if (!['localhost', '127.0.0.1'].includes(url.hostname) && !r.url().startsWith('data:')) external.push(r.url())
  })
  try {
    const cdp = await context.newCDPSession(page)
    await cdp.send('Performance.enable')
    await page.goto(`http://127.0.0.1:${PORT}/dev/experiments`, { waitUntil: 'networkidle' })
    await page.getByRole('group', { name: 'Chiều rộng khung' }).getByRole('button', { name: `${FRAME}px`, exact: true }).click()
    await page.getByRole('button', { name: /T7\.2/ }).click()
    await page.getByRole('group', { name: 'Loại phản hồi' }).getByRole('button', { name: kind.button, exact: true }).click()

    if (copies > 1) await page.getByRole('group', { name: 'Số bản sao đồng thời' }).getByRole('button', { name: `${copies} bản cùng lúc`, exact: true }).click()

    // Từ trạng thái trung lập (không phải chính nguồn cần đo, để tính cả nạp lười gói) bấm chọn nguồn rồi đo đến khi sẵn sàng.
    const group = page.getByRole('group', { name: 'Nguồn hoạt ảnh' })
    if (source.id !== 'konva') {
      await group.getByRole('button', { name: SOURCES[0].button, exact: true }).click()
      await page.evaluate(waitSourceReady, 'konva')
    }
    const ready = page.evaluate(waitSourceReady, source.id)
    await group.getByRole('button', { name: source.button, exact: true }).click()
    const readyMs = await ready
    // Nhiều bản: tín hiệu là tổng hợp của mọi bộ phát; các bản (nhất là dotlottie, mỗi bản tự nạp WASM) cần thêm thời gian.
    await page.waitForTimeout(copies > 1 ? 3000 : 500)
    if (source.id === 'konva') await page.evaluate(startKonvaCounting)

    await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle })
    const observe = page.evaluate(observePlayback, WINDOW_MS)
    await page.getByRole('button', { name: 'Phát', exact: true }).click()
    if (shot) {
      await page.waitForTimeout(600)
      const box = await page.getByTestId('lottie-preview').boundingBox()
      if (box) await page.screenshot({ path: path.join(SHOT_DIR, `${source.id}-${kind.id}.jpg`), type: 'jpeg', quality: 80, clip: box }).catch(() => {})
    }
    const observed = await observe
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 })
    await cdp.send('HeapProfiler.enable')
    await cdp.send('HeapProfiler.collectGarbage')
    const metrics = await cdp.send('Performance.getMetrics')
    const heap = metrics.metrics.find((m) => m.name === 'JSHeapUsedSize')?.value ?? null
    const previewNodes = await page.evaluate(() => document.querySelector('[data-testid="lottie-preview"]')?.querySelectorAll('*').length ?? null)

    return {
      source: source.id,
      kind: kind.id,
      copies,
      throttle,
      readyMs: throttle === 1 && readyMs !== null ? Math.round(readyMs * 10) / 10 : null,
      firstFrameMs: observed.firstFrameMs === null ? null : Math.round(observed.firstFrameMs * 10) / 10,
      completeMs: observed.completeMs === null ? null : Math.round(observed.completeMs),
      playback: summarizeFrames(observed.frames),
      engineFrames: observed.harness?.frames ?? null,
      konvaDraws: observed.konvaDraws,
      domNodes: previewNodes,
      heapMB: heap === null ? null : Math.round((heap / 1048576) * 10) / 10,
      errors,
      external: [...new Set(external)],
    }
  } catch (error) {
    return { source: source.id, kind: kind.id, copies, throttle, error: String(error?.message ?? error).slice(0, 300), errors }
  } finally {
    await context.close()
  }
}

// ---------------------------------------------------------------------------------------------- chạy
async function main() {
  fs.mkdirSync(SHOT_DIR, { recursive: true })
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 't72-'))
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
    for (const kind of KINDS) {
      for (const source of SOURCES) {
        for (const throttle of [1, 4]) {
          const row = await runCase(browser, source, kind, throttle, throttle === 1)
          result.cases.push(row)
          console.log(`${row.error ? 'FAIL' : 'ok  '} ${source.id} ${kind.id} x${throttle}${row.error ? `: ${row.error}` : ` ${row.playback.fps} fps`}`)
        }
      }
    }
    // Thử tải: 12 hoạt ảnh phát cùng lúc.
    for (const source of SOURCES) {
      for (const throttle of [1, 4]) {
        const row = await runCase(browser, source, KINDS[0], throttle, false, 12)
        result.cases.push(row)
        console.log(`${row.error ? 'FAIL' : 'ok  '} ${source.id} correct x12 x${throttle}${row.error ? `: ${row.error}` : ` ${row.playback.fps} fps`}`)
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
  const lines = [`# T7.2: hoạt ảnh phản hồi Konva so với Lottie (${result.startedAt.slice(0, 10)})`, '']
  lines.push(`Chạy bằng \`node scripts/experiments/compare-lottie.mjs\`: Chrome ${result.chrome ?? '?'} (headless, playwright-core), Node ${result.node}, Windows, khung ${FRAME}px. Hoạt ảnh Lottie do code tự sinh; không tệp ngoài, không mạng ngoài máy.`, '')
  if (result.bundle) {
    const total = (files) => files.reduce((acc, f) => acc + f.gzip, 0)
    const lottieRelated = result.bundle.experiments.filter((f) => /lottie|dotlottie|wasm|Player/i.test(f.name))
    lines.push('## 1. Dung lượng (gzip)', '')
    lines.push(
      markdownTable(['Bản build', 'Tổng JS+CSS+WASM gzip', 'Số tệp'], [
        ['Thường (không có trang thử nghiệm)', formatBytes(total(result.bundle.normal)), result.bundle.normal.length],
        ['Thử nghiệm (VITE_EXPERIMENTS=1)', formatBytes(total(result.bundle.experiments)), result.bundle.experiments.length],
      ]),
      '',
      markdownTable(['Tệp bản thử nghiệm (bỏ băm)', 'Thô', 'Gzip'], result.bundle.experiments.map((f) => [f.name, formatBytes(f.raw), formatBytes(f.gzip)])),
      '',
      `Các tệp có thể liên quan Lottie: ${lottieRelated.map((f) => f.name).join(', ') || '—'}. Mỗi bộ phát nạp lười: người dùng không mở phòng Lottie thì không tải gì; bản build thường không đổi.`,
      '',
    )
  }
  const ok = result.cases.filter((c) => !c.error)
  const cpu = (c) => (c.throttle === 1 ? 'thường' : `chậm ${c.throttle}×`)
  lines.push('## 2. Nạp và khung hình đầu', '')
  lines.push(
    markdownTable(
      ['Phản hồi', 'Số bản', 'Nguồn', 'CPU', 'Sẵn sàng sau khi bấm chọn nguồn (ms)', 'Độ trễ đến khung đầu sau «Phát» (ms)', 'Chạy hết sau (ms)'],
      result.cases.map((c) => (c.error ? [c.kind, c.copies, c.source, cpu(c), 'LỖI', c.error, ''] : [c.kind, c.copies, c.source, cpu(c), c.throttle === 1 ? (c.readyMs ?? 'quá 15 giây') : '— (đo ở CPU thường)', c.firstFrameMs ?? '—', c.completeMs ?? '—'])),
    ),
    '',
  )
  lines.push(`## 3. Trong lúc phát (cửa sổ ${WINDOW_MS / 1000} giây kể từ «Phát»)`, '')
  lines.push(
    markdownTable(
      ['Phản hồi', 'Số bản', 'Nguồn', 'CPU', 'FPS (rAF)', 'p95 khung (ms)', 'Khung dài nhất (ms)', 'Khung rớt (>33,4ms)', 'Khung hình thư viện báo', 'Lần vẽ Konva', 'Số nút DOM vùng xem', 'Heap JS sau GC (MB)'],
      ok.map((c) => [c.kind, c.copies, c.source, cpu(c), c.playback.fps ?? '—', c.playback.p95Ms ?? '—', c.playback.worstMs ?? '—', c.playback.dropped, c.engineFrames ?? '—', c.konvaDraws ?? '—', c.domNodes ?? '—', c.heapMB ?? '—']),
    ),
    '',
    'Ngưỡng «khung rớt» tính theo 60 Hz dù trình duyệt có thể chạy rAF ở 120 Hz. Một lượt đo, 2,5 giây mỗi ca; chưa có khoảng tin cậy. Với nhiều bản cùng lúc, «khung hình thư viện báo» là TỔNG của mọi bộ phát, «số nút DOM» là của cả vùng xem, «sẵn sàng» và «chạy hết» chỉ tính khi TẤT CẢ bộ phát đã xong («—» = chưa xong trong cửa sổ đo). Mốc thời gian «độ trễ đến khung đầu» tính từ lúc bấm, nên gồm cả thời gian lệnh bấm đi qua trình điều khiển; «sẵn sàng» của Konva chỉ là thời gian dựng canvas; heap JS không gồm bộ nhớ WASM của dotlottie.',
    '',
  )
  const withErrors = result.cases.filter((c) => c.errors?.length)
  const withExternal = result.cases.filter((c) => c.external?.length)
  lines.push('## 4. Lỗi console và yêu cầu ra ngoài máy', '')
  lines.push(withErrors.length === 0 ? 'Không có lỗi hay cảnh báo console.' : withErrors.map((c) => `- ${c.source} ${c.kind} x${c.copies} CPU ${c.throttle}: ${c.errors.slice(0, 2).join(' | ')}`).join('\n'), '')
  lines.push(withExternal.length === 0 ? 'Không có yêu cầu mạng ra ngoài máy (WASM của dotlottie dùng tệp cục bộ).' : `**Có yêu cầu ra ngoài máy:** ${[...new Set(withExternal.flatMap((c) => c.external))].join(', ')}`, '')
  return lines.join('\n')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
