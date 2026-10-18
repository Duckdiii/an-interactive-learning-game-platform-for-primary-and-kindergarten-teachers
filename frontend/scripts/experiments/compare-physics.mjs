/**
 * T7.3: đo thả rơi theo vật lý (matter-js) cho PREPOSITION_SCENE bằng Chrome thật (playwright-core).
 *
 *   node scripts/experiments/compare-physics.mjs
 *
 * Đo: dung lượng gói matter-js (nạp lười), thời gian một lần mô phỏng (ms) ở CPU thường và chậm 4×, tính tất định
 * (nhiều lần chạy cùng kết quả), và luồng thật bằng chuột: kéo vật lên chỗ buông, vật rơi, bấm «Done!», xem đúng/sai
 * cho bốn quy tắc (ON, UNDER, IN, NEXT_TO), kèm FPS lúc rơi và ảnh chụp giữa lúc rơi. Ghi `docs/experiments/results/t7-3/`.
 */
import { chromium } from 'playwright-core'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import zlib from 'node:zlib'
import { build, preview } from 'vite'
import { formatBytes, markdownTable, percentile, stableAssetName, summarizeFrames } from './analysis.mjs'

const ROOT = fileURLToPath(new URL('../../', import.meta.url))
const OUT_DIR = path.resolve(ROOT, '../docs/experiments/results/t7-3')
const SHOT_DIR = path.join(OUT_DIR, 'shots')
const PORT = 4181
const WINDOW = { width: 1440, height: 1100 }
const FRAME = 768
const CASES = [
  { id: 'on', fixture: 'on the table', rule: 'ON', drop: { x: 360, y: 40 } },
  { id: 'under', fixture: 'under the table', rule: 'UNDER', drop: { x: 360, y: 250 } },
  { id: 'in', fixture: 'in the box', rule: 'IN', drop: { x: 360, y: 40 } },
  { id: 'next-to', fixture: 'next to the box', rule: 'NEXT_TO', drop: { x: 590, y: 100 } },
  { id: 'wrong-on-for-under', fixture: 'under the table', rule: 'UNDER (cố ý thả lên bàn)', drop: { x: 360, y: 40 } },
]
const SIM_STARTS = []
for (let x = 60; x <= 660; x += 60) for (let y = 60; y <= 300; y += 60) SIM_STARTS.push({ x, y })

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
/** Chạy trong trang: vị trí trang (px) của điểm (sceneX, sceneY) của cảnh, và tâm hiện tại của vật. */
const sceneGeometry = () => {
  const stage = window.Konva.stages[0]
  const item = stage.findOne('.item')
  const parent = item.getParent()
  const sx = item.getAbsoluteScale().x
  const origin = parent.getAbsolutePosition()
  const rect = stage.container().getBoundingClientRect()
  const ratio = rect.width / stage.width()
  const toPage = (x, y) => ({ x: rect.left + (origin.x + x * sx) * ratio, y: rect.top + (origin.y + y * sx) * ratio })
  const box = item.getClientRect()
  const center = { x: rect.left + (box.x + box.width / 2) * ratio, y: rect.top + (box.y + box.height / 2) * ratio }
  return { origin: toPage(0, 0), unit: sx * ratio, center }
}

/** Chạy trong trang: chạy mô phỏng `runs` lần cho mỗi điểm buông, trả thời gian từng lần (ms) và băm kết quả để kiểm tất định. */
const benchSimulate = ({ starts, landmark, runs }) => {
  const sim = window.__physicsHarness.simulate
  const size = { width: 100, height: 100 }
  const times = []
  const hashes = new Map()
  let unsettled = 0
  let steps = 0
  for (let r = 0; r < runs; r += 1) {
    for (const start of starts) {
      const t0 = performance.now()
      const out = sim({ landmark, size, start })
      times.push(performance.now() - t0)
      steps += out.frames.length
      if (!out.settled) unsettled += 1
      const key = `${start.x},${start.y}`
      const hash = JSON.stringify(out.final) + out.frames.length
      if (!hashes.has(key)) hashes.set(key, new Set())
      hashes.get(key).add(hash)
    }
  }
  const nonDeterministic = [...hashes.values()].filter((set) => set.size > 1).length
  return { times, unsettled, nonDeterministic, meanSteps: steps / times.length }
}

/** Chạy trong trang: ms từ lúc gọi đến khi nút «Done!» mở lại (vật đã nằm yên); ghi mốc rAF để tính FPS. */
const waitFallEnd = () =>
  new Promise((resolve) => {
    const t0 = performance.now()
    const frames = []
    const done = () => {
      const button = [...document.querySelectorAll('button')].find((b) => b.textContent === 'Done!')
      return Boolean(button) && !button.disabled
    }
    const loop = () => {
      const now = performance.now()
      frames.push(now)
      if (done() && now - t0 > 50) resolve({ ms: now - t0, frames })
      else if (now - t0 > 8000) resolve({ ms: null, frames })
      else requestAnimationFrame(loop)
    }
    requestAnimationFrame(loop)
  })

