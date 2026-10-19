import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  addToLedger,
  checkBudget,
  DEFAULT_MONTHLY_CAP,
  DEFAULT_RUN_CAP,
  generateOne,
  IMG_KEY_ENV,
  imageFileName,
  isInside,
  ledgerProblem,
  moderateImage,
  parseArgs,
  parseEnvVar,
  PROMPTS,
  run,
  usedThisMonth,
} from './img-core.mjs'

const KEY = 'FAKE-IMG-KEY-FOR-TESTS-0123456789'
const NOW = new Date('2026-10-19T08:00:00Z')
const b64 = (text) => Buffer.from(text).toString('base64')

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
const isImages = (url) => url.includes('/images/generations')
const isMod = (url) => url.includes('/moderations')
const SAFE = { results: [{ flagged: false, categories: { violence: false } }] }
const FLAGGED = { results: [{ flagged: true, categories: { violence: true, sexual: false, harassment: true } }] }

/** Mặc định: sinh ảnh ra "PNG-<n>", kiểm duyệt an toàn. */
const happy = (moderation = SAFE) =>
  fakeFetch((url, _init, i) => (isImages(url) ? ok({ data: [{ b64_json: b64(`PNG-${i}`) }] }) : ok(moderation)))

function memoryIo(initial = {}) {
  const files = new Map()
  const hashes = new Map()
  const removed = []
  const copies = []
  const json = new Map(Object.entries(initial))
  const events = []
  return {
    files,
    hashes,
    removed,
    copies,
    json,
    events,
    readJson: async (p) => json.get(p) ?? null,
    writeJson: async (p, v) => {
      events.push(`writeJson:${p}`)
      json.set(p, JSON.parse(JSON.stringify(v)))
    },
    writeFile: async (p, buf) => {
      events.push(`writeFile:${p}`)
      files.set(p, buf)
    },
    hashFile: async (p) => hashes.get(p) ?? null,
    removeFile: async (p) => {
      events.push(`removeFile:${p}`)
      removed.push(p)
    },
    copyFile: async (from, to) => {
      events.push(`copyFile:${to}`)
      copies.push([from, to])
    },
    mkdir: async () => {},
  }
}

const exec = (argv, { env = { [IMG_KEY_ENV]: KEY }, fetchFn = happy(), io = memoryIo(), defaultApprovedDir = '/appr' } = {}) => {
  const logs = []
  return run({ argv, env, fetchFn, io, now: () => NOW, clock: (() => { let t = 0; return () => (t += 40) })(), log: (l) => logs.push(l), defaultApprovedDir }).then((result) => ({ result, logs, io, fetchFn }))
}
const imageCalls = (f) => f.calls.filter((c) => isImages(c.url))

