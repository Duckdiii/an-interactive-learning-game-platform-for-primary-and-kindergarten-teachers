import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { SAMPLES } from './tts-core.mjs'
import {
  audioFileName,
  childEnv,
  scrubPaths,
  DEFAULT_MAX_JOBS,
  parseArgs,
  parseProtocol,
  planJobs,
  PROTOCOL_PREFIX,
  PYTHON_ENV,
  run,
} from './tts-vieneu-core.mjs'

// Vitest chạy từ thư mục frontend/ (cwd); `import.meta.url` trong môi trường jsdom không phải URL tệp.
const HELPER = path.resolve(process.cwd(), 'scripts/experiments/vieneu_synth.py')
const NOW = new Date('2026-10-19T08:00:00Z')
const line = (payload) => `${PROTOCOL_PREFIX}${JSON.stringify(payload)}`

/** `io` trong bộ nhớ: ghi lại đường dẫn đã kiểm và các tệp JSON đã ghi. */
function memoryIo() {
  const json = new Map()
  const asserted = []
  return {
    json,
    asserted,
    assertPath: (p, kind) => void asserted.push(`${kind}:${p}`),
    resolvePath: (p) => `/abs/${p}`,
    mkdir: async () => {},
    writeJson: async (p, value) => void json.set(p, value),
  }
}

/** `spawnFn` giả: ghi lại lời gọi, trả kết quả do `handler` quyết định. */
function fakeSpawn(handler) {
  const calls = []
  const fn = async (command, args, options) => {
    calls.push({ command, args, options })
    return handler({ command, args, options })
  }
  fn.calls = calls
  return fn
}

// Tệp việc do `io.writeJson` ghi vào bộ nhớ; handler giả đọc lại từ biến này như Python đọc jobs.json.
let lastJobs = []
const doneAll = () => ({
  code: 0,
  stderr: '',
  stdout: ['log của thư viện', ...lastJobs.map((j) => line({ event: 'done', id: j.id, file: j.file, bytes: 1000, seconds: 1.5, latencyMs: 400 }))].join('\n'),
})

function makeRun(argv, { spawn, io = memoryIo(), env = { [PYTHON_ENV]: 'python-gia' } } = {}) {
  const spawnFn = spawn ?? fakeSpawn(doneAll)
  const wrappedIo = {
    ...io,
    writeJson: async (p, value) => {
      if (p.endsWith('jobs.json')) lastJobs = value
      await io.writeJson(p, value)
    },
  }
  return { io, spawnFn, promise: run({ argv, env, spawnFn, io: wrappedIo, helper: HELPER, now: () => NOW, defaultManifest: 'docs/manifest.json', timeoutMs: 1000 }) }
}

describe('parseArgs', () => {
  it('giá trị mặc định: chỉ tiếng Việt, trần 20 câu, thư mục ra .tts-out/vieneu', () => {
    expect(parseArgs([])).toMatchObject({ run: false, listVoices: false, voices: [], lang: 'vi', maxJobs: DEFAULT_MAX_JOBS, outDir: '.tts-out/vieneu', errors: [] })
  })
  it('--voice và --only lặp được', () => {
    expect(parseArgs(['--voice=A', '--voice=B', '--only=vi-correct', '--only=vi-tryagain'])).toMatchObject({ voices: ['A', 'B'], only: ['vi-correct', 'vi-tryagain'] })
  })
  it('cờ boolean có giá trị, cờ lạ, --lang sai, --max-jobs không phải số đều là lỗi', () => {
    expect(parseArgs(['--run=false']).errors).toHaveLength(1)
    expect(parseArgs(['--list-voices=1']).errors).toHaveLength(1)
    expect(parseArgs(['--lạ']).errors).toHaveLength(1)
    expect(parseArgs(['--lang=fr']).errors).toHaveLength(1)
    expect(parseArgs(['--max-jobs=abc']).errors).toHaveLength(1)
    expect(parseArgs(['--max-jobs=-3']).errors).toHaveLength(1)
  })
})

