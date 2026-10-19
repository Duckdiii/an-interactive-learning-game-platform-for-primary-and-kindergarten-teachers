/**
 * T5.2: đo tự động khu thử nghiệm bằng Chrome thật (playwright-core, kênh `chrome`).
 *
 *   node scripts/experiments/measure.mjs [--skip-bundle] [--no-fps] [--lab=number-line]
 *
 * Làm: (1) build thường và build `VITE_EXPERIMENTS=1` rồi so dung lượng; (2) phục vụ bản thử nghiệm bằng `vite preview`;
 * (3) mỗi viewport × loại game × theme: chụp ảnh sân, đo tràn ngang, lỗi console, vùng chạm THẬT (đọc từ Konva, quy ra px
 * màn hình), thời gian nạp ảnh của theme, kiểm axe; (4) đo FPS khi kéo/chạm liên tục ở CPU thường và chậm 4 lần.
 * Ghi `docs/experiments/results/t5-2/` (báo cáo Markdown, JSON thô, ảnh). Không gọi mạng ngoài máy. Phần phân tích thuần
 * nằm ở `analysis.mjs` và có test.
 */
import { AxeBuilder } from '@axe-core/playwright'
import { chromium } from 'playwright-core'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import zlib from 'node:zlib'
import { build, preview } from 'vite'
import {
  diffSizes,
  formatBytes,
  hasHorizontalOverflow,
  markdownTable,
  significantConsole,
  smallestTarget,
  stableAssetName,
  summarizeAxe,
  summarizeFrames,
  TOUCH_THRESHOLDS,
  touchTargetFailures,
} from './analysis.mjs'

const ROOT = fileURLToPath(new URL('../../', import.meta.url))
const PORT = 4178

const args = new Set(process.argv.slice(2))
const onlyLab = process.argv.find((a) => a.startsWith('--lab='))?.slice(6)
// `--out=<tên thư mục>` ghi vào docs/experiments/results/<tên> (mặc định t5-2): để đo lại mà không ghi đè kết quả cũ.
const outName = process.argv.find((a) => a.startsWith('--out='))?.slice(6) ?? 't5-2'
const OUT_DIR = path.resolve(ROOT, '../docs/experiments/results', outName)
const SHOT_DIR = path.join(OUT_DIR, 'shots')

// Trang thử nghiệm có khung chiều rộng cố định (nút 390/768/1280px); `ResponsiveStage` co theo khung, không theo cửa sổ.
// Cửa sổ luôn đủ rộng cho khung lớn nhất; ca khác nhau ở khung được chọn.
const WINDOW = { width: 1440, height: 1000 }
const VIEWPORTS = [
  { id: '390', frame: 390 },
  { id: '768', frame: 768 },
  { id: '1280', frame: 1280 },
]
const LABS = [
  { id: 'number-line', button: /T4\.1/, themed: true },
  { id: 'syllable-builder', button: /T4\.2/, themed: true },
  { id: 'preposition-scene', button: /T4\.3/, themed: true },
  { id: 'theme-lab', button: /T3\)/, themed: false },
].filter((lab) => !onlyLab || lab.id === onlyLab)
const THEMES = [
  { id: 'neutral', name: 'Trung tính' },
  { id: 'space', name: 'Vũ trụ' },
  { id: 'ocean', name: 'Đại dương' },
]

const round1 = (n) => (Number.isFinite(n) ? Math.round(n * 10) / 10 : null)

// ---------------------------------------------------------------------------------------------- bundle
function assetSizes(dir) {
  const assets = path.join(dir, 'assets')
  const raw = {}
  const gzip = {}
  for (const file of fs.existsSync(assets) ? fs.readdirSync(assets) : []) {
    if (!/\.(js|css)$/.test(file)) continue
    const bytes = fs.readFileSync(path.join(assets, file))
    // Hai tệp khác nhau mà cùng khóa ổn định thì không được ghi đè nhau (tổng sẽ thấp hơn thực tế): đánh số thêm.
    let key = stableAssetName(file)
    for (let n = 2; key in raw; n += 1) key = `${stableAssetName(file)}#${n}`
    raw[key] = bytes.length
    gzip[key] = zlib.gzipSync(bytes).length
  }
  return { raw, gzip }
}

