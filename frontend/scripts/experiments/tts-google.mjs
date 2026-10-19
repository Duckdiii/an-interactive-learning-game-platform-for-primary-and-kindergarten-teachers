/**
 * T8.1: sinh giọng đọc mẫu bằng Google Cloud Text-to-Speech (CHẠY CỤC BỘ bằng Node, không dùng trong trình duyệt).
 *
 *   node scripts/experiments/tts-google.mjs                       # chạy thử: chỉ lập kế hoạch, không tổng hợp
 *   node scripts/experiments/tts-google.mjs --list-voices         # liệt kê giọng vi-VN, en-US (không tốn ký tự)
 *   node scripts/experiments/tts-google.mjs --run                 # tổng hợp thật (tốn ký tự, có trần)
 *
 * Khóa: biến môi trường GOOGLE_TTS_API_KEY, hoặc đặt trong tệp frontend/.env.tts.local (đã bị .gitignore). Không bao giờ để
 * khóa trong mã, log hay biến VITE_*. Xem docs/experiments/results/t8-1-tts/README.md.
 */
import fs from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { isInside, KEY_ENV, parseKeyFromEnvText, run } from './tts-core.mjs'

const ROOT = fileURLToPath(new URL('../../', import.meta.url))
const ENV_FILE = path.join(ROOT, '.env.tts.local')
// Chỉ đọc ĐÚNG biến khóa từ tệp (không nạp biến khác vào tiến trình); biến đã có trong môi trường thì được ưu tiên.
if (existsSync(ENV_FILE) && !process.env[KEY_ENV]) {
  const fromFile = parseKeyFromEnvText(readFileSync(ENV_FILE, 'utf8'))
  if (fromFile) process.env[KEY_ENV] = fromFile
}

// Chỉ cho ghi trong frontend/ hoặc docs/experiments/results/ (cờ --out/--ledger/--manifest không được trỏ ra ngoài).
const ALLOWED_ROOTS = [ROOT, path.resolve(ROOT, '../docs/experiments/results')]
const resolve = (p) => {
  const full = path.isAbsolute(p) ? p : path.join(ROOT, p)
  if (!ALLOWED_ROOTS.some((base) => isInside(base, full))) throw new Error(`đường dẫn nằm ngoài thư mục cho phép: ${p}`)
  return full
}
const io = {
  assertPath: (file) => void resolve(file),
  // Chỉ coi là «chưa có» khi tệp không tồn tại; tệp hỏng thì ném lỗi (không được coi là 0 ký tự đã dùng).
  readJson: async (file) => {
    let text
    try {
      text = await fs.readFile(resolve(file), 'utf8')
    } catch (error) {
      if (error?.code === 'ENOENT') return null
      throw error
    }
    return JSON.parse(text)
  },
  writeJson: async (file, value) => {
    await fs.mkdir(path.dirname(resolve(file)), { recursive: true })
    await fs.writeFile(resolve(file), `${JSON.stringify(value, null, 2)}\n`)
  },
  writeFile: async (file, buffer) => fs.writeFile(resolve(file), buffer),
  mkdir: async (dir) => fs.mkdir(resolve(dir), { recursive: true }),
}

// Chỉ khi chạy thật mới ghi bản kê vào thư mục kết quả (không chứa khóa, không chứa âm thanh); `run` quyết định theo cờ đã phân tích.
const defaultManifest = path.resolve(ROOT, '../docs/experiments/results/t8-1-tts/manifest.json')
const result = await run({ argv: process.argv.slice(2), env: process.env, fetchFn: fetch, io, log: (line) => console.log(line), defaultManifest })
if (result.error) {
  console.error(`LỖI (${result.mode}): ${result.error}`)
  process.exitCode = 1
} else if (result.mode === 'run') {
  console.log(`Xong: ${result.totals.ok}/${result.totals.calls} lần gọi, ${result.totals.chars} ký tự, ${result.totals.bytes} byte. Âm thanh ở ${resolve(result.outDir)} (nếu nằm trong repo thì đã bị .gitignore).`)
}
