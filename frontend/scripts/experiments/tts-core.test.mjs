import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  addToLedger,
  audioFileName,
  buildSynthesizeRequest,
  checkBudget,
  chooseVoices,
  countChars,
  DEFAULT_MONTHLY_CAP,
  DEFAULT_RUN_CAP,
  isAllowedVoice,
  isInside,
  isPremiumVoice,
  KEY_ENV,
  ledgerProblem,
  monthKey,
  parseArgs,
  parseKeyFromEnvText,
  planJobs,
  redact,
  run,
  SAMPLES,
  synthesizeOne,
  usedThisMonth,
  voiceProblem,
  voiceType,
} from './tts-core.mjs'

const KEY = 'AIza-FAKE-KEY-FOR-TESTS-0123456789'
const NOW = new Date('2026-10-19T08:00:00Z')

const VOICES_VI = ['vi-VN-Standard-A', 'vi-VN-Standard-B', 'vi-VN-Wavenet-A', 'vi-VN-Neural2-A', 'vi-VN-Studio-A', 'vi-VN-Chirp3-HD-X'].map((name) => ({ name }))
const VOICES_EN = ['en-US-Standard-A', 'en-US-Wavenet-B', 'en-US-Neural2-C', 'en-US-Journey-D', 'en-US-Polyglot-1', 'en-GB-Standard-A'].map((name) => ({ name }))
const b64 = (text) => Buffer.from(text).toString('base64')

/** Fetch giả: ghi lại lời gọi, trả theo `handler(url, init, index)`. */
function fakeFetch(handler) {
  const calls = []
  const fn = async (url, init = {}) => {
    calls.push({ url: String(url), init })
    return handler(String(url), init, calls.length - 1)
  }
  fn.calls = calls
  return fn
}
const ok = (body) => ({ ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) })
const fail = (status, text) => ({ ok: false, status, json: async () => ({}), text: async () => text })

/** Mặc định: voices.list trả danh sách mẫu, synthesize trả âm thanh giả. */
const happyFetch = () =>
  fakeFetch((url) => {
    if (url.includes('/voices?languageCode=vi-VN')) return ok({ voices: VOICES_VI })
    if (url.includes('/voices?languageCode=en-US')) return ok({ voices: VOICES_EN })
    return ok({ audioContent: b64('MP3-BYTES') })
  })

/** `io` trong bộ nhớ, ghi lại thứ tự thao tác để kiểm «ghi sổ cái trước khi gọi». */
function memoryIo(initial = {}) {
  const files = new Map()
  const json = new Map(Object.entries(initial))
  const events = []
  return {
    files,
    json,
    events,
    readJson: async (path) => json.get(path) ?? null,
    writeJson: async (path, value) => {
      events.push(`writeJson:${path}`)
      json.set(path, JSON.parse(JSON.stringify(value)))
    },
    writeFile: async (path, buffer) => {
      events.push(`writeFile:${path}`)
      files.set(path, buffer)
    },
    mkdir: async () => {},
  }
}

const exec = (argv, { env = { [KEY_ENV]: KEY }, fetchFn = happyFetch(), io = memoryIo() } = {}) => {
  const logs = []
  const promise = run({ argv, env, fetchFn, io, now: () => NOW, clock: (() => { let t = 0; return () => (t += 10) })(), log: (line) => logs.push(line) })
  return promise.then((result) => ({ result, logs, io, fetchFn }))
}

describe('đếm ký tự và sổ cái', () => {
  it('countChars đếm điểm mã Unicode (tiếng Việt dựng sẵn, biểu tượng ngoài BMP)', () => {
    expect(countChars('mèo')).toBe(3)
    expect(countChars('Giỏi lắm!')).toBe(9)
    expect(countChars('a😀b')).toBe(3)
    expect(countChars('')).toBe(0)
  })

  it('sổ cái: cộng dồn trong tháng, sang tháng khác thì bắt đầu lại, dữ liệu hỏng coi là 0', () => {
    const ledger = addToLedger(null, 100, NOW)
    expect(ledger).toEqual({ month: '2026-10', chars: 100 })
    expect(addToLedger(ledger, 50, NOW).chars).toBe(150)
    expect(usedThisMonth(ledger, new Date('2026-11-01T00:00:00Z'))).toBe(0)
    expect(addToLedger(ledger, 5, new Date('2026-11-01T00:00:00Z'))).toEqual({ month: '2026-11', chars: 5 })
    expect(usedThisMonth({ month: '2026-10', chars: 'x' }, NOW)).toBe(0)
    expect(usedThisMonth(undefined, NOW)).toBe(0)
    expect(monthKey(NOW)).toBe('2026-10')
  })
})