// ---------------------------------------------------------------------------------------------- ca đo
async function openLab(browser) {
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
  const cdp = await context.newCDPSession(page)
  await page.goto(`http://127.0.0.1:${PORT}/dev/experiments`, { waitUntil: 'networkidle' })
  await page.getByRole('group', { name: 'Chiều rộng khung' }).getByRole('button', { name: `${FRAME}px`, exact: true }).click()
  await page.getByRole('button', { name: /T4\.3/ }).click()
  return { context, page, cdp, errors, external }
}

async function runBench(browser, throttle, loadedBytes) {
  const lab = await openLab(browser)
  try {
    const before = await lab.page.evaluate(() => performance.getEntriesByType('resource').map((e) => e.name.split('/').pop()))
    await lab.page.getByLabel(/Thả rơi theo vật lý/).check()
    const t0 = Date.now()
    await lab.page.waitForFunction(() => Boolean(window.__physicsHarness), null, { timeout: 15000 })
    const loadMs = Date.now() - t0
    const after = await lab.page.evaluate(() => performance.getEntriesByType('resource').map((e) => e.name.split('/').pop()))
    loadedBytes.push(...after.filter((name) => !before.includes(name)))
    await lab.cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle })
    const landmark = { kind: 'TABLE', label: 'table', x: 230, y: 150, width: 260, height: 190 }
    const bench = await lab.page.evaluate(benchSimulate, { starts: SIM_STARTS, landmark, runs: 5 })
    await lab.cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 })
    return {
      throttle,
      loadMs,
      calls: bench.times.length,
      meanMs: round(bench.times.reduce((a, b) => a + b, 0) / bench.times.length),
      p95Ms: round(percentile(bench.times, 95)),
      maxMs: round(Math.max(...bench.times)),
      meanSteps: round(bench.meanSteps),
      unsettled: bench.unsettled,
      nonDeterministic: bench.nonDeterministic,
      errors: lab.errors,
      external: [...new Set(lab.external)],
    }
  } finally {
    await lab.context.close()
  }
}

async function runFlow(browser, spec, throttle, shot) {
  const lab = await openLab(browser)
  const { page } = lab
  try {
    await page.getByRole('button', { name: spec.fixture, exact: true }).click()
    await page.getByLabel(/Thả rơi theo vật lý/).check()
    await page.waitForFunction(() => Boolean(window.__physicsHarness), null, { timeout: 15000 })
    await page.waitForTimeout(300)
    const geo = await page.evaluate(sceneGeometry)
    const target = { x: geo.origin.x + spec.drop.x * geo.unit, y: geo.origin.y + spec.drop.y * geo.unit }
    await lab.cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle })
    await page.mouse.move(geo.center.x, geo.center.y)
    await page.mouse.down()
    await page.mouse.move(target.x, target.y, { steps: 12 })
    const fall = page.evaluate(waitFallEnd)
    await page.mouse.up()
    if (shot) {
      await page.waitForTimeout(250)
      const box = await page.locator('.konvajs-content').first().boundingBox()
      if (box) await page.screenshot({ path: path.join(SHOT_DIR, `${spec.id}.jpg`), type: 'jpeg', quality: 80, clip: box }).catch(() => {})
    }
    const result = await fall
    await lab.cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 })
    const done = page.getByRole('button', { name: 'Done!' })
    await done.dispatchEvent('click')
    const answered = page.getByText(/Trả lời gần nhất: preview:/)
    await answered.waitFor({ timeout: 5000 })
    const answer = (await answered.textContent()) ?? ''
    const verdict = await page.getByRole('status').filter({ hasText: /Great job|Good try|Not quite/ }).first().textContent().catch(() => null)
    return {
      id: spec.id,
      rule: spec.rule,
      throttle,
      drop: spec.drop,
      fallMs: result.ms === null ? null : Math.round(result.ms),
      playback: summarizeFrames(result.frames),
      answer: answer.replace('Trả lời gần nhất: preview: ', ''),
      verdict: verdict ? verdict.trim().slice(0, 60) : null,
      errors: lab.errors,
      external: [...new Set(lab.external)],
    }
  } catch (error) {
    return { id: spec.id, rule: spec.rule, throttle, error: String(error?.message ?? error).slice(0, 300), errors: lab.errors }
  } finally {
    await lab.context.close()
  }
}

const round = (n) => (n === null || n === undefined ? null : Math.round(n * 100) / 100)

