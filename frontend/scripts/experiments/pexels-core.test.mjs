import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  addToLedger,
  candidateKey,
  checkBudget,
  DEFAULT_MONTHLY_CAP,
  DEFAULT_PER_QUERY,
  DEFAULT_RUN_CAP,
  downloadImage,
  imageKind,
  isPexelsImageUrl,
  isPexelsPageUrl,
  KEY_ENV,
  ledgerProblem,
  MAX_DOWNLOADS_PER_RUN,
  MAX_IMAGE_BYTES,
  normalizePhotos,
  parseArgs,
  parseEnvVar,
  QUERIES,
  run,
  searchOne,
  usedThisMonth,
} from './pexels-core.mjs'

// Khóa GIẢ (không có tiền tố trông như khóa thật) chỉ để chứng minh khóa không lộ ra log/lỗi/URL.
const KEY = 'FAKE-PEXELS-KEY-FOR-TESTS-0123456789'
const NOW = new Date('2026-10-19T08:00:00Z')

const JPEG = (tag = 'a') => Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from(`JPEG-${tag}`)])
const photo = (id, extra = {}) => ({
  id,
  url: `https://www.pexels.com/photo/anh-${id}/`,
  photographer: 'Ann Photographer',
  photographer_url: 'https://www.pexels.com/@ann',
  alt: 'a cat on a sofa',
  src: { large: `https://images.pexels.com/photos/${id}/large.jpeg` },
  ...extra,
})

const headers = (map = {}) => ({ get: (name) => map[String(name).toLowerCase()] ?? null })
const searchOk = (photos, map = {}) => ({ ok: true, status: 200, headers: headers(map), json: async () => ({ photos }) })
const imageOk = (bytes, map = {}) => ({ ok: true, status: 200, headers: headers(map), arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) })
const failStatus = (status, text = '') => ({ ok: false, status, headers: headers(), text: async () => text, json: async () => ({}) })

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
const isSearch = (url) => url.startsWith('https://api.pexels.com/v1/search')
/** Mặc định: mỗi từ khóa trả 3 ảnh có id = 100 × số thứ tự + k; ảnh trả về là JPEG giả. */
const happyFetch = (perQuery = 3) =>
  fakeFetch((url) => {
    if (isSearch(url)) {
      const query = new URL(url).searchParams.get('query')
      const base = (QUERIES.findIndex((q) => q.query === query) + 1) * 100
      return searchOk(Array.from({ length: perQuery }, (_, k) => photo(base + k + 1)), { 'x-ratelimit-remaining': '19990' })
    }
    return imageOk(JPEG(url.split('/photos/')[1]?.split('/')[0]))
  })

/** `io` trong bộ nhớ, ghi lại thứ tự thao tác để kiểm «ghi sổ cái trước khi gọi». */
function memoryIo(initial = {}) {
  const files = new Map()
  const json = new Map(Object.entries(initial).map(([k, v]) => [k, structuredClone(v)]))
  const events = []
  const removed = []
  const copies = []
  const asserted = []
  return {
    files, json, events, removed, copies, asserted,
    assertPath: (p, kind) => void asserted.push(`${kind}:${p}`),
    readJson: async (p) => {
      const v = json.get(p)
      if (v === '__corrupt__') throw new Error('JSON hỏng')
      return v === undefined ? null : structuredClone(v)
    },
    writeJson: async (p, value) => {
      events.push(`writeJson:${p}`)
      json.set(p, structuredClone(value))
    },
    writeFile: async (p, buf) => {
      events.push(`writeFile:${p}`)
      files.set(p, buf)
    },
    copyFile: async (from, to) => void copies.push([from, to]),
    removeFile: async (p) => {
      removed.push(p)
      files.delete(p)
    },
    hashFile: async (p) => (files.has(p) ? createHash('sha256').update(files.get(p)).digest('hex') : null),
    mkdir: async () => {},
  }
}

const exec = (argv, { fetchFn = happyFetch(), io = memoryIo(), env = { [KEY_ENV]: KEY }, logs = [] } = {}) =>
  run({ argv, env, fetchFn, io, now: () => NOW, log: (l) => logs.push(l), defaultApprovedDir: 'appr' }).then((result) => ({ result, fetchFn, io, logs }))

describe('parseArgs', () => {
  it('mặc định: dry-run, 3 ảnh mỗi từ khóa, trần 6 lần mỗi lần và 100 mỗi tháng', () => {
    expect(parseArgs([])).toMatchObject({ run: false, only: [], perQuery: DEFAULT_PER_QUERY, runCap: DEFAULT_RUN_CAP, monthlyCap: DEFAULT_MONTHLY_CAP, outDir: '.img-out', errors: [] })
  })
  it('đọc các cờ', () => {
    expect(parseArgs(['--run', '--only=cat', '--only=dog', '--per-query=2', '--max-searches=4', '--monthly-cap=9', '--approve=x', '--reviewer=Cô Thơ'])).toMatchObject({
      run: true, only: ['cat', 'dog'], perQuery: 2, runCap: 4, monthlyCap: 9, approve: 'x', reviewer: 'Cô Thơ', errors: [],
    })
  })
  it('cờ sai: --run có giá trị, --per-query ngoài 1..5 hoặc không phải số, số âm, cờ lạ', () => {
    for (const bad of ['--run=false', '--per-query=0', '--per-query=6', '--per-query=abc', '--per-query=', '--max-searches=-1', '--monthly-cap=1.5', '--lạ', '--model=x']) {
      expect(parseArgs([bad]).errors, bad).toHaveLength(1)
    }
  })
})