describe('lời nhắc cố định và trần', () => {
  it('lời nhắc cố định, đều dặn không chữ, không người, nền sáng; id an toàn làm tên tệp', () => {
    expect(PROMPTS.length).toBeGreaterThan(0)
    for (const p of PROMPTS) {
      expect(p.prompt).toMatch(/no text/)
      expect(p.prompt).toMatch(/no people/)
      expect(imageFileName(p.id)).toBe(`${p.id}.png`)
    }
    expect(new Set(PROMPTS.map((p) => p.id)).size).toBe(PROMPTS.length)
  })

  it('checkBudget: biên trần mỗi lần và tháng, trần không hợp lệ', () => {
    expect(checkBudget({ count: 3, runCap: 3, monthlyCap: 10, used: 7 }).ok).toBe(true)
    expect(checkBudget({ count: 4, runCap: 3, monthlyCap: 10, used: 0 }).ok).toBe(false)
    expect(checkBudget({ count: 3, runCap: 3, monthlyCap: 10, used: 8 }).reason).toMatch(/trần tháng/)
    expect(checkBudget({ count: 1, runCap: 0, monthlyCap: 10 }).ok).toBe(false)
    expect(checkBudget({ count: 1, runCap: 1.5, monthlyCap: 10 }).ok).toBe(false)
    expect(DEFAULT_MONTHLY_CAP).toBeGreaterThan(DEFAULT_RUN_CAP)
  })

  it('sổ cái: cộng dồn, sang tháng khác bắt đầu lại, dạng hỏng có lý do', () => {
    const ledger = addToLedger(null, 2, NOW)
    expect(ledger).toEqual({ month: '2026-10', images: 2 })
    expect(addToLedger(ledger, 1, NOW).images).toBe(3)
    expect(usedThisMonth(ledger, new Date('2026-11-02T00:00:00Z'))).toBe(0)
    expect(ledgerProblem(null)).toBeNull()
    for (const bad of [{ month: '2026-10', images: -1 }, { month: '2026-10', images: 'x' }, { images: 1 }, 'x']) expect(ledgerProblem(bad)).toMatch(/không hợp lệ/)
  })

  it('parseArgs: mặc định an toàn, cờ boolean không nhận giá trị, cờ lạ và model sai tên bị lỗi', () => {
    expect(parseArgs([]).run).toBe(false)
    expect(parseArgs(['--run=false']).errors).toHaveLength(1)
    expect(parseArgs(['--xyz']).errors).toHaveLength(1)
    expect(parseArgs(['--model=a b']).errors).toHaveLength(1)
    expect(parseArgs(['--max-images=1.5']).errors).toHaveLength(1)
    expect(parseArgs(['--max-images=']).errors).toHaveLength(1)
    expect(parseArgs(['--run', '--only=cat', '--only=dog', '--max-images=2', '--model=gpt-image-1'])).toMatchObject({ run: true, only: ['cat', 'dog'], runCap: 2, model: 'gpt-image-1', errors: [] })
  })

  it('parseEnvVar chỉ lấy đúng biến, bỏ nháy, bỏ dòng chú thích', () => {
    expect(parseEnvVar('OPENAI_IMAGES_API_KEY=abc', 'OPENAI_IMAGES_API_KEY')).toBe('abc')
    expect(parseEnvVar('X=1\n  OPENAI_IMAGES_API_KEY = "q" \n', 'OPENAI_IMAGES_API_KEY')).toBe('q')
    expect(parseEnvVar('# OPENAI_IMAGES_API_KEY=c', 'OPENAI_IMAGES_API_KEY')).toBeNull()
    expect(parseEnvVar('OPENAI_API_KEY=backend-key', 'OPENAI_IMAGES_API_KEY')).toBeNull()
    expect(parseEnvVar('OPENAI_IMAGES_API_KEY=', 'OPENAI_IMAGES_API_KEY')).toBeNull()
  })

  it('isInside dùng chung với script TTS', () => {
    const base = path.resolve('/tmp/b')
    expect(isInside(base, path.join(base, 'x'))).toBe(true)
    expect(isInside(base, path.resolve(base, '..', 'x'))).toBe(false)
  })
})