// ---------------------------------------------------------------------------------------------- chạy
async function main() {
  fs.mkdirSync(SHOT_DIR, { recursive: true })
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 't73-'))
  const result = { startedAt: new Date().toISOString(), node: process.version, bundle: null, bench: [], flows: [], lazyFiles: [] }
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
    for (const throttle of [1, 4]) {
      const row = await runBench(browser, throttle, result.lazyFiles)
      result.bench.push(row)
      console.log(`bench x${throttle}: mean ${row.meanMs} ms, p95 ${row.p95Ms}, max ${row.maxMs}, không tất định ${row.nonDeterministic}`)
    }
    result.lazyFiles = [...new Set(result.lazyFiles)]
    for (const throttle of [1, 4]) {
      for (const spec of CASES) {
        const row = await runFlow(browser, spec, throttle, throttle === 1)
        result.flows.push(row)
        console.log(`${row.error ? 'FAIL' : 'ok  '} ${spec.id} x${throttle}${row.error ? `: ${row.error}` : ` rơi ${row.fallMs} ms → ${row.answer} ${row.verdict}`}`)
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
  const lines = [`# T7.3: thả rơi theo vật lý (matter-js) cho PREPOSITION_SCENE (${result.startedAt.slice(0, 10)})`, '']
  lines.push(`Chạy bằng \`node scripts/experiments/compare-physics.mjs\`: Chrome ${result.chrome ?? '?'} (headless, playwright-core), Node ${result.node}, Windows, khung ${FRAME}px. Không mạng ngoài máy.`, '')
  if (result.bundle) {
    const total = (files) => files.reduce((acc, f) => acc + f.gzip, 0)
    const related = result.bundle.experiments.filter((f) => /matter|Drop/i.test(f.name))
    lines.push('## 1. Dung lượng (gzip)', '')
    lines.push(
      markdownTable(['Bản build', 'Tổng JS+CSS gzip', 'Số tệp'], [
        ['Thường (không có trang thử nghiệm)', formatBytes(total(result.bundle.normal)), result.bundle.normal.length],
        ['Thử nghiệm (VITE_EXPERIMENTS=1)', formatBytes(total(result.bundle.experiments)), result.bundle.experiments.length],
      ]),
      '',
      markdownTable(['Tệp liên quan matter-js (bỏ băm)', 'Thô', 'Gzip'], related.map((f) => [f.name, formatBytes(f.raw), formatBytes(f.gzip)])),
      '',
      `Tệp thật sự được tải thêm khi bật «Thả rơi theo vật lý»: ${result.lazyFiles.join(', ') || '—'}. Chưa bật thì không tải gì; bản build thường không đổi.`,
      '',
    )
  }
  lines.push('## 2. Một lần mô phỏng (ms)', '')
  lines.push(
    markdownTable(
      ['CPU', 'Nạp gói sau khi bật (ms)', 'Số lần gọi', 'Trung bình', 'p95', 'Lớn nhất', 'Số bước trung bình', 'Chưa nằm yên', 'Điểm buông không tất định'],
      result.bench.map((b) => [b.throttle === 1 ? 'thường' : `chậm ${b.throttle}×`, b.loadMs, b.calls, b.meanMs, b.p95Ms, b.maxMs, b.meanSteps, b.unsettled, b.nonDeterministic]),
    ),
    '',
    `Mỗi điểm trong lưới ${SIM_STARTS.length} điểm buông (bàn) được chạy 5 lần; «không tất định» = số điểm mà 5 lần cho kết quả khác nhau.`,
    '',
  )
  lines.push('## 3. Luồng thật bằng chuột (kéo → buông → rơi → «Done!»)', '')
  const cpu = (r) => (r.throttle === 1 ? 'thường' : `chậm ${r.throttle}×`)
  lines.push(
    markdownTable(
      ['Ca', 'Quy tắc', 'CPU', 'Điểm buông (cảnh)', 'Rơi xong sau (ms)', 'FPS lúc rơi', 'Khung rớt', 'Vị trí nộp', 'Kết quả'],
      result.flows.map((r) =>
        r.error
          ? [r.id, r.rule, cpu(r), '—', `LỖI: ${r.error}`, '—', '—', '—', '—']
          : [r.id, r.rule, cpu(r), `${r.drop.x}, ${r.drop.y}`, r.fallMs, r.playback.fps, r.playback.dropped, r.answer, r.verdict],
      ),
    ),
    '',
    'Ngưỡng «khung rớt» tính theo 60 Hz dù trình duyệt có thể chạy rAF ở 120 Hz. Một lượt đo; «rơi xong sau» tính từ lúc nhả chuột đến khi nút «Done!» mở lại.',
    '',
  )
  lines.push('## 4. Lỗi console và yêu cầu ra ngoài máy', '')
  const allErrors = [...result.bench, ...result.flows].flatMap((r) => r.errors ?? [])
  const allExternal = [...result.bench, ...result.flows].flatMap((r) => r.external ?? [])
  lines.push(allErrors.length === 0 ? 'Không có lỗi hay cảnh báo console.' : [...new Set(allErrors)].map((e) => `- ${e}`).join('\n'), '')
  lines.push(allExternal.length === 0 ? 'Không có yêu cầu mạng ra ngoài máy.' : [...new Set(allExternal)].map((e) => `- ${e}`).join('\n'), '')
  return lines.join('\n')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