describe('kiểm tra địa chỉ', () => {
  it('chỉ nhận https://images.pexels.com không tài khoản, không cổng', () => {
    expect(isPexelsImageUrl('https://images.pexels.com/photos/1/x.jpeg')).toBe(true)
    for (const bad of ['http://images.pexels.com/x.jpg', 'https://images.pexels.com.evil.com/x.jpg', 'https://evil.com/images.pexels.com/x.jpg', 'https://user:pw@images.pexels.com/x.jpg', 'https://images.pexels.com:8443/x.jpg', 'https://www.pexels.com/x.jpg', 'ftp://images.pexels.com/x', 'không phải url', '', null, undefined]) {
      expect(isPexelsImageUrl(bad), String(bad)).toBe(false)
    }
  })
  it('trang Pexels: https, pexels.com hoặc www.pexels.com', () => {
    expect(isPexelsPageUrl('https://www.pexels.com/photo/a-1/')).toBe(true)
    expect(isPexelsPageUrl('https://pexels.com/@ann')).toBe(true)
    for (const bad of ['http://www.pexels.com/x', 'https://notpexels.com/x', 'https://www.pexels.com.evil.com/x', 'https://u:p@www.pexels.com/x', 'javascript:alert(1)', null]) expect(isPexelsPageUrl(bad), String(bad)).toBe(false)
  })
})

describe('normalizePhotos', () => {
  it('bỏ ảnh thiếu id, id không nguyên dương, địa chỉ ảnh hoặc trang lạ; giữ tối đa perQuery', () => {
    const data = { photos: [photo(1), photo(0), photo('2'), photo(3, { src: { large: 'https://evil.com/a.jpg' } }), photo(4, { url: 'https://evil.com/p' }), { id: 5 }, null, photo(6), photo(7), photo(8)] }
    expect(normalizePhotos(data, 2).map((p) => p.photoId)).toEqual([1, 6])
    expect(normalizePhotos(data, 5).map((p) => p.photoId)).toEqual([1, 6, 7, 8])
  })
  it('thiếu danh sách photos thì trả null; làm sạch ký tự điều khiển và độ dài; photographer_url lạ thành null', () => {
    expect(normalizePhotos({}, 3)).toBeNull()
    expect(normalizePhotos({ photos: 'x' }, 3)).toBeNull()
    expect(normalizePhotos(null, 3)).toBeNull()
    const [p] = normalizePhotos({ photos: [photo(1, { alt: 'a\u0007b\nc'.padEnd(500, 'x'), photographer_url: 'https://evil.com/@x', photographer: 'N'.repeat(300) })] }, 3)
    expect([...p.alt].some((char) => char.charCodeAt(0) < 32)).toBe(false)
    expect(p.alt.length).toBeLessThanOrEqual(200)
    expect(p.photographer.length).toBe(100)
    expect(p.photographerUrl).toBeNull()
  })
  it('bỏ cả ký tự điều khiển C1, bidi và độ rộng 0 (tên tác giả do người dùng Pexels đặt)', () => {
    const [p] = normalizePhotos({ photos: [photo(1, { photographer: 'An\u009b[31m‮evil​X', alt: 'a⁦b\u0085c' })] }, 1)
    for (const bad of ['\u009b', '‮', '​', '⁦', '\u0085']) {
      expect(p.photographer + p.alt).not.toContain(bad)
    }
    expect(p.photographer).toContain('An')
    expect(p.alt).toContain('a')
  })
  it('địa chỉ trang/ảnh dài quá 300 ký tự bị bỏ', () => {
    const long = `https://www.pexels.com/photo/${'a'.repeat(300)}/`
    expect(isPexelsPageUrl(long)).toBe(false)
    expect(isPexelsImageUrl(`https://images.pexels.com/${'a'.repeat(300)}.jpg`)).toBe(false)
    expect(normalizePhotos({ photos: [photo(1, { url: long })] }, 1)).toEqual([])
  })
})

describe('imageKind', () => {
  it('nhận JPEG, PNG, WebP theo đầu tệp; còn lại là null', () => {
    expect(imageKind(Buffer.from([0xff, 0xd8, 0xff, 0x00]))).toBe('jpg')
    expect(imageKind(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))).toBe('png')
    expect(imageKind(Buffer.concat([Buffer.from('RIFF'), Buffer.from([1, 2, 3, 4]), Buffer.from('WEBPxx')]))).toBe('webp')
    for (const bad of [Buffer.from('<html>'), Buffer.from('GIF89a'), Buffer.alloc(0), Buffer.from([0xff, 0xd8]), Buffer.from([0xff, 0xd8, 0x00, 0x00]), Buffer.concat([Buffer.from('RIFF'), Buffer.from([1, 2, 3, 4]), Buffer.from('WAVEfmt ')])]) {
      expect(imageKind(bad)).toBeNull()
    }
  })
})