async function buildTo(dir, experiments) {
  // `envDir: false`: không đọc tệp .env của máy, nên VITE_EXPERIMENTS chỉ do script này quyết định.
  delete process.env.ANALYZE
  if (experiments) process.env.VITE_EXPERIMENTS = '1'
  else delete process.env.VITE_EXPERIMENTS
  await build({ root: ROOT, logLevel: 'warn', envDir: false, build: { outDir: dir, emptyOutDir: true } })
  return assetSizes(dir)
}

// ---------------------------------------------------------------------------------------------- trong trang
/**
 * Chạy trong trang: các vùng tương tác của Konva với hộp ở px màn hình, KHÔNG gồm nét viền (cùng cách tính với hàm
 * bố cục ở `*Facts.ts`; vùng bắt chạm thật của Konva lớn hơn một nửa nét viền mỗi cạnh). Tính node đang hiện, có
 * trình xử lý nhấp/chạm/nhấn xuống hoặc kéo được. Nút đang tắt (renderer bỏ trình xử lý) không được tính.
 */
const readTargets = () => {
  const stage = window.Konva?.stages?.[0]
  if (!stage) return null
  const out = []
  stage.find(() => true).forEach((node) => {
    const listeners = node.eventListeners || {}
    const handles = ['click', 'tap', 'mousedown', 'touchstart', 'pointerdown'].some((type) => listeners[type] && listeners[type].length)
    const draggable = Boolean(node.draggable && node.draggable())
    if (!(handles || draggable) || !node.isListening() || !node.isVisible()) return
    const rect = node.getClientRect({ skipShadow: true, skipStroke: true })
    // Vùng bắt chạm mở rộng bằng `hitStrokeWidth` (số) của node hoặc con cháu: mép ngoài thêm nửa bề rộng đó mỗi cạnh
    // (tính theo toạ độ màn hình = nhân hệ số co của sân).
    let hitExtra = 0
    // Con cháu chỉ tính khi node là nhóm kéo được (vật kéo có hình vẽ là con); nhóm có trình xử lý khác thì không, để không
    // phóng đại vùng của cả nhóm theo con của nó.
    const candidates = [node, ...(draggable && node.find ? node.find(() => true) : [])]
    for (const candidate of candidates) {
      const hit = candidate.hitStrokeWidth ? candidate.hitStrokeWidth() : 'auto'
      if (typeof hit === 'number' && hit > 0) hitExtra = Math.max(hitExtra, hit / 2)
    }
    if (hitExtra > 0) {
      const scale = stage.scaleX()
      rect.x -= hitExtra * scale
      rect.y -= hitExtra * scale
      rect.width += hitExtra * 2 * scale
      rect.height += hitExtra * 2 * scale
    }
    const text = node.findOne ? node.findOne('Text') : null
    out.push({
      label: (text && text.text()) || (node.name && node.name()) || node.className,
      kind: node.className,
      width: rect.width,
      height: rect.height,
      cx: rect.x + rect.width / 2,
      cy: rect.y + rect.height / 2,
      draggable,
    })
  })
  return { targets: out, scale: stage.scaleX(), imageNodes: stage.find('Image').length }
}

/**
 * Chạy trong trang, gọi NGAY khi bấm đổi theme: nền họa tiết của theme là `Rect` có `fillPatternImage`, chỉ được dựng khi
 * ảnh SVG nhúng đã nạp xong (xem `StageBackdrop`). Nên thời gian nạp = từ lúc bấm đến khi Rect đó xuất hiện.
 * `expectPattern` = theme có nền họa tiết (không phải «neutral»). Trả { ms, patterns }: ms là null nếu không chờ gì
 * (theme không có nền) hoặc quá 5 giây (patterns = 0 trong trường hợp này).
 */