describe('chọn giọng', () => {
  it('loại bỏ giọng cao cấp và giọng ngôn ngữ khác; ưu tiên Standard rồi WaveNet', () => {
    expect(chooseVoices(VOICES_VI, 'vi-VN')).toEqual(['vi-VN-Standard-A', 'vi-VN-Wavenet-A'])
    expect(chooseVoices(VOICES_EN, 'en-US')).toEqual(['en-US-Standard-A', 'en-US-Wavenet-B'])
    expect(chooseVoices(VOICES_EN, 'en-US', 3)).toEqual(['en-US-Standard-A', 'en-US-Wavenet-B', 'en-US-Neural2-C'])
  })

  it('không đủ loại thì bù bằng giọng còn lại; danh sách rỗng hoặc hỏng thì rỗng', () => {
    expect(chooseVoices([{ name: 'vi-VN-Standard-A' }, { name: 'vi-VN-Standard-B' }], 'vi-VN')).toEqual(['vi-VN-Standard-A', 'vi-VN-Standard-B'])
    expect(chooseVoices([], 'vi-VN')).toEqual([])
    expect(chooseVoices(null, 'vi-VN')).toEqual([])
    expect(chooseVoices([{ nope: 1 }, null], 'vi-VN')).toEqual([])
  })

  it('chỉ còn giọng cao cấp (và giọng ngôn ngữ khác) thì KHÔNG bù bằng giọng cao cấp', () => {
    expect(chooseVoices([{ name: 'vi-VN-Studio-A' }, { name: 'vi-VN-Chirp3-HD-X' }, { name: 'vi-VN-Standard-A' }], 'vi-VN', 3)).toEqual(['vi-VN-Standard-A'])
    expect(chooseVoices([{ name: 'vi-VN-Studio-A' }], 'vi-VN')).toEqual([])
  })

  it('isPremiumVoice và voiceType', () => {
    for (const name of ['vi-VN-Studio-A', 'en-US-Chirp3-HD-Aoede', 'en-US-Journey-F', 'en-US-Polyglot-1', 'en-US-News-K', 'en-US-Casual-K']) expect(isPremiumVoice(name)).toBe(true)
    for (const name of ['vi-VN-Standard-A', 'vi-VN-Wavenet-B', 'en-US-Neural2-C']) expect(isPremiumVoice(name)).toBe(false)
    expect(voiceType('vi-VN-Wavenet-A')).toBe('Wavenet')
  })

  it('voiceProblem: tên sai dạng, giọng cao cấp, sai ngôn ngữ', () => {
    expect(voiceProblem('vi-VN-Standard-A', 'vi-VN')).toBeNull()
    expect(voiceProblem('vi-VN-Studio-A', 'vi-VN')).toMatch(/cao cấp/)
    expect(voiceProblem('en-US-Standard-A', 'vi-VN')).toMatch(/không thuộc/)
    expect(voiceProblem('rm -rf /', 'vi-VN')).toMatch(/không hợp lệ/)
    expect(voiceProblem(undefined, 'vi-VN')).toMatch(/không hợp lệ/)
  })
})

