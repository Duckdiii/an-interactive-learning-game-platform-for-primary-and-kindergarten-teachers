import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MissingKeywordLog, MAX_TRACKED_KEYWORDS, getMissingKeywords, missingKeywordLog } from './missingLog'
import { PLACEHOLDER_ALT, PLACEHOLDER_SRC } from './placeholder'
import { createFluentSource, isSafeStickerUrl, resolveImage, type LocalImageSource } from './resolveImage'
import { buildKeywordIndex } from './keywordIndex'

const STICKER = 'https://images.example.com/cat.jpg'

describe('resolveImage: tầng 1, bộ hình cục bộ', () => {
  let log: MissingKeywordLog
  beforeEach(() => {
    log = new MissingKeywordLog()
  })

  it('khớp chính xác: trả hình SVG cục bộ, alt tiếng Việt, không ghi nhận thiếu', () => {
    const image = resolveImage('con mèo', { log })
    expect(image).toMatchObject({ tier: 'fluent', slug: 'cat-face', alt: 'con mèo', keyword: 'con mèo', sticker: false })
    expect(image.src).toMatch(/cat-face.*\.svg/)
    expect(log.list()).toEqual([])
  })
  it('khớp bí danh tiếng Anh và tiếng Việt, hoa thường tùy ý', () => {
    for (const keyword of ['cat', 'CAT', 'mèo', 'Meo', 'meo']) expect(resolveImage(keyword, { log }).slug, keyword).toBe('cat-face')
  })
  it('khớp không dấu: «con meo», «qua tao», «xe dap», «dong ho bao thuc»', () => {
    expect(resolveImage('con meo', { log }).slug).toBe('cat-face')
    expect(resolveImage('qua tao', { log }).slug).toBe('red-apple')
    expect(resolveImage('xe dap', { log }).slug).toBe('bicycle')
    expect(resolveImage('dong ho bao thuc', { log }).slug).toBe('alarm-clock')
  })
  it('đúng dấu thắng: «ông» và «ong» ra hai hình khác nhau', () => {
    expect(resolveImage('ông', { log }).slug).toBe('old-man')
    expect(resolveImage('ong', { log }).slug).toBe('honeybee')
  })
  it('bỏ từ loại: «con cat» ra con mèo', () => {
    expect(resolveImage('con cat', { log }).slug).toBe('cat-face')
  })
  it('khoảng trắng thừa được cắt; giữ nguyên từ khóa đã cắt trong kết quả', () => {
    expect(resolveImage('   cat   ', { log }).keyword).toBe('cat')
  })
})

describe('resolveImage: các tầng dự phòng', () => {
  let log: MissingKeywordLog
  beforeEach(() => {
    log = new MissingKeywordLog()
  })

  it('không có hình cục bộ nhưng có sticker an toàn: dùng sticker, đánh dấu sticker, mang ghi nguồn, VẪN ghi nhận thiếu', () => {
    const onMissing = vi.fn()
    const image = resolveImage('khủng long', { stickerUrl: STICKER, stickerCredit: 'Tác giả A', onMissing, log })
    expect(image).toMatchObject({ tier: 'sticker', src: STICKER, sticker: true, credit: 'Tác giả A', alt: 'khủng long', keyword: 'khủng long' })
    expect(onMissing).toHaveBeenCalledWith({ keyword: 'khủng long', normalized: 'khung long', tier: 'sticker' })
    expect(log.list()).toEqual([{ normalized: 'khung long', keyword: 'khủng long', count: 1 }])
  })
  it('hình cục bộ thắng sticker (bộ cục bộ là tầng đầu)', () => {
    const image = resolveImage('cat', { stickerUrl: STICKER, log })
    expect(image.tier).toBe('fluent')
    expect(log.list()).toEqual([])
  })
  it('không có cả hai: hình dự phòng thân thiện và ghi nhận «hình đang thiếu»', () => {
    const onMissing = vi.fn()
    const image = resolveImage('khủng long', { onMissing, log })
    expect(image).toMatchObject({ tier: 'placeholder', src: PLACEHOLDER_SRC, alt: PLACEHOLDER_ALT, sticker: false, keyword: 'khủng long' })
    expect(image.slug).toBeUndefined()
    expect(onMissing).toHaveBeenCalledTimes(1)
    expect(onMissing).toHaveBeenCalledWith({ keyword: 'khủng long', normalized: 'khung long', tier: 'placeholder' })
  })
  it('hình dự phòng là SVG nhúng sẵn, không có chữ, không tải gì ngoài', () => {
    const svg = decodeURIComponent(PLACEHOLDER_SRC.replace('data:image/svg+xml;utf8,', ''))
    expect(svg.startsWith('<svg')).toBe(true)
    expect(svg.replace(' xmlns="http://www.w3.org/2000/svg"', '')).not.toMatch(/<text|<script|href=|http/)
  })
  it('sticker không an toàn bị bỏ: rơi xuống hình dự phòng', () => {
    for (const stickerUrl of ['javascript:alert(1)', 'data:image/png;base64,AAAA', 'http://insecure.example.com/a.jpg', '//evil.example.com/a.jpg', 'file:///etc/passwd', 'https://user:pw@example.com/a.jpg', 'not a url', '', 'https://example.com/a b.jpg']) {
      expect(resolveImage('khủng long', { stickerUrl, log }).tier, stickerUrl).toBe('placeholder')
    }
  })
  it('đường dẫn gốc nội bộ được nhận làm sticker', () => {
    expect(resolveImage('khủng long', { stickerUrl: '/media/dino.jpg', log }).tier).toBe('sticker')
  })
  it('hàm onMissing ném lỗi không làm hỏng kết quả', () => {
    const image = resolveImage('khủng long', {
      onMissing: () => {
        throw new Error('hỏng')
      },
      log,
    })
    expect(image.tier).toBe('placeholder')
    expect(log.list()).toHaveLength(1) // sổ ghi trước khi gọi hàm
  })
  it('log: null tắt sổ ghi nhưng onMissing vẫn được gọi', () => {
    const onMissing = vi.fn()
    resolveImage('khủng long', { log: null, onMissing })
    expect(onMissing).toHaveBeenCalledTimes(1)
  })
})