describe('searchOne', () => {
  it('khóa nằm ở header Authorization (không Bearer), không ở URL; từ khóa và per_page ở URL; không theo chuyển hướng', async () => {
    const fetchFn = happyFetch()
    const out = await searchOne({ fetchFn, apiKey: KEY, query: 'beach ball', perQuery: 2 })
    const call = fetchFn.calls[0]
    expect(call.url).toBe('https://api.pexels.com/v1/search?query=beach+ball&per_page=2')
    expect(call.url).not.toContain(KEY)
    expect(call.init.headers).toEqual({ Authorization: KEY })
    expect(call.init.method).toBe('GET')
    expect(call.init.redirect).toBe('error')
    expect(call.init.body).toBeUndefined()
    expect(out.photos).toHaveLength(2)
    expect(out.remaining).toBe(19990)
  })
  it('đọc số lần còn lại từ header; thiếu hoặc không phải số thì null', async () => {
    for (const [map, expected] of [[{}, null], [{ 'x-ratelimit-remaining': 'abc' }, null], [{ 'x-ratelimit-remaining': '12' }, 12]]) {
      const fetchFn = fakeFetch(() => searchOk([photo(1)], map))
      expect((await searchOne({ fetchFn, apiKey: KEY, query: 'cat', perQuery: 1 })).remaining).toBe(expected)
    }
  })
  it('401, 403 chỉ báo mã trạng thái (không in thân lỗi); 429 báo hết hạn mức; lỗi khác báo mã', async () => {
    for (const status of [401, 403]) {
      const fetchFn = fakeFetch(() => failStatus(status, `Invalid key ${KEY.slice(0, 6)}***`))
      await expect(searchOne({ fetchFn, apiKey: KEY, query: 'cat', perQuery: 1 })).rejects.toThrow(`Pexels trả ${status}`)
      const failure = await searchOne({ fetchFn, apiKey: KEY, query: 'cat', perQuery: 1 }).catch((e) => e)
      expect(failure.message).toBe(`Pexels trả ${status}`)
    }
    await expect(searchOne({ fetchFn: fakeFetch(() => failStatus(429)), apiKey: KEY, query: 'cat', perQuery: 1 })).rejects.toThrow(/429.*hạn mức/)
    await expect(searchOne({ fetchFn: fakeFetch(() => failStatus(500)), apiKey: KEY, query: 'cat', perQuery: 1 })).rejects.toThrow('Pexels trả 500')
  })
  it('lỗi mạng bị lọc khóa; phản hồi không có photos là lỗi sai dạng', async () => {
    const net = fakeFetch(() => {
      throw new Error(`connect failed for ${KEY}`)
    })
    const error = await searchOne({ fetchFn: net, apiKey: KEY, query: 'cat', perQuery: 1 }).catch((e) => e)
    expect(error.message).toContain('lỗi mạng')
    expect(error.message).not.toContain(KEY)
    await expect(searchOne({ fetchFn: fakeFetch(() => ({ ok: true, status: 200, headers: headers(), json: async () => ({ ket_qua: [] }) })), apiKey: KEY, query: 'cat', perQuery: 1 })).rejects.toThrow(/sai dạng/)
  })
})

describe('downloadImage', () => {
  it('tải ảnh KHÔNG gửi khóa, không theo chuyển hướng, trả dạng và byte', async () => {
    const fetchFn = fakeFetch(() => imageOk(JPEG('x')))
    const out = await downloadImage({ fetchFn, url: 'https://images.pexels.com/photos/1/large.jpeg' })
    expect(out.ext).toBe('jpg')
    expect(out.bytes.equals(JPEG('x'))).toBe(true)
    expect(fetchFn.calls[0].init.headers).toBeUndefined()
    expect(fetchFn.calls[0].init.redirect).toBe('error')
  })
  it('địa chỉ ngoài images.pexels.com bị từ chối trước khi gọi mạng', async () => {
    const fetchFn = fakeFetch(() => imageOk(JPEG()))
    for (const url of ['https://evil.com/a.jpg', 'http://images.pexels.com/a.jpg', 'https://images.pexels.com.evil.com/a.jpg']) {
      await expect(downloadImage({ fetchFn, url })).rejects.toThrow(/không thuộc images.pexels.com/)
    }
    expect(fetchFn.calls).toHaveLength(0)
  })
  it('đọc theo luồng và NGẮT ngay khi vượt trần (không đọc hết thân), khi không có content-length', async () => {
    let cancelled = false
    let reads = 0
    const chunk = new Uint8Array(MAX_IMAGE_BYTES / 4 + 1)
    chunk.set([0xff, 0xd8, 0xff])
    const body = {
      getReader: () => ({
        read: async () => (++reads > 100 ? { done: true } : { done: false, value: chunk }),
        cancel: async () => {
          cancelled = true
        },
      }),
    }
    const fetchFn = fakeFetch(() => ({ ok: true, status: 200, headers: headers(), body }))
    await expect(downloadImage({ fetchFn, url: 'https://images.pexels.com/photos/1/large.jpeg' })).rejects.toThrow(/lớn hơn/)
    expect(cancelled).toBe(true)
    expect(reads).toBeLessThanOrEqual(5)
  })
  it('đọc theo luồng thành công khi nhỏ hơn trần', async () => {
    const parts = [new Uint8Array([0xff, 0xd8, 0xff, 0xe0]), new Uint8Array([1, 2, 3])]
    let i = 0
    const body = { getReader: () => ({ read: async () => (i < parts.length ? { done: false, value: parts[i++] } : { done: true }), cancel: async () => {} }) }
    const out = await downloadImage({ fetchFn: fakeFetch(() => ({ ok: true, status: 200, headers: headers(), body })), url: 'https://images.pexels.com/photos/1/large.jpeg' })
    expect([...out.bytes]).toEqual([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3])
  })
  it('từ chối: HTTP lỗi, content-length quá lớn, nội dung quá lớn, rỗng, không phải ảnh', async () => {
    const url = 'https://images.pexels.com/photos/1/large.jpeg'
    await expect(downloadImage({ fetchFn: fakeFetch(() => failStatus(404)), url })).rejects.toThrow('tải ảnh trả 404')
    await expect(downloadImage({ fetchFn: fakeFetch(() => imageOk(JPEG(), { 'content-length': String(MAX_IMAGE_BYTES + 1) })), url })).rejects.toThrow(/lớn hơn/)
    const big = Buffer.concat([JPEG(), Buffer.alloc(MAX_IMAGE_BYTES)])
    await expect(downloadImage({ fetchFn: fakeFetch(() => imageOk(big)), url })).rejects.toThrow(/kích thước/)
    await expect(downloadImage({ fetchFn: fakeFetch(() => imageOk(Buffer.alloc(0))), url })).rejects.toThrow(/kích thước/)
    await expect(downloadImage({ fetchFn: fakeFetch(() => imageOk(Buffer.from('<html>lừa</html>'))), url })).rejects.toThrow(/không phải ảnh/)
  })
})

