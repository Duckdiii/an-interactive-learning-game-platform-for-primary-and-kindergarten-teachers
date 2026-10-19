/**
 * T8.1: lõi của script sinh giọng đọc bằng Google Cloud Text-to-Speech (chạy cục bộ bằng Node, KHÔNG dùng trong trình duyệt).
 *
 * Nguyên tắc (xem docs/experiments/results/t8-1-tts/README.md):
 * - Khóa API chỉ đọc từ biến môi trường `GOOGLE_TTS_API_KEY`, gửi bằng header `X-Goog-Api-Key` (không đưa vào URL), không in ra,
 *   không ghi vào tệp nào; mọi thông báo lỗi đều bị lọc khóa.
 * - Mặc định CHỈ LẬP KẾ HOẠCH (dry-run); chỉ gọi dịch vụ tính phí khi có cờ `--run` và có khóa.
 * - Trần chi phí đo bằng SỐ KÝ TỰ gửi đi: trần mỗi lần chạy và trần cộng dồn theo tháng (sổ cái cục bộ). Số ký tự được GHI VÀO
 *   SỔ CÁI TRƯỚC khi gọi (kể cả khi gọi lỗi vẫn tính), và chạm trần là dừng, không gọi nữa.
 * - KHÔNG có vòng thử lại tự động: một lần gọi lỗi thì dừng cả lượt chạy (tránh tốn phí do lặp).
 * - Giọng cao cấp (Studio, Chirp, Journey, Polyglot...) bị từ chối: chỉ dùng Standard, WaveNet, Neural2.
 * Hàm ở đây nhận `fetchFn`, `io`, `now`... qua tham số để test bằng bản giả, không gọi mạng thật.
 */

import path from 'node:path'

export const GOOGLE_BASE = 'https://texttospeech.googleapis.com/v1'
export const KEY_ENV = 'GOOGLE_TTS_API_KEY'
/** Trần ký tự mỗi lần chạy và mỗi tháng (cộng dồn). Đặt rất thấp để hạn chế chi phí, nhưng script KHÔNG biết hạn mức miễn phí thật của dự án Google của bạn: bạn phải tự kiểm trong Google Cloud Console. */
export const DEFAULT_RUN_CAP = 3000
export const DEFAULT_MONTHLY_CAP = 30000
export const REQUEST_TIMEOUT_MS = 20000
export const ENCODING = 'MP3'
/** Họ giọng tính phí cao hoặc khác hạn mức miễn phí: từ chối. */
export const PREMIUM_PATTERN = /studio|chirp|journey|polyglot|casual|news|hd/i
/** Thứ tự ưu tiên khi chọn giọng (rẻ trước). */
export const VOICE_TYPE_ORDER = ['Standard', 'Wavenet', 'Neural2']

export const LANGUAGES = { vi: 'vi-VN', en: 'en-US' }

/** Bộ câu mẫu nhỏ cho ba loại game mới và phản hồi. Chỉ văn bản thử, không có dữ liệu cá nhân. */
export const SAMPLES = [
  { id: 'vi-numberline', lang: 'vi', text: 'Đặt chú ong vào số bảy.' },
  { id: 'vi-syllable-hint', lang: 'vi', text: 'Ghép tiếng chỉ con vật kêu meo meo.' },
  { id: 'vi-syllable-answer', lang: 'vi', text: 'mèo' },
  { id: 'vi-correct', lang: 'vi', text: 'Giỏi lắm!' },
  { id: 'vi-tryagain', lang: 'vi', text: 'Thử lại nhé!' },
  { id: 'en-under', lang: 'en', text: 'Put the cat under the table.' },
  { id: 'en-in', lang: 'en', text: 'Put the ball in the box.' },
  { id: 'en-nextto', lang: 'en', text: 'Put the dog next to the box.' },
  { id: 'en-correct', lang: 'en', text: 'Great job!' },
  { id: 'en-tryagain', lang: 'en', text: 'Good try!' },
]

/** Số ký tự (điểm mã Unicode, tính cả khoảng trắng: ước tính thiên về dư so với cách tính của nhà cung cấp). */
export const countChars = (text) => [...text].length

export const monthKey = (date) => date.toISOString().slice(0, 7)

/** Số ký tự đã dùng trong THÁNG HIỆN TẠI theo sổ cái (sổ cái tháng khác thì coi là 0). */
export function usedThisMonth(ledger, now) {
  return ledger && ledger.month === monthKey(now) && Number.isFinite(ledger.chars) ? ledger.chars : 0
}