describe('planJobs và audioFileName', () => {
  it('không chỉ định giọng: mỗi câu một việc với voice null', () => {
    const jobs = planJobs({ voices: [] })
    expect(jobs).toHaveLength(SAMPLES.length)
    expect(jobs.every((j) => j.voice === null)).toBe(true)
  })
  it('hai giọng: mỗi câu hai việc, tên tệp không trùng kể cả khi hai giọng rút gọn giống nhau', () => {
    const jobs = planJobs({ samples: SAMPLES.slice(0, 1), voices: ['Minh Quân', 'Minh Quận'] })
    expect(jobs).toHaveLength(2)
    expect(new Set(jobs.map((j) => j.file)).size).toBe(2)
  })
  it('tên tệp chỉ gồm ký tự an toàn và kết thúc .wav', () => {
    expect(audioFileName('vi/../x', 'Đức Trí', 0)).toMatch(/^[A-Za-z0-9._-]+\.wav$/)
    expect(audioFileName('a', null, 0)).toBe('a__0-default.wav')
    expect(audioFileName('a', 'Đức Trí', 1)).toBe('a__1-duc_Tri.wav')
  })
})

describe('parseProtocol', () => {
  it('chỉ đọc dòng có tiền tố, bỏ qua log của thư viện', () => {
    const events = parseProtocol(`log\n${line({ event: 'done', id: 'a' })}\nlog khác\r\n${line({ event: 'error', id: 'b' })}`)
    expect(events.map((e) => e.event)).toEqual(['done', 'error'])
  })
  it('đọc được sự kiện khi tiền tố nằm giữa dòng (thư viện in dở dòng trước đó)', () => {
    expect(parseProtocol(`tiến trình 40%\r${line({ event: 'done', id: 'a' })}`).map((e) => e.event)).toEqual(['done'])
  })
  it('dòng có tiền tố nhưng không phải JSON, hoặc không có trường event, bị bỏ qua (không làm hỏng cả lượt)', () => {
    const events = parseProtocol(`${PROTOCOL_PREFIX}{hỏng\n${PROTOCOL_PREFIX}123\n${PROTOCOL_PREFIX}{"khac":1}\n${line({ event: 'done', id: 'a' })}`)
    expect(events.map((e) => e.event)).toEqual(['done'])
  })
})