describe('kế hoạch và trần chi phí', () => {
  it('planJobs: mỗi câu × mỗi giọng của ngôn ngữ đó', () => {
    const jobs = planJobs({ voicesByLang: { vi: ['vi-VN-Standard-A', 'vi-VN-Wavenet-A'], en: ['en-US-Standard-A'] } })
    expect(jobs).toHaveLength(SAMPLES.filter((s) => s.lang === 'vi').length * 2 + SAMPLES.filter((s) => s.lang === 'en').length)
    expect(jobs.every((job) => job.chars === countChars(job.text))).toBe(true)
  })

  it('bộ câu mẫu mặc định rất nhỏ so với trần mặc định (cả hai ngôn ngữ, hai giọng mỗi ngôn ngữ)', () => {
    const jobs = planJobs({ voicesByLang: { vi: ['a', 'b'], en: ['c', 'd'] } })
    const total = jobs.reduce((sum, job) => sum + job.chars, 0)
    expect(total).toBeLessThan(DEFAULT_RUN_CAP / 4)
  })

  it('checkBudget: trong trần thì cho; vượt trần mỗi lần; vượt trần tháng; trần không hợp lệ', () => {
    const jobs = [{ chars: 100 }, { chars: 200 }]
    expect(checkBudget({ jobs, runCap: 300, monthlyCap: 1000, used: 0 })).toEqual({ ok: true, total: 300, reason: null })
    expect(checkBudget({ jobs, runCap: 299, monthlyCap: 1000, used: 0 }).ok).toBe(false)
    expect(checkBudget({ jobs, runCap: 300, monthlyCap: 1000, used: 701 }).reason).toMatch(/trần tháng/)
    expect(checkBudget({ jobs, runCap: 300, monthlyCap: 1000, used: 700 }).ok).toBe(true)
    expect(checkBudget({ jobs, runCap: 0, monthlyCap: 1000 }).ok).toBe(false)
    expect(checkBudget({ jobs, runCap: 300, monthlyCap: Number.NaN }).ok).toBe(false)
    expect(DEFAULT_MONTHLY_CAP).toBeGreaterThan(DEFAULT_RUN_CAP)
  })
})

describe('yêu cầu HTTP và khóa', () => {
  it('khóa nằm ở header, KHÔNG ở URL; thân yêu cầu đúng', () => {
    const { url, init } = buildSynthesizeRequest({ apiKey: KEY, voice: 'vi-VN-Standard-A', text: 'mèo' })
    expect(url).toBe('https://texttospeech.googleapis.com/v1/text:synthesize')
    expect(url).not.toContain(KEY)
    expect(init.headers['X-Goog-Api-Key']).toBe(KEY)
    expect(JSON.parse(init.body)).toEqual({ input: { text: 'mèo' }, voice: { languageCode: 'vi-VN', name: 'vi-VN-Standard-A' }, audioConfig: { audioEncoding: 'MP3' } })
    expect(init.method).toBe('POST')
    expect(init.signal).toBeDefined()
  })

  it('redact lọc mọi lần xuất hiện của khóa và bỏ qua khóa rỗng', () => {
    expect(redact(`a ${KEY} b ${KEY}`, [KEY])).toBe('a [đã ẩn khóa] b [đã ẩn khóa]')
    expect(redact('abc', [''])).toBe('abc')
    expect(redact('abc', [])).toBe('abc')
  })

  it('synthesizeOne: giải mã base64, đo độ trễ, gọi đúng MỘT lần', async () => {
    const fetchFn = happyFetch()
    const out = await synthesizeOne({ fetchFn, apiKey: KEY, voice: 'vi-VN-Standard-A', text: 'mèo', clock: (() => { let t = 100; return () => (t += 25) })() })
    expect(out.audio.toString()).toBe('MP3-BYTES')
    expect(out.bytes).toBe(9)
    expect(out.latencyMs).toBe(25)
    expect(fetchFn.calls).toHaveLength(1)
  })

  it('lỗi HTTP: ném lỗi KHÔNG chứa khóa dù máy chủ phản hồi lặp lại khóa; không thử lại', async () => {
    const fetchFn = fakeFetch(() => fail(403, `API key ${KEY} bị từ chối`))
    await expect(synthesizeOne({ fetchFn, apiKey: KEY, voice: 'vi-VN-Standard-A', text: 'x' })).rejects.toThrow(/403/)
    const error = await synthesizeOne({ fetchFn, apiKey: KEY, voice: 'vi-VN-Standard-A', text: 'x' }).catch((e) => e)
    expect(error.message).not.toContain(KEY)
    expect(fetchFn.calls).toHaveLength(2) // hai lần gọi hai hàm riêng; mỗi hàm gọi đúng một lần
  })

  it('lỗi mạng hoặc quá hạn: thông báo đã lọc khóa; phản hồi thiếu audioContent bị từ chối', async () => {
    const netFail = fakeFetch(() => {
      throw new Error(`socket ${KEY} reset`)
    })
    const error = await synthesizeOne({ fetchFn: netFail, apiKey: KEY, voice: 'vi-VN-Standard-A', text: 'x' }).catch((e) => e)
    expect(error.message).toMatch(/lỗi mạng/)
    expect(error.message).not.toContain(KEY)
    const empty = fakeFetch(() => ok({}))
    await expect(synthesizeOne({ fetchFn: empty, apiKey: KEY, voice: 'vi-VN-Standard-A', text: 'x' })).rejects.toThrow(/audioContent/)
  })

  it('audioFileName chỉ có ký tự an toàn', () => {
    expect(audioFileName({ id: 'vi-correct', voice: 'vi-VN-Wavenet-A' })).toBe('vi-correct__vi-VN-Wavenet-A.mp3')
    expect(audioFileName({ id: '../x', voice: 'a b' })).toBe('.._x__a_b.mp3')
  })
})

