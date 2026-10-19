/**
 * T8.2: sinh ảnh minh họa bằng AI (OpenAI Images) kèm kiểm duyệt tự động và duyệt tay (CHẠY CỤC BỘ bằng Node, không dùng trong trình duyệt).
 *
 *   node scripts/experiments/img-openai.mjs                                   # chạy thử: chỉ lập kế hoạch, không sinh, không tốn phí
 *   node scripts/experiments/img-openai.mjs --run --only=cat --only=dog       # sinh thật (ẢNH TRẢ PHÍ, có trần số ảnh)
 *   node scripts/experiments/img-openai.mjs --approve=cat --reviewer="Tên"    # sau khi BẠN xem ảnh ở frontend/.img-out/pending/
 *
 * Khóa: biến môi trường OPENAI_IMAGES_API_KEY, hoặc tệp frontend/.env.image.local (đã bị .gitignore). Không bao giờ để khóa trong mã,
 * log hay biến VITE_*. Xem docs/experiments/results/t8-2-images/README.md.
 */
import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { IMG_KEY_ENV, isInside, parseEnvVar, run } from './img-core.mjs'

const ROOT = fileURLToPath(new URL('../../', import.meta.url))
const ENV_FILE = path.join(ROOT, '.env.image.local')
// Chỉ đọc ĐÚNG biến khóa từ tệp (không nạp biến khác); biến đã có trong môi trường được ưu tiên.
if (existsSync(ENV_FILE) && !process.env[IMG_KEY_ENV]) {
  const fromFile = parseEnvVar(readFileSync(ENV_FILE, 'utf8'), IMG_KEY_ENV)
  if (fromFile) process.env[IMG_KEY_ENV] = fromFile
}

// Chỉ cho ghi trong frontend/ hoặc docs/experiments/results/ (cờ --out/--ledger/--approved-dir không được trỏ ra ngoài).
const ALLOWED_ROOTS = [ROOT, path.resolve(ROOT, '../docs/experiments/results')]
const resolve = (p) => {
  const full = path.isAbsolute(p) ? p : path.join(ROOT, p)
  if (!ALLOWED_ROOTS.some((base) => isInside(base, full))) throw new Error(`đường dẫn nằm ngoài thư mục cho phép: ${p}`)
  return full
}
const io = {
  assertPath: (file) => void resolve(file),
  // Chỉ coi là «chưa có» khi tệp không tồn tại; tệp hỏng thì ném lỗi (không được coi là 0 ảnh đã sinh).
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
  copyFile: async (from, to) => fs.copyFile(resolve(from), resolve(to)),
  removeFile: async (file) => fs.rm(resolve(file), { force: true }),
  // Hash của tệp (null nếu không có tệp): để duyệt đúng ảnh đã lưu.
  hashFile: async (file) => {
    try {
      return createHash('sha256').update(await fs.readFile(resolve(file))).digest('hex')
    } catch (error) {
      if (error?.code === 'ENOENT') return null
      throw error
    }
  },
  mkdir: async (dir) => fs.mkdir(resolve(dir), { recursive: true }),
}

const defaultApprovedDir = path.resolve(ROOT, '../docs/experiments/results/t8-2-images/approved')
const result = await run({ argv: process.argv.slice(2), env: process.env, fetchFn: fetch, io, log: (line) => console.log(line), defaultApprovedDir })
if (result.error) {
  console.error(`LỖI (${result.mode}): ${result.error}`)
  process.exitCode = 1
} else if (result.mode === 'run') {
  console.log(`Xong: ${result.totals.calls} lần sinh, ${result.totals.pending} ảnh chờ bạn xem ở ${resolve(result.outDir)}/pending (bị .gitignore), ${result.totals.rejected} bị từ chối. Chưa có ảnh nào được duyệt hay commit.`)
}