describe('childEnv', () => {
  it('chỉ giữ biến trong danh sách cho phép (không phân biệt hoa thường), ép UTF-8', () => {
    const env = childEnv({
      PATH: '/bin', Path: 'C:/x', SystemRoot: 'C:/Windows', HF_HOME: 'D:/hf', CUDA_VISIBLE_DEVICES: '0', LC_ALL: 'C',
      GOOGLE_TTS_API_KEY: 'x', OPENAI_IMAGES_API_KEY: 'y', HF_TOKEN: 'z', MY_PASSWORD: 'p', APP_SECRET: 's',
      DB_URL: 'chuoi-ket-noi-gia', HTTPS_PROXY: 'proxy-gia', SSH_AUTH_SOCK: 's', GH_ENTERPRISE_X: 'g', NPM_CONFIG__AUTH: 'a', AWS_PROFILE: 'p',
      PYTHONPATH: 'C:/ngoai', PYTHONSTARTUP: 'C:/s.py', PYTHONHOME: 'C:/h', VIENEU_PYTHON: 'py',
    })
    expect(Object.keys(env).sort()).toEqual(['CUDA_VISIBLE_DEVICES', 'HF_HOME', 'LC_ALL', 'PATH', 'Path', 'PYTHONIOENCODING', 'PYTHONUTF8', 'SystemRoot'].sort())
    expect(env).toMatchObject({ PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' })
  })
})

describe('scrubPaths', () => {
  it('thay thư mục người dùng bằng ~ (Windows và POSIX)', () => {
    expect(scrubPaths('File "C:\\Users\\nguoi-dung\\venv\\x.py", line 1')).toBe('File "~\\venv\\x.py", line 1')
    expect(scrubPaths('lỗi ở C:/Users/nguoi-dung/AppData/x và /home/nguoi-dung/.cache/y và /Users/nguoi-dung/z')).toBe('lỗi ở ~/AppData/x và ~/.cache/y và ~/z')
    expect(scrubPaths('không có đường dẫn')).toBe('không có đường dẫn')
  })
})

describe('run: chạy thử và từ chối', () => {
  it('dry-run không gọi Python, không ghi tệp', async () => {
    const { io, spawnFn, promise } = makeRun([])
    const result = await promise
    expect(result.mode).toBe('dry-run')
    expect(result.plan).toMatchObject({ jobs: 5, voices: ['(giọng mặc định)'] })
    expect(spawnFn.calls).toHaveLength(0)
    expect(io.json.size).toBe(0)
  })
  it('vượt trần số câu thì từ chối trước khi gọi Python', async () => {
    const { spawnFn, promise } = makeRun(['--run', '--lang=both', '--max-jobs=3'])
    const result = await promise
    expect(result.mode).toBe('refused')
    expect(spawnFn.calls).toHaveLength(0)
  })
  it('đúng bằng trần thì vẫn chạy được (chỉ vượt trần mới từ chối)', async () => {
    const { promise } = makeRun(['--max-jobs=5'])
    expect((await promise).mode).toBe('dry-run')
  })
  it('chạy thử không kiểm đường dẫn bản kê (chỉ --run mới ghi bản kê)', async () => {
    const { io, promise } = makeRun([])
    await promise
    expect(io.asserted).toEqual(['out:.tts-out/vieneu'])
  })
  it('--run kiểm cả thư mục ra (loại out) lẫn bản kê (loại manifest) ngay đầu lượt', async () => {
    const { io, promise } = makeRun(['--run'])
    await promise
    expect(io.asserted).toEqual(['out:.tts-out/vieneu', 'manifest:docs/manifest.json'])
  })
  it('--only chọn đúng câu được nêu, kể cả khác ngôn ngữ mặc định (--lang chỉ áp dụng khi không có --only)', async () => {
    const { promise } = makeRun(['--only=en-correct'])
    const result = await promise
    expect(result.plan.jobs).toBe(1)
  })
  it('tên giọng lạ, id câu không có, cờ sai đều là lỗi trước khi gọi Python', async () => {
    for (const argv of [['--voice=a"; rm -rf /'], ['--only=khong-co'], ['--run=1']]) {
      const { spawnFn, promise } = makeRun(argv)
      expect((await promise).mode).toBe('error')
      expect(spawnFn.calls).toHaveLength(0)
    }
  })
  it('kiểm đường dẫn ghi ngay đầu lượt (kể cả khi chỉ chạy thử)', async () => {
    const io = memoryIo()
    io.assertPath = () => {
      throw new Error('ngoài thư mục cho phép')
    }
    const { promise } = makeRun(['--out=../x'], { io })
    expect(await promise).toMatchObject({ mode: 'error', error: expect.stringContaining('ngoài thư mục') })
  })
})

describe('run: sinh thật', () => {
  it('gọi Python không qua shell, gửi tệp việc và thư mục ra tuyệt đối, ghi bản kê', async () => {
    const { io, spawnFn, promise } = makeRun(['--run', '--voice=Giọng A'], { env: { [PYTHON_ENV]: 'C:/venv/python.exe', GOOGLE_TTS_API_KEY: 'bi-mat' } })
    const result = await promise
    expect(result.mode).toBe('run')
    expect(result.error).toBeNull()
    expect(result.totals).toMatchObject({ jobs: 5, ok: 5, bytes: 5000, seconds: 7.5 })
    const call = spawnFn.calls[0]
    expect(call.command).toBe('C:/venv/python.exe')
    expect(call.args).toEqual([HELPER, '--jobs', '/abs/.tts-out/vieneu/jobs.json', '--out', '/abs/.tts-out/vieneu'])
    expect(call.options.env.GOOGLE_TTS_API_KEY).toBeUndefined()
    expect(io.json.get('docs/manifest.json')).toMatchObject({ provider: 'VieNeu-TTS (cục bộ)', totals: { ok: 5 }, stopped: null })
  })
  it('không đặt VIENEU_PYTHON thì từ chối, không đoán lệnh python, không gọi gì', async () => {
    for (const argv of [['--run'], ['--list-voices']]) {
      const { spawnFn, promise } = makeRun(argv, { env: {} })
      const result = await promise
      expect(result.mode).toBe('error')
      expect(result.error).toContain(PYTHON_ENV)
      expect(spawnFn.calls).toHaveLength(0)
    }
  })
  it('chạy thử không cần VIENEU_PYTHON', async () => {
    const { promise } = makeRun([], { env: {} })
    expect((await promise).mode).toBe('dry-run')
  })
  it('không chạy được Python: lượt --run vẫn ghi bản kê với lý do, lỗi giấu đường dẫn người dùng', async () => {
    const spawn = fakeSpawn(() => ({ spawnError: 'spawn C:\\Users\\nguoi-dung\\venv\\python.exe ENOENT', code: null, stdout: '', stderr: '' }))
    const { io, promise } = makeRun(['--run'], { spawn })
    const result = await promise
    expect(result.mode).toBe('run')
    expect(result.totals.ok).toBe(0)
    expect(result.error).toContain(PYTHON_ENV)
    expect(result.error).not.toContain('nguoi-dung')
    expect(io.json.get('docs/manifest.json').stopped).toContain('không chạy được Python')
  })
  it('quá thời gian: giữ các câu đã xong trước đó và ghi bản kê', async () => {
    const spawn = fakeSpawn(() => ({ timedOut: true, code: null, stderr: '', stdout: line({ event: 'done', id: lastJobs[0].id, file: lastJobs[0].file, bytes: 10, seconds: 1, latencyMs: 5 }) }))
    const { io, promise } = makeRun(['--run'], { spawn })
    const result = await promise
    expect(result.error).toMatch(/quá .* giây/)
    expect(result.totals.ok).toBe(1)
    expect(io.json.get('docs/manifest.json').stopped).toMatch(/quá .* giây/)
  })
  it('số trong sự kiện done không phải số hữu hạn thì tính là 0 (không nối chuỗi vào tổng)', async () => {
    const spawn = fakeSpawn(() => ({ code: 0, stderr: '', stdout: lastJobs.map((j) => line({ event: 'done', id: j.id, file: j.file, bytes: '1000', seconds: null, latencyMs: 'x' })).join('\n') }))
    const { promise } = makeRun(['--run'], { spawn })
    expect((await promise).totals).toMatchObject({ ok: 5, bytes: 0, seconds: 0 })
  })
  it('stderr trong lý do dừng giấu đường dẫn người dùng', async () => {
    const spawn = fakeSpawn(() => ({ code: 1, stdout: '', stderr: 'File "C:\\Users\\nguoi-dung\\x.py" lỗi' }))
    const { promise } = makeRun(['--run'], { spawn })
    const result = await promise
    expect(result.error).toContain('~')
    expect(result.error).not.toContain('nguoi-dung')
  })
  it('một câu lỗi: dừng, các câu sau ghi «không có phản hồi», bản kê vẫn ghi với stopped', async () => {
    const spawn = fakeSpawn(() => ({
      code: 2,
      stderr: '',
      stdout: [
        line({ event: 'done', id: lastJobs[0].id, file: lastJobs[0].file, bytes: 10, seconds: 1, latencyMs: 5 }),
        line({ event: 'error', id: lastJobs[1].id, file: lastJobs[1].file, error: 'không có giọng: X' }),
      ].join('\n'),
    }))
    const { io, promise } = makeRun(['--run', '--voice=X'], { spawn })
    const result = await promise
    expect(result.totals).toMatchObject({ jobs: 5, ok: 1 })
    expect(result.results[1]).toMatchObject({ ok: false, error: 'không có giọng: X' })
    expect(result.results[2]).toMatchObject({ ok: false, error: expect.stringContaining('không có phản hồi') })
    expect(result.error).toContain('1/5')
    expect(io.json.get('docs/manifest.json').stopped).toContain('1/5')
  })
  it('lỗi fatal của bộ sinh (không nạp được vieneu) được báo nguyên văn', async () => {
    const spawn = fakeSpawn(() => ({ code: 3, stderr: '', stdout: line({ event: 'fatal', error: 'không nạp được vieneu: No module' }) }))
    const { promise } = makeRun(['--run'], { spawn })
    expect((await promise).error).toContain('không nạp được vieneu')
  })
  it('lỗi của giọng này không được gán cho cùng câu ở giọng khác (ghép theo id và tên tệp)', async () => {
    const spawn = fakeSpawn(() => ({ code: 2, stderr: '', stdout: line({ event: 'error', id: lastJobs[0].id, file: lastJobs[0].file, error: 'hỏng giọng đầu' }) }))
    const { promise } = makeRun(['--run', '--only=vi-correct', '--voice=A', '--voice=B'], { spawn })
    const result = await promise
    expect(result.results[0]).toMatchObject({ ok: false, error: 'hỏng giọng đầu' })
    expect(result.results[1]).toMatchObject({ ok: false, error: expect.stringContaining('không có phản hồi') })
  })
  it('một câu «done» của tệp khác không được tính cho câu này (id và tên tệp phải khớp)', async () => {
    const spawn = fakeSpawn(() => ({ code: 0, stderr: '', stdout: line({ event: 'done', id: lastJobs[0].id, file: 'khac.wav', bytes: 1, seconds: 1, latencyMs: 1 }) }))
    const { promise } = makeRun(['--run'], { spawn })
    expect((await promise).totals.ok).toBe(0)
  })
})

describe('run: liệt kê giọng', () => {
  it('in từng giọng và không ghi gì', async () => {
    const spawn = fakeSpawn(() => ({ code: 0, stderr: '', stdout: line({ event: 'voices', voices: [{ label: 'Giọng A', id: 'a' }, { label: 'Giọng B', id: 'b' }] }) }))
    const logs = []
    const io = memoryIo()
    const result = await run({ argv: ['--list-voices'], env: { [PYTHON_ENV]: 'python-gia' }, spawnFn: spawn, io, helper: HELPER, log: (l) => logs.push(l) })
    expect(result.mode).toBe('list-voices')
    expect(logs).toEqual(['Giọng A (a)', 'Giọng B (b)'])
    expect(spawn.calls[0].args).toEqual([HELPER, '--list-voices'])
    expect(io.json.size).toBe(0)
  })
  it('sự kiện voices có voices không phải mảng thì báo lỗi, không ném TypeError', async () => {
    const spawn = fakeSpawn(() => ({ code: 0, stderr: '', stdout: line({ event: 'voices', voices: 'khong-phai-mang' }) }))
    const result = await run({ argv: ['--list-voices'], env: { [PYTHON_ENV]: 'python-gia' }, spawnFn: spawn, io: memoryIo(), helper: HELPER })
    expect(result).toMatchObject({ mode: 'error', error: expect.stringContaining('không lấy được danh sách giọng') })
  })
  it('không có sự kiện voices thì báo lỗi kèm mã thoát', async () => {
    const spawn = fakeSpawn(() => ({ code: 1, stderr: 'Traceback', stdout: '' }))
    const result = await run({ argv: ['--list-voices'], env: { [PYTHON_ENV]: 'python-gia' }, spawnFn: spawn, io: memoryIo(), helper: HELPER })
    expect(result.mode).toBe('error')
    expect(result.error).toContain('mã thoát 1')
  })
})

// Kiểm cả bộ sinh Python thật với một mô-đun `vieneu` GIẢ (không tải mô hình, không cần mạng). Bỏ qua nếu máy không có Python 3.
function findPython() {
  for (const candidate of ['py', 'python3', 'python']) {
    const probe = spawnSync(candidate, ['--version'], { encoding: 'utf8', windowsHide: true })
    if (probe.status === 0 && /Python 3/.test(`${probe.stdout}${probe.stderr}`)) return candidate
  }
  return null
}
const PYTHON = findPython()
const FAKE_VIENEU = `
import wave
class Vieneu:
    def list_preset_voices(self):
        return [("Giọng A", "a-id"), ("Giọng B", "b-id")]
    def infer(self, text, voice=None):
        if text == "Giỏi lắm!":
            raise RuntimeError("hỏng giả")
        return (text, voice)
    def save(self, audio, path):
        with wave.open(path, "wb") as handle:
            handle.setnchannels(1)
            handle.setsampwidth(2)
            handle.setframerate(48000)
            handle.writeframes(b"\\x00\\x00" * 24000)
`

describe.skipIf(!PYTHON)('bộ sinh Python thật với vieneu giả', () => {
  // `run` chỉ chuyển cho Python các biến trong danh sách cho phép (không có PYTHONPATH), nên chính tầng spawn của test thêm
  // PYTHONPATH trỏ tới thư mục chứa `vieneu` giả.
  let fakeLib = null
  const realSpawn = async (command, args, { env }) => {
    const out = spawnSync(command, args, { encoding: 'utf8', windowsHide: true, env: { ...env, ...(fakeLib ? { PYTHONPATH: fakeLib } : {}) } })
    return { code: out.status, stdout: out.stdout ?? '', stderr: out.stderr ?? '', timedOut: false, spawnError: out.error?.message }
  }
  const setup = () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'vieneu-test-'))
    const lib = path.join(dir, 'lib')
    mkdirSync(lib)
    writeFileSync(path.join(lib, 'vieneu.py'), FAKE_VIENEU, 'utf8')
    const outDir = path.join(dir, 'out')
    const io = {
      assertPath: () => {},
      resolvePath: (p) => (path.isAbsolute(p) ? p : path.join(dir, p)),
      mkdir: async (p) => mkdirSync(path.join(dir, p), { recursive: true }),
      writeJson: async (p, value) => {
        mkdirSync(path.dirname(path.join(dir, p)), { recursive: true })
        writeFileSync(path.join(dir, p), JSON.stringify(value), 'utf8')
      },
    }
    fakeLib = lib
    const env = { ...process.env, [PYTHON_ENV]: PYTHON }
    return { dir, outDir, io, env }
  }

  it('liệt kê giọng và sinh tệp .wav thật, đo được số giây', async () => {
    const { dir, io, env } = setup()
    try {
      const listed = await run({ argv: ['--list-voices'], env, spawnFn: realSpawn, io, helper: HELPER })
      expect(listed.voices.map((v) => v.label)).toEqual(['Giọng A', 'Giọng B'])
      const result = await run({ argv: ['--run', '--voice=Giọng A', '--only=vi-tryagain', '--only=vi-numberline', '--out=out'], env, spawnFn: realSpawn, io, helper: HELPER, now: () => NOW })
      expect(result.error).toBeNull()
      expect(result.totals).toMatchObject({ jobs: 2, ok: 2, seconds: 1 })
      const files = readdirSync(path.join(dir, 'out')).filter((f) => f.endsWith('.wav'))
      expect(files.sort()).toEqual(result.results.map((r) => r.file).sort())
      expect(readFileSync(path.join(dir, 'out', files[0])).subarray(0, 4).toString()).toBe('RIFF')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
  it('giọng không có thì Python báo lỗi và dừng, không tạo tệp', async () => {
    const { dir, io, env } = setup()
    try {
      const result = await run({ argv: ['--run', '--voice=Không có', '--only=vi-tryagain', '--out=out'], env, spawnFn: realSpawn, io, helper: HELPER, now: () => NOW })
      expect(result.totals.ok).toBe(0)
      expect(result.results[0].error).toContain('không có giọng')
      expect(readdirSync(path.join(dir, 'out')).filter((f) => f.endsWith('.wav'))).toEqual([])
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
  it('một câu lỗi giữa chừng: các câu trước còn, các câu sau không chạy', async () => {
    const { dir, io, env } = setup()
    try {
      const result = await run({ argv: ['--run', '--only=vi-tryagain', '--only=vi-correct', '--only=vi-numberline', '--out=out'], env, spawnFn: realSpawn, io, helper: HELPER, now: () => NOW })
      const byId = Object.fromEntries(result.results.map((r) => [r.id, r]))
      expect(byId['vi-numberline'].ok).toBe(true)
      expect(byId['vi-correct']).toMatchObject({ ok: false, error: expect.stringContaining('hỏng giả') })
      expect(byId['vi-tryagain']).toMatchObject({ ok: false, error: expect.stringContaining('không có phản hồi') })
      expect(result.error).toContain('1/3')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
  it('tên tệp có thư mục hoặc sai đuôi bị bộ sinh Python từ chối, không ghi ra ngoài thư mục ra', () => {
    const { dir, env } = setup()
    try {
      for (const file of ['../thoat.wav', 'sub/x.wav', 'x.mp3']) {
        const jobsPath = path.join(dir, 'jobs.json')
        writeFileSync(jobsPath, JSON.stringify([{ id: 'a', text: 'x', voice: null, file }]), 'utf8')
        mkdirSync(path.join(dir, 'out2'), { recursive: true })
        const out = spawnSync(PYTHON, [HELPER, '--jobs', jobsPath, '--out', path.join(dir, 'out2')], { encoding: 'utf8', windowsHide: true, env: { ...env, PYTHONPATH: fakeLib } })
        expect(out.status).toBe(2)
        expect(out.stdout).toContain('tên tệp không hợp lệ')
      }
      expect(readdirSync(dir).filter((f) => f.endsWith('.wav'))).toEqual([])
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
  it('tệp cùng thư mục với script không được thay thư viện chuẩn (thư mục script bị bỏ khỏi sys.path)', () => {
    const { dir, env } = setup()
    try {
      const scriptDir = path.join(dir, 'script')
      mkdirSync(scriptDir)
      writeFileSync(path.join(scriptDir, 'vieneu_synth.py'), readFileSync(HELPER, 'utf8'), 'utf8')
      writeFileSync(path.join(scriptDir, 'argparse.py'), 'raise RuntimeError("ARGPARSE-BI-THAY")\n', 'utf8')
      const out = spawnSync(PYTHON, [path.join(scriptDir, 'vieneu_synth.py'), '--list-voices'], { encoding: 'utf8', windowsHide: true, env: { ...env, PYTHONPATH: fakeLib } })
      expect(`${out.stdout}${out.stderr}`).not.toContain('ARGPARSE-BI-THAY')
      expect(out.stdout).toContain('Giọng A')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
  it('xuống dòng trước tiền tố: log dở dòng của thư viện không dính vào dòng giao thức', () => {
    const { dir, env } = setup()
    try {
      writeFileSync(path.join(fakeLib, 'vieneu.py'), 'import sys\nclass Vieneu:\n    def __init__(self):\n        sys.stdout.write("tiến trình 50%")\n    def list_preset_voices(self):\n        return [("A", "a")]\n', 'utf8')
      const out = spawnSync(PYTHON, [HELPER, '--list-voices'], { encoding: 'utf8', windowsHide: true, env: { ...env, PYTHONPATH: fakeLib } })
      expect(out.stdout.split(/\r?\n/).some((l) => l.startsWith(PROTOCOL_PREFIX))).toBe(true)
      expect(out.stdout).not.toContain('50%@@VIENEU@@')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
  it('thiếu --jobs/--out thì báo lỗi ngay, không nạp mô hình', () => {
    const { dir, env } = setup()
    try {
      const marker = path.join(dir, 'da-nap.txt')
      writeFileSync(path.join(fakeLib, 'vieneu.py'), `open(${JSON.stringify(marker)}, "w").write("x")\nclass Vieneu: pass\n`, 'utf8')
      const out = spawnSync(PYTHON, [HELPER], { encoding: 'utf8', windowsHide: true, env: { ...env, PYTHONPATH: fakeLib } })
      expect(out.status).toBe(2)
      expect(out.stdout).toContain('thiếu --jobs hoặc --out')
      expect(existsSync(marker)).toBe(false)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
  it('không có mô-đun vieneu: báo fatal, không treo', async () => {
    const { dir, io, env } = setup()
    try {
      fakeLib = path.join(dir, 'trong')
      mkdirSync(fakeLib)
      const result = await run({ argv: ['--run', '--only=vi-tryagain', '--out=out'], env, spawnFn: realSpawn, io, helper: HELPER, now: () => NOW })
      expect(result.error).toContain('không nạp được vieneu')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