describe('khóa ứng viên, sổ cái, ngân sách, env', () => {
  it('candidateKey chỉ gồm ký tự an toàn', () => {
    expect(candidateKey('cat', 123)).toBe('cat-123')
    expect(candidateKey('a/../b', 1)).toBe('a____b-1')
  })
  it('ledgerProblem nhận null, từ chối dạng sai; usedThisMonth chỉ tính đúng tháng', () => {
    expect(ledgerProblem(null)).toBeNull()
    expect(ledgerProblem({ month: '2026-10', searches: 3 })).toBeNull()
    for (const bad of ['x', { month: 5, searches: 1 }, { month: '2026-10', searches: -1 }, { month: '2026-10' }, { month: '2026-10', searches: NaN }]) expect(ledgerProblem(bad)).not.toBeNull()
    expect(usedThisMonth({ month: '2026-10', searches: 4 }, NOW)).toBe(4)
    expect(usedThisMonth({ month: '2026-09', searches: 4 }, NOW)).toBe(0)
    expect(addToLedger({ month: '2026-09', searches: 4 }, 1, NOW)).toEqual({ month: '2026-10', searches: 1 })
  })
  it('checkBudget: biên trần mỗi lần, trần tải, trần tháng, trần không hợp lệ', () => {
    expect(checkBudget({ count: 6, perQuery: 3, runCap: 6 }).ok).toBe(true)
    expect(checkBudget({ count: 7, perQuery: 3, runCap: 6 }).ok).toBe(false)
    expect(checkBudget({ count: 6, perQuery: 5, runCap: 6 })).toMatchObject({ ok: true })
    expect(checkBudget({ count: 7, perQuery: 5, runCap: 10 }).ok).toBe(false)
    expect(MAX_DOWNLOADS_PER_RUN).toBe(30)
    expect(checkBudget({ count: 1, perQuery: 1, monthlyCap: 10, used: 9 }).ok).toBe(true)
    expect(checkBudget({ count: 2, perQuery: 1, monthlyCap: 10, used: 9 }).ok).toBe(false)
    expect(checkBudget({ count: 1, perQuery: 1, runCap: 0 }).ok).toBe(false)
  })
  it('parseEnvVar chỉ đọc đúng biến, bỏ dòng chú thích, khác tên thì null', () => {
    expect(parseEnvVar('PEXELS_API_KEY=abc', 'PEXELS_API_KEY')).toBe('abc')
    expect(parseEnvVar('X=1\n  PEXELS_API_KEY = "q" \n', 'PEXELS_API_KEY')).toBe('q')
    expect(parseEnvVar('# PEXELS_API_KEY=c', 'PEXELS_API_KEY')).toBeNull()
    expect(parseEnvVar('OTHER_PEXELS_API_KEY=z', 'PEXELS_API_KEY')).toBeNull()
    expect(parseEnvVar('PEXELS_API_KEY=', 'PEXELS_API_KEY')).toBeNull()
  })
})

