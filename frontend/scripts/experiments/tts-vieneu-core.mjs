/**
 * T8.3: lõi thuần của script sinh giọng đọc cục bộ bằng VieNeu-TTS (mô hình mã nguồn mở, chạy trên máy, không khóa, không tốn tiền).
 * Node chỉ lập kế hoạch và gọi bộ sinh Python (vieneu_synth.py) qua `spawnFn` được truyền vào, nên test không cần cài vieneu.
 */
import { SAMPLES, countChars } from './tts-core.mjs'

export const PROTOCOL_PREFIX = '@@VIENEU@@ '
export const DEFAULT_MAX_JOBS = 20
export const RUN_TIMEOUT_MS = 15 * 60 * 1000
export const PYTHON_ENV = 'VIENEU_PYTHON'
// Tên giọng chỉ đi vào tệp JSON gửi cho Python (không vào dòng lệnh); vẫn giới hạn ký tự cho gọn.
export const VOICE_PATTERN = /^[\p{L}\p{N} _.'-]{1,40}$/u
// Danh sách CHO PHÉP (không phải danh sách cấm): chỉ những biến Python/Windows/thư viện tải mô hình cần để chạy. Mọi biến khác
// (khóa API, chuỗi kết nối, proxy có mật khẩu, PYTHONPATH/PYTHONSTARTUP...) không được chuyển sang tiến trình con. So khớp không phân biệt hoa thường (Windows).
const ENV_ALLOWLIST = /^(path|pathext|systemroot|windir|comspec|temp|tmp|userprofile|appdata|localappdata|programdata|homedrive|homepath|home|virtual_env|lang|lc_[a-z]+|hf_home|hf_endpoint|hf_hub_cache|huggingface_hub_cache|torch_home|xdg_cache_home|number_of_processors|processor_architecture|os|cuda_[a-z_]+)$/i

/** Bản sao môi trường cho tiến trình Python theo danh sách cho phép, ép UTF-8. */
export function childEnv(env) {
  const out = {}
  for (const [name, value] of Object.entries(env ?? {})) if (ENV_ALLOWLIST.test(name) && value !== undefined) out[name] = value
  out.PYTHONIOENCODING = 'utf-8'
  out.PYTHONUTF8 = '1'
  return out
}

/** Thay đường dẫn thư mục người dùng trong thông báo bằng `~` (thông báo lỗi có thể được ghi vào bản kê và commit). */
export const scrubPaths = (text) => String(text).replace(/[A-Za-z]:[\\/]+Users[\\/]+[^\\/\s"']+/gi, '~').replace(/\/(?:home|Users)\/[^/\s"']+/g, '~')

const slug = (text) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '')

/** Tên tệp `<id>__<số thứ tự giọng>-<giọng>.wav`; số thứ tự giữ tên không trùng khi hai giọng cùng rút gọn ra một chuỗi. */
export const audioFileName = (id, voice, voiceIndex) => `${slug(id) || 'x'}__${voiceIndex}-${voice === null ? 'default' : slug(voice) || 'v'}.wav`

/** `--khóa` hoặc `--khóa=giá trị`; `--voice` và `--only` lặp được. */
export function parseArgs(argv) {
  const args = { run: false, listVoices: false, voices: [], only: [], lang: 'vi', maxJobs: DEFAULT_MAX_JOBS, outDir: '.tts-out/vieneu', manifest: null, errors: [] }
  for (const raw of argv) {
    const [flag, value] = raw.includes('=') ? [raw.slice(0, raw.indexOf('=')), raw.slice(raw.indexOf('=') + 1)] : [raw, undefined]
    if ((flag === '--run' || flag === '--list-voices') && value !== undefined) args.errors.push(`cờ ${flag} không nhận giá trị (không viết ${flag}=...)`)
    else if (flag === '--run') args.run = true
    else if (flag === '--list-voices') args.listVoices = true
    else if (flag === '--voice' && value) args.voices.push(value)
    else if (flag === '--only' && value) args.only.push(value)
    else if (flag === '--lang' && ['vi', 'en', 'both'].includes(value)) args.lang = value
    else if (flag === '--max-jobs' && /^\d+$/.test(value ?? '')) args.maxJobs = Number(value)
    else if (flag === '--out' && value) args.outDir = value
    else if (flag === '--manifest' && value) args.manifest = value
    else args.errors.push(`cờ không hợp lệ: ${raw.slice(0, 60)}`)
  }
  return args
}

/** Mỗi câu mẫu × mỗi giọng; không chỉ định giọng thì dùng giọng mặc định của thư viện (voice = null). */
export function planJobs({ samples = SAMPLES, voices }) {
  const list = voices.length > 0 ? voices : [null]
  const jobs = []
  for (const sample of samples) {
    list.forEach((voice, index) => {
      jobs.push({ id: sample.id, lang: sample.lang, voice, text: sample.text, chars: countChars(sample.text), file: audioFileName(sample.id, voice, index) })
    })
  }
  return jobs
}

/**
 * Đọc các sự kiện giao thức. Tiền tố có thể nằm giữa dòng (thư viện in dở dòng rồi bộ sinh nối tiếp); log khác bị bỏ qua.
 * Dòng có tiền tố mà không phải JSON hợp lệ bị bỏ qua: câu liên quan sẽ báo «không có phản hồi» thay vì làm hỏng cả lượt.
 */
export function parseProtocol(stdout) {
  const events = []
  for (const line of String(stdout).split(/\r?\n/)) {
    const at = line.indexOf(PROTOCOL_PREFIX)
    if (at < 0) continue
    try {
      const event = JSON.parse(line.slice(at + PROTOCOL_PREFIX.length))
      if (event && typeof event === 'object' && typeof event.event === 'string') events.push(event)
    } catch {
      // bỏ qua dòng hỏng
    }
  }
  return events
}

const clip = (text, n = 300) => scrubPaths(String(text ?? '').trim()).slice(0, n)
const finite = (value) => (Number.isFinite(value) ? value : 0)

/** Bắt buộc đặt VIENEU_PYTHON (không đoán lệnh `python` trần: trên Windows có thể là bản giả của Microsoft Store). */
function pythonFrom(env) {
  const python = env?.[PYTHON_ENV]
  if (!python) throw new Error(`chưa đặt biến ${PYTHON_ENV}: trỏ tới python.exe của môi trường đã cài vieneu (xem README)`)
  return python
}

/**
 * Gọi Python. Không ném lỗi khi Python không chạy được hoặc quá giờ: trả `failure` kèm các sự kiện đã nhận được,
 * để lượt `--run` vẫn ghi bản kê những câu đã xong.
 */
async function callPython({ spawnFn, python, helper, args, timeoutMs, env }) {
  const out = await spawnFn(python, [helper, ...args], { timeoutMs, env: childEnv(env) })
  let failure = null
  if (out.spawnError) failure = `không chạy được Python (${clip(python)}): ${clip(out.spawnError)}. Kiểm tra biến ${PYTHON_ENV}.`
  else if (out.timedOut) failure = `Python chạy quá ${Math.round(timeoutMs / 1000)} giây nên bị dừng`
  return { events: parseProtocol(out.stdout), code: out.code, stderr: clip(out.stderr, 600), failure }
}

/**
 * Chạy một lượt. `io`: assertPath(p), resolvePath(p) -> đường dẫn tuyệt đối, mkdir(p), writeJson(p, obj).
 * `spawnFn(command, args, { timeoutMs, env })` -> { code, stdout, stderr, timedOut, spawnError }.
 */
export async function run({ argv, env, spawnFn, io, helper, now = () => new Date(), log = () => {}, defaultManifest = null, timeoutMs = RUN_TIMEOUT_MS }) {
  const args = parseArgs(argv)
  if (args.errors.length > 0) return { mode: 'error', error: args.errors.join('; ') }
  if (args.run && !args.manifest) args.manifest = defaultManifest
  try {
    return await runChecked({ args, env, spawnFn, io, helper, now, log, timeoutMs })
  } catch (error) {
    return { mode: 'error', error: clip(error?.message ?? error) }
  }
}

async function runChecked({ args, env, spawnFn, io, helper, now, log, timeoutMs }) {
  if (args.outDir) io.assertPath?.(args.outDir, 'out')
  if (args.manifest) io.assertPath?.(args.manifest, 'manifest')

  if (args.listVoices) {
    const python = pythonFrom(env)
    const { events, code, stderr, failure } = await callPython({ spawnFn, python, helper, args: ['--list-voices'], timeoutMs, env })
    if (failure) throw new Error(failure)
    const fatal = events.find((e) => e.event === 'fatal')
    if (fatal) throw new Error(fatal.error)
    const listed = events.find((e) => e.event === 'voices' && Array.isArray(e.voices))
    if (!listed) throw new Error(`không lấy được danh sách giọng (mã thoát ${code}): ${stderr}`)
    for (const voice of listed.voices) log(`${clip(voice?.label, 60)} (${clip(voice?.id, 60)})`)
    return { mode: 'list-voices', voices: listed.voices }
  }

  for (const name of args.voices) if (!VOICE_PATTERN.test(name)) return { mode: 'error', error: `tên giọng không hợp lệ: ${name.slice(0, 40)}` }
  const langs = args.lang === 'both' ? ['vi', 'en'] : [args.lang]
  let samples = SAMPLES.filter((s) => langs.includes(s.lang))
  if (args.only.length > 0) {
    const unknown = args.only.filter((id) => !SAMPLES.some((s) => s.id === id))
    if (unknown.length > 0) return { mode: 'error', error: `id câu mẫu không có: ${unknown.join(', ').slice(0, 80)}` }
    samples = SAMPLES.filter((s) => args.only.includes(s.id))
  }
  const jobs = planJobs({ samples, voices: args.voices })
  const chars = jobs.reduce((sum, job) => sum + job.chars, 0)
  const plan = { jobs: jobs.length, chars, maxJobs: args.maxJobs, voices: args.voices.length > 0 ? args.voices : ['(giọng mặc định)'] }
  log(`Kế hoạch: ${jobs.length} câu, ${chars} ký tự, giọng: ${plan.voices.join(', ')} (chạy trên máy bạn, không tốn tiền).`)
  if (jobs.length === 0) return { mode: 'error', plan, error: 'không có câu nào để sinh' }
  if (jobs.length > args.maxJobs) return { mode: 'refused', plan, error: `kế hoạch có ${jobs.length} câu, vượt trần mỗi lần (${args.maxJobs}); dùng --only hoặc --max-jobs` }
  if (!args.run) {
    log('Chạy thử (dry-run): chưa sinh gì. Thêm --run để sinh thật (lần đầu thư viện tự tải mô hình, có thể lâu).')
    return { mode: 'dry-run', plan }
  }

  const python = pythonFrom(env)
  await io.mkdir(args.outDir)
  const jobsFile = `${args.outDir}/jobs.json`
  await io.writeJson(jobsFile, jobs.map(({ id, text, voice, file }) => ({ id, text, voice, file })))
  const startedAt = now().toISOString()
  const { events, code, stderr, failure } = await callPython({
    spawnFn, python, helper, args: ['--jobs', io.resolvePath(jobsFile), '--out', io.resolvePath(args.outDir)], timeoutMs, env,
  })
  const fatal = events.find((e) => e.event === 'fatal')
  const results = jobs.map((job) => {
    const done = events.find((e) => e.event === 'done' && e.id === job.id && e.file === job.file)
    if (done) return { id: job.id, lang: job.lang, voice: job.voice, chars: job.chars, file: job.file, ok: true, bytes: finite(done.bytes), seconds: finite(done.seconds), latencyMs: finite(done.latencyMs) }
    // Ghép theo cả id lẫn tên tệp: hai giọng cùng id câu không được nhận nhầm lỗi của nhau.
    const failed = events.find((e) => e.event === 'error' && e.id === job.id && e.file === job.file)
    return { id: job.id, lang: job.lang, voice: job.voice, chars: job.chars, file: job.file, ok: false, error: failed ? clip(failed.error) : 'không có phản hồi (lượt chạy dừng trước câu này)' }
  })
  const totals = {
    jobs: results.length,
    ok: results.filter((r) => r.ok).length,
    chars: results.filter((r) => r.ok).reduce((sum, r) => sum + r.chars, 0),
    bytes: results.reduce((sum, r) => sum + (r.bytes ?? 0), 0),
    seconds: Math.round(results.reduce((sum, r) => sum + (r.seconds ?? 0), 0) * 1000) / 1000,
  }
  let stopped = null
  if (failure) stopped = failure
  else if (fatal) stopped = clip(fatal.error)
  else if (totals.ok < totals.jobs) stopped = `chỉ ${totals.ok}/${totals.jobs} câu xong (mã thoát ${code})${stderr ? `: ${stderr}` : ''}`
  if (args.manifest) {
    await io.writeJson(args.manifest, { startedAt, provider: 'VieNeu-TTS (cục bộ)', plan, results, totals, stopped })
  }
  return { mode: 'run', plan, totals, results, error: stopped, outDir: args.outDir }
}
