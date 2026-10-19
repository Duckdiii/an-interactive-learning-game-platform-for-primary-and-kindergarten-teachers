/**
 * T8.3: sinh giọng đọc mẫu bằng VieNeu-TTS CHẠY TRÊN MÁY BẠN (mã nguồn mở, không khóa API, không thẻ, không tốn tiền).
 *
 *   node scripts/experiments/tts-vieneu.mjs                 # chạy thử: chỉ lập kế hoạch
 *   node scripts/experiments/tts-vieneu.mjs --list-voices   # liệt kê giọng có sẵn
 *   node scripts/experiments/tts-vieneu.mjs --run --voice="Tên giọng"   # sinh thật ra frontend/.tts-out/vieneu/*.wav
 *
 * Cần Python đã cài gói `vieneu` ở NGOÀI repo; đặt biến môi trường VIENEU_PYTHON trỏ tới python.exe của môi trường đó.
 * Xem docs/experiments/results/t8-3-vieneu/README.md.
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { isInside } from './tts-core.mjs'
import { run } from './tts-vieneu-core.mjs'
import { spawnPython } from './tts-vieneu-spawn.mjs'

const ROOT = fileURLToPath(new URL('../../', import.meta.url))
const HELPER = fileURLToPath(new URL('./vieneu_synth.py', import.meta.url))

// Hẹp hơn các script trước: âm thanh chỉ ra frontend/.tts-out/, bản kê chỉ ra docs/experiments/results/ (và phải là .json),
// nên cờ --out/--manifest không ghi đè được mã nguồn hay package.json.
const ALLOWED = {
  out: [path.join(ROOT, '.tts-out')],
  manifest: [path.resolve(ROOT, '../docs/experiments/results')],
}
const resolve = (p, kind = 'out') => {
  const full = path.isAbsolute(p) ? p : path.join(ROOT, p)
  if (!ALLOWED[kind].some((base) => isInside(base, full))) throw new Error(`đường dẫn ${kind === 'out' ? '--out' : '--manifest'} nằm ngoài thư mục cho phép (${kind === 'out' ? 'frontend/.tts-out' : 'docs/experiments/results'}): ${p}`)
  if (kind === 'manifest' && !full.endsWith('.json')) throw new Error('--manifest phải là tệp .json')
  return full
}
const io = {
  assertPath: (file, kind) => void resolve(file, kind),
  resolvePath: (file) => resolve(file, 'out'),
  mkdir: async (dir) => fs.mkdir(resolve(dir, 'out'), { recursive: true }),
  writeJson: async (file, value) => {
    // jobs.json nằm trong thư mục ra; bản kê nằm trong docs/experiments/results.
    const kind = file.endsWith('jobs.json') ? 'out' : 'manifest'
    const full = resolve(file, kind)
    await fs.mkdir(path.dirname(full), { recursive: true })
    await fs.writeFile(full, `${JSON.stringify(value, null, 2)}\n`)
  },
}

const defaultManifest = path.resolve(ROOT, '../docs/experiments/results/t8-3-vieneu/manifest.json')
const result = await run({ argv: process.argv.slice(2), env: process.env, spawnFn: spawnPython, io, helper: HELPER, log: (line) => console.log(line), defaultManifest })
if (result.error) {
  console.error(`LỖI (${result.mode}): ${result.error}`)
  process.exitCode = 1
}
if (result.mode === 'run') {
  console.log(`Xong: ${result.totals.ok}/${result.totals.jobs} câu, ${result.totals.chars} ký tự, ${result.totals.seconds} giây âm thanh. Tệp ở ${resolve(result.outDir)} (đã bị .gitignore).`)
}
