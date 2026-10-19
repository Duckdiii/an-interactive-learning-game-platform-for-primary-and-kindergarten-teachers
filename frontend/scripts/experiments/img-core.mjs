/**
 * T8.2: lõi của script sinh ảnh minh họa bằng AI (OpenAI Images) kèm kiểm duyệt an toàn tự động (OpenAI Moderation) và duyệt TAY
 * trước khi dùng. Chạy cục bộ bằng Node, KHÔNG dùng trong trình duyệt.
 *
 * Nguyên tắc (xem docs/experiments/results/t8-2-images/README.md):
 * - Khóa chỉ từ biến môi trường `OPENAI_IMAGES_API_KEY` (hoặc tệp frontend/.env.image.local, bị .gitignore), gửi bằng header
 *   `Authorization: Bearer`, KHÔNG in, KHÔNG ghi, mọi thông báo lỗi bị lọc khóa. Cố ý khác tên với `OPENAI_API_KEY` của backend (kiểm duyệt).
 * - Ảnh trả phí và KHÔNG có hạn mức miễn phí nào được biết: mặc định chỉ lập kế hoạch (dry-run); chỉ gọi khi có `--run`.
 * - Trần theo SỐ ẢNH (mỗi lần chạy và theo tháng, sổ cái cục bộ ghi TRƯỚC khi gọi, gọi lỗi vẫn tính); không thử lại tự động; một lỗi là dừng.
 * - Lời nhắc (prompt) CỐ ĐỊNH trong mã (không nhận văn bản tự do từ dòng lệnh), đã viết cho trẻ nhỏ: hình vẽ phẳng, không chữ, không người.
 * - MỌI ảnh phải qua kiểm duyệt tự động (lỗi hoặc không rõ kết quả = từ chối, như backend) rồi mới lưu ở thư mục chờ duyệt; chỉ khi bạn
 *   chạy `--approve=<tệp> --reviewer=<tên>` ảnh mới được sao sang thư mục «đã duyệt». Script KHÔNG tự commit gì.
 * Hàm nhận `fetchFn`, `io`... qua tham số để test bằng bản giả, không gọi mạng thật.
 */
import { createHash } from 'node:crypto'
import { isInside, monthKey, redact, REQUEST_TIMEOUT_MS } from './tts-core.mjs'

export { isInside, redact }
export const IMG_KEY_ENV = 'OPENAI_IMAGES_API_KEY'
export const OPENAI_BASE = 'https://api.openai.com/v1'
export const DEFAULT_MODEL = 'gpt-image-1'
/** Danh sách TRẮNG mô hình ảnh (mô hình khác có thể đắt hơn hoặc trả URL thay vì b64_json); muốn thêm thì sửa mã sau khi tự kiểm. */
export const ALLOWED_MODELS = ['gpt-image-1']
export const IMAGE_SIZE = '1024x1024'
export const IMAGE_QUALITY = 'low'
export const MODERATION_MODEL = 'omni-moderation-latest'
export const DEFAULT_RUN_CAP = 3
export const DEFAULT_MONTHLY_CAP = 10
/** Ảnh sinh ra có thể lâu hơn TTS. */
export const IMAGE_TIMEOUT_MS = Math.max(REQUEST_TIMEOUT_MS, 90000)

const STYLE =
  'Flat cartoon illustration for young children, simple shapes, bright friendly colors, one centered subject on a plain light background, no text, no letters, no numbers, no logo, no people.'

/** Lời nhắc cố định, lấy từ các vật trong ba game mới (mèo, bóng, chó, hộp, bàn, ong). */
export const PROMPTS = [
  { id: 'cat', prompt: `A friendly smiling cat sitting. ${STYLE}` },
  { id: 'dog', prompt: `A friendly smiling dog sitting. ${STYLE}` },
  { id: 'ball', prompt: `A round colorful beach ball. ${STYLE}` },
  { id: 'box', prompt: `An open cardboard box, seen from the front. ${STYLE}` },
  { id: 'table', prompt: `A small wooden table with four legs, seen from the front. ${STYLE}` },
  { id: 'bee', prompt: `A cute friendly bee with small wings. ${STYLE}` },
]

