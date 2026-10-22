import { describe, expect, it } from 'vitest'
import { FLUENT_INDEX, FLUENT_KEYWORDS, FLUENT_URLS } from './emojiCatalog'
import { resolveImage } from './resolveImage'

const rawSvgs = import.meta.glob<string>('../../../assets/emoji/fluent/*.svg', { query: '?raw', import: 'default', eager: true })
const svgBySlug = new Map(Object.entries(rawSvgs).map(([path, svg]) => [path.slice(path.lastIndexOf('/') + 1).replace(/\.svg$/, ''), svg]))

describe('thư viện Fluent Emoji Flat cục bộ', () => {
  it('có 299 từ khóa, slug duy nhất, đủ trường, mọi slug dạng chữ thường gạch nối', () => {
    expect(FLUENT_KEYWORDS).toHaveLength(299)
    expect(new Set(FLUENT_KEYWORDS.map((entry) => entry.slug)).size).toBe(299)
    for (const entry of FLUENT_KEYWORDS) {
      expect(entry.slug, entry.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
      expect(entry.name.length, entry.slug).toBeGreaterThan(0)
      expect(entry.category.length, entry.slug).toBeGreaterThan(0)
      expect(entry.aliases.length, entry.slug).toBeGreaterThan(0)
    }
  })

  it('mỗi từ khóa có đúng một tệp SVG trong thư mục và ngược lại (không tệp mồ côi); slug khớp URL của bundler', () => {
    const files = [...svgBySlug.keys()].sort()
    expect(files).toEqual(FLUENT_KEYWORDS.map((entry) => entry.slug).sort())
    expect(Object.keys(FLUENT_URLS).sort()).toEqual(files)
    for (const url of Object.values(FLUENT_URLS)) expect(url.startsWith('data:'), url.slice(0, 40)).toBe(false) // không nhúng vào gói JS
  })

  it('mọi tệp SVG hợp lệ và an toàn: có xmlns, viewBox, không script/sự kiện/liên kết ngoài, dưới 20 KB', () => {
    for (const entry of FLUENT_KEYWORDS) {
      const svg = svgBySlug.get(entry.slug) ?? ''
      // Hầu hết 32×32; vài hình (ví dụ swan, keycap-5) cao 33 theo gói gốc.
      expect(svg, entry.slug).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 32 3[0-3]" width="32" height="3[0-3]">/)
      expect(svg.trimEnd().endsWith('</svg>'), entry.slug).toBe(true)
      expect(svg, entry.slug).not.toMatch(/<script|<foreignObject|\son[a-z]+\s*=|javascript:|href\s*=\s*["'](?!#)/i)
      expect(svg.length, entry.slug).toBeLessThan(20_000)
    }
  })

  it('dữ liệu từ khóa sạch: không có hai mục cùng khóa chính xác; tên chính của mọi mục khớp về chính nó', () => {
    expect(FLUENT_INDEX.conflictingExactKeys()).toEqual([])
    for (const entry of FLUENT_KEYWORDS) {
      expect(FLUENT_INDEX.find(entry.name)?.entry.slug, entry.name).toBe(entry.slug)
      expect(FLUENT_INDEX.find(entry.name)?.kind, entry.name).toBe('exact')
    }
  })

  it('mọi bí danh có dấu và không dấu đã khai trỏ về đúng mục của nó', () => {
    for (const entry of FLUENT_KEYWORDS) {
      for (const alias of entry.aliases) expect(FLUENT_INDEX.find(alias)?.entry.slug, `${entry.slug} ← ${alias}`).toBe(entry.slug)
    }
  })

  it('tên có từ loại («con mèo», «cây nấm», «quả táo»...): bỏ từ loại, phần còn lại vẫn ra đúng mục (không trôi sang mục khác như «nấm» → «năm»)', () => {
    const classifiers = ['con', 'quả', 'trái', 'cái', 'chiếc', 'cây', 'củ', 'chùm']
    for (const entry of FLUENT_KEYWORDS) {
      const [first, ...rest] = entry.name.split(' ')
      if (!classifiers.includes(first) || rest.length === 0) continue
      const bare = rest.join(' ')
      const hit = FLUENT_INDEX.find(bare)?.entry
      // Danh từ trơn có thể thuộc hai mục («cây dừa» và «quả dừa» cùng có «dừa»): mục đứng trước thắng, nhưng không được ra mục KHÔNG có danh từ đó.
      const sharing = FLUENT_KEYWORDS.filter((other) => other.name.split(' ').slice(1).join(' ') === bare && classifiers.includes(other.name.split(' ')[0]))
      expect(sharing.map((other) => other.slug), `${entry.name} → ${bare} → ${hit?.slug}`).toContain(hit?.slug)
    }
  })

  it('các khóa không dấu mơ hồ đã biết (chỉ khi gõ không dấu): danh sách cố định để người thêm từ khóa soát', () => {
    expect([...FLUENT_INDEX.ambiguousLooseKeys()].sort()).toEqual(['ba', 'cai keo', 'con bo', 'con de', 'ong', 'qua dua'])
  })

  it('mọi từ khóa tra qua resolveImage ra hình cục bộ đúng slug, không ghi nhận thiếu', () => {
    for (const entry of FLUENT_KEYWORDS) {
      const image = resolveImage(entry.name, { log: null })
      expect(image.tier, entry.slug).toBe('fluent')
      expect(image.slug, entry.slug).toBe(entry.slug)
      expect(image.src, entry.slug).toBe(FLUENT_URLS[entry.slug])
    }
  })

  it('ví dụ của đề bài: «con mèo», «meo», «cat» cùng ra con mèo', () => {
    const slugs = ['con mèo', 'meo', 'cat'].map((keyword) => resolveImage(keyword, { log: null }).slug)
    expect(slugs).toEqual(['cat-face', 'cat-face', 'cat-face'])
  })

  it('hình tiêu biểu của trò Vườn hoa (ong, bướm, bọ rùa, nấm, ốc sên, hoa, mặt trời, chim) đều có', () => {
    for (const keyword of ['ong', 'bướm', 'bọ rùa', 'nấm', 'ốc sên', 'hoa', 'mặt trời', 'chim', 'mây'])
      expect(resolveImage(keyword, { log: null }).tier, keyword).toBe('fluent')
  })
})
