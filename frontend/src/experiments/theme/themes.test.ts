import { describe, expect, it } from 'vitest'
import { decodeSvgDataUri, svgDataUri } from './art/svgUri'
import { fishSvg, fishUri, oceanBackdropSvg, oceanBackdropUri, waveSvg, waveUri } from './art/oceanArt'
import { planetSvg, planetUri, rocketSvg, rocketUri, spaceBackdropSvg, spaceBackdropUri } from './art/spaceArt'
import { contrastRatio, isHarshRed, parseHex, relativeLuminance } from './contrast'
import { contrastRows, MIN_CONTRAST_GRAPHIC } from './themeReport'
import { ALL_THEMES, findTheme } from './themes'
import { neutralTheme } from './themes/neutral'
import { oceanTheme } from './themes/ocean'
import { spaceTheme } from './themes/space'
import { AGE_BANDS } from './themeTypes'
import { validateTheme } from './validateTheme'

const NEW_THEMES = [spaceTheme, oceanTheme]

describe('danh sách theme', () => {
  it('neutral đứng đầu làm mốc, mã không trùng, tên khác nhau', () => {
    expect(ALL_THEMES[0]).toBe(neutralTheme)
    const ids = ALL_THEMES.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(ALL_THEMES.map((t) => t.name)).size).toBe(ALL_THEMES.length)
    expect(ids).toEqual(['neutral', 'space', 'ocean'])
  })

  it('findTheme tìm đúng và trả undefined khi không có', () => {
    expect(findTheme('space')).toBe(spaceTheme)
    expect(findTheme('ocean')).toBe(oceanTheme)
    expect(findTheme('khong-co')).toBeUndefined()
  })
})

describe.each(ALL_THEMES)('theme $id', (theme) => {
  it('hợp lệ theo validateTheme', () => {
    expect(validateTheme(theme)).toEqual([])
  })

  it('có tên tiếng Việt, đủ nhóm tuổi, cam kết không bạo lực, dùng font Arial cỡ 26 (khớp phép đo chữ của renderer)', () => {
    expect(theme.name.trim().length).toBeGreaterThan(0)
    expect([...theme.ageBands].sort()).toEqual([...AGE_BANDS].sort())
    expect(theme.contentSafety.noViolence).toBe(true)
    expect(theme.font).toEqual({ family: 'Arial', baseSize: 26 })
  })

  it('tương thích QUIZ và MATCHING (hai cơ chế đã có renderer)', () => {
    expect(theme.compatibleMechanics).toEqual(expect.arrayContaining(['QUIZ', 'MATCHING']))
  })

  it('bảng màu đường nối đủ cho 6 cặp, mã tài nguyên không trùng, mỗi tài nguyên có mô tả', () => {
    expect(theme.colors.linkColors.length).toBeGreaterThanOrEqual(6)
    const ids = theme.assets.map((a) => a.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const asset of theme.assets) expect(asset.alt.trim().length).toBeGreaterThan(0)
  })

  it('họa tiết nền (nếu có) trỏ tới tài nguyên có thật', () => {
    if (theme.backdropAssetId !== undefined) {
      expect(theme.assets.map((a) => a.id)).toContain(theme.backdropAssetId)
      expect(theme.paintStageBackground).toBe(true)
    }
  })
})

describe.each(NEW_THEMES)('theme mới $id', (theme) => {
  it('mọi cặp chữ/nền VÀ đồ họa (viền, đường nối) đều đạt tương phản', () => {
    const failing = contrastRows(theme).filter((row) => !row.ok)
    expect(failing.map((row) => `${row.label} ${row.ratio?.toFixed(2)}`)).toEqual([])
  })

  it('vẽ nền riêng và có họa tiết nền', () => {
    expect(theme.paintStageBackground).toBe(true)
    expect(theme.backdropAssetId).toBe('backdrop')
  })

  it('không có màu đỏ gắt ở BẤT KỲ vai trò nào (kể cả đường nối và nhấn)', () => {
    const { linkColors, ...scalar } = theme.colors
    const all = [...Object.values(scalar), ...linkColors]
    expect(all.filter((color) => isHarshRed(color))).toEqual([])
  })

  it('khác neutral ở các vai trò chính (không vô tình chép lại màu cũ)', () => {
    // `surface` không nằm trong danh sách: thẻ trắng của Đại dương cố ý giống neutral (chỉ đổi nền, chữ, viền, nút).
    for (const key of ['background', 'onBackground', 'accent', 'border', 'audioSurface'] as const) {
      expect(theme.colors[key].toUpperCase()).not.toBe(neutralTheme.colors[key].toUpperCase())
    }
  })

  it('màu "đúng" và "thử lại" khác nhau và khác nền thẻ (phân biệt được không chỉ bằng màu đỏ/xanh)', () => {
    const { surface, surfaceCorrect, surfaceTryAgain } = theme.colors
    expect(new Set([surface, surfaceCorrect, surfaceTryAgain]).size).toBe(3)
  })

  it('mỗi theme có ba hình SVG riêng (họa tiết nền và hai hình minh họa)', () => {
    expect(theme.assets).toHaveLength(3)
    expect(theme.assets.every((a) => a.kind === 'svg')).toBe(true)
  })
})