describe('resolveImage: đầu vào lạ không ném lỗi và không ghi nhận', () => {
  it.each([[undefined], [null], [''], ['   '], [42], [{}], [['cat']]])('%j → hình dự phòng', (keyword) => {
    const log = new MissingKeywordLog()
    const onMissing = vi.fn()
    const image = resolveImage(keyword, { log, onMissing })
    expect(image.tier).toBe('placeholder')
    expect(onMissing).not.toHaveBeenCalled()
    expect(log.list()).toEqual([])
  })
  it('từ khóa quá dài bị cắt 200 ký tự', () => {
    const log = new MissingKeywordLog()
    const image = resolveImage('x'.repeat(5000), { log })
    expect(image.keyword).toHaveLength(200)
  })
})

describe('chuỗi nguồn thay được', () => {
  it('nguồn đầu thắng, nguồn sau là dự phòng (mở rộng thêm bộ khác mà không sửa resolveImage)', () => {
    const first: LocalImageSource = { id: 'a', find: (k) => (k === 'x' ? { src: 'a.svg', alt: 'A', slug: 'a' } : null) }
    const second: LocalImageSource = { id: 'b', find: (k) => (k === 'x' || k === 'y' ? { src: 'b.svg', alt: 'B', slug: 'b' } : null) }
    expect(resolveImage('x', { sources: [first, second], log: null }).src).toBe('a.svg')
    expect(resolveImage('y', { sources: [first, second], log: null }).src).toBe('b.svg')
    expect(resolveImage('z', { sources: [first, second], log: null }).tier).toBe('placeholder')
  })
  it('createFluentSource: slug có trong chỉ mục nhưng thiếu tệp thì coi như không có', () => {
    const index = buildKeywordIndex([{ slug: 'ghost', name: 'ma', category: 't', aliases: [] }])
    expect(createFluentSource(index, {}).find('ma')).toBeNull()
    expect(createFluentSource(index, { ghost: 'g.svg' }).find('ma')).toEqual({ src: 'g.svg', alt: 'ma', slug: 'ghost' })
  })
})

describe('isSafeStickerUrl', () => {
  it('nhận https và đường dẫn gốc; từ chối còn lại, kể cả không phải chuỗi và quá dài', () => {
    expect(isSafeStickerUrl('https://a.example.com/x.jpg')).toBe(true)
    expect(isSafeStickerUrl('/x.jpg')).toBe(true)
    expect(isSafeStickerUrl('HTTPS://A.EXAMPLE.COM/x.jpg')).toBe(true)
    for (const value of ['http://a.com/x', 'ftp://a.com/x', 'javascript:1', '//a.com/x', 'x.jpg', 'https://', undefined, null, 7, 'https://a.com/\u0000', 'https://a.com/\n'])
      expect(isSafeStickerUrl(value), String(value)).toBe(false)
    expect(isSafeStickerUrl('https://a.example.com/' + 'a'.repeat(2048))).toBe(false)
    expect(isSafeStickerUrl('https://a.example.com/' + 'a'.repeat(2000))).toBe(true)
  })
})

describe('sổ hình đang thiếu', () => {
  it('gộp theo từ khóa không dấu, đếm số lần, nhiều nhất trước; giữ cách viết đầu tiên', () => {
    const log = new MissingKeywordLog()
    resolveImage('Khủng Long', { log })
    resolveImage('khung long', { log })
    resolveImage('rồng lửa', { log })
    resolveImage('KHỦNG LONG', { log })
    expect(log.list()).toEqual([
      { normalized: 'khung long', keyword: 'Khủng Long', count: 3 },
      { normalized: 'rong lua', keyword: 'rồng lửa', count: 1 },
    ])
  })
  it('clear xóa sạch; list trả bản sao (sửa bản sao không ảnh hưởng sổ)', () => {
    const log = new MissingKeywordLog()
    resolveImage('khủng long', { log })
    log.list()[0].count = 99
    expect(log.list()[0].count).toBe(1)
    log.clear()
    expect(log.list()).toEqual([])
  })
  it('nhớ tối đa MAX_TRACKED_KEYWORDS từ khóa khác nhau nhưng vẫn đếm tiếp các từ đã nhớ', () => {
    const log = new MissingKeywordLog()
    for (let i = 0; i < MAX_TRACKED_KEYWORDS + 20; i += 1) log.record({ keyword: `k${i}`, normalized: `k${i}`, tier: 'placeholder' })
    expect(log.list()).toHaveLength(MAX_TRACKED_KEYWORDS)
    log.record({ keyword: 'k0', normalized: 'k0', tier: 'placeholder' })
    expect(log.list()[0]).toMatchObject({ normalized: 'k0', count: 2 })
  })
  it('sổ dùng chung của ứng dụng là mặc định và đọc được qua getMissingKeywords', () => {
    missingKeywordLog.clear()
    resolveImage('loài-chưa-có-trong-thư-viện')
    expect(getMissingKeywords()).toEqual([{ normalized: 'loai chua co trong thu vien', keyword: 'loài-chưa-có-trong-thư-viện', count: 1 }])
    missingKeywordLog.clear()
  })
})