// ---- sổ cái theo SỐ ẢNH ----
export function ledgerProblem(ledger) {
  if (ledger === null || ledger === undefined) return null
  if (typeof ledger !== 'object' || typeof ledger.month !== 'string' || !Number.isFinite(ledger.images) || ledger.images < 0) return 'sổ cái có dạng không hợp lệ'
  return null
}
export const usedThisMonth = (ledger, now) => (ledger && ledger.month === monthKey(now) && Number.isFinite(ledger.images) ? ledger.images : 0)
export const addToLedger = (ledger, images, now) => ({ month: monthKey(now), images: usedThisMonth(ledger, now) + images })

export function checkBudget({ count, runCap = DEFAULT_RUN_CAP, monthlyCap = DEFAULT_MONTHLY_CAP, used = 0 }) {
  if (![runCap, monthlyCap].every((n) => Number.isInteger(n) && n > 0)) return { ok: false, reason: 'trần phải là số nguyên dương' }
  if (count > runCap) return { ok: false, reason: `kế hoạch ${count} ảnh vượt trần mỗi lần chạy (${runCap}); dùng --only= hoặc nâng --max-images=` }
  if (used + count > monthlyCap) return { ok: false, reason: `đã sinh ${used} ảnh trong tháng, cộng ${count} vượt trần tháng (${monthlyCap})` }
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

const authHeaders = (apiKey) => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` })

/** Một lần sinh ảnh (KHÔNG thử lại). Trả { b64, bytes, latencyMs }; lỗi thì ném Error đã lọc khóa. */
export async function generateOne({ fetchFn, apiKey, model, prompt, clock = () => performance.now() }) {
  const t0 = clock()
  let response
  try {
    response = await fetchFn(`${OPENAI_BASE}/images/generations`, {
      method: 'POST',
      headers: authHeaders(apiKey),
      body: JSON.stringify({ model, prompt, size: IMAGE_SIZE, quality: IMAGE_QUALITY, n: 1 }),
      signal: AbortSignal.timeout(IMAGE_TIMEOUT_MS),
    })
  } catch (error) {
    throw new Error(`OpenAI Images: lỗi mạng hoặc quá hạn: ${redact(error?.message ?? error, [apiKey]).slice(0, 200)}`)
  }
  const latencyMs = clock() - t0
  if (!response.ok) {
    // Lỗi xác thực: CHỈ mã trạng thái (thân lỗi có thể nhắc lại khóa dạng che mà redact không bắt được).
    let detail = ''
    if (response.status !== 401 && response.status !== 403) {
      try {
        detail = redact(await response.text(), [apiKey]).slice(0, 200)
      } catch {
        /* bỏ qua */
      }
    }
    throw new Error(`OpenAI Images trả ${response.status}${detail ? `: ${detail}` : ''}`)
  }
  const data = await response.json()
  const b64 = data?.data?.[0]?.b64_json
  if (typeof b64 !== 'string' || b64.length === 0) throw new Error('OpenAI Images: phản hồi không có b64_json')
  return { b64, bytes: Buffer.from(b64, 'base64').length, latencyMs }
}

/**
 * Kiểm duyệt ảnh (kèm lời nhắc) bằng OpenAI Moderation. ĐÓNG-AN-TOÀN: lỗi mạng, HTTP lỗi hoặc phản hồi không đúng dạng
 * đều trả `{ safe: false, reason }` (không bao giờ coi là an toàn khi không chắc). Trả { safe, flagged, categories, reason }.
 */
export async function moderateImage({ fetchFn, apiKey, prompt, b64 }) {
  let response
  try {
    response = await fetchFn(`${OPENAI_BASE}/moderations`, {
      method: 'POST',
      headers: authHeaders(apiKey),
      body: JSON.stringify({
        model: MODERATION_MODEL,
        input: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: `data:image/png;base64,${b64}` } },
        ],
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  } catch (error) {
    return { safe: false, flagged: null, categories: [], reason: `kiểm duyệt lỗi mạng: ${redact(error?.message ?? error, [apiKey]).slice(0, 120)}` }
  }
  if (!response.ok) return { safe: false, flagged: null, categories: [], reason: `kiểm duyệt trả ${response.status}` }
  let data
  try {
    data = await response.json()
  } catch {
    return { safe: false, flagged: null, categories: [], reason: 'kiểm duyệt trả phản hồi không đọc được' }
  }
  const results = data?.results
  if (!Array.isArray(results) || results.length === 0 || results.some((r) => typeof r?.flagged !== 'boolean')) {
    return { safe: false, flagged: null, categories: [], reason: 'kiểm duyệt trả phản hồi sai dạng' }
  }
  const flaggedResults = results.filter((r) => r.flagged)
  const categories = [...new Set(flaggedResults.flatMap((r) => Object.entries(r.categories ?? {}).filter(([, v]) => v === true).map(([k]) => k)))].sort()
  return { safe: flaggedResults.length === 0, flagged: flaggedResults.length > 0, categories, reason: flaggedResults.length > 0 ? 'bị kiểm duyệt đánh dấu' : null }
}

export const imageFileName = (id) => `${id}.png`.replace(/[^A-Za-z0-9._-]/g, '_')

export function parseArgs(argv) {
  const args = { run: false, only: [], approve: null, reviewer: null, model: DEFAULT_MODEL, runCap: DEFAULT_RUN_CAP, monthlyCap: DEFAULT_MONTHLY_CAP, outDir: '.img-out', ledger: '.img-ledger.json', approvedDir: null, errors: [] }
  for (const raw of argv) {
    const [flag, value] = raw.includes('=') ? [raw.slice(0, raw.indexOf('=')), raw.slice(raw.indexOf('=') + 1)] : [raw, undefined]
    if (flag === '--run' && value !== undefined) args.errors.push('cờ --run không nhận giá trị (không viết --run=...)')
    else if (flag === '--run') args.run = true
    else if (flag === '--only' && value) args.only.push(value)
    else if (flag === '--approve' && value) args.approve = value
    else if (flag === '--reviewer' && value) args.reviewer = value
    else if (flag === '--model' && value && ALLOWED_MODELS.includes(value)) args.model = value
    else if (flag === '--max-images' && Number.isInteger(Number(value)) && value !== '') args.runCap = Number(value)
    else if (flag === '--monthly-cap' && Number.isInteger(Number(value)) && value !== '') args.monthlyCap = Number(value)
    else if (flag === '--out' && value) args.outDir = value
    else if (flag === '--ledger' && value) args.ledger = value
    else if (flag === '--approved-dir' && value) args.approvedDir = value
    else args.errors.push(`cờ không hợp lệ: ${raw.slice(0, 60)}`)
  }
  return args
}

/**
 * Chạy một lượt. `io`: readJson(path)->obj|null (ném lỗi nếu tệp hỏng), writeJson, writeFile(path, Buffer), copyFile(from, to), mkdir,
 * assertPath?(path). Trả { mode, ... }. Không bao giờ in/ghi khóa.
 */
export async function run({ argv, env, fetchFn, io, now = () => new Date(), clock, log = () => {}, defaultApprovedDir = null }) {
  const args = parseArgs(argv)
  if (args.errors.length > 0) return { mode: 'error', error: args.errors.join('; ') }
  if (args.approve && args.run) return { mode: 'error', error: '--approve và --run không dùng cùng lúc (duyệt và sinh ảnh là hai bước riêng)' }
  if (!args.approvedDir) args.approvedDir = defaultApprovedDir
  try {
    return await runChecked({ args, env, fetchFn, io, now, clock, log })
  } catch (error) {
    return { mode: 'error', error: redact(error?.message ?? error, [env?.[IMG_KEY_ENV] || '']).slice(0, 300) }
  }
}

async function runChecked({ args, env, fetchFn, io, now, clock, log }) {
  // Thư mục chứa ảnh chờ duyệt PHẢI là .img-out (đã bị .gitignore), không nằm ở nơi Vite đóng gói hay không bị ignore.
  if (!/^\.img-out(\/|$)/.test(args.outDir.replace(/\\/g, '/'))) return { mode: 'error', error: '--out phải là .img-out (hoặc thư mục con của nó)' }
  for (const target of [args.outDir, args.ledger, args.approvedDir]) if (target) io.assertPath?.(target)
  const apiKey = env?.[IMG_KEY_ENV] || ''
  const say = (line) => log(redact(line, [apiKey]))
  const manifestPath = `${args.outDir}/manifest.json`

  // ---- duyệt tay: sao ảnh đã chờ duyệt sang thư mục «đã duyệt» (không cần khóa, không gọi mạng) ----
  if (args.approve) {
    if (!args.reviewer || args.reviewer.trim().length === 0) return { mode: 'error', error: 'duyệt cần --reviewer=<tên người xem ảnh>' }
    if (!args.approvedDir) return { mode: 'error', error: 'thiếu thư mục đã duyệt (--approved-dir=)' }
    const manifest = (await io.readJson(manifestPath)) ?? { items: [] }
    const item = (manifest.items ?? []).find((it) => it.id === args.approve)
    if (!item) return { mode: 'error', error: `không có ảnh «${args.approve}» trong bản kê` }
    if (item.status !== 'pending-review') return { mode: 'error', error: `ảnh «${args.approve}» có trạng thái ${item.status}, chỉ duyệt được ảnh chờ duyệt (đã qua kiểm duyệt tự động)` }
    if (item.moderation?.safe !== true) return { mode: 'error', error: `ảnh «${args.approve}» chưa qua kiểm duyệt tự động` }
    if (typeof item.file !== 'string' || !/^[A-Za-z0-9_-]+\.png$/.test(item.file)) return { mode: 'error', error: `tên tệp trong bản kê không hợp lệ: ${String(item.file).slice(0, 40)}` }
    // Ảnh được duyệt phải ĐÚNG ảnh đã lưu lúc sinh (không bị thay sau khi kiểm duyệt hoặc sinh lại).
    if (typeof item.sha256 !== 'string' || item.sha256.length === 0) return { mode: 'error', error: `bản kê thiếu sha256 của «${args.approve}»; sinh lại ảnh này` }
    const actualHash = await io.hashFile?.(`${args.outDir}/pending/${item.file}`)
    if (actualHash !== item.sha256) return { mode: 'error', error: `ảnh «${args.approve}» trong thư mục chờ duyệt khác với ảnh đã lưu lúc sinh (hash không khớp hoặc thiếu tệp); không duyệt` }
    await io.mkdir(args.approvedDir)
    await io.copyFile(`${args.outDir}/pending/${item.file}`, `${args.approvedDir}/${item.file}`)
    item.status = 'approved'
    item.approval = { reviewer: args.reviewer.trim().slice(0, 80), at: now().toISOString() }
    await io.writeJson(manifestPath, manifest)
    await io.writeJson(`${args.approvedDir}/approved.json`, { approved: manifest.items.filter((it) => it.status === 'approved').map(({ id, file, prompt, model, moderation, approval, sha256 }) => ({ id, file, prompt, model, moderation, approval, sha256 })) })
    say(`Đã duyệt ${item.file} (người xem: ${item.approval.reviewer}). Việc commit ảnh là của bạn.`)
    return { mode: 'approve', item }
  }

  // ---- lập kế hoạch ----
  const known = PROMPTS.map((p) => p.id)
  for (const id of args.only) if (!known.includes(id)) return { mode: 'error', error: `không có lời nhắc «${id.slice(0, 30)}» (có: ${known.join(', ')})` }
  // Không chọn --only: lấy các lời nhắc ĐẦU TIÊN trong giới hạn trần mỗi lần (không sinh cả bộ ngoài ý muốn).
  const chosen = args.only.length > 0 ? PROMPTS.filter((p) => args.only.includes(p.id)) : PROMPTS.slice(0, Number.isInteger(args.runCap) && args.runCap > 0 ? args.runCap : PROMPTS.length)
  const ledgerBefore = (await io.readJson(args.ledger)) ?? null
  const issue = ledgerProblem(ledgerBefore)
  if (issue) return { mode: 'error', error: `${issue} (${args.ledger}); sửa hoặc xóa tệp thủ công sau khi kiểm số ảnh đã sinh` }
  const used = usedThisMonth(ledgerBefore, now())
  const budget = checkBudget({ count: chosen.length, runCap: args.runCap, monthlyCap: args.monthlyCap, used })
  const plan = { images: chosen.length, ids: chosen.map((p) => p.id), model: args.model, usedThisMonth: used, runCap: args.runCap, monthlyCap: args.monthlyCap }
  say(`Kế hoạch: ${chosen.length} ảnh (${plan.ids.join(', ')}), mô hình ${args.model}, đã sinh tháng này ${used}; trần mỗi lần ${args.runCap}, trần tháng ${args.monthlyCap}. Ảnh TRẢ PHÍ.`)
  if (!budget.ok) return { mode: 'refused', plan, error: budget.reason }
  if (!args.run) {
    say('Chạy thử (dry-run): chưa sinh ảnh nào, không tốn phí. Thêm --run để sinh thật.')
    return { mode: 'dry-run', plan }
  }
  if (!apiKey) return { mode: 'error', plan, error: `thiếu ${IMG_KEY_ENV} (biến môi trường hoặc tệp .env.image.local)` }

  // ---- sinh thật: ghi sổ cái TRƯỚC, một lỗi là dừng, kiểm duyệt đóng-an-toàn, lưu vào thư mục chờ duyệt ----
  await io.mkdir(`${args.outDir}/pending`)
  const manifest = (await io.readJson(manifestPath)) ?? { items: [] }
  // Không sinh lại id đã duyệt (sẽ mất dấu duyệt và ghi đè ảnh chờ duyệt); muốn sinh lại thì xóa ảnh đã duyệt và mục bản kê thủ công.
  const alreadyApproved = chosen.filter((job) => (manifest.items ?? []).some((it) => it.id === job.id && it.status === 'approved')).map((job) => job.id)
  if (alreadyApproved.length > 0) return { mode: 'error', plan, error: `ảnh đã được duyệt, không sinh lại: ${alreadyApproved.join(', ')}` }
  let ledger = ledgerBefore
  let stopped = null
  const results = []
  for (const job of chosen) {
    ledger = addToLedger(ledger, 1, now())
    await io.writeJson(args.ledger, ledger)
    const entry = { id: job.id, file: imageFileName(job.id), prompt: job.prompt, model: args.model, at: now().toISOString() }
    try {
      const out = await generateOne({ fetchFn, apiKey, model: args.model, prompt: job.prompt, clock })
      const moderation = await moderateImage({ fetchFn, apiKey, prompt: job.prompt, b64: out.b64 })
      Object.assign(entry, { bytes: out.bytes, latencyMs: Math.round(out.latencyMs), moderation: { safe: moderation.safe, flagged: moderation.flagged, categories: moderation.categories, reason: moderation.reason } })
      if (moderation.safe) {
        const bytes = Buffer.from(out.b64, 'base64')
        await io.writeFile(`${args.outDir}/pending/${entry.file}`, bytes)
        entry.sha256 = createHash('sha256').update(bytes).digest('hex')
        entry.status = 'pending-review'
        say(`ok  ${entry.file}: ${out.bytes} byte, ${entry.latencyMs} ms; qua kiểm duyệt tự động, CHỜ BẠN XEM`)
      } else {
        entry.status = 'rejected'
        say(`TỪ CHỐI ${job.id}: ${moderation.reason}${moderation.categories.length ? ` (${moderation.categories.join(', ')})` : ''}; ảnh KHÔNG được lưu`)
      }
    } catch (error) {
      entry.status = 'error'
      entry.error = redact(error.message, [apiKey])
      stopped = `dừng sau lỗi ở ${job.id}: ${entry.error}`
    }
    // Ảnh chờ duyệt cũ của cùng id không còn hợp lệ nếu lần này không có ảnh mới qua kiểm duyệt: xóa để không duyệt nhầm ảnh cũ.
    if (entry.status !== 'pending-review') {
      try {
        await io.removeFile?.(`${args.outDir}/pending/${entry.file}`)
      } catch {
        /* bỏ qua */
      }
    }
    manifest.items = [...(manifest.items ?? []).filter((it) => it.id !== entry.id), entry]
    try {
      await io.writeJson(manifestPath, manifest)
    } catch (error) {
      stopped = stopped ?? `không ghi được bản kê sau khi đã sinh ảnh (đã tính phí): ${redact(error?.message ?? error, [apiKey]).slice(0, 150)}`
    }
    results.push(entry)
    if (stopped) break
  }
  const totals = { calls: results.length, pending: results.filter((r) => r.status === 'pending-review').length, rejected: results.filter((r) => r.status === 'rejected').length, bytes: results.reduce((sum, r) => sum + (r.bytes ?? 0), 0), usedThisMonthAfter: ledger ? ledger.images : used }
  return { mode: 'run', plan, totals, results, error: stopped, outDir: args.outDir }
}