describe('đặc điểm riêng từng theme', () => {
  it('Vũ trụ: nền tối, chữ trên nền sáng rõ (≥ 7:1), thẻ sáng chữ tối', () => {
    const c = spaceTheme.colors
    expect(relativeLuminance(parseHex(c.background)!)).toBeLessThan(0.05)
    expect(contrastRatio(c.onBackground, c.background)!).toBeGreaterThanOrEqual(7)
    expect(contrastRatio(c.text, c.surface)!).toBeGreaterThanOrEqual(7)
    expect(spaceTheme.assets.map((a) => a.id)).toEqual(['backdrop', 'planet', 'rocket'])
  })

  it('Đại dương: nền sáng, chữ xanh đậm, thẻ trắng', () => {
    const c = oceanTheme.colors
    expect(relativeLuminance(parseHex(c.background)!)).toBeGreaterThan(0.7)
    expect(contrastRatio(c.onBackground, c.background)!).toBeGreaterThanOrEqual(7)
    expect(c.surface.toUpperCase()).toBe('#FFFFFF')
    expect(oceanTheme.assets.map((a) => a.id)).toEqual(['backdrop', 'fish', 'wave'])
  })

  it('neutral: ghi nhận hai điểm đồ họa yếu của giao diện hiện tại (mốc, không sửa): đường "thử lại" cam và màu nối thứ 4', () => {
    const weak = contrastRows(neutralTheme)
      .filter((row) => !row.ok)
      .map((row) => row.label)
    expect(weak).toEqual(['lineTryAgain trên background', 'linkColors[3] trên background'])
    expect(contrastRows(neutralTheme).every((row) => row.kind === 'graphic' || row.ok)).toBe(true) // phần chữ đều đạt
    expect(MIN_CONTRAST_GRAPHIC).toBe(3)
  })
})

describe('hình SVG tự vẽ', () => {
  const cases = [
    ['spaceBackdrop', spaceBackdropSvg, spaceBackdropUri],
    ['planet', planetSvg, planetUri],
    ['rocket', rocketSvg, rocketUri],
    ['oceanBackdrop', oceanBackdropSvg, oceanBackdropUri],
    ['fish', fishSvg, fishUri],
    ['wave', waveSvg, waveUri],
  ] as const
  const ALLOWED = new Set(['svg', 'defs', 'lineargradient', 'stop', 'circle', 'ellipse', 'path'])

  describe.each(cases)('%s', (_name, build, toUri) => {
    const markup = build()

    it('là XML hợp lệ, gốc là <svg> có width, height và viewBox khớp nhau', () => {
      const doc = new DOMParser().parseFromString(markup, 'image/svg+xml')
      expect(doc.getElementsByTagName('parsererror')).toHaveLength(0)
      const root = doc.documentElement
      expect(root.tagName).toBe('svg')
      const w = root.getAttribute('width')
      const h = root.getAttribute('height')
      expect(Number(w)).toBeGreaterThan(0)
      expect(Number(h)).toBeGreaterThan(0)
      expect(root.getAttribute('viewBox')).toBe(`0 0 ${w} ${h}`)
    })

    it('chỉ dùng các thẻ hình học an toàn, không script, không sự kiện, không liên kết ngoài', () => {
      const doc = new DOMParser().parseFromString(markup, 'image/svg+xml')
      for (const el of Array.from(doc.getElementsByTagName('*'))) {
        expect(ALLOWED.has(el.tagName.toLowerCase())).toBe(true)
        for (const attr of Array.from(el.attributes)) {
          expect(attr.name.toLowerCase().startsWith('on')).toBe(false)
          expect(attr.name.toLowerCase()).not.toContain('href')
        }
      }
      // Địa chỉ http duy nhất được phép là namespace SVG.
      expect(markup.replace('http://www.w3.org/2000/svg', '')).not.toMatch(/https?:/i)
      expect(markup).not.toMatch(/<script|javascript:/i)
    })

    it('không dùng màu đỏ gắt (nội dung phải thân thiện với trẻ nhỏ)', () => {
      const colors = markup.match(/#[0-9A-Fa-f]{6}\b/g) ?? []
      expect(colors.filter((color) => isHarshRed(color))).toEqual([])
    })

    it('cố định: gọi hai lần cho cùng kết quả (không ngẫu nhiên)', () => {
      expect(build()).toBe(markup)
    })

    it('gọn: dưới 4000 ký tự', () => {
      expect(markup.length).toBeLessThan(4000)
    })

    it('data URI giải ngược đúng ra markup', () => {
      expect(decodeSvgDataUri(toUri())).toBe(markup)
    })
  })

  it('ô nền lặp trong suốt (không có hình chữ nhật phủ kín che màu nền)', () => {
    expect(spaceBackdropSvg()).not.toContain('<rect')
    expect(oceanBackdropSvg()).not.toContain('<rect')
  })

  it('ô nền lặp có kích thước vuông 200 để lát liền mạch', () => {
    expect(spaceBackdropSvg()).toContain('width="200" height="200"')
    expect(oceanBackdropSvg()).toContain('width="200" height="200"')
  })
})

describe('svgDataUri', () => {
  it('mã hóa ký tự đặc biệt và giải ngược lại đúng', () => {
    const markup = '<svg a="1 & 2" b=\'#fff\'>"%</svg>'
    const uri = svgDataUri(markup)
    expect(uri.startsWith('data:image/svg+xml;charset=utf-8,')).toBe(true)
    expect(uri).not.toMatch(/[<>"#\s]/) // an toàn khi đặt vào src
    expect(decodeSvgDataUri(uri)).toBe(markup)
  })
})
