/**
 * T8.2: tìm và tải ảnh minh họa từ Pexels API, có duyệt tay (CHẠY CỤC BỘ bằng Node, không dùng trong trình duyệt).
 *
 *   node scripts/experiments/pexels-search.mjs                                  # chạy thử: chỉ lập kế hoạch, không gọi mạng
 *   node scripts/experiments/pexels-search.mjs --run --only=cat --only=dog      # tìm và tải ảnh về frontend/.img-out/pending/
 *   node scripts/experiments/pexels-search.mjs --approve=cat-123 --reviewer="Tên"   # sau khi BẠN xem ảnh
 *
 * Khóa: biến môi trường PEXELS_API_KEY, hoặc tệp frontend/.env.pexels.local (đã bị .gitignore). Không bao giờ để khóa trong mã,
 * log hay biến VITE_*. Xem docs/experiments/results/t8-2-pexels/README.md.
 */
import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { isInside, KEY_ENV, parseEnvVar, run } from './pexels-core.mjs'

const ROOT = fileURLToPath(new URL('../../', import.meta.url))
const ENV_FILE = path.join(ROOT, '.env.pexels.local')
// Chỉ đọc ĐÚNG biến khóa từ tệp (không nạp biến khác); biến đã có trong môi trường được ưu tiên.
if (existsSync(ENV_FILE) && !process.env[KEY_ENV]) {
  try {
    const fromFile = parseEnvVar(readFileSync(ENV_FILE, 'utf8'), KEY_ENV)
    if (fromFile) process.env[KEY_ENV] = fromFile
  } catch (error) {
    console.error(`Không đọc được ${ENV_FILE}: ${error.code ?? 'lỗi'}. Dùng biến môi trường ${KEY_ENV} thay thế.`)
  }
}

// Chỉ cho ghi trong frontend/ hoặc docs/experiments/results/; riêng từng loại đường dẫn còn bị ghim hẹp hơn (cờ --out/--ledger/--approved-dir).
const ALLOWED_ROOTS = [ROOT, path.resolve(ROOT, '../docs/experiments/results')]
const PINNED = {
  out: [path.join(ROOT, '.img-out')],
  ledger: [ROOT], // tên tệp đã được lõi giới hạn ở `.img-ledger*.json` hoặc `.json` trong `.img-out`
  approved: [path.resolve(ROOT, '../docs/experiments/results/t8-2-pexels')],
}
const resolve = (p, kind) => {
  const full = path.isAbsolute(p) ? p : path.join(ROOT, p)
  const bases = kind ? PINNED[kind] : ALLOWED_ROOTS
  if (!bases.some((base) => isInside(base, full))) throw new Error(`đường dẫn${kind ? ` (${kind})` : ''} nằm ngoài thư mục cho phép: ${p}`)
  return full
}
const io = {
  assertPath: (file, kind) => void resolve(file, kind),
  // Chỉ coi là «chưa có» khi tệp không tồn tại; tệp hỏng thì ném lỗi (không được coi là 0 lần đã tìm).
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
  // Hash của tệp (null nếu không có tệp): để duyệt đúng ảnh đã tải.
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

const defaultApprovedDir = path.resolve(ROOT, '../docs/experiments/results/t8-2-pexels/approved')
const result = await run({ argv: process.argv.slice(2), env: process.env, fetchFn: fetch, io, log: (line) => console.log(line), defaultApprovedDir })
if (result.error) {
  console.error(`LỖI (${result.mode}): ${result.error}`)
  process.exitCode = 1
} else if (result.mode === 'run') {
  const remaining = result.totals.rateLimitRemaining
  console.log(`Xong: ${result.totals.searches} lần tìm, ${result.totals.pending} ảnh chờ bạn xem ở ${resolve(result.outDir)}/pending (bị .gitignore). Chưa có ảnh nào được duyệt hay commit.${remaining === null ? '' : ` Pexels báo còn ${remaining} lần gọi trong kỳ hạn mức.`}`)
}