const waitForThemePattern = (expectPattern) =>
  new Promise((resolve) => {
    const t0 = performance.now()
    let frames = 0
    const check = () => {
      const stage = window.Konva?.stages?.[0]
      const patterns = stage ? stage.find('Rect').filter((rect) => rect.fillPatternImage && rect.fillPatternImage()) : []
      frames += 1
      if (patterns.length > 0) return resolve({ ms: performance.now() - t0, patterns: patterns.length })
      if (!expectPattern && frames >= 3) return resolve({ ms: null, patterns: 0 })
      if (performance.now() - t0 > 5000) return resolve({ ms: null, patterns: 0 })
      requestAnimationFrame(check)
    }
    requestAnimationFrame(check)
  })

async function openLab(page, lab, theme, frame) {
  await page.goto(`http://127.0.0.1:${PORT}/dev/experiments`, { waitUntil: 'networkidle' })
  await page.getByRole('group', { name: 'Chiều rộng khung' }).getByRole('button', { name: `${frame}px`, exact: true }).click()
  await page.getByRole('button', { name: lab.button }).click()
  await page.evaluate(() => document.fonts.ready)
  let themeLoad = { ms: null, patterns: null }
  if (lab.themed && theme) {
    const click = page.getByRole('group', { name: 'Theme' }).getByRole('button', { name: theme.name, exact: true }).click()
    // Bắt đầu chờ trong trang ngay khi bấm (không đợi Playwright trả về).
    const [, loaded] = await Promise.all([click, page.evaluate(waitForThemePattern, theme.id !== 'neutral')])
    themeLoad = loaded
  } else {
    await page.waitForSelector('.konvajs-content', { timeout: 5000 }).catch(() => {})
  }
  await page.waitForTimeout(300)
  return themeLoad
}

// ---------------------------------------------------------------------------------------------- FPS
/**
 * FPS lúc tương tác: vòng rAF chỉ chạy TRONG lúc kéo/chạm (không tính phần chuẩn bị), kèm đếm số lần Konva thật sự vẽ
 * lại (`layer.draw`) để biết thao tác có tác dụng. Kéo vật nếu có node kéo được; không thì chạm liên tục hai nút đầu.
 * Ngưỡng «khung rớt» (>33,4ms) tính theo 60 Hz dù máy đo có thể chạy rAF ở 120 Hz.
 */
async function measureFps(page, cdp, throttle) {
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle })
  const info = await page.evaluate(readTargets)
  const box = await page.locator('.konvajs-content').first().boundingBox()
  if (!info || !box) throw new Error('không đọc được stage')
  await page.evaluate(() => {
    window.__draws = 0
    for (const layer of window.Konva.stages[0].getLayers()) {
      const original = layer.draw
      layer.draw = function (...a) {
        window.__draws += 1
        return original.apply(this, a)
      }
    }
    window.__frames = []
    window.__stopFrames = false
    const loop = () => {
      window.__frames.push(performance.now())
      if (!window.__stopFrames) requestAnimationFrame(loop)
    }
    requestAnimationFrame(loop)
  })
  const draggable = info.targets.find((t) => t.draggable)
  const tapTargets = info.targets.filter((t) => !t.draggable && t.kind !== 'Stage').slice(0, 2)
  const deadline = Date.now() + 3000
  let action = 'none'
  if (draggable) {
    action = 'drag'
    const x = box.x + draggable.cx
    const y = box.y + draggable.cy
    await page.mouse.move(x, y)
    await page.mouse.down()
    while (Date.now() < deadline) {
      await page.mouse.move(x + 90, y, { steps: 30 })
      await page.mouse.move(Math.max(box.x + 10, x - 90), y, { steps: 30 })
    }
    await page.mouse.up()
  } else if (tapTargets.length > 0) {
    action = 'tap'
    let i = 0
    while (Date.now() < deadline) {
      const t = tapTargets[i % tapTargets.length]
      await page.mouse.click(box.x + t.cx, box.y + t.cy)
      i += 1
    }
  }
  const { frames, draws } = await page.evaluate(() => {
    window.__stopFrames = true
    return { frames: window.__frames, draws: window.__draws }
  })
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 })
  return { ...summarizeFrames(frames), action, draws, drawsPerSecond: Math.round((draws / 3) * 10) / 10 }
}

