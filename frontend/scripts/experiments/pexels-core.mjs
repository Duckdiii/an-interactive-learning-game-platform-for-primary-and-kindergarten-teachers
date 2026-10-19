/**
 * T8.2: lõi của script tìm và tải ảnh minh họa từ Pexels API (đúng cách sản phẩm sẽ làm: Backend lấy `visualPrompt` tiếng Anh, gọi Pexels
 * để lấy ảnh; xem docs/game-json-dsl-v1.0.0.md). Chạy cục bộ bằng Node, KHÔNG dùng trong trình duyệt. Có duyệt TAY trước khi dùng.
 *
 * Nguyên tắc (xem docs/experiments/results/t8-2-pexels/README.md):
 * - Khóa chỉ từ biến môi trường `PEXELS_API_KEY` (hoặc tệp frontend/.env.pexels.local, bị .gitignore), chỉ gửi tới api.pexels.com bằng header
 *   `Authorization`, KHÔNG gửi tới máy chủ ảnh, KHÔNG in, KHÔNG ghi; mọi thông báo lỗi bị lọc khóa.
 * - Mặc định chỉ lập kế hoạch (dry-run); chỉ gọi mạng khi có `--run`. API miễn phí nhưng có hạn mức: trần số lần tìm mỗi lần chạy và theo tháng
 *   (sổ cái cục bộ ghi TRƯỚC mỗi lần gọi), không thử lại tự động, một lỗi (kể cả 429) là dừng.
 * - Từ khóa CỐ ĐỊNH trong mã (không nhận văn bản tự do từ dòng lệnh). Ảnh chỉ tải từ đúng máy chủ images.pexels.com bằng https, không theo
 *   chuyển hướng, giới hạn kích thước, kiểm đúng dạng ảnh (JPEG/PNG/WebP) rồi mới lưu ở thư mục CHỜ DUYỆT.
 * - KHÔNG có kiểm duyệt tự động: chỉ khi bạn xem ảnh và chạy `--approve=<khóa> --reviewer=<tên>` ảnh mới được sao sang thư mục «đã duyệt»
 *   (kèm tên nhiếp ảnh gia và đường dẫn gốc để ghi nguồn). Script KHÔNG tự commit gì.
 * Hàm nhận `fetchFn`, `io`... qua tham số để test bằng bản giả, không gọi mạng thật.
 */
import { createHash } from 'node:crypto'
import path from 'node:path'
import { isInside, monthKey, redact, REQUEST_TIMEOUT_MS } from './tts-core.mjs'

export { isInside, redact }
export const KEY_ENV = 'PEXELS_API_KEY'
export const API_BASE = 'https://api.pexels.com/v1'
export const IMAGE_HOST = 'images.pexels.com'
export const DEFAULT_PER_QUERY = 3
export const MAX_PER_QUERY = 5
export const DEFAULT_RUN_CAP = 6
export const DEFAULT_MONTHLY_CAP = 100
export const MAX_DOWNLOADS_PER_RUN = 30
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024
export const IMAGE_TIMEOUT_MS = Math.max(REQUEST_TIMEOUT_MS, 30000)

/** Từ khóa cố định, lấy từ các vật trong ba game mới (mèo, chó, bóng, hộp, bàn, ong). */
export const QUERIES = [
  { id: 'cat', query: 'cat' },
  { id: 'dog', query: 'dog' },
  { id: 'ball', query: 'beach ball' },
  { id: 'box', query: 'cardboard box' },
  { id: 'table', query: 'wooden table' },
  { id: 'bee', query: 'bee' },
]

// ---- sổ cái theo SỐ LẦN TÌM (hạn mức API) ----
export function ledgerProblem(ledger) {
  if (ledger === null || ledger === undefined) return null
  if (typeof ledger !== 'object' || typeof ledger.month !== 'string' || !Number.isFinite(ledger.searches) || ledger.searches < 0) return 'sổ cái có dạng không hợp lệ'
  return null
}
export const usedThisMonth = (ledger, now) => (ledger && ledger.month === monthKey(now) && Number.isFinite(ledger.searches) ? ledger.searches : 0)
export const addToLedger = (ledger, searches, now) => ({ month: monthKey(now), searches: usedThisMonth(ledger, now) + searches })

