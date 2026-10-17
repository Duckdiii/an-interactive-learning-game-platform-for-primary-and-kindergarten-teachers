import { describe, expect, it } from 'vitest'
import { contrastRows, MIN_CONTRAST_GRAPHIC } from './themeReport'
import { neutralTheme } from './themes/neutral'
import { spaceTheme } from './themes/space'
import type { ThemeManifest } from './themeTypes'
import { validateTheme, type ThemeIssueCode } from './validateTheme'

const codes = (theme: ThemeManifest): ThemeIssueCode[] => validateTheme(theme).map((issue) => issue.code)

describe('validateTheme: họa tiết nền', () => {
  it('theme hợp lệ có họa tiết nền không có lỗi', () => {
    expect(codes(spaceTheme)).toEqual([])
  })

  it('không khai báo họa tiết (undefined) thì không kiểm gì thêm', () => {
    expect(codes({ ...spaceTheme, backdropAssetId: undefined })).toEqual([])
    expect(codes(neutralTheme)).toEqual([])
  })

  it('trỏ tới mã tài nguyên không có thì báo, kèm đường dẫn', () => {
    const issues = validateTheme({ ...spaceTheme, backdropAssetId: 'khong-co' })
    expect(issues).toEqual([expect.objectContaining({ code: 'BACKDROP_ASSET_MISSING', path: 'backdropAssetId' })])
  })

  it('có họa tiết mà tắt paintStageBackground thì báo (sẽ không bao giờ được vẽ)', () => {
    const issues = validateTheme({ ...spaceTheme, paintStageBackground: false })
    expect(issues).toEqual([expect.objectContaining({ code: 'BACKDROP_WITHOUT_BACKGROUND' })])
  })

  it('cả hai lỗi cùng lúc', () => {
    expect(codes({ ...spaceTheme, backdropAssetId: 'x', paintStageBackground: false })).toEqual([
      'BACKDROP_ASSET_MISSING',
      'BACKDROP_WITHOUT_BACKGROUND',
    ])
  })
})

describe('validateTheme: onBackground (chữ vẽ thẳng lên nền sân)', () => {
  const withColors = (overrides: Partial<ThemeManifest['colors']>): ThemeManifest => ({
    ...spaceTheme,
    colors: { ...spaceTheme.colors, ...overrides },
  })

  it('nền tối mà chữ trên nền cũng tối: báo tương phản thấp ở onBackground', () => {
    const issues = validateTheme(withColors({ onBackground: '#1E1B4B' }))
    expect(issues).toEqual([expect.objectContaining({ code: 'CONTRAST_LOW', path: 'colors.onBackground' })])
  })

  it('màu sai định dạng', () => {
    const issues = validateTheme(withColors({ onBackground: 'trắng' }))
    expect(issues).toEqual([expect.objectContaining({ code: 'COLOR_INVALID', path: 'colors.onBackground' })])
  })

  it('chữ trên thẻ (text) tối trên nền sân tối KHÔNG còn bị báo: chữ trên thẻ chỉ so với thẻ', () => {
    // Theme Vũ trụ chính là ca này (nền #0B1026, text #1E1B4B) và phải hợp lệ.
    expect(codes(spaceTheme)).toEqual([])
  })

  it('text vẫn bị so với mọi bề mặt thẻ: text nhạt trên thẻ sáng thì báo ở text', () => {
    const issues = validateTheme(withColors({ text: '#E0E7FF' }))
    expect(issues.length).toBeGreaterThan(0)
    expect(issues.every((issue) => issue.code === 'CONTRAST_LOW' && issue.path === 'colors.text')).toBe(true)
  })
})

describe('contrastRows', () => {
  it('đủ 7 cặp chữ + 3 đồ họa cố định + 6 màu nối = 16 hàng', () => {
    const rows = contrastRows(spaceTheme)
    expect(rows).toHaveLength(16)
    expect(rows.filter((row) => row.kind === 'text')).toHaveLength(7)
    expect(rows.filter((row) => row.kind === 'graphic')).toHaveLength(9)
  })

  it('ngưỡng chữ: 3:1 khi cỡ chữ cơ sở ≥ 24, 4,5:1 khi nhỏ hơn; đồ họa luôn 3:1', () => {
    const large = contrastRows(spaceTheme)
    expect(large.filter((r) => r.kind === 'text').every((r) => r.required === 3)).toBe(true)
    const small = contrastRows({ ...spaceTheme, font: { family: 'Arial', baseSize: 16 } })
    expect(small.filter((r) => r.kind === 'text').every((r) => r.required === 4.5)).toBe(true)
    expect(small.filter((r) => r.kind === 'graphic').every((r) => r.required === MIN_CONTRAST_GRAPHIC)).toBe(true)
  })

  it('ok khớp với phép so ratio ≥ required; màu sai thì ratio null và không ok', () => {
    const rows = contrastRows({ ...spaceTheme, colors: { ...spaceTheme.colors, border: 'xanh' } })
    const border = rows.find((r) => r.label === 'border trên background')!
    expect(border).toMatchObject({ ratio: null, ok: false })
    for (const row of rows.filter((r) => r.ratio !== null)) expect(row.ok).toBe(row.ratio! >= row.required)
  })

  it('cặp chữ trên nền sân dùng onBackground, không phải text', () => {
    const labels = contrastRows(spaceTheme).map((r) => r.label)
    expect(labels).toContain('onBackground trên background')
    expect(labels).not.toContain('text trên background')
  })
})