describe('run: chạy thử và từ chối', () => {
  it('dry-run không cần khóa, không gọi mạng, không ghi gì', async () => {
    const { result, fetchFn, io } = await exec([], { env: {} })
    expect(result.mode).toBe('dry-run')
    expect(result.plan).toMatchObject({ searches: 6, perQuery: 3, maxDownloads: 18, usedThisMonth: 0 })
    expect(fetchFn.calls).toHaveLength(0)
    expect(io.events).toEqual([])
  })
  it('không chọn --only thì lấy các từ khóa ĐẦU TIÊN trong trần mỗi lần', async () => {
    const { result } = await exec(['--max-searches=2'], { env: {} })
    expect(result.plan.ids).toEqual(['cat', 'dog'])
  })
  it('từ khóa lạ là lỗi; từ chối khi vượt trần mỗi lần, trần tải hoặc trần tháng (trước mọi lời gọi)', async () => {
    expect((await exec(['--only=khong-co'])).result.mode).toBe('error')
    const over = await exec(['--run', '--only=cat', '--only=dog', '--only=ball', '--max-searches=2'])
    expect(over.result).toMatchObject({ mode: 'refused' })
    expect(over.fetchFn.calls).toHaveLength(0)
    // 6 từ khóa × 5 ảnh = đúng bằng trần tải mỗi lần (30): vẫn được; trần tải chỉ chặn khi bộ từ khóa lớn hơn (xem test checkBudget).
    const downloads = await exec(['--per-query=5', '--max-searches=7'], { env: {} })
    expect(downloads.result).toMatchObject({ mode: 'dry-run', plan: { maxDownloads: MAX_DOWNLOADS_PER_RUN } })
    const month = await exec(['--run', '--only=cat'], { io: memoryIo({ '.img-ledger.json': { month: '2026-10', searches: DEFAULT_MONTHLY_CAP } }) })
    expect(month.result.mode).toBe('refused')
    expect(month.fetchFn.calls).toHaveLength(0)
  })
  it('sổ cái hỏng thì từ chối chạy, kể cả dry-run', async () => {
    for (const bad of [{ month: 5 }, 'x']) {
      const { result } = await exec(['--only=cat'], { io: memoryIo({ '.img-ledger.json': bad }) })
      expect(result.mode).toBe('error')
    }
    const corrupt = await exec(['--only=cat'], { io: memoryIo({ '.img-ledger.json': '__corrupt__' }) })
    expect(corrupt.result.mode).toBe('error')
  })
  it('--run thiếu khóa: lỗi, không gọi mạng, không ghi sổ cái', async () => {
    const { result, fetchFn, io } = await exec(['--run', '--only=cat'], { env: {} })
    expect(result).toMatchObject({ mode: 'error', error: expect.stringContaining(KEY_ENV) })
    expect(fetchFn.calls).toHaveLength(0)
    expect(io.json.has('.img-ledger.json')).toBe(false)
  })
  it('--out phải là .img-out; kiểm đường dẫn ghi ngay đầu lượt (out, sổ cái, thư mục đã duyệt)', async () => {
    // `..` được chuẩn hóa TRƯỚC khi so: `.img-out/../src` thật ra là `src`.
    for (const out of ['src', 'public/x', '../x', '/tmp/x', '.img-outx', '.img-out/../src', '.img-out/../public', '.img-out/lan2/../..', '.']) expect((await exec(['--only=cat', `--out=${out}`])).result.mode, out).toBe('error')
    expect((await exec(['--only=cat', '--out=.img-out/lan2'])).result.mode).toBe('dry-run')
    expect((await exec(['--only=cat', '--out=.img-out/./lan3/'])).result.mode).toBe('dry-run')
    const { io } = await exec(['--only=cat'])
    expect(io.asserted).toEqual(['out:.img-out', 'ledger:.img-ledger.json', 'approved:appr'])
    const blocked = memoryIo()
    blocked.assertPath = () => {
      throw new Error('ngoài thư mục cho phép')
    }
    expect(await exec(['--only=cat'], { io: blocked }).then((r) => r.result)).toMatchObject({ mode: 'error', error: expect.stringContaining('ngoài thư mục') })
  })
  it('--ledger chỉ được là .img-ledger*.json hoặc .json trong .img-out (không ghi đè được tệp nguồn)', async () => {
    for (const bad of ['src/x.json', 'package.json', '.img-ledger.json/../x.json', '.img-ledger.txt', '../x.json', '.img-out/../src/a.json', '/tmp/a.json']) {
      const { result, io } = await exec(['--only=cat', `--ledger=${bad}`])
      expect(result, bad).toMatchObject({ mode: 'error', error: expect.stringContaining('--ledger') })
      expect(io.asserted, bad).toEqual([])
    }
    for (const good of ['.img-ledger.json', '.img-ledger-thu.json', '.img-out/so-cai.json']) expect((await exec(['--only=cat', `--ledger=${good}`])).result.mode, good).toBe('dry-run')
  })
  it('dry-run cũng báo trước nếu từ khóa đã có ảnh được duyệt', async () => {
    const io = memoryIo({ '.img-out/manifest.json': { items: [{ key: 'cat-9', id: 'cat', file: 'cat-9.jpg', status: 'approved', sha256: 'h' }] } })
    const { result, fetchFn } = await exec(['--only=cat'], { io, env: {} })
    expect(result).toMatchObject({ mode: 'error', error: expect.stringContaining('cat') })
    expect(fetchFn.calls).toHaveLength(0)
  })
  it('không ghi được sổ cái thì KHÔNG gọi mạng cho từ khóa đó, vẫn trả kết quả các từ khóa trước', async () => {
    const io = memoryIo()
    const original = io.writeJson
    let ledgerWrites = 0
    io.writeJson = async (p, v) => {
      if (p === '.img-ledger.json' && ++ledgerWrites === 2) throw new Error('đĩa đầy')
      return original(p, v)
    }
    const { result, fetchFn } = await exec(['--run', '--only=cat', '--only=dog', '--per-query=1'], { io })
    expect(result.mode).toBe('run')
    expect(result.error).toContain('không ghi được sổ cái')
    expect(result.totals).toMatchObject({ searches: 1, pending: 1 })
    expect(fetchFn.calls.filter((c) => isSearch(c.url))).toHaveLength(1)
  })
  it('--approve cùng --run bị từ chối', async () => {
    expect((await exec(['--approve=x', '--run'])).result).toMatchObject({ mode: 'error', error: expect.stringContaining('không dùng cùng lúc') })
  })
})