describe('gọi API (fetch giả)', () => {
  it('generateOne: khóa ở header Authorization, không ở URL hay thân; giải mã b64; đo độ trễ; gọi MỘT lần', async () => {
    const fetchFn = happy()
    const out = await generateOne({ fetchFn, apiKey: KEY, model: 'gpt-image-1', prompt: 'p', clock: (() => { let t = 100; return () => (t += 30) })() })
    expect(fetchFn.calls).toHaveLength(1)
    const { url, init } = fetchFn.calls[0]
    expect(url).toBe('https://api.openai.com/v1/images/generations')
    expect(url).not.toContain(KEY)
    expect(init.headers.Authorization).toBe(`Bearer ${KEY}`)
    expect(init.body).not.toContain(KEY)
    expect(JSON.parse(init.body)).toMatchObject({ model: 'gpt-image-1', prompt: 'p', size: '1024x1024', quality: 'low', n: 1 })
    expect(out.latencyMs).toBe(30)
    expect(Buffer.from(out.b64, 'base64').toString()).toBe('PNG-0')
  })

  it('generateOne: lỗi HTTP/mạng/thiếu dữ liệu đều không lộ khóa và không thử lại', async () => {
    const f401 = fakeFetch(() => fail(401, `Incorrect API key provided: ${KEY}`))
    const e1 = await generateOne({ fetchFn: f401, apiKey: KEY, model: 'm', prompt: 'p' }).catch((e) => e)
    expect(e1.message).toMatch(/401/)
    expect(e1.message).not.toContain(KEY)
    expect(f401.calls).toHaveLength(1)
    const fNet = fakeFetch(() => {
      throw new Error(`reset ${KEY}`)
    })
    const e2 = await generateOne({ fetchFn: fNet, apiKey: KEY, model: 'm', prompt: 'p' }).catch((e) => e)
    expect(e2.message).toMatch(/lỗi mạng/)
    expect(e2.message).not.toContain(KEY)
    await expect(generateOne({ fetchFn: fakeFetch(() => ok({ data: [] })), apiKey: KEY, model: 'm', prompt: 'p' })).rejects.toThrow(/b64_json/)
  })

  it('moderateImage: an toàn khi không bị đánh dấu; bị đánh dấu thì liệt kê nhóm; gửi cả lời nhắc lẫn ảnh', async () => {
    const f = fakeFetch(() => ok(SAFE))
    const safe = await moderateImage({ fetchFn: f, apiKey: KEY, prompt: 'a cat', b64: b64('x') })
    expect(safe).toMatchObject({ safe: true, flagged: false })
    const body = JSON.parse(f.calls[0].init.body)
    expect(body.model).toBe('omni-moderation-latest')
    expect(body.input.map((i) => i.type)).toEqual(['text', 'image_url'])
    expect(body.input[1].image_url.url.startsWith('data:image/png;base64,')).toBe(true)
    const flagged = await moderateImage({ fetchFn: fakeFetch(() => ok(FLAGGED)), apiKey: KEY, prompt: 'p', b64: 'x' })
    expect(flagged).toMatchObject({ safe: false, flagged: true, categories: ['harassment', 'violence'] })
  })

  it('moderateImage ĐÓNG-AN-TOÀN: lỗi mạng, HTTP lỗi, JSON hỏng, phản hồi sai dạng đều là KHÔNG an toàn và không lộ khóa', async () => {
    const cases = [
      fakeFetch(() => {
        throw new Error(`down ${KEY}`)
      }),
      fakeFetch(() => fail(500, 'x')),
      fakeFetch(() => ({ ok: true, status: 200, json: async () => { throw new Error('bad json') } })),
      fakeFetch(() => ok({})),
      fakeFetch(() => ok({ results: [] })),
      fakeFetch(() => ok({ results: [{ flagged: 'no' }] })),
      fakeFetch(() => ok({ results: [{ flagged: false }, { categories: {} }] })),
    ]
    for (const fetchFn of cases) {
      const r = await moderateImage({ fetchFn, apiKey: KEY, prompt: 'p', b64: 'x' })
      expect(r.safe).toBe(false)
      expect(JSON.stringify(r)).not.toContain(KEY)
    }
  })
})

