import { describe, expect, it } from 'vitest'
import { buildSvg, extractAll, findIcon } from './fluent-extract-core.mjs'

const iconSet = {
  width: 32,
  height: 32,
  icons: {
    cat: { body: '<path d="M0 0h10v10z" fill="#fc0"/>' },
    wide: { body: '<rect width="40" height="20"/>', width: 40, height: 20 },
    evil: { body: '<script>alert(1)</script>' },
    handler: { body: '<path onclick="x()" d="M0 0"/>' },
    link: { body: '<image href="https://evil.example/x.png"/>' },
    localref: { body: '<use href="#a"/><path id="a" d="M0 0"/>' },
    empty: { body: '' },
  },
  aliases: { kitty: { parent: 'cat' }, ghost: { parent: 'missing' } },
}

describe('findIcon', () => {
  it('tìm trực tiếp và qua bí danh một bước; không có thì undefined', () => {
    expect(findIcon(iconSet, 'cat')).toBe(iconSet.icons.cat)
    expect(findIcon(iconSet, 'kitty')).toBe(iconSet.icons.cat)
    expect(findIcon(iconSet, 'ghost')).toBeUndefined()
    expect(findIcon(iconSet, 'nope')).toBeUndefined()
  })
})

describe('buildSvg', () => {
  it('dựng SVG có xmlns và viewBox theo kích thước của gói', () => {
    expect(buildSvg(iconSet, 'cat')).toBe(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32"><path d="M0 0h10v10z" fill="#fc0"/></svg>\n',
    )
  })
  it('kích thước riêng của icon thắng kích thước chung', () => {
    expect(buildSvg(iconSet, 'wide')).toContain('viewBox="0 0 40 20" width="40" height="20"')
  })
  it('bí danh dùng nội dung của icon gốc', () => {
    expect(buildSvg(iconSet, 'kitty')).toBe(buildSvg(iconSet, 'cat'))
  })
  it('từ chối nội dung chạy mã, trình xử lý sự kiện, liên kết ra ngoài (nhưng cho phép tham chiếu nội bộ #id)', () => {
    expect(buildSvg(iconSet, 'evil')).toBeNull()
    expect(buildSvg(iconSet, 'handler')).toBeNull()
    expect(buildSvg(iconSet, 'link')).toBeNull()
    expect(buildSvg(iconSet, 'localref')).not.toBeNull()
  })
  it('từ chối slug sai dạng (đường dẫn, chữ hoa, rỗng, không phải chuỗi), slug thiếu và icon rỗng', () => {
    for (const slug of ['../cat', 'Cat', 'cat/', '', ' cat', 'cat.svg', 'a--b', undefined, 5, null]) expect(buildSvg(iconSet, slug)).toBeNull()
    expect(buildSvg(iconSet, 'nope')).toBeNull()
    expect(buildSvg(iconSet, 'empty')).toBeNull()
  })
  it('kích thước không hợp lệ thì từ chối', () => {
    expect(buildSvg({ icons: { a: { body: '<path/>', width: 0, height: 10 } } }, 'a')).toBeNull()
    expect(buildSvg({ icons: { a: { body: '<path/>', width: Number.NaN, height: 10 } } }, 'a')).toBeNull()
  })
  it('không có kích thước nào thì mặc định 32', () => {
    expect(buildSvg({ icons: { a: { body: '<path/>' } } }, 'a')).toContain('viewBox="0 0 32 32"')
  })
})

describe('extractAll', () => {
  it('trích đủ, bỏ trùng slug, liệt kê slug thiếu hoặc không an toàn', () => {
    const { files, missing } = extractAll(iconSet, [{ slug: 'cat' }, { slug: 'cat' }, { slug: 'kitty' }, { slug: 'nope' }, { slug: 'evil' }])
    expect([...files.keys()]).toEqual(['cat', 'kitty'])
    expect(missing).toEqual(['nope', 'evil'])
  })
  it('danh sách rỗng thì không có gì', () => {
    const { files, missing } = extractAll(iconSet, [])
    expect(files.size).toBe(0)
    expect(missing).toEqual([])
  })
})