describe('run: tìm và tải thật', () => {
  it('tìm từng từ khóa, tải ảnh vào thư mục chờ duyệt, ghi bản kê và sổ cái', async () => {
    const { result, fetchFn, io } = await exec(['--run', '--only=cat', '--only=dog', '--per-query=2'])
    expect(result.mode).toBe('run')
    expect(result.error).toBeNull()
    expect(result.totals).toMatchObject({ searches: 2, pending: 4, errors: 0, usedThisMonthAfter: 2, rateLimitRemaining: 19990 })
    expect([...io.files.keys()].sort()).toEqual(['.img-out/pending/cat-101.jpg', '.img-out/pending/cat-102.jpg', '.img-out/pending/dog-201.jpg', '.img-out/pending/dog-202.jpg'])
    expect(io.json.get('.img-ledger.json')).toEqual({ month: '2026-10', searches: 2 })
    const items = io.json.get('.img-out/manifest.json').items
    expect(items).toHaveLength(4)
    expect(items[0]).toMatchObject({ key: 'cat-101', id: 'cat', query: 'cat', photoId: 101, photographer: 'Ann Photographer', pexelsUrl: 'https://www.pexels.com/photo/anh-101/', status: 'pending-review', file: 'cat-101.jpg' })
    expect(items[0].sha256).toBe(createHash('sha256').update(io.files.get('.img-out/pending/cat-101.jpg')).digest('hex'))
    // thứ tự: tìm cat, tải 2 ảnh, tìm dog, tải 2 ảnh
    expect(fetchFn.calls.map((c) => (isSearch(c.url) ? `S:${new URL(c.url).searchParams.get('query')}` : 'D'))).toEqual(['S:cat', 'D', 'D', 'S:dog', 'D', 'D'])
  })
  it('khóa chỉ gửi tới api.pexels.com, không bao giờ tới máy chủ ảnh, URL hay thân yêu cầu', async () => {
    const { fetchFn, logs, result } = await exec(['--run', '--only=cat', '--per-query=1'])
    for (const call of fetchFn.calls) {
      expect(call.url).not.toContain(KEY)
      expect(call.init.body).toBeUndefined()
      if (isSearch(call.url)) expect(call.init.headers.Authorization).toBe(KEY)
      else expect(JSON.stringify(call.init)).not.toContain(KEY)
    }
    expect(JSON.stringify(result)).not.toContain(KEY)
    expect(logs.join('\n')).not.toContain(KEY)
  })
  it('sổ cái ghi TRƯỚC lời tìm của từng từ khóa', async () => {
    const io = memoryIo()
    const order = []
    const base = happyFetch(1)
    const fetchFn = fakeFetch((url, init, i) => {
      if (isSearch(url)) order.push(`search:${io.events.filter((e) => e === 'writeJson:.img-ledger.json').length}`)
      return base(url, init, i)
    })
    await exec(['--run', '--only=cat', '--only=dog', '--per-query=1'], { fetchFn, io })
    expect(order).toEqual(['search:1', 'search:2'])
  })
  it('một lần tìm lỗi (kể cả 429) là dừng: không tìm từ khóa sau, lần lỗi vẫn tính vào sổ cái, kết quả trước vẫn được lưu', async () => {
    for (const status of [429, 500, 401]) {
      let searches = 0
      const fetchFn = fakeFetch((url) => {
        if (isSearch(url)) {
          searches += 1
          return searches === 1 ? searchOk([photo(1)]) : failStatus(status, `thân lỗi chứa ${KEY}`)
        }
        return imageOk(JPEG())
      })
      const { result, io, logs } = await exec(['--run', '--only=cat', '--only=dog', '--only=ball', '--per-query=1'], { fetchFn })
      expect(searches, String(status)).toBe(2)
      expect(result.error).toContain('dog')
      expect(result.error).not.toContain(KEY)
      expect(logs.join('\n')).not.toContain(KEY)
      expect(io.json.get('.img-ledger.json').searches).toBe(2)
      expect(io.json.get('.img-out/manifest.json').items.map((i) => i.key)).toEqual(['cat-1'])
      expect(result.totals).toMatchObject({ searches: 1, pending: 1, errors: 1 })
    }
  })
  it('một lần tải lỗi là dừng: không tải ảnh kế, không tìm từ khóa sau; mục lỗi được ghi', async () => {
    let downloads = 0
    const fetchFn = fakeFetch((url) => {
      if (isSearch(url)) return searchOk([photo(1), photo(2)])
      downloads += 1
      return failStatus(503)
    })
    const { result, io } = await exec(['--run', '--only=cat', '--only=dog', '--per-query=2'], { fetchFn })
    expect(downloads).toBe(1)
    expect(fetchFn.calls.filter((c) => isSearch(c.url))).toHaveLength(1)
    expect(result.error).toContain('cat-1')
    expect(io.json.get('.img-out/manifest.json').items).toEqual([expect.objectContaining({ key: 'cat-1', status: 'error' })])
    expect(io.files.size).toBe(0)
  })
  it('ảnh tải về không phải ảnh (HTML) bị từ chối, không được lưu', async () => {
    const fetchFn = fakeFetch((url) => (isSearch(url) ? searchOk([photo(1)]) : imageOk(Buffer.from('<html>quảng cáo</html>'))))
    const { result, io } = await exec(['--run', '--only=cat', '--per-query=1'], { fetchFn })
    expect(result.error).toMatch(/không phải ảnh/)
    expect(io.files.size).toBe(0)
  })
  it('ảnh có địa chỉ lạ trong phản hồi bị bỏ, không có cuộc tải nào tới máy chủ lạ', async () => {
    const fetchFn = fakeFetch((url) => (isSearch(url) ? searchOk([photo(1, { src: { large: 'https://evil.com/x.jpg' } }), photo(2)]) : imageOk(JPEG())))
    const { result, io } = await exec(['--run', '--only=cat', '--per-query=3'], { fetchFn })
    expect(result.error).toBeNull()
    expect([...io.files.keys()]).toEqual(['.img-out/pending/cat-2.jpg'])
    expect(fetchFn.calls.every((c) => isSearch(c.url) || new URL(c.url).hostname === 'images.pexels.com')).toBe(true)
  })
  it('không có kết quả cho một từ khóa: ghi nhận và đi tiếp từ khóa sau', async () => {
    const fetchFn = fakeFetch((url) => {
      if (isSearch(url)) return new URL(url).searchParams.get('query') === 'cat' ? searchOk([]) : searchOk([photo(7)])
      return imageOk(JPEG())
    })
    const { result, io } = await exec(['--run', '--only=cat', '--only=dog', '--per-query=1'], { fetchFn })
    expect(result.error).toBeNull()
    expect(result.results[0]).toMatchObject({ id: 'cat', status: 'no-results' })
    expect([...io.files.keys()]).toEqual(['.img-out/pending/dog-7.jpg'])
  })
  it('tìm lại một từ khóa: ảnh chờ duyệt cũ bị xóa tệp và mục; ảnh đã duyệt thì không cho tìm lại (không gọi mạng)', async () => {
    const pending = { items: [{ key: 'cat-9', id: 'cat', file: 'cat-9.jpg', status: 'pending-review', sha256: 'h' }, { key: 'dog-5', id: 'dog', file: 'dog-5.jpg', status: 'pending-review', sha256: 'h' }] }
    const io = memoryIo({ '.img-out/manifest.json': pending })
    io.files.set('.img-out/pending/cat-9.jpg', JPEG('cu'))
    const again = await exec(['--run', '--only=cat', '--per-query=1'], { io })
    expect(io.removed).toEqual(['.img-out/pending/cat-9.jpg'])
    expect(io.json.get('.img-out/manifest.json').items.map((i) => i.key)).toEqual(['dog-5', 'cat-101'])
    expect(again.result.error).toBeNull()
    const approved = memoryIo({ '.img-out/manifest.json': { items: [{ key: 'cat-9', id: 'cat', file: 'cat-9.jpg', status: 'approved', sha256: 'h' }] } })
    const refused = await exec(['--run', '--only=cat'], { io: approved })
    expect(refused.result).toMatchObject({ mode: 'error', error: expect.stringContaining('cat') })
    expect(refused.fetchFn.calls).toHaveLength(0)
  })
  it('lỗi ghi bản kê không làm sập: báo lỗi và dừng', async () => {
    const io = memoryIo()
    const original = io.writeJson
    io.writeJson = async (p, v) => {
      if (p.endsWith('manifest.json')) throw new Error('đĩa đầy')
      return original(p, v)
    }
    const { result } = await exec(['--run', '--only=cat', '--only=dog', '--per-query=1'], { io })
    expect(result.mode).toBe('run')
    expect(result.error).toContain('không ghi được bản kê')
  })
})