export function checkBudget({ count, perQuery, runCap = DEFAULT_RUN_CAP, monthlyCap = DEFAULT_MONTHLY_CAP, used = 0 }) {
  if (![runCap, monthlyCap].every((n) => Number.isInteger(n) && n > 0)) return { ok: false, reason: 'trần phải là số nguyên dương' }
  if (count > runCap) return { ok: false, reason: `kế hoạch ${count} lần tìm vượt trần mỗi lần chạy (${runCap}); dùng --only= hoặc nâng --max-searches=` }
  if (count * perQuery > MAX_DOWNLOADS_PER_RUN) return { ok: false, reason: `kế hoạch tải ${count * perQuery} ảnh vượt trần mỗi lần chạy (${MAX_DOWNLOADS_PER_RUN}); giảm --per-query= hoặc --only=` }
  if (used + count > monthlyCap) return { ok: false, reason: `đã tìm ${used} lần trong tháng, cộng ${count} vượt trần tháng (${monthlyCap})` }
  return { ok: true, reason: null }
}

/** Đọc đúng biến `name` từ nội dung tệp env (không nạp biến khác). */
export function parseEnvVar(text, name) {
  const pattern = new RegExp(`^\\s*${name}\\s*=\\s*(.*?)\\s*$`)
  for (const line of String(text).split(/\r?\n/)) {
    const match = pattern.exec(line)
    if (match) return match[1].replace(/^(["'])(.*)\1$/, '$2') || null
  }
  return null
}

// ---- kiểm tra địa chỉ và dữ liệu từ API (không tin phản hồi) ----
function parseUrl(text) {
  if (typeof text !== 'string' || text.length > MAX_URL_LENGTH) return null
  try {
    return new URL(text)
  } catch {
    return null
  }
}
/** Chỉ https, đúng máy chủ ảnh, không tài khoản, không cổng lạ. */
export function isPexelsImageUrl(text) {
  const url = parseUrl(text)
  return Boolean(url && url.protocol === 'https:' && url.hostname === IMAGE_HOST && url.username === '' && url.password === '' && url.port === '')
}
/** Địa chỉ trang Pexels (trang ảnh, trang nhiếp ảnh gia): https và máy chủ là pexels.com hoặc www.pexels.com. */
export function isPexelsPageUrl(text) {
  const url = parseUrl(text)
  return Boolean(url && url.protocol === 'https:' && (url.hostname === 'www.pexels.com' || url.hostname === 'pexels.com') && url.username === '' && url.password === '' && url.port === '')
}

// Bỏ mọi ký tự điều khiển (C0, DEL, C1) và ký tự định dạng/ẩn (bidi như U+202E, độ rộng 0 như U+200B): dữ liệu từ Pexels do người dùng đặt.
const isControl = (char) => /^[\p{Cc}\p{Cf}]$/u.test(char)
const clip = (value, n) => [...String(value ?? '')].map((char) => (isControl(char) ? ' ' : char)).join('').trim().slice(0, n)
const MAX_URL_LENGTH = 300

/** Giữ ảnh hợp lệ từ phản hồi tìm kiếm, bỏ ảnh thiếu/sai dạng/địa chỉ lạ. */
export function normalizePhotos(data, perQuery) {
  if (!data || !Array.isArray(data.photos)) return null
  const photos = []
  for (const photo of data.photos) {
    if (photos.length >= perQuery) break
    const src = photo?.src?.large
    if (!Number.isInteger(photo?.id) || photo.id <= 0 || !isPexelsImageUrl(src) || !isPexelsPageUrl(photo?.url)) continue
    photos.push({
      photoId: photo.id,
      src,
      pexelsUrl: photo.url,
      photographer: clip(photo.photographer, 100),
      photographerUrl: isPexelsPageUrl(photo.photographer_url) ? photo.photographer_url : null,
      alt: clip(photo.alt, 200),
    })
  }
  return photos
}

/** Một lần tìm (KHÔNG thử lại). Trả { photos, latencyMs, remaining }; lỗi thì ném Error đã lọc khóa. */
export async function searchOne({ fetchFn, apiKey, query, perQuery, clock = () => performance.now() }) {
  const t0 = clock()
  const url = `${API_BASE}/search?${new URLSearchParams({ query, per_page: String(perQuery) })}`
  let response
  try {
    response = await fetchFn(url, { method: 'GET', headers: { Authorization: apiKey }, redirect: 'error', signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
  } catch (error) {
    throw new Error(`Pexels: lỗi mạng hoặc quá hạn: ${redact(error?.message ?? error, [apiKey]).slice(0, 200)}`)
  }
  const latencyMs = clock() - t0
  if (!response.ok) {
    // Chỉ mã trạng thái: thân lỗi có thể nhắc lại khóa dạng che mà redact không bắt được.
    if (response.status === 429) throw new Error('Pexels trả 429: hết hạn mức gọi API (200 lần mỗi giờ, 20.000 lần mỗi tháng theo tài liệu); chờ rồi chạy lại')
    throw new Error(`Pexels trả ${response.status}`)
  }
  const data = await response.json()
  const photos = normalizePhotos(data, perQuery)
  if (photos === null) throw new Error('Pexels: phản hồi tìm kiếm sai dạng (không có danh sách photos)')
  const remainingHeader = response.headers?.get?.('x-ratelimit-remaining')
  const remaining = remainingHeader !== null && remainingHeader !== undefined && Number.isFinite(Number(remainingHeader)) ? Number(remainingHeader) : null
  return { photos, latencyMs, remaining }
}

/** Dạng ảnh theo ĐẦU TỆP (không tin Content-Type): jpg, png, webp hoặc null. */
export function imageKind(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpg'
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png'
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString('latin1') === 'RIFF' && buffer.subarray(8, 12).toString('latin1') === 'WEBP') return 'webp'
  return null
}

/** Đọc thân phản hồi theo luồng và NGẮT ngay khi vượt trần (không đọc hết thân lớn vào bộ nhớ); không có luồng thì dùng arrayBuffer. */
async function readLimited(response) {
  const reader = response.body?.getReader?.()
  if (!reader) return Buffer.from(await response.arrayBuffer())
  const chunks = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > MAX_IMAGE_BYTES) {
      await reader.cancel().catch(() => {})
      throw new Error(`ảnh lớn hơn ${MAX_IMAGE_BYTES} byte`)
    }
    chunks.push(Buffer.from(value))
  }
  return Buffer.concat(chunks)
}

/** Tải một ảnh từ máy chủ ảnh (KHÔNG gửi khóa, KHÔNG theo chuyển hướng). Trả { bytes, ext, latencyMs }. */
export async function downloadImage({ fetchFn, url, clock = () => performance.now() }) {
  if (!isPexelsImageUrl(url)) throw new Error('địa chỉ ảnh không thuộc images.pexels.com (https)')
  const t0 = clock()
  let response
  try {
    response = await fetchFn(url, { method: 'GET', redirect: 'error', signal: AbortSignal.timeout(IMAGE_TIMEOUT_MS) })
  } catch (error) {
    throw new Error(`tải ảnh lỗi mạng hoặc quá hạn: ${clip(error?.message ?? error, 150)}`)
  }
  if (!response.ok) throw new Error(`tải ảnh trả ${response.status}`)
  const declared = Number(response.headers?.get?.('content-length'))
  if (Number.isFinite(declared) && declared > MAX_IMAGE_BYTES) throw new Error(`ảnh lớn hơn ${MAX_IMAGE_BYTES} byte`)
  const bytes = await readLimited(response)
  if (bytes.length === 0 || bytes.length > MAX_IMAGE_BYTES) throw new Error(`kích thước ảnh không hợp lệ (${bytes.length} byte)`)
  const ext = imageKind(bytes)
  if (!ext) throw new Error('nội dung tải về không phải ảnh JPEG/PNG/WebP')
  return { bytes, ext, latencyMs: clock() - t0 }
}

/** Khóa/tên tệp ổn định cho một ứng viên: `<id>-<photoId>`, chỉ ký tự an toàn. */
export const candidateKey = (id, photoId) => `${id}-${photoId}`.replace(/[^A-Za-z0-9_-]/g, '_')

export function parseArgs(argv) {
  const args = { run: false, only: [], approve: null, reviewer: null, perQuery: DEFAULT_PER_QUERY, runCap: DEFAULT_RUN_CAP, monthlyCap: DEFAULT_MONTHLY_CAP, outDir: '.img-out', ledger: '.img-ledger.json', approvedDir: null, errors: [] }
  const intValue = (value) => value !== undefined && /^\d+$/.test(value)
  for (const raw of argv) {
    const [flag, value] = raw.includes('=') ? [raw.slice(0, raw.indexOf('=')), raw.slice(raw.indexOf('=') + 1)] : [raw, undefined]
    if (flag === '--run' && value !== undefined) args.errors.push('cờ --run không nhận giá trị (không viết --run=...)')
    else if (flag === '--run') args.run = true
    else if (flag === '--only' && value) args.only.push(value)
    else if (flag === '--approve' && value) args.approve = value
    else if (flag === '--reviewer' && value) args.reviewer = value
    else if (flag === '--per-query' && intValue(value) && Number(value) >= 1 && Number(value) <= MAX_PER_QUERY) args.perQuery = Number(value)
    else if (flag === '--max-searches' && intValue(value)) args.runCap = Number(value)
    else if (flag === '--monthly-cap' && intValue(value)) args.monthlyCap = Number(value)
    else if (flag === '--out' && value) args.outDir = value
    else if (flag === '--ledger' && value) args.ledger = value
    else if (flag === '--approved-dir' && value) args.approvedDir = value
    else args.errors.push(`cờ không hợp lệ: ${clip(raw, 60)}`)
  }
  return args
}

/**
 * Chạy một lượt. `io`: readJson(path)->obj|null (ném lỗi nếu tệp hỏng), writeJson, writeFile(path, Buffer), copyFile(from, to),
 * removeFile, hashFile(path)->hex|null, mkdir, assertPath?(path). Trả { mode, ... }. Không bao giờ in/ghi khóa.
 */
export async function run({ argv, env, fetchFn, io, now = () => new Date(), clock, log = () => {}, defaultApprovedDir = null }) {
  const args = parseArgs(argv)
  if (args.errors.length > 0) return { mode: 'error', error: args.errors.join('; ') }
  if (args.approve && args.run) return { mode: 'error', error: '--approve và --run không dùng cùng lúc (duyệt và tìm ảnh là hai bước riêng)' }
  if (!args.approvedDir) args.approvedDir = defaultApprovedDir
  try {
    return await runChecked({ args, env, fetchFn, io, now, clock, log })
  } catch (error) {
    return { mode: 'error', error: redact(error?.message ?? error, [env?.[KEY_ENV] || '']).slice(0, 300) }
  }
}

async function runChecked({ args, env, fetchFn, io, now, clock, log }) {
  // Thư mục chứa ảnh chờ duyệt PHẢI là .img-out (đã bị .gitignore), không nằm ở nơi Vite đóng gói hay không bị ignore.
  // Chuẩn hóa TRƯỚC khi so (`.img-out/../src` thành `src` và bị từ chối); dùng đường dẫn đã chuẩn hóa cho mọi thao tác sau đó.
  const outDir = path.posix.normalize(args.outDir.replace(/\\/g, '/'))
  if (!/^\.img-out(\/|$)/.test(outDir)) return { mode: 'error', error: '--out phải là .img-out (hoặc thư mục con của nó)' }
  args.outDir = outDir.replace(/\/$/, '')
  // Sổ cái chỉ được là tệp .json riêng của script (không ghi đè được tệp nguồn nào qua --ledger).
  const ledgerPath = path.posix.normalize(args.ledger.replace(/\\/g, '/'))
  if (!/^(\.img-ledger[A-Za-z0-9_.-]*\.json|\.img-out\/[A-Za-z0-9_./-]+\.json)$/.test(ledgerPath)) return { mode: 'error', error: '--ledger phải là .img-ledger*.json hoặc một tệp .json trong .img-out' }
  args.ledger = ledgerPath
  io.assertPath?.(args.outDir, 'out')
  io.assertPath?.(args.ledger, 'ledger')
  if (args.approvedDir) io.assertPath?.(args.approvedDir, 'approved')
  const apiKey = env?.[KEY_ENV] || ''
  const say = (line) => log(redact(line, [apiKey]))
  const manifestPath = `${args.outDir}/manifest.json`

  // ---- duyệt tay: sao ảnh đã chờ duyệt sang thư mục «đã duyệt» (không cần khóa, không gọi mạng) ----
  if (args.approve) {
    if (!args.reviewer || args.reviewer.trim().length === 0) return { mode: 'error', error: 'duyệt cần --reviewer=<tên người xem ảnh>' }
    if (!args.approvedDir) return { mode: 'error', error: 'thiếu thư mục đã duyệt (--approved-dir=)' }
    const manifest = (await io.readJson(manifestPath)) ?? { items: [] }
    const item = (manifest.items ?? []).find((it) => it.key === args.approve)
    if (!item) return { mode: 'error', error: `không có ảnh «${clip(args.approve, 40)}» trong bản kê` }
    if (item.status !== 'pending-review') return { mode: 'error', error: `ảnh «${args.approve}» có trạng thái ${item.status}, chỉ duyệt được ảnh chờ duyệt` }
    if (typeof item.file !== 'string' || !/^[A-Za-z0-9_-]+\.(jpg|png|webp)$/.test(item.file)) return { mode: 'error', error: `tên tệp trong bản kê không hợp lệ: ${clip(item.file, 40)}` }
    // Ảnh được duyệt phải ĐÚNG ảnh đã tải (không bị thay sau khi tải).
    if (typeof item.sha256 !== 'string' || item.sha256.length === 0) return { mode: 'error', error: `bản kê thiếu sha256 của «${args.approve}»; tải lại ảnh này` }
    const actualHash = await io.hashFile?.(`${args.outDir}/pending/${item.file}`)
    if (actualHash !== item.sha256) return { mode: 'error', error: `ảnh «${args.approve}» trong thư mục chờ duyệt khác với ảnh đã tải (hash không khớp hoặc thiếu tệp); không duyệt` }
    // Gộp theo `key` vào approved.json ĐÃ CÓ (bản kê trong .img-out có thể đã bị xóa; không được làm mất dòng ghi nguồn của ảnh đã duyệt trước đó).
    // Đọc và kiểm TRƯỚC khi sao ảnh hay sửa bản kê, để lỗi không để lại trạng thái nửa vời.
    const approvedPath = `${args.approvedDir}/approved.json`
    const existing = (await io.readJson(approvedPath)) ?? { approved: [] }
    if (!existing || !Array.isArray(existing.approved)) return { mode: 'error', error: `${approvedPath} có dạng không hợp lệ; sửa hoặc xóa thủ công` }
    await io.mkdir(args.approvedDir)
    await io.copyFile(`${args.outDir}/pending/${item.file}`, `${args.approvedDir}/${item.file}`)
    item.status = 'approved'
    item.approval = { reviewer: args.reviewer.trim().slice(0, 80), at: now().toISOString() }
    await io.writeJson(manifestPath, manifest)
    const current = manifest.items.filter((it) => it.status === 'approved').map(({ key, id, query, file, sha256, photographer, photographerUrl, pexelsUrl, alt, approval }) => ({ key, id, query, file, sha256, photographer, photographerUrl, pexelsUrl, alt, approval }))
    const merged = new Map(existing.approved.map((entry) => [entry.key, entry]))
    for (const entry of current) merged.set(entry.key, entry)
    await io.writeJson(approvedPath, { approved: [...merged.values()] })
    say(`Đã duyệt ${item.file} (người xem: ${item.approval.reviewer}). Việc commit ảnh là của bạn; khi dùng, ghi nguồn «Photo by ${item.photographer} on Pexels».`)
    return { mode: 'approve', item }
  }

  // ---- lập kế hoạch ----
  const known = QUERIES.map((q) => q.id)
  for (const id of args.only) if (!known.includes(id)) return { mode: 'error', error: `không có từ khóa «${clip(id, 30)}» (có: ${known.join(', ')})` }
  // Không chọn --only: lấy các từ khóa ĐẦU TIÊN trong giới hạn trần mỗi lần (không tìm cả bộ ngoài ý muốn).
  const chosen = args.only.length > 0 ? QUERIES.filter((q) => args.only.includes(q.id)) : QUERIES.slice(0, Number.isInteger(args.runCap) && args.runCap > 0 ? args.runCap : QUERIES.length)
  const ledgerBefore = (await io.readJson(args.ledger)) ?? null
  const issue = ledgerProblem(ledgerBefore)
  if (issue) return { mode: 'error', error: `${issue} (${args.ledger}); sửa hoặc xóa tệp thủ công sau khi kiểm số lần đã tìm` }
  const used = usedThisMonth(ledgerBefore, now())
  const budget = checkBudget({ count: chosen.length, perQuery: args.perQuery, runCap: args.runCap, monthlyCap: args.monthlyCap, used })
  const plan = { searches: chosen.length, ids: chosen.map((q) => q.id), perQuery: args.perQuery, maxDownloads: chosen.length * args.perQuery, usedThisMonth: used, runCap: args.runCap, monthlyCap: args.monthlyCap }
  say(`Kế hoạch: ${chosen.length} lần tìm (${plan.ids.join(', ')}), tối đa ${args.perQuery} ảnh mỗi từ khóa; đã tìm tháng này ${used}; trần mỗi lần ${args.runCap}, trần tháng ${args.monthlyCap}.`)
  if (!budget.ok) return { mode: 'refused', plan, error: budget.reason }
  // Không tìm lại từ khóa đã có ảnh được duyệt (sẽ gây nhầm lẫn); muốn làm lại thì xóa ảnh đã duyệt và mục bản kê thủ công.
  // Kiểm ngay ở bước lập kế hoạch để dry-run cũng báo trước.
  const manifest = (await io.readJson(manifestPath)) ?? { items: [] }
  const alreadyApproved = chosen.filter((job) => (manifest.items ?? []).some((it) => it.id === job.id && it.status === 'approved')).map((job) => job.id)
  if (alreadyApproved.length > 0) return { mode: 'error', plan, error: `đã có ảnh được duyệt, không tìm lại: ${alreadyApproved.join(', ')}` }
  if (!args.run) {
    say('Chạy thử (dry-run): chưa gọi Pexels. Thêm --run để tìm và tải ảnh.')
    return { mode: 'dry-run', plan }
  }
  if (!apiKey) return { mode: 'error', plan, error: `thiếu ${KEY_ENV} (biến môi trường hoặc tệp .env.pexels.local)` }

  // ---- tìm và tải thật: ghi sổ cái TRƯỚC mỗi lần tìm, một lỗi là dừng, lưu vào thư mục chờ duyệt ----
  await io.mkdir(`${args.outDir}/pending`)
  let ledger = ledgerBefore
  let stopped = null
  let remaining = null
  let searchesDone = 0
  const results = []
  const saveManifest = async () => {
    try {
      await io.writeJson(manifestPath, manifest)
    } catch (error) {
      stopped = stopped ?? `không ghi được bản kê: ${redact(error?.message ?? error, [apiKey]).slice(0, 150)}`
    }
  }
  for (const job of chosen) {
    ledger = addToLedger(ledger, 1, now())
    try {
      await io.writeJson(args.ledger, ledger)
    } catch (error) {
      // Không ghi được sổ cái thì KHÔNG gọi mạng; vẫn trả kết quả các từ khóa đã xong trước đó.
      stopped = `không ghi được sổ cái nên dừng trước «${job.id}»: ${redact(error?.message ?? error, [apiKey]).slice(0, 150)}`
      break
    }
    let found
    try {
      found = await searchOne({ fetchFn, apiKey, query: job.query, perQuery: args.perQuery, clock })
      remaining = found.remaining ?? remaining
      searchesDone += 1
    } catch (error) {
      stopped = `dừng sau lỗi khi tìm «${job.id}»: ${redact(error.message, [apiKey])}`
      results.push({ id: job.id, status: 'error', error: redact(error.message, [apiKey]) })
      break
    }
    // Ứng viên chờ duyệt cũ của cùng từ khóa không còn hợp lệ khi tìm lại: xóa tệp và mục để không duyệt nhầm ảnh cũ.
    for (const old of (manifest.items ?? []).filter((it) => it.id === job.id && it.status !== 'approved')) {
      if (typeof old.file === 'string') {
        try {
          await io.removeFile?.(`${args.outDir}/pending/${old.file}`)
        } catch {
          /* bỏ qua */
        }
      }
    }
    manifest.items = (manifest.items ?? []).filter((it) => it.id !== job.id)
    if (found.photos.length === 0) {
      results.push({ id: job.id, status: 'no-results' })
      say(`không có ảnh hợp lệ cho «${job.query}»`)
      await saveManifest()
      if (stopped) break
      continue
    }
    for (const photo of found.photos) {
      const key = candidateKey(job.id, photo.photoId)
      const entry = { key, id: job.id, query: job.query, photoId: photo.photoId, pexelsUrl: photo.pexelsUrl, photographer: photo.photographer, photographerUrl: photo.photographerUrl, alt: photo.alt, at: now().toISOString() }
      try {
        const image = await downloadImage({ fetchFn, url: photo.src, clock })
        entry.file = `${key}.${image.ext}`
        await io.writeFile(`${args.outDir}/pending/${entry.file}`, image.bytes)
        Object.assign(entry, { bytes: image.bytes.length, latencyMs: Math.round(image.latencyMs), sha256: createHash('sha256').update(image.bytes).digest('hex'), status: 'pending-review' })
        say(`ok  ${entry.file}: ${entry.bytes} byte, ${entry.latencyMs} ms; ảnh của ${entry.photographer || '(không rõ)'}; CHỜ BẠN XEM`)
      } catch (error) {
        entry.status = 'error'
        entry.error = redact(error.message, [apiKey])
        stopped = `dừng sau lỗi ở ${key}: ${entry.error}`
      }
      manifest.items.push(entry)
      results.push(entry)
      if (stopped) break
    }
    await saveManifest()
    if (stopped) break
  }
  const downloaded = results.filter((r) => r.status === 'pending-review')
  const totals = { searches: searchesDone, pending: downloaded.length, errors: results.filter((r) => r.status === 'error').length, bytes: downloaded.reduce((sum, r) => sum + (r.bytes ?? 0), 0), usedThisMonthAfter: ledger ? ledger.searches : used, rateLimitRemaining: remaining }
  return { mode: 'run', plan, totals, results, error: stopped, outDir: args.outDir }
}