/** Sổ cái hợp lệ: null (chưa có) hoặc { month: chuỗi, chars: số hữu hạn >= 0 }. Hỏng thì KHÔNG coi là 0 (sẽ vô hiệu trần tháng). */
export function ledgerProblem(ledger) {
  if (ledger === null || ledger === undefined) return null
  if (typeof ledger !== 'object' || typeof ledger.month !== 'string' || !Number.isFinite(ledger.chars) || ledger.chars < 0) return 'sổ cái có dạng không hợp lệ'
  return null
}

/** Ghi thêm `chars` vào sổ cái (trả sổ cái MỚI; tháng khác thì bắt đầu lại). */
export function addToLedger(ledger, chars, now) {
  const base = usedThisMonth(ledger, now)
  return { month: monthKey(now), chars: base + chars }
}

export const isPremiumVoice = (name) => PREMIUM_PATTERN.test(name)

/** Danh sách TRẮNG: chỉ giọng thuộc loại đã biết (Standard, Wavenet, Neural2) và không khớp mẫu cao cấp. Loại lạ bị từ chối. */
export const isAllowedVoice = (name) => !isPremiumVoice(name) && VOICE_TYPE_ORDER.includes(voiceType(name))

/** Loại giọng (Standard/Wavenet/Neural2...) lấy từ tên dạng `vi-VN-Wavenet-A`; null nếu không nhận ra. */
export function voiceType(name) {
  const part = String(name).split('-')[2]
  return part ?? null
}

/**
 * Chọn tối đa `wanted` giọng cho một ngôn ngữ từ phản hồi `voices.list`, bỏ giọng cao cấp, ưu tiên mỗi loại rẻ một giọng
 * (Standard, rồi WaveNet, rồi Neural2) để so được chất lượng.
 */
export function chooseVoices(voices, languageCode, wanted = 2) {
  const eligible = (Array.isArray(voices) ? voices : [])
    .filter((v) => typeof v?.name === 'string' && v.name.startsWith(`${languageCode}-`) && isAllowedVoice(v.name))
    .sort((a, b) => a.name.localeCompare(b.name))
  const picked = []
  for (const type of VOICE_TYPE_ORDER) {
    const found = eligible.find((v) => voiceType(v.name) === type && !picked.includes(v.name))
    if (found && picked.length < wanted) picked.push(found.name)
  }
  for (const v of eligible) if (picked.length < wanted && !picked.includes(v.name)) picked.push(v.name)
  return picked
}

/** Kiểm tên giọng người dùng chỉ định: đúng ngôn ngữ và không cao cấp. Trả null nếu hợp lệ, hoặc chuỗi lý do. */
export function voiceProblem(name, languageCode) {
  if (typeof name !== 'string' || !/^[a-z]{2,3}-[A-Z]{2}-[A-Za-z0-9]+(-[A-Za-z0-9]+)*$/.test(name)) return `tên giọng không hợp lệ: ${String(name).slice(0, 40)}`
  if (isPremiumVoice(name)) return `giọng cao cấp bị từ chối (chỉ Standard, WaveNet, Neural2): ${name}`
  if (!isAllowedVoice(name)) return `loại giọng không nằm trong danh sách được phép (chỉ Standard, WaveNet, Neural2): ${name}`
  if (!name.startsWith(`${languageCode}-`)) return `giọng ${name} không thuộc ngôn ngữ ${languageCode}`
  return null
}

/** Các việc cần làm: mỗi câu mẫu × mỗi giọng của ngôn ngữ đó. `voicesByLang` = { vi: [...], en: [...] }. */
export function planJobs({ samples = SAMPLES, voicesByLang }) {
  const jobs = []
  for (const sample of samples) {
    for (const voice of voicesByLang[sample.lang] ?? []) {
      jobs.push({ id: sample.id, lang: sample.lang, voice, text: sample.text, chars: countChars(sample.text) })
    }
  }
  return jobs
}