describe('run: chạy thử, từ chối, sinh ảnh, duyệt', () => {
  it('mặc định dry-run: không khóa vẫn lập kế hoạch, KHÔNG gọi mạng, KHÔNG ghi gì', async () => {
    const { result, io, fetchFn } = await exec([], { env: {} })
    expect(result.mode).toBe('dry-run')
    expect(fetchFn.calls).toHaveLength(0)
    expect(io.events).toEqual([])
    expect(result.plan.images).toBe(DEFAULT_RUN_CAP) // mặc định chỉ các lời nhắc đầu, trong giới hạn trần mỗi lần
    expect(result.plan.ids).toEqual(PROMPTS.slice(0, DEFAULT_RUN_CAP).map((p) => p.id))
  })

  it('chọn tay nhiều ảnh hơn trần mỗi lần thì TỪ CHỐI (không tự cắt); không chọn thì chỉ lấy các ảnh đầu trong trần', async () => {
    expect(PROMPTS.length).toBeGreaterThan(DEFAULT_RUN_CAP)
    const { result, fetchFn } = await exec(['--run', '--only=cat', '--only=dog', '--only=ball', '--only=box'])
    expect(result.mode).toBe('refused')
    expect(fetchFn.calls).toHaveLength(0)
    const defaults = await exec(['--run'])
    expect(defaults.result.mode).toBe('run')
    expect(imageCalls(defaults.fetchFn)).toHaveLength(DEFAULT_RUN_CAP)
    const ok2 = await exec(['--run', '--only=cat', '--only=dog'])
    expect(ok2.result.mode).toBe('run')
  })

  it('--run thiếu khóa, lời nhắc lạ, cờ boolean có giá trị, sổ cái hỏng: lỗi, không gọi mạng, không ghi', async () => {
    const noKey = await exec(['--run', '--only=cat'], { env: {} })
    expect(noKey.result.mode).toBe('error')
    expect(noKey.fetchFn.calls).toHaveLength(0)
    const unknown = await exec(['--run', '--only=khong-co'])
    expect(unknown.result.mode).toBe('error')
    const boolVal = await exec(['--run=0', '--only=cat'])
    expect(boolVal.result.mode).toBe('error')
    expect(boolVal.fetchFn.calls).toHaveLength(0)
    for (const bad of [{ month: '2026-10', images: -5 }, 'x']) {
      const io = memoryIo({ '.img-ledger.json': bad })
      const r = await exec(['--run', '--only=cat'], { io })
      expect(r.result.mode).toBe('error')
      expect(r.fetchFn.calls).toHaveLength(0)
      expect(io.events).toEqual([])
    }
  })

  it('sổ cái gần chạm trần tháng: từ chối trước khi gọi', async () => {
    const io = memoryIo({ '.img-ledger.json': { month: '2026-10', images: DEFAULT_MONTHLY_CAP - 1 } })
    const { result, fetchFn } = await exec(['--run', '--only=cat', '--only=dog'], { io })
    expect(result.mode).toBe('refused')
    expect(fetchFn.calls).toHaveLength(0)
  })

  it('sinh thành công: mỗi ảnh một lần sinh + một lần kiểm duyệt; lưu ở thư mục CHỜ DUYỆT; sổ cái ghi TRƯỚC mỗi lần gọi', async () => {
    const { result, io, fetchFn } = await exec(['--run', '--only=cat', '--only=dog'])
    expect(result.mode).toBe('run')
    expect(result.error).toBeNull()
    expect(imageCalls(fetchFn)).toHaveLength(2)
    expect(fetchFn.calls.filter((c) => isMod(c.url))).toHaveLength(2)
    expect([...io.files.keys()].sort()).toEqual(['.img-out/pending/cat.png', '.img-out/pending/dog.png'])
    expect(io.json.get('.img-ledger.json')).toEqual({ month: '2026-10', images: 2 })
    const manifest = io.json.get('.img-out/manifest.json')
    expect(manifest.items.map((it) => it.status)).toEqual(['pending-review', 'pending-review'])
    expect(manifest.items[0]).toMatchObject({ id: 'cat', model: 'gpt-image-1', moderation: { safe: true } })
    for (let i = 0; i < io.events.length; i += 1) {
      if (io.events[i].startsWith('writeFile:')) expect(io.events.slice(0, i)).toContain('writeJson:.img-ledger.json')
    }
    expect(io.events.indexOf('writeJson:.img-ledger.json')).toBeLessThan(io.events.indexOf('writeFile:.img-out/pending/cat.png'))
  })

  it('ảnh bị kiểm duyệt đánh dấu: KHÔNG được lưu, bản kê ghi «rejected» kèm nhóm; phiên vẫn tính vào sổ cái', async () => {
    const { result, io } = await exec(['--run', '--only=cat'], { fetchFn: happy(FLAGGED) })
    expect(io.files.size).toBe(0)
    expect(result.results[0].status).toBe('rejected')
    expect(result.results[0].moderation.categories).toEqual(['harassment', 'violence'])
    expect(io.json.get('.img-ledger.json').images).toBe(1)
  })

  it('kiểm duyệt LỖI: coi là không an toàn, không lưu ảnh', async () => {
    const f = fakeFetch((url) => (isImages(url) ? ok({ data: [{ b64_json: b64('X') }] }) : fail(503, 'down')))
    const { result, io } = await exec(['--run', '--only=cat'], { fetchFn: f })
    expect(result.results[0].status).toBe('rejected')
    expect(io.files.size).toBe(0)
  })

  it('một lần sinh lỗi là DỪNG cả lượt: không thử lại, không sinh tiếp; lần lỗi vẫn bị tính', async () => {
    let n = 0
    const f = fakeFetch((url) => {
      if (isMod(url)) return ok(SAFE)
      n += 1
      return n === 2 ? fail(500, 'boom') : ok({ data: [{ b64_json: b64('A') }] })
    })
    const { result, io } = await exec(['--run', '--only=cat', '--only=dog', '--only=ball'], { fetchFn: f })
    expect(imageCalls(f)).toHaveLength(2)
    expect(result.results.map((r) => r.status)).toEqual(['pending-review', 'error'])
    expect(result.error).toMatch(/dừng sau lỗi/)
    expect(io.json.get('.img-ledger.json').images).toBe(2)
  })

  it('KHÔNG BAO GIỜ lộ khóa: log, kết quả, bản kê, sổ cái, URL', async () => {
    const f = fakeFetch((url) => (isImages(url) ? fail(401, `bad key ${KEY}`) : ok(SAFE)))
    const { result, logs, io } = await exec(['--run', '--only=cat'], { fetchFn: f })
    const all = JSON.stringify({ result, logs, json: [...io.json.entries()], urls: f.calls.map((c) => c.url) })
    expect(all).not.toContain(KEY)
    expect(all).not.toContain("FAKE-IMG-KEY")
  })

  it('sổ cái được ghi TRƯỚC lời gọi API của TỪNG ảnh (kể cả ảnh thứ hai)', async () => {
    const io = memoryIo()
    const fetchFn = fakeFetch((url, _init, i) => {
      io.events.push(`fetch:${url}`)
      return isImages(url) ? ok({ data: [{ b64_json: b64(`PNG-${i}`) }] }) : ok(SAFE)
    })
    await exec(['--run', '--only=cat', '--only=dog'], { io, fetchFn })
    const images = io.events.map((e, i) => [e, i]).filter(([e]) => e.startsWith('fetch:') && e.includes('/images/generations')).map(([, i]) => i)
    const ledgers = io.events.map((e, i) => [e, i]).filter(([e]) => e === 'writeJson:.img-ledger.json').map(([, i]) => i)
    expect(images).toHaveLength(2)
    expect(ledgers.length).toBeGreaterThanOrEqual(2)
    expect(ledgers[0]).toBeLessThan(images[0])
    expect(ledgers[1]).toBeLessThan(images[1])
    expect(io.json.get('.img-ledger.json').images).toBe(2)
  })

  it('không sinh lại id ĐÃ DUYỆT: lỗi trước khi tốn phí, không ghi gì', async () => {
    const io = memoryIo({ '.img-out/manifest.json': { items: [{ id: 'cat', file: 'cat.png', status: 'approved' }] } })
    const { result, fetchFn } = await exec(['--run', '--only=cat'], { io })
    expect(result.mode).toBe('error')
    expect(result.error).toMatch(/đã được duyệt/)
    expect(fetchFn.calls).toHaveLength(0)
    expect(io.events).toEqual([])
  })

  it('sinh lại id đang chờ duyệt mà lần này bị từ chối: ảnh chờ duyệt CŨ bị xóa, bản kê ghi rejected', async () => {
    const io = memoryIo({ '.img-out/manifest.json': { items: [{ id: 'cat', file: 'cat.png', status: 'pending-review', sha256: 'old' }] } })
    const { result } = await exec(['--run', '--only=cat'], { io, fetchFn: happy(FLAGGED) })
    expect(result.results[0].status).toBe('rejected')
    expect(io.removed).toEqual(['.img-out/pending/cat.png'])
    expect(io.json.get('.img-out/manifest.json').items.map((it) => it.status)).toEqual(['rejected'])
  })

  it('ảnh lưu có sha256 của đúng byte đã ghi (dùng để kiểm lúc duyệt)', async () => {
    const { io } = await exec(['--run', '--only=cat'])
    const { createHash } = await import('node:crypto')
    const bytes = io.files.get('.img-out/pending/cat.png')
    expect(io.json.get('.img-out/manifest.json').items[0].sha256).toBe(createHash('sha256').update(bytes).digest('hex'))
  })

  it('ghi bản kê thất bại sau khi đã sinh ảnh: không sập, báo lỗi và dừng; sổ cái vẫn đã tính', async () => {
    const io = memoryIo()
    const original = io.writeJson
    io.writeJson = async (p, v) => {
      if (p.endsWith('manifest.json')) throw new Error('disk full')
      return original(p, v)
    }
    const { result } = await exec(['--run', '--only=cat', '--only=dog'], { io })
    expect(result.mode).toBe('run')
    expect(result.error).toMatch(/bản kê/)
    expect(result.results).toHaveLength(1)
    expect(io.json.get('.img-ledger.json').images).toBe(1)
  })

  it('--model chỉ nhận mô hình trong danh sách trắng; --out phải là .img-out', async () => {
    expect(parseArgs(['--model=dall-e-3']).errors).toHaveLength(1)
    expect(parseArgs(['--model=gpt-image-1']).errors).toEqual([])
    for (const out of ['src', 'public/x', '../x', '/tmp/x', '.img-outx']) {
      const { result, fetchFn, io } = await exec(['--run', '--only=cat', `--out=${out}`])
      expect(result.mode).toBe('error')
      expect(fetchFn.calls).toHaveLength(0)
      expect(io.events).toEqual([])
    }
    const sub = await exec(['--only=cat', '--out=.img-out/lan2'])
    expect(sub.result.mode).toBe('dry-run')
  })

  it('lỗi 401/403: thông báo chỉ có mã trạng thái, KHÔNG kèm thân lỗi (có thể nhắc lại khóa dạng che)', async () => {
    for (const status of [401, 403]) {
      const f = fakeFetch(() => fail(status, 'Incorrect API key provided: FAKE****6789'))
      const e = await generateOne({ fetchFn: f, apiKey: KEY, model: 'm', prompt: 'p' }).catch((x) => x)
      expect(e.message).toBe(`OpenAI Images trả ${status}`)
    }
    const e500 = await generateOne({ fetchFn: fakeFetch(() => fail(500, 'server busy')), apiKey: KEY, model: 'm', prompt: 'p' }).catch((x) => x)
    expect(e500.message).toMatch(/server busy/)
  })

  it('log luôn lọc khóa, kể cả khi dịch vụ lỡ trả tên nhóm kiểm duyệt có chứa khóa (lớp phòng thủ thứ hai)', async () => {
    const leaky = { results: [{ flagged: true, categories: { [`x-${KEY}`]: true } }] }
    const { logs } = await exec(['--run', '--only=cat'], { fetchFn: happy(leaky) })
    expect(logs.length).toBeGreaterThan(0)
    expect(logs.join(' | ')).not.toContain(KEY)
  })

  it('đường dẫn ghi kiểm ngay đầu: assertPath ném thì không gọi, không ghi', async () => {
    const io = memoryIo()
    io.assertPath = (p) => {
      if (p.includes('..')) throw new Error(`ngoài thư mục cho phép: ${p}`)
    }
    const { result, fetchFn } = await exec(['--run', '--only=cat', '--out=../../x'], { io })
    expect(result.mode).toBe('error')
    expect(fetchFn.calls).toHaveLength(0)
    expect(io.events).toEqual([])
  })

  describe('duyệt tay', () => {
    const pendingManifest = (overrides = {}) => ({
      items: [{ id: 'cat', file: 'cat.png', prompt: 'p', model: 'gpt-image-1', status: 'pending-review', moderation: { safe: true }, sha256: 'h1', ...overrides }],
    })
    const withHash = (io, file = '.img-out/pending/cat.png', hash = 'h1') => {
      io.hashes.set(file, hash)
      return io
    }

    it('duyệt cần --reviewer; không cần khóa, không gọi mạng; sao ảnh sang thư mục đã duyệt và ghi người xem', async () => {
      const io = withHash(memoryIo({ '.img-out/manifest.json': pendingManifest() }))
      const noReviewer = await exec(['--approve=cat'], { io, env: {} })
      expect(noReviewer.result.mode).toBe('error')
      expect(io.copies).toHaveLength(0)
      const { result, fetchFn } = await exec(['--approve=cat', '--reviewer=Cô Thơ'], { io, env: {} })
      expect(result.mode).toBe('approve')
      expect(fetchFn.calls).toHaveLength(0)
      expect(io.copies).toEqual([['.img-out/pending/cat.png', '/appr/cat.png']])
      expect(io.json.get('.img-out/manifest.json').items[0]).toMatchObject({ status: 'approved', approval: { reviewer: 'Cô Thơ' } })
      expect(io.json.get('/appr/approved.json').approved[0]).toMatchObject({ id: 'cat', prompt: 'p', approval: { reviewer: 'Cô Thơ' } })
    })

    it('chỉ duyệt ảnh đang chờ duyệt và đã qua kiểm duyệt tự động; tên tệp lạ bị từ chối', async () => {
      for (const bad of [{ status: 'rejected' }, { status: 'error' }, { status: 'approved' }, { moderation: { safe: false } }, { moderation: undefined }, { file: '../../etc/x.png' }, { file: 'a/b.png' }, { file: 'x.exe' }]) {
        const io = withHash(memoryIo({ '.img-out/manifest.json': pendingManifest(bad) }))
        const { result } = await exec(['--approve=cat', '--reviewer=A'], { io })
        expect(result.mode).toBe('error')
        expect(io.copies).toHaveLength(0)
      }
      const missing = await exec(['--approve=khong-co', '--reviewer=A'], { io: memoryIo({ '.img-out/manifest.json': pendingManifest() }) })
      expect(missing.result.mode).toBe('error')
      const noManifest = await exec(['--approve=cat', '--reviewer=A'])
      expect(noManifest.result.mode).toBe('error')
    })

    it('ảnh được duyệt phải ĐÚNG ảnh đã lưu: hash lệch, thiếu tệp hoặc thiếu sha256 trong bản kê thì từ chối', async () => {
      const changed = withHash(memoryIo({ '.img-out/manifest.json': pendingManifest() }), '.img-out/pending/cat.png', 'KHAC')
      const a = await exec(['--approve=cat', '--reviewer=A'], { io: changed })
      expect(a.result.mode).toBe('error')
      expect(a.result.error).toMatch(/hash/)
      const missingFile = memoryIo({ '.img-out/manifest.json': pendingManifest() })
      expect((await exec(['--approve=cat', '--reviewer=A'], { io: missingFile })).result.mode).toBe('error')
      const noHash = withHash(memoryIo({ '.img-out/manifest.json': pendingManifest({ sha256: undefined }) }))
      const c = await exec(['--approve=cat', '--reviewer=A'], { io: noHash })
      expect(c.result.error).toMatch(/sha256/)
      for (const io of [changed, missingFile, noHash]) expect(io.copies).toHaveLength(0)
    })

    it('--approve cùng --run là lỗi (không lặng lẽ bỏ --run)', async () => {
      const io = withHash(memoryIo({ '.img-out/manifest.json': pendingManifest() }))
      const { result, fetchFn } = await exec(['--approve=cat', '--reviewer=A', '--run'], { io })
      expect(result.mode).toBe('error')
      expect(fetchFn.calls).toHaveLength(0)
      expect(io.copies).toHaveLength(0)
    })

    it('thiếu thư mục đã duyệt thì lỗi', async () => {
      const io = withHash(memoryIo({ '.img-out/manifest.json': pendingManifest() }))
      const { result } = await exec(['--approve=cat', '--reviewer=A'], { io, defaultApprovedDir: null })
      expect(result.mode).toBe('error')
    })
  })
})