describe('parseArgs', () => {
  it('mặc định an toàn: không chạy thật; đọc cờ và giọng lặp', () => {
    const args = parseArgs(['--voice=vi-VN-Standard-A', '--voice=en-US-Standard-B', '--lang=vi', '--max-chars=500', '--monthly-cap=2000', '--run'])
    expect(args).toMatchObject({ run: true, lang: 'vi', runCap: 500, monthlyCap: 2000, voices: ['vi-VN-Standard-A', 'en-US-Standard-B'], errors: [] })
    expect(parseArgs([]).run).toBe(false)
  })

  it('cờ lạ hoặc giá trị hỏng được báo lỗi', () => {
    expect(parseArgs(['--xyz']).errors).toHaveLength(1)
    expect(parseArgs(['--lang=fr']).errors).toHaveLength(1)
    expect(parseArgs(['--max-chars=abc']).errors).toHaveLength(1)
  })
})

describe('run: chạy thử, từ chối, chạy thật', () => {
  it('mặc định là dry-run: không có khóa vẫn lập kế hoạch, KHÔNG gọi mạng, KHÔNG ghi gì', async () => {
    const { result, io, fetchFn } = await exec([], { env: {} })
    expect(result.mode).toBe('dry-run')
    expect(fetchFn.calls).toHaveLength(0)
    expect(io.events).toEqual([])
    expect(result.plan.jobs).toBeGreaterThan(0)
    expect(result.plan.chars).toBeGreaterThan(0)
  })

  it('dry-run có khóa: chỉ liệt kê giọng (không tốn ký tự), không synthesize, không ghi', async () => {
    const { result, io, fetchFn } = await exec([])
    expect(result.mode).toBe('dry-run')
    expect(fetchFn.calls.every((c) => c.url.includes('/voices?'))).toBe(true)
    expect(io.events).toEqual([])
    expect(result.plan.voices.vi).toEqual(['vi-VN-Standard-A', 'vi-VN-Wavenet-A'])
  })

  it('--run thiếu khóa: báo lỗi, không gọi mạng', async () => {
    const { result, fetchFn } = await exec(['--run', '--voice=vi-VN-Standard-A', '--voice=en-US-Standard-A'], { env: {} })
    expect(result.mode).toBe('error')
    expect(result.error).toMatch(KEY_ENV)
    expect(fetchFn.calls).toHaveLength(0)
  })

  it('từ chối giọng cao cấp và kế hoạch vượt trần: không gọi synthesize', async () => {
    const premium = await exec(['--run', '--voice=vi-VN-Studio-A'])
    expect(premium.result.mode).toBe('error')
    expect(premium.fetchFn.calls.filter((c) => c.url.includes('text:synthesize'))).toHaveLength(0)
    const over = await exec(['--run', '--max-chars=10'])
    expect(over.result.mode).toBe('refused')
    expect(over.fetchFn.calls.filter((c) => c.url.includes('text:synthesize'))).toHaveLength(0)
    expect(over.io.events).toEqual([])
  })

  it('đã gần chạm trần tháng: từ chối, không gọi synthesize', async () => {
    const io = memoryIo({ '.tts-ledger.json': { month: '2026-10', chars: DEFAULT_MONTHLY_CAP - 5 } })
    const { result, fetchFn } = await exec(['--run'], { io })
    expect(result.mode).toBe('refused')
    expect(result.error).toMatch(/trần tháng/)
    expect(fetchFn.calls.filter((c) => c.url.includes('text:synthesize'))).toHaveLength(0)
  })

  it('chạy thật thành công: mỗi việc đúng một lần gọi, tệp được ghi, sổ cái cộng đúng và được ghi TRƯỚC mỗi lần gọi', async () => {
    const { result, io, fetchFn } = await exec(['--run', '--manifest=m.json'])
    const synth = fetchFn.calls.filter((c) => c.url.includes('text:synthesize'))
    expect(result.mode).toBe('run')
    expect(result.error).toBeNull()
    expect(synth).toHaveLength(result.plan.jobs)
    expect(result.totals).toMatchObject({ calls: result.plan.jobs, ok: result.plan.jobs, chars: result.plan.chars })
    expect(io.files.size).toBe(result.plan.jobs)
    expect(io.json.get('.tts-ledger.json')).toEqual({ month: '2026-10', chars: result.plan.chars })
    // Trước mỗi lần ghi tệp âm thanh phải có một lần ghi sổ cái.
    const order = io.events
    for (let i = 0; i < order.length; i += 1) {
      if (order[i].startsWith('writeFile:')) expect(order[i - 1]).toBe('writeJson:.tts-ledger.json')
    }
    expect(io.json.has('m.json')).toBe(true)
  })

  it('một lần gọi lỗi là DỪNG cả lượt: không thử lại, không gọi tiếp; lần lỗi vẫn bị tính vào sổ cái', async () => {
    let n = 0
    const fetchFn = fakeFetch((url) => {
      if (url.includes('/voices?languageCode=vi-VN')) return ok({ voices: VOICES_VI })
      if (url.includes('/voices?languageCode=en-US')) return ok({ voices: VOICES_EN })
      n += 1
      return n === 2 ? fail(500, 'boom') : ok({ audioContent: b64('A') })
    })
    const { result, io } = await exec(['--run', '--manifest=m.json'], { fetchFn })
    const synth = fetchFn.calls.filter((c) => c.url.includes('text:synthesize'))
    expect(synth).toHaveLength(2)
    expect(result.results).toHaveLength(2)
    expect(result.results[1].ok).toBe(false)
    expect(result.error).toMatch(/dừng sau lỗi/)
    const charged = result.results.reduce((sum, r) => sum + r.chars, 0)
    expect(io.json.get('.tts-ledger.json').chars).toBe(charged)
    expect(io.files.size).toBe(1)
  })

  it('KHÔNG BAO GIỜ lộ khóa: không trong log, kết quả, tệp manifest, sổ cái hay URL', async () => {
    const fetchFn = fakeFetch((url) => {
      if (url.includes('/voices?')) return ok({ voices: url.includes('vi-VN') ? VOICES_VI : VOICES_EN })
      return fail(401, `khóa ${KEY} không hợp lệ`)
    })
    const { result, logs, io } = await exec(['--run', '--manifest=m.json'], { fetchFn })
    const everything = JSON.stringify({ result, logs, json: [...io.json.entries()], urls: fetchFn.calls.map((c) => c.url) })
    expect(everything).not.toContain(KEY)
    expect(everything).not.toContain('AIza')
  })

  it('--list-voices cần khóa và liệt kê tên giọng đã sắp xếp (không tốn ký tự)', async () => {
    const noKey = await exec(['--list-voices'], { env: {} })
    expect(noKey.result.mode).toBe('error')
    const { result, fetchFn } = await exec(['--list-voices', '--lang=vi'])
    expect(result.mode).toBe('list-voices')
    expect(result.voices.vi).toContain('vi-VN-Standard-A')
    expect(fetchFn.calls.every((c) => c.url.includes('/voices?'))).toBe(true)
  })

  it('log luôn lọc khóa, kể cả khi dịch vụ lỡ trả về tên giọng có chứa khóa (lớp phòng thủ thứ hai)', async () => {
    const fetchFn = fakeFetch(() => ok({ voices: [{ name: `vi-VN-Standard-${KEY}` }] }))
    const { logs } = await exec(['--list-voices', '--lang=vi'], { fetchFn })
    expect(logs.length).toBeGreaterThan(0)
    expect(logs.join(' | ')).not.toContain(KEY)
  })

  it('cờ lạ: báo lỗi, không làm gì', async () => {
    const { result, fetchFn, io } = await exec(['--khong-co'])
    expect(result.mode).toBe('error')
    expect(fetchFn.calls).toHaveLength(0)
    expect(io.events).toEqual([])
  })

  it('--lang=en chỉ lập kế hoạch cho tiếng Anh', async () => {
    const { result } = await exec(['--lang=en', '--voice=en-US-Standard-A'])
    expect(Object.keys(result.plan.voices)).toEqual(['en'])
    expect(result.plan.jobs).toBe(SAMPLES.filter((s) => s.lang === 'en').length)
  })
})