describe('run: duyệt tay', () => {
  const pendingItem = (extra = {}) => ({ key: 'cat-101', id: 'cat', query: 'cat', file: 'cat-101.jpg', status: 'pending-review', sha256: 'h1', photographer: 'Ann', photographerUrl: 'https://www.pexels.com/@ann', pexelsUrl: 'https://www.pexels.com/photo/anh-101/', alt: 'mèo', ...extra })
  const withFile = (io, hash = 'h1') => {
    io.files.set('.img-out/pending/cat-101.jpg', JPEG())
    io.hashFile = async (p) => (io.files.has(p) ? hash : null)
    return io
  }
  const setup = (item = pendingItem()) => withFile(memoryIo({ '.img-out/manifest.json': { items: [item] } }))
  const matchAnyHash = (io) => {
    io.hashFile = async () => 'h1'
    return io
  }

  it('duyệt thành công: sao tệp, ghi trạng thái, ghi approved.json kèm thông tin nguồn; không cần khóa, không gọi mạng', async () => {
    const io = setup()
    const { result, fetchFn, logs } = await exec(['--approve=cat-101', '--reviewer=Cô Thơ'], { io, env: {} })
    expect(result.mode).toBe('approve')
    expect(fetchFn.calls).toHaveLength(0)
    expect(io.copies).toEqual([['.img-out/pending/cat-101.jpg', 'appr/cat-101.jpg']])
    expect(io.json.get('.img-out/manifest.json').items[0]).toMatchObject({ status: 'approved', approval: { reviewer: 'Cô Thơ' } })
    expect(io.json.get('appr/approved.json').approved[0]).toMatchObject({ key: 'cat-101', file: 'cat-101.jpg', sha256: 'h1', photographer: 'Ann', pexelsUrl: 'https://www.pexels.com/photo/anh-101/', approval: { reviewer: 'Cô Thơ' } })
    expect(logs.join('\n')).toContain('Photo by Ann on Pexels')
  })
  it('approved.json được GỘP theo key (xóa .img-out rồi duyệt ảnh khác không làm mất dòng ghi nguồn đã có)', async () => {
    const older = { key: 'dog-201', id: 'dog', file: 'dog-201.jpg', photographer: 'Bob', pexelsUrl: 'https://www.pexels.com/photo/b-201/', approval: { reviewer: 'A' } }
    const io = setup()
    io.json.set('appr/approved.json', { approved: [older, { key: 'cat-101', file: 'cat-101.jpg', photographer: 'SAI-CU' }] })
    await exec(['--approve=cat-101', '--reviewer=Cô Thơ'], { io })
    const approved = io.json.get('appr/approved.json').approved
    expect(approved.map((a) => a.key).sort()).toEqual(['cat-101', 'dog-201'])
    expect(approved.find((a) => a.key === 'dog-201')).toEqual(older)
    expect(approved.find((a) => a.key === 'cat-101').photographer).toBe('Ann') // mục cùng key được cập nhật, không nhân đôi
  })
  it('approved.json có sẵn nhưng hỏng thì từ chối, không ghi đè', async () => {
    for (const bad of [{ approved: 'x' }, 'x', { khac: 1 }]) {
      const io = setup()
      io.json.set('appr/approved.json', bad)
      const { result } = await exec(['--approve=cat-101', '--reviewer=A'], { io })
      expect(result).toMatchObject({ mode: 'error', error: expect.stringContaining('dạng không hợp lệ') })
      expect(io.json.get('appr/approved.json')).toEqual(bad)
      // không để lại trạng thái nửa vời: chưa sao ảnh, bản kê vẫn «chờ duyệt»
      expect(io.copies).toEqual([])
      expect(io.json.get('.img-out/manifest.json').items[0].status).toBe('pending-review')
    }
  })
  it('thiếu hoặc trống --reviewer thì từ chối; thiếu thư mục đã duyệt thì từ chối', async () => {
    expect((await exec(['--approve=cat-101'], { io: setup() })).result.mode).toBe('error')
    expect((await exec(['--approve=cat-101', '--reviewer=   '], { io: setup() })).result.mode).toBe('error')
    const noDir = await run({ argv: ['--approve=cat-101', '--reviewer=A'], env: {}, fetchFn: happyFetch(), io: setup(), now: () => NOW })
    expect(noDir.mode).toBe('error')
  })
  it('chỉ duyệt được ảnh đang chờ duyệt, có trong bản kê, tên tệp hợp lệ, hash khớp', async () => {
    const cases = [
      ['không có trong bản kê', ['--approve=khong-co', '--reviewer=A'], setup()],
      ['đã duyệt rồi', ['--approve=cat-101', '--reviewer=A'], setup(pendingItem({ status: 'approved' }))],
      ['đang lỗi', ['--approve=cat-101', '--reviewer=A'], setup(pendingItem({ status: 'error' }))],
      // hash luôn khớp để chỉ riêng kiểm tên tệp quyết định kết quả
      ['tên tệp lạ', ['--approve=cat-101', '--reviewer=A'], matchAnyHash(setup(pendingItem({ file: '../x.jpg' })))],
      ['sai đuôi', ['--approve=cat-101', '--reviewer=A'], matchAnyHash(setup(pendingItem({ file: 'cat-101.gif' })))],
      ['thiếu hash', ['--approve=cat-101', '--reviewer=A'], setup(pendingItem({ sha256: undefined }))],
      ['hash lệch', ['--approve=cat-101', '--reviewer=A'], withFile(memoryIo({ '.img-out/manifest.json': { items: [pendingItem()] } }), 'khac')],
      ['thiếu tệp', ['--approve=cat-101', '--reviewer=A'], memoryIo({ '.img-out/manifest.json': { items: [pendingItem()] } })],
    ]
    for (const [name, argv, io] of cases) {
      const { result } = await exec(argv, { io })
      expect(result.mode, name).toBe('error')
      expect(io.copies, name).toEqual([])
    }
  })
})