/** Kiểm trần trước khi gọi. Trả { ok, total, reason }. */
export function checkBudget({ jobs, runCap = DEFAULT_RUN_CAP, monthlyCap = DEFAULT_MONTHLY_CAP, used = 0 }) {
  const total = jobs.reduce((sum, job) => sum + job.chars, 0)
  if (!Number.isFinite(runCap) || runCap <= 0 || !Number.isFinite(monthlyCap) || monthlyCap <= 0) return { ok: false, total, reason: 'trần phải là số dương' }
  if (total > runCap) return { ok: false, total, reason: `kế hoạch cần ${total} ký tự, vượt trần mỗi lần chạy (${runCap})` }
  if (used + total > monthlyCap) return { ok: false, total, reason: `đã dùng ${used} ký tự trong tháng, cộng ${total} vượt trần tháng (${monthlyCap})` }
  return { ok: true, total, reason: null }
}

/** `target` có nằm trong `base` không (theo node:path; không theo liên kết tượng trưng). */
export function isInside(base, target) {
  const rel = path.relative(base, target)
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))
}

/** Đọc đúng biến GOOGLE_TTS_API_KEY từ nội dung tệp env (không nạp biến khác); null nếu không có hoặc rỗng. */
export function parseKeyFromEnvText(text) {
  for (const line of String(text).split(/\r?\n/)) {
    const match = /^\s*GOOGLE_TTS_API_KEY\s*=\s*(.*?)\s*$/.exec(line)
    if (match) return match[1].replace(/^(["'])(.*)\1$/, '$2') || null
  }
  return null
}

/** Lọc các khóa khỏi một chuỗi (dùng cho mọi thông báo lỗi/log). */
export function redact(text, secrets) {
  let out = String(text)
  for (const secret of secrets) if (secret) out = out.split(secret).join('[đã ẩn khóa]')
  return out
}

/** Yêu cầu HTTP tổng hợp giọng: khóa nằm ở header, không ở URL. */
export function buildSynthesizeRequest({ apiKey, voice, text }) {
  const languageCode = voice.split('-').slice(0, 2).join('-')
  return {
    url: `${GOOGLE_BASE}/text:synthesize`,
    init: {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': apiKey },
      body: JSON.stringify({ input: { text }, voice: { languageCode, name: voice }, audioConfig: { audioEncoding: ENCODING } }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    },
  }
}

/** Một lần gọi (KHÔNG thử lại). Trả { audio: Buffer, bytes, latencyMs }; lỗi thì ném Error đã lọc khóa. */
export async function synthesizeOne({ fetchFn, apiKey, voice, text, clock = () => performance.now() }) {
  const { url, init } = buildSynthesizeRequest({ apiKey, voice, text })
  const t0 = clock()
  let response
  try {
    response = await fetchFn(url, init)
  } catch (error) {
    throw new Error(`Google TTS: lỗi mạng hoặc quá hạn: ${redact(error?.message ?? error, [apiKey]).slice(0, 200)}`)
  }
  const latencyMs = clock() - t0
  if (!response.ok) {
    let detail = ''
    try {
      detail = redact(await response.text(), [apiKey]).slice(0, 200)
    } catch {
      /* bỏ qua */
    }
    throw new Error(`Google TTS trả ${response.status}${detail ? `: ${detail}` : ''}`)
  }
  const data = await response.json()
  if (typeof data?.audioContent !== 'string' || data.audioContent.length === 0) throw new Error('Google TTS: phản hồi không có audioContent')
  const audio = Buffer.from(data.audioContent, 'base64')
  return { audio, bytes: audio.length, latencyMs }
}

/** Liệt kê giọng của một ngôn ngữ (không tốn ký tự). Trả mảng `voices` của Google. */
export async function listVoices({ fetchFn, apiKey, languageCode }) {
  const response = await fetchFn(`${GOOGLE_BASE}/voices?languageCode=${encodeURIComponent(languageCode)}`, {
    headers: { 'X-Goog-Api-Key': apiKey },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  }).catch((error) => {
    throw new Error(`Google TTS: lỗi mạng khi liệt kê giọng: ${redact(error?.message ?? error, [apiKey]).slice(0, 200)}`)
  })
  if (!response.ok) throw new Error(`Google TTS trả ${response.status} khi liệt kê giọng`)
  const data = await response.json()
  return Array.isArray(data?.voices) ? data.voices : []
}

/** Tên tệp âm thanh: `<id>__<giọng>.mp3`, chỉ gồm ký tự an toàn. */
export const audioFileName = (job) => `${job.id}__${job.voice}.${ENCODING.toLowerCase()}`.replace(/[^A-Za-z0-9._-]/g, '_')

/** Đọc cờ dòng lệnh dạng `--khóa` hoặc `--khóa=giá trị`; `--voice` có thể lặp. */
export function parseArgs(argv) {
  const args = { run: false, listVoices: false, voices: [], lang: 'both', runCap: DEFAULT_RUN_CAP, monthlyCap: DEFAULT_MONTHLY_CAP, outDir: '.tts-out', ledger: '.tts-ledger.json', manifest: null, errors: [] }
  for (const raw of argv) {
    const [flag, value] = raw.includes('=') ? [raw.slice(0, raw.indexOf('=')), raw.slice(raw.indexOf('=') + 1)] : [raw, undefined]
    if ((flag === '--run' || flag === '--list-voices') && value !== undefined) args.errors.push(`cờ ${flag} không nhận giá trị (không viết ${flag}=...)`)
    else if (flag === '--run') args.run = true
    else if (flag === '--list-voices') args.listVoices = true
    else if (flag === '--voice' && value) args.voices.push(value)
    else if (flag === '--lang' && ['vi', 'en', 'both'].includes(value)) args.lang = value
    else if (flag === '--max-chars' && Number.isFinite(Number(value))) args.runCap = Number(value)
    else if (flag === '--monthly-cap' && Number.isFinite(Number(value))) args.monthlyCap = Number(value)
    else if (flag === '--out' && value) args.outDir = value
    else if (flag === '--ledger' && value) args.ledger = value
    else if (flag === '--manifest' && value) args.manifest = value
    else args.errors.push(`cờ không hợp lệ: ${redact(raw, []).slice(0, 60)}`)
  }
  return args
}

/**
 * Chạy một lượt. `io` gồm: readJson(path) -> object|null, writeJson(path, obj), writeFile(path, Buffer), mkdir(path).
 * Trả { mode, plan, totals, results, error }. Không bao giờ in/ghi khóa.
 */
export async function run({ argv, env, fetchFn, io, now = () => new Date(), clock, log = () => {}, defaultManifest = null }) {
  const args = parseArgs(argv)
  if (args.errors.length > 0) return { mode: 'error', error: args.errors.join('; ') }
  if (args.run && !args.manifest) args.manifest = defaultManifest
  try {
    return await runChecked({ args, env, fetchFn, io, now, clock, log })
  } catch (error) {
    return { mode: 'error', error: redact(error?.message ?? error, [env?.[KEY_ENV] || '']).slice(0, 300) }
  }
}

async function runChecked({ args, env, fetchFn, io, now, clock, log }) {
  // Kiểm mọi đường dẫn ghi NGAY ĐẦU (trước khi tốn ký tự): `assertPath` ném lỗi nếu nằm ngoài thư mục cho phép.
  for (const target of [args.outDir, args.ledger, args.manifest]) if (target) io.assertPath?.(target)
  const apiKey = env?.[KEY_ENV] || ''
  const secrets = [apiKey]
  const langs = args.lang === 'both' ? ['vi', 'en'] : [args.lang]
  const say = (line) => log(redact(line, secrets))

  // 1) Liệt kê giọng (không tốn ký tự).
  if (args.listVoices) {
    if (!apiKey) return { mode: 'error', error: `thiếu ${KEY_ENV}` }
    const listed = {}
    for (const lang of langs) listed[lang] = (await listVoices({ fetchFn, apiKey, languageCode: LANGUAGES[lang] })).map((v) => v.name).sort()
    for (const lang of langs) say(`${LANGUAGES[lang]}: ${listed[lang].join(', ') || '(không có)'}`)
    return { mode: 'list-voices', voices: listed }
  }

  // 2) Chọn giọng: do người dùng chỉ định, hoặc tự chọn từ danh sách (cần khóa), hoặc giữ chỗ khi chạy thử không khóa.
  const voicesByLang = {}
  const codes = langs.map((lang) => LANGUAGES[lang])
  for (const name of args.voices) {
    const problem = voiceProblem(name, name.split('-').slice(0, 2).join('-'))
    if (problem) return { mode: 'error', error: problem }
    if (!codes.some((code) => name.startsWith(`${code}-`))) return { mode: 'error', error: `giọng ${name} không thuộc ngôn ngữ đang chạy (${codes.join(', ')})` }
  }
  for (const lang of langs) {
    const code = LANGUAGES[lang]
    const named = args.voices.filter((name) => name.startsWith(`${code}-`))
    if (named.length > 0) voicesByLang[lang] = named
    else if (apiKey) voicesByLang[lang] = chooseVoices(await listVoices({ fetchFn, apiKey, languageCode: code }), code)
    else voicesByLang[lang] = [`${code}-(chưa chọn: cần khóa để liệt kê giọng)`, `${code}-(chưa chọn 2)`]
  }
  const jobs = planJobs({ samples: SAMPLES.filter((s) => langs.includes(s.lang)), voicesByLang })
  const ledgerBefore = (await io.readJson(args.ledger)) ?? null
  const ledgerIssue = ledgerProblem(ledgerBefore)
  if (ledgerIssue) return { mode: 'error', error: `${ledgerIssue} (${args.ledger}); sửa hoặc xóa tệp thủ công sau khi kiểm số ký tự đã dùng` }
  const used = usedThisMonth(ledgerBefore, now())
  const budget = checkBudget({ jobs, runCap: args.runCap, monthlyCap: args.monthlyCap, used })
  const plan = { jobs: jobs.length, chars: budget.total, usedThisMonth: used, runCap: args.runCap, monthlyCap: args.monthlyCap, voices: voicesByLang }
  say(`Kế hoạch: ${jobs.length} lần gọi, ${budget.total} ký tự (đã dùng tháng này ${used}; trần mỗi lần ${args.runCap}, trần tháng ${args.monthlyCap}).`)
  if (!budget.ok) return { mode: 'refused', plan, error: budget.reason }
  if (jobs.length === 0 || langs.some((lang) => (voicesByLang[lang] ?? []).length === 0)) return { mode: 'error', plan, error: 'không chọn được giọng nào cho một ngôn ngữ (danh sách giọng rỗng hoặc chỉ còn giọng cao cấp); dùng --voice=' }
  if (!args.run) {
    say('Chạy thử (dry-run): chưa tổng hợp gì, không tốn ký tự (có khóa thì chỉ liệt kê giọng, miễn phí). Thêm --run để tổng hợp thật.')
    return { mode: 'dry-run', plan }
  }
  if (!apiKey) return { mode: 'error', plan, error: `thiếu ${KEY_ENV} (đặt trong biến môi trường hoặc tệp .env.tts.local)` }
  if (jobs.some((job) => job.voice.includes('('))) return { mode: 'error', plan, error: 'chưa chọn được giọng' }

  // 3) Gọi thật, từng việc một; ghi sổ cái TRƯỚC mỗi lần gọi; một lỗi là dừng cả lượt.
  await io.mkdir(args.outDir)
  const results = []
  let ledger = ledgerBefore
  let stopped = null
  for (const job of jobs) {
    ledger = addToLedger(ledger, job.chars, now())
    await io.writeJson(args.ledger, ledger)
    if (ledger.chars > args.monthlyCap) {
      stopped = `chạm trần tháng (${args.monthlyCap}) trước ${job.id}`
      break
    }
    const file = audioFileName(job)
    try {
      const out = await synthesizeOne({ fetchFn, apiKey, voice: job.voice, text: job.text, clock })
      await io.writeFile(`${args.outDir}/${file}`, out.audio)
      results.push({ id: job.id, lang: job.lang, voice: job.voice, chars: job.chars, bytes: out.bytes, latencyMs: Math.round(out.latencyMs), file, ok: true })
      say(`ok  ${file}: ${out.bytes} byte, ${Math.round(out.latencyMs)} ms`)
    } catch (error) {
      results.push({ id: job.id, lang: job.lang, voice: job.voice, chars: job.chars, file, ok: false, error: redact(error.message, secrets) })
      stopped = `dừng sau lỗi ở ${job.id}: ${redact(error.message, secrets)}`
      break
    }
  }
  const totals = {
    calls: results.length,
    ok: results.filter((r) => r.ok).length,
    chars: results.reduce((sum, r) => sum + r.chars, 0),
    bytes: results.reduce((sum, r) => sum + (r.bytes ?? 0), 0),
    usedThisMonthAfter: ledger ? ledger.chars : used,
  }
  if (args.manifest) {
    await io.writeJson(args.manifest, { startedAt: now().toISOString(), provider: 'Google Cloud Text-to-Speech', encoding: ENCODING, plan, results, totals, stopped })
  }
  return { mode: 'run', plan, totals, results, error: stopped, outDir: args.outDir }
}