describe('vá lỗ hổng sau rà soát bảo mật', () => {
  it('danh sách trắng loại giọng: loại lạ (không chứa từ khóa cao cấp) bị từ chối, kể cả khi chỉ định tay hoặc bù', () => {
    expect(isAllowedVoice('vi-VN-Standard-A')).toBe(true)
    expect(isAllowedVoice('vi-VN-Wavenet-B')).toBe(true)
    expect(isAllowedVoice('vi-VN-Neural2-A')).toBe(true)
    expect(isAllowedVoice('vi-VN-Gemini-A')).toBe(false)
    expect(isAllowedVoice('vi-VN-Instant-A')).toBe(false)
    expect(voiceProblem('vi-VN-Gemini-A', 'vi-VN')).toMatch(/danh sách được phép/)
    expect(chooseVoices([{ name: 'vi-VN-Gemini-A' }, { name: 'vi-VN-Standard-A' }], 'vi-VN', 3)).toEqual(['vi-VN-Standard-A'])
  })

  it('cờ boolean có giá trị (--run=false, --run=0, --list-voices=x) là LỖI, không được tính phí', async () => {
    for (const flag of ['--run=false', '--run=0', '--list-voices=1']) {
      const { result, fetchFn } = await exec([flag])
      expect(result.mode).toBe('error')
      expect(result.error).toMatch(/không nhận giá trị/)
      expect(fetchFn.calls).toHaveLength(0)
    }
  })

  it('sổ cái HỎNG (không phải JSON hợp lệ, chars âm, thiếu tháng) thì TỪ CHỐI chạy, không coi là 0', async () => {
    for (const bad of [{ month: '2026-10', chars: -1000 }, { month: '2026-10', chars: 'x' }, { chars: 5 }, 'rác', 42]) {
      const io = memoryIo({ '.tts-ledger.json': bad })
      const { result, fetchFn } = await exec(['--run'], { io })
      expect(result.mode).toBe('error')
      expect(result.error).toMatch(/sổ cái/)
      expect(fetchFn.calls.filter((c) => c.url.includes('text:synthesize'))).toHaveLength(0)
      expect(io.events).toEqual([])
    }
  })

  it('đọc sổ cái ném lỗi (tệp hỏng ở tầng io): trả lỗi, không sập, không gọi synthesize', async () => {
    const io = memoryIo()
    io.readJson = async () => {
      throw new Error('Unexpected end of JSON input')
    }
    const { result, fetchFn } = await exec(['--run'], { io })
    expect(result.mode).toBe('error')
    expect(result.error).toMatch(/JSON/)
    expect(fetchFn.calls.filter((c) => c.url.includes('text:synthesize'))).toHaveLength(0)
  })

  it('--voice không thuộc ngôn ngữ đang chạy: báo lỗi thay vì bỏ qua im lặng', async () => {
    const a = await exec(['--lang=vi', '--voice=en-US-Standard-A'])
    expect(a.result.mode).toBe('error')
    expect(a.result.error).toMatch(/không thuộc ngôn ngữ/)
    const b = await exec(['--voice=fr-FR-Standard-A'])
    expect(b.result.mode).toBe('error')
  })

  it('danh sách giọng rỗng hoặc chỉ còn giọng cao cấp: --run báo lỗi, không ghi gì', async () => {
    const empty = fakeFetch((url) => (url.includes('/voices?') ? ok({ voices: [{ name: url.includes('vi-VN') ? 'vi-VN-Studio-A' : 'en-US-Journey-D' }] }) : ok({ audioContent: b64('A') })))
    const { result, io } = await exec(['--run'], { fetchFn: empty })
    expect(result.mode).toBe('error')
    expect(result.error).toMatch(/không chọn được giọng/)
    expect(io.events).toEqual([])
  })

  it('lỗi khi liệt kê giọng (403, mạng): trả lỗi đã lọc khóa, không ném ra ngoài', async () => {
    const f403 = fakeFetch(() => fail(403, `khóa ${KEY} bị từ chối`))
    const a = await exec(['--list-voices'], { fetchFn: f403 })
    expect(a.result.mode).toBe('error')
    expect(JSON.stringify(a.result)).not.toContain(KEY)
    const fNet = fakeFetch(() => {
      throw new Error(`reset ${KEY}`)
    })
    const b = await exec(['--list-voices'], { fetchFn: fNet })
    expect(b.result.mode).toBe('error')
    expect(JSON.stringify(b.result)).not.toContain(KEY)
  })

  it('liệt kê giọng gửi khóa bằng header (không ở URL)', async () => {
    const { fetchFn } = await exec(['--list-voices'])
    for (const call of fetchFn.calls) {
      expect(call.init.headers['X-Goog-Api-Key']).toBe(KEY)
      expect(call.url).not.toContain(KEY)
    }
  })

  it('manifest mặc định chỉ dùng khi --run; có --manifest tự chỉ định thì giữ nguyên; dry-run không ghi', async () => {
    const withRun = await exec(['--run'], { fetchFn: happyFetch() })
    expect(withRun.io.json.has('/m/default.json')).toBe(false) // chưa truyền defaultManifest
    const logs = []
    const io = memoryIo()
    const result = await run({ argv: ['--run'], env: { [KEY_ENV]: KEY }, fetchFn: happyFetch(), io, now: () => NOW, log: (l) => logs.push(l), defaultManifest: '/m/default.json' })
    expect(result.mode).toBe('run')
    expect(io.json.has('/m/default.json')).toBe(true)
    const io2 = memoryIo()
    await run({ argv: ['--run', '--manifest=mine.json'], env: { [KEY_ENV]: KEY }, fetchFn: happyFetch(), io: io2, now: () => NOW, log: () => {}, defaultManifest: '/m/default.json' })
    expect(io2.json.has('mine.json')).toBe(true)
    expect(io2.json.has('/m/default.json')).toBe(false)
    const io3 = memoryIo()
    await run({ argv: [], env: { [KEY_ENV]: KEY }, fetchFn: happyFetch(), io: io3, now: () => NOW, log: () => {}, defaultManifest: '/m/default.json' })
    expect(io3.events).toEqual([])
  })

  it('đường dẫn ghi bị kiểm NGAY ĐẦU (trước khi tốn ký tự): assertPath ném lỗi thì không gọi synthesize, không ghi sổ cái', async () => {
    const io = memoryIo()
    io.assertPath = (p) => {
      if (p.includes('..')) throw new Error(`đường dẫn nằm ngoài thư mục cho phép: ${p}`)
    }
    const { result, fetchFn } = await exec(['--run', '--manifest=../../x.json'], { io })
    expect(result.mode).toBe('error')
    expect(result.error).toMatch(/ngoài thư mục/)
    expect(fetchFn.calls.filter((c) => c.url.includes('text:synthesize'))).toHaveLength(0)
    expect(io.events).toEqual([])
  })

  it('isInside: trong, ngoài, thoát bằng ..', () => {
    const base = path.resolve('/tmp/base')
    expect(isInside(base, path.join(base, 'a', 'b.json'))).toBe(true)
    expect(isInside(base, base)).toBe(true)
    expect(isInside(base, path.resolve(base, '..', 'x'))).toBe(false)
    expect(isInside(base, path.resolve('/etc/passwd'))).toBe(false)
    expect(isInside(base, path.join(base, '..', 'base2', 'x'))).toBe(false)
  })

  it('parseKeyFromEnvText chỉ lấy đúng biến khóa, bỏ nháy và khoảng trắng, bỏ qua biến khác', () => {
    expect(parseKeyFromEnvText('GOOGLE_TTS_API_KEY=abc123')).toBe('abc123')
    expect(parseKeyFromEnvText('# ghi chú\nNODE_TLS_REJECT_UNAUTHORIZED=0\r\n  GOOGLE_TTS_API_KEY = "abc" \n')).toBe('abc')
    expect(parseKeyFromEnvText("GOOGLE_TTS_API_KEY='xyz'")).toBe('xyz')
    expect(parseKeyFromEnvText('GOOGLE_TTS_API_KEY=')).toBeNull()
    expect(parseKeyFromEnvText('OTHER=1')).toBeNull()
    expect(parseKeyFromEnvText('# GOOGLE_TTS_API_KEY=commented')).toBeNull()
  })

  it('ledgerProblem: null/undefined hợp lệ; dạng hỏng thì có lý do', () => {
    expect(ledgerProblem(null)).toBeNull()
    expect(ledgerProblem(undefined)).toBeNull()
    expect(ledgerProblem({ month: '2026-10', chars: 0 })).toBeNull()
    expect(ledgerProblem({ month: '2026-10', chars: -1 })).toMatch(/không hợp lệ/)
    expect(ledgerProblem({ chars: 1 })).toMatch(/không hợp lệ/)
    expect(ledgerProblem('x')).toMatch(/không hợp lệ/)
  })
})