// ---------------------------------------------------------------------------------------------- chạy
async function main() {
  fs.mkdirSync(SHOT_DIR, { recursive: true })
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 't52-'))
  const result = { startedAt: new Date().toISOString(), node: process.version, cases: [], fps: [], bundle: null }
  const save = () => {
    fs.writeFileSync(path.join(OUT_DIR, 'results.json'), JSON.stringify(result, null, 2))
    fs.writeFileSync(path.join(OUT_DIR, 'measurements.md'), renderReport(result))
  }
  let server = null
  let browser = null
  try {
    // 1) build
    const dirExperiments = path.join(tmp, 'exp')
    if (!args.has('--skip-bundle')) {
      const normal = await buildTo(path.join(tmp, 'normal'), false)
      const experiments = await buildTo(dirExperiments, true)
      result.bundle = { normal, experiments }
    } else {
      await buildTo(dirExperiments, true)
    }

    // 2) phục vụ bản thử nghiệm
    server = await preview({
      root: ROOT,
      logLevel: 'warn',
      envDir: false,
      build: { outDir: dirExperiments },
      preview: { port: PORT, strictPort: true, host: '127.0.0.1' },
    })

    browser = await chromium.launch({ channel: 'chrome', headless: true })
    result.chrome = browser.version()

    // 3) từng ca
    for (const viewport of VIEWPORTS) {
      for (const lab of LABS) {
        for (const theme of lab.themed ? THEMES : [null]) {
          const context = await browser.newContext({ viewport: WINDOW, deviceScaleFactor: 1 })
          const page = await context.newPage()
          const consoleMessages = []
          page.on('console', (m) => consoleMessages.push({ type: m.type(), text: m.text() }))
          page.on('pageerror', (e) => consoleMessages.push({ type: 'error', text: `pageerror: ${e.message}` }))
          const name = `${viewport.id}-${lab.id}${theme ? `-${theme.id}` : ''}`
          try {
            const themeLoad = await openLab(page, lab, theme, viewport.frame)
            // Tràn ngang: trong khung thử nghiệm (có overflow-x-auto nên tràn sẽ hiện thanh cuộn) và trên cả trang.
            const overflow = await page.evaluate(() => {
              const frame = document.querySelector('[data-testid="experiment-frame"]')
              return {
                frame: { scrollWidth: frame.scrollWidth, clientWidth: frame.clientWidth },
                page: { scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth },
              }
            })
            const info = await page.evaluate(readTargets)
            const targets = info?.targets ?? []
            const axe = await new AxeBuilder({ page }).analyze()
            await page.locator('.konvajs-content').first().screenshot({ path: path.join(SHOT_DIR, `${name}.jpg`), type: 'jpeg', quality: 70 }).catch(() => {})
            result.cases.push({
              name,
              viewport: viewport.id,
              lab: lab.id,
              theme: theme?.id ?? null,
              overflowFrame: hasHorizontalOverflow(overflow.frame),
              overflowPage: hasHorizontalOverflow(overflow.page),
              overflowRaw: overflow,
              console: significantConsole(consoleMessages),
              stageScale: Number.isFinite(info?.scale) ? Math.round(info.scale * 1000) / 1000 : null,
              targets: targets.map((t) => ({ label: t.label, kind: t.kind, width: round1(t.width), height: round1(t.height) })),
              targetCount: targets.length,
              smallestTarget: smallestTarget(targets),
              failures: touchTargetFailures(targets),
              imageNodes: info?.imageNodes ?? null,
              themePatterns: themeLoad.patterns,
              themeLoadMs: round1(themeLoad.ms ?? NaN),
              axe: summarizeAxe(axe.violations),
            })
            console.log(`ok   ${name}`)
          } catch (error) {
            result.cases.push({ name, viewport: viewport.id, lab: lab.id, theme: theme?.id ?? null, error: String(error?.message ?? error).slice(0, 300) })
            console.log(`FAIL ${name}: ${error?.message}`)
          } finally {
            await context.close()
          }
        }
      }
    }
    save()

    // 4) FPS: chủ đề «Vũ trụ» (nặng nhất, có nền ảnh), ba khung, CPU thường và chậm 4 lần
    if (!args.has('--no-fps')) {
      for (const viewport of VIEWPORTS) {
        for (const lab of LABS.filter((l) => l.themed)) {
          for (const throttle of [1, 4]) {
            const context = await browser.newContext({ viewport: WINDOW, deviceScaleFactor: 1 })
            const page = await context.newPage()
            try {
              const cdp = await context.newCDPSession(page)
              await openLab(page, lab, THEMES[1], viewport.frame)
              const stats = await measureFps(page, cdp, throttle)
              result.fps.push({ viewport: viewport.id, lab: lab.id, throttle, ...stats })
              console.log(`fps  ${viewport.id} ${lab.id} x${throttle}: ${stats.fps} (${stats.action}, ${stats.draws} lần vẽ)`)
            } catch (error) {
              result.fps.push({ viewport: viewport.id, lab: lab.id, throttle, error: String(error?.message ?? error).slice(0, 200) })
            } finally {
              await context.close()
            }
          }
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
  const lines = []
  const date = result.startedAt.slice(0, 10)
  lines.push(`# T5.2: số đo tự động khu thử nghiệm (${date})`, '')
  lines.push(`Chạy bằng \`node scripts/experiments/measure.mjs\`: Chrome ${result.chrome} (headless, playwright-core), Node ${result.node}, Windows, cửa sổ ${WINDOW.width}×${WINDOW.height}; "khung" là chiều rộng khung của trang thử nghiệm (390/768/1280px), nơi \`ResponsiveStage\` co theo. Số đo trên trình duyệt tự động ≠ máy trẻ em; không thay được thử trên điện thoại thật.`, '')

  if (result.bundle) {
    const { normal, experiments } = result.bundle
    const raw = diffSizes(normal.raw, experiments.raw)
    const gzip = diffSizes(normal.gzip, experiments.gzip)
    lines.push('## 1. Dung lượng bundle (build thường so với `VITE_EXPERIMENTS=1`)', '')
    lines.push(
      markdownTable(
        ['', 'Thường', 'Thử nghiệm', 'Chênh'],
        [
          ['JS+CSS thô', formatBytes(raw.totalA), formatBytes(raw.totalB), formatBytes(raw.delta)],
          ['JS+CSS gzip', formatBytes(gzip.totalA), formatBytes(gzip.totalB), formatBytes(gzip.delta)],
        ],
      ),
      '',
    )
    lines.push(
      markdownTable(
        ['Tệp (bỏ băm)', 'Thường (gzip)', 'Thử nghiệm (gzip)', 'Chênh'],
        gzip.rows.map((r) => [r.name, formatBytes(r.before), formatBytes(r.after), formatBytes(r.delta)]),
      ),
      '',
      'Lưu ý: số đo trên cây làm việc hiện tại (node_modules cài khi ở nhánh khác), chưa lặp lại sau `npm ci` sạch; chênh lệch thường–thử nghiệm vẫn có nghĩa vì cùng điều kiện.',
      '',
    )
  }

  lines.push('## 2. Từng ca (khung × loại game × theme)', '')
  const cases = result.cases
  lines.push(
    markdownTable(
      ['Ca', 'Tràn ngang (khung / trang)', 'Console', 'Tỉ lệ sân', 'Vùng chạm nhỏ nhất (px)', 'Trượt 64 / 56 / 48', 'Nền họa tiết theme xuất hiện sau khi bấm', 'axe (luật:node)'],
      cases.map((c) =>
        c.error
          ? [c.name, 'LỖI', c.error, '', '', '', '', '']
          : [
              c.name,
              `${c.overflowFrame ? 'CÓ' : 'không'} / ${c.overflowPage ? 'CÓ' : 'không'}`,
              c.console.length,
              c.stageScale,
              c.smallestTarget,
              `${c.failures.PRESCHOOL.length} / ${c.failures.GRADE_1_2.length} / ${c.failures.GRADE_3_5.length}`,
              c.themePatterns === null ? '—' : c.themePatterns === 0 && c.themeLoadMs === null && c.theme === 'neutral' ? 'không có nền họa tiết' : c.themeLoadMs === null ? 'KHÔNG thấy nền sau 5 giây' : `${c.themeLoadMs} ms`,
              c.axe.length === 0 ? '0' : c.axe.map((v) => `${v.id}:${v.nodes}`).join(', '),
            ],
      ),
    ),
    '',
  )

  lines.push('## 3. Vùng chạm trượt ngưỡng (đo thật, khung 390)', '')
  const small = cases.filter((c) => !c.error && c.viewport === '390' && c.failures.PRESCHOOL.length > 0)
  if (small.length === 0) lines.push('Không có.', '')
  for (const c of small) {
    const fail = (band) => c.failures[band].map((t) => `${t.label} ${t.size}px`).join('; ') || 'đạt'
    lines.push(`- **${c.name}** — mầm non (${TOUCH_THRESHOLDS.PRESCHOOL}): ${fail('PRESCHOOL')}; lớp 1–2 (${TOUCH_THRESHOLDS.GRADE_1_2}): ${fail('GRADE_1_2')}; lớp 3–5 (${TOUCH_THRESHOLDS.GRADE_3_5}): ${fail('GRADE_3_5')}`)
  }
  lines.push('')

  lines.push('## 4. FPS khi kéo/chạm liên tục (theme Vũ trụ)', '')
  if (result.fps.length === 0) lines.push('Không chạy (`--no-fps`).', '')
  else {
    lines.push(
      markdownTable(
        ['Khung', 'Loại game', 'Thao tác', 'CPU', 'FPS (rAF)', 'Lần vẽ Konva/giây', 'p95 khung (ms)', 'Khung dài nhất (ms)', 'Khung rớt (>33,4ms)', 'Số khung'],
        result.fps.map((f) => [f.viewport, f.lab, f.action ?? '—', f.throttle === 1 ? 'thường' : `chậm ${f.throttle}×`, f.fps ?? f.error ?? '—', f.drawsPerSecond ?? '—', f.p95Ms ?? '—', f.worstMs ?? '—', f.dropped ?? '—', f.frames ?? '—']),
      ),
      '',
      'FPS ở đây là tốc độ rAF của trang TRONG lúc kéo/chạm liên tục (không gồm lúc chuẩn bị); cột «Lần vẽ Konva/giây» cho biết thao tác có làm Konva vẽ lại thật. Kéo và chạm là hai thao tác khác nhau nên không so thẳng giữa các loại game. Ngưỡng «khung rớt» tính theo 60 Hz dù trình duyệt có thể chạy rAF ở 120 Hz.',
      '',
    )
  }

  lines.push('## 5. Trợ năng (axe) gộp theo luật', '')
  const byRule = new Map()
  for (const c of cases) {
    if (c.error) continue
    for (const v of c.axe) {
      const entry = byRule.get(v.id) ?? { impact: v.impact, help: v.help, cases: 0, nodes: 0 }
      entry.cases += 1
      entry.nodes += v.nodes
      byRule.set(v.id, entry)
    }
  }
  if (byRule.size === 0) lines.push('Không có vi phạm nào trong các ca đã chạy.', '')
  else {
    lines.push(markdownTable(['Luật', 'Mức', 'Số ca', 'Số node', 'Mô tả'], [...byRule.entries()].map(([id, e]) => [id, e.impact, e.cases, e.nodes, e.help])), '')
  }
  lines.push('Giới hạn của công cụ: canvas Konva không có cây DOM nên axe chỉ kiểm phần DOM quanh canvas (nút, nhãn, tương phản chữ DOM, vùng ẩn cho bàn phím). Phần vẽ trong canvas do kiểm tra bố cục và vùng chạm ở trên đánh giá.', '')

  const overflowCases = cases.filter((c) => !c.error && (c.overflowFrame || c.overflowPage))
  const consoleCases = cases.filter((c) => !c.error && c.console.length > 0)
  const errored = cases.filter((c) => c.error)
  lines.push('## 6. Tóm tắt', '')
  lines.push(`- ${cases.length} ca, ${errored.length} ca lỗi khi chạy, ${overflowCases.length} ca tràn ngang, ${consoleCases.length} ca có error/warning ở console.`)
  if (consoleCases.length > 0) lines.push(`- Console (ca đầu tiên): ${consoleCases[0].name}: ${consoleCases[0].console.map((m) => m.text).join(' | ').slice(0, 300)}`)
  lines.push('')
  return lines.join('\n')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
