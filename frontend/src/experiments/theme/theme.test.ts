import { describe, expect, it } from 'vitest'
import { contrastRatio, isHarshRed, parseHex, toHsl } from './contrast'
import { neutralTheme } from './themes/neutral'
import { AGE_BANDS, KNOWN_MECHANICS, type ThemeManifest } from './themeTypes'
import { validateTheme, type ThemeIssueCode } from './validateTheme'

const SVG = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg"/>'

function makeTheme(overrides: Partial<ThemeManifest> = {}): ThemeManifest {
  return {
    id: 'test',
    name: 'Theme thử',
    ageBands: ['PRESCHOOL', 'GRADE_1_2'],
    paintStageBackground: false,
    colors: {
      ...neutralTheme.colors,
      background: '#F8FAFC',
      surface: '#FFFFFF',
      surfaceSelected: '#DBEAFE',
      surfaceCorrect: '#A5D6A7',
      surfaceTryAgain: '#FFE082',
      text: '#1E293B',
      border: '#334155',
      accent: '#2563EB',
      onAccent: '#FFFFFF',
    },
    font: { family: 'sans-serif', baseSize: 26 },
    compatibleMechanics: ['QUIZ', 'MATCHING'],
    contentSafety: { noViolence: true },
    assets: [{ id: 'star', kind: 'svg', src: SVG, alt: 'Ngôi sao' }],
    ...overrides,
  }
}

const codes = (theme: ThemeManifest): ThemeIssueCode[] => validateTheme(theme).map((issue) => issue.code)

describe('contrast helpers', () => {
  it('parseHex đọc #RGB, #RRGGBB, không phân biệt hoa thường', () => {
    expect(parseHex('#fff')).toEqual({ r: 255, g: 255, b: 255 })
    expect(parseHex('#A5D6A7')).toEqual({ r: 165, g: 214, b: 167 })
    expect(parseHex('#a5d6a7')).toEqual({ r: 165, g: 214, b: 167 })
  })

  it.each(['red', '#12345', '#GGGGGG', '#1234567', '', '123456', 'rgb(0,0,0)'])('parseHex từ chối %j', (input) => {
    expect(parseHex(input)).toBeNull()
  })

  it('contrastRatio khớp giá trị WCAG đã biết', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5)
    expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 5)
    // Ngưỡng AA 4,5:1: #767676 trên trắng vừa đạt, #777777 vừa trượt.
    expect(contrastRatio('#767676', '#FFFFFF')).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio('#777777', '#FFFFFF')).toBeLessThan(4.5)
  })

  it('contrastRatio đối xứng và trả null khi màu sai', () => {
    expect(contrastRatio('#123456', '#FEDCBA')).toBeCloseTo(contrastRatio('#FEDCBA', '#123456')!, 10)
    expect(contrastRatio('red', '#FFFFFF')).toBeNull()
    expect(contrastRatio('#FFFFFF', 'xyz')).toBeNull()
  })

  it('toHsl cho đỏ, xanh lá, xám', () => {
    expect(toHsl({ r: 255, g: 0, b: 0 })).toEqual({ h: 0, s: 1, l: 0.5 })
    expect(toHsl({ r: 0, g: 255, b: 0 }).h).toBeCloseTo(120, 5)
    expect(toHsl({ r: 128, g: 128, b: 128 }).s).toBe(0)
  })

  it.each([
    ['#FF0000', true],
    ['#DC2626', true],
    ['#B91C1C', true],
    ['#FF1010', true],
    ['#FECACA', false], // đỏ rất nhạt
    ['#FFE082', false], // vàng dịu của thẻ «thử lại»
    ['#A5D6A7', false], // xanh lá
    ['#808080', false], // xám
    ['#F9A8D4', false], // hồng
    ['#E11D48', true], // nhánh vòng sắc độ (≈347°)
    ['#FF4500', true], // đỏ cam (≈16°) nằm trong ngưỡng 20°
    ['#FF8000', false], // cam (≈30°)
    ['#7F0000', true], // đỏ sẫm, độ sáng ≈0,25
    ['#4C0000', false], // đỏ rất tối, độ sáng ≈0,15 dưới ngưỡng
    ['#E57373', true], // đỏ dịu kiểu Material vẫn bị chặn (ghi nhận, xem comment hàm)
    ['#FF6B6B', false], // san hô sáng (độ sáng ≈0,71) lọt qua (ghi nhận)
    ['không phải màu', false],
  ])('isHarshRed(%s) = %s', (color, expected) => {
    expect(isHarshRed(color)).toBe(expected)
  })
})

describe('validateTheme', () => {
  it('theme hợp lệ không có lỗi', () => {
    expect(validateTheme(makeTheme())).toEqual([])
  })

  it('mọi nhóm tuổi và cơ chế biết đều được chấp nhận', () => {
    expect(codes(makeTheme({ ageBands: [...AGE_BANDS], compatibleMechanics: [...KNOWN_MECHANICS] }))).toEqual([])
  })

  it('mã và tên rỗng', () => {
    expect(codes(makeTheme({ id: '  ', name: '' }))).toEqual(['ID_EMPTY', 'NAME_EMPTY'])
  })

  describe('nhóm tuổi', () => {
    it('rỗng', () => expect(codes(makeTheme({ ageBands: [] }))).toEqual(['AGE_BANDS_EMPTY']))
    it('không biết', () => {
      const issues = validateTheme(makeTheme({ ageBands: ['PRESCHOOL', 'ADULT' as never] }))
      expect(issues).toHaveLength(1)
      expect(issues[0]).toMatchObject({ code: 'AGE_BAND_UNKNOWN', path: 'ageBands[1]' })
    })
    it('trùng', () => {
      expect(codes(makeTheme({ ageBands: ['PRESCHOOL', 'PRESCHOOL'] }))).toEqual(['AGE_BAND_DUPLICATE'])
    })
  })

  describe('màu và tương phản', () => {
    it.each(['red', '#12', '', '#GGGGGG'])('màu sai định dạng %j', (bad) => {
      const theme = makeTheme()
      theme.colors = { ...theme.colors, border: bad }
      const issues = validateTheme(theme)
      expect(issues).toEqual([expect.objectContaining({ code: 'COLOR_INVALID', path: 'colors.border' })])
    })

    it('màu chữ sai thì không báo thêm lỗi tương phản dây chuyền', () => {
      const theme = makeTheme()
      theme.colors = { ...theme.colors, text: 'đen' }
      expect(codes(theme)).toEqual(['COLOR_INVALID'])
    })

    it('chữ nhạt trên nền sáng: trượt với chữ thường', () => {
      const theme = makeTheme({ font: { family: 'sans-serif', baseSize: 16 } })
      theme.colors = { ...theme.colors, text: '#999999' }
      const issues = validateTheme(theme)
      expect(issues.length).toBeGreaterThan(0)
      expect(issues.every((issue) => issue.code === 'CONTRAST_LOW' && issue.path === 'colors.text')).toBe(true)
    })

    it('cùng màu #777777 (≈4,48:1): trượt ở cỡ 23 nhưng đạt ở cỡ 24 (chữ lớn, ngưỡng 3:1)', () => {
      // Mọi nền đều trắng để chỉ còn một cặp (chữ #777777, nền trắng) quyết định kết quả.
      const white = '#FFFFFF'
      const colors = {
        ...makeTheme().colors,
        text: '#777777',
        background: white,
        surface: white,
        surfaceSelected: white,
        surfaceCorrect: white,
        surfaceTryAgain: white,
        audioSurface: white,
      }
      const small = makeTheme({ font: { family: 'sans-serif', baseSize: 23 } })
      small.colors = colors
      const large = makeTheme({ font: { family: 'sans-serif', baseSize: 24 } })
      large.colors = colors
      expect(codes(small)).toContain('CONTRAST_LOW')
      expect(codes(large)).not.toContain('CONTRAST_LOW')
    })

    it('ranh giới 4,5:1 ở chữ thường: #767676 trên trắng đạt, #777777 trượt', () => {
      const white = '#FFFFFF'
      const base = { ...makeTheme().colors, background: white, surface: white, surfaceSelected: white, audioSurface: white }
      const pass = makeTheme({ font: { family: 'sans-serif', baseSize: 16 } })
      pass.colors = { ...base, text: '#767676', surfaceCorrect: white, surfaceTryAgain: white }
      const fail = makeTheme({ font: { family: 'sans-serif', baseSize: 16 } })
      fail.colors = { ...base, text: '#777777', surfaceCorrect: white, surfaceTryAgain: white }
      expect(codes(pass)).not.toContain('CONTRAST_LOW')
      expect(codes(fail)).toContain('CONTRAST_LOW')
    })

    it('chữ rất nhạt trượt cả ở chữ lớn', () => {
      const theme = makeTheme({ font: { family: 'sans-serif', baseSize: 40 } })
      theme.colors = { ...theme.colors, text: '#CCCCCC', surface: '#FFFFFF' }
      expect(codes(theme)).toContain('CONTRAST_LOW')
    })

    it('nút: chữ trên nền nhấn nhạt bị báo ở onAccent', () => {
      const theme = makeTheme()
      theme.colors = { ...theme.colors, accent: '#93C5FD', onAccent: '#FFFFFF' }
      expect(validateTheme(theme)).toEqual([expect.objectContaining({ code: 'CONTRAST_LOW', path: 'colors.onAccent' })])
    })
  })

  describe('vai trò màu mở rộng', () => {
    it.each(['accentBorder', 'disabledSurface', 'disabledBorder', 'onDisabled', 'audioSurface', 'audioBorder', 'lineCorrect', 'lineTryAgain'] as const)(
      'màu %s sai định dạng bị báo',
      (key) => {
        const theme = makeTheme()
        theme.colors = { ...theme.colors, [key]: 'xanh' }
        expect(validateTheme(theme).some((i) => i.code === 'COLOR_INVALID' && i.path === `colors.${key}`)).toBe(true)
      },
    )

    it('nút khóa chữ nhạt trên nền nhạt KHÔNG bị báo tương phản (WCAG miễn trừ)', () => {
      const theme = makeTheme()
      theme.colors = { ...theme.colors, disabledSurface: '#FFFFFF', onDisabled: '#EEEEEE' }
      expect(codes(theme)).toEqual([])
    })

    it('chữ trên nút «Nghe lại» được kiểm tương phản', () => {
      const theme = makeTheme()
      theme.colors = { ...theme.colors, text: '#CCCCCC', audioSurface: '#FFFFFF' }
      expect(validateTheme(theme).some((i) => i.code === 'CONTRAST_LOW' && i.message.includes('audioSurface'))).toBe(true)
    })

    it('đường nối đỏ gắt bị chặn như màu phản hồi', () => {
      const theme = makeTheme()
      theme.colors = { ...theme.colors, lineTryAgain: '#DC2626' }
      expect(validateTheme(theme)).toEqual([expect.objectContaining({ code: 'FEEDBACK_HARSH_RED', path: 'colors.lineTryAgain' })])
    })

    it('linkColors: đủ 6 màu thì hợp lệ, 5 màu thì báo thiếu', () => {
      const six = makeTheme()
      expect(six.colors.linkColors).toHaveLength(6)
      expect(codes(six)).toEqual([])
      const five = makeTheme()
      five.colors = { ...five.colors, linkColors: five.colors.linkColors.slice(0, 5) }
      expect(validateTheme(five)).toEqual([expect.objectContaining({ code: 'LINK_COLORS_TOO_FEW', path: 'colors.linkColors' })])
    })

    it('linkColors: màu sai chỉ rõ vị trí', () => {
      const theme = makeTheme()
      const bad = [...theme.colors.linkColors]
      bad[2] = 'hồng'
      theme.colors = { ...theme.colors, linkColors: bad }
      expect(validateTheme(theme)).toEqual([expect.objectContaining({ code: 'COLOR_INVALID', path: 'colors.linkColors[2]' })])
    })
  })

  describe('phản hồi không đỏ gắt', () => {
    it.each(['surfaceCorrect', 'surfaceTryAgain'] as const)('%s đỏ gắt bị chặn', (key) => {
      const theme = makeTheme()
      theme.colors = { ...theme.colors, [key]: '#DC2626' }
      expect(validateTheme(theme).map((i) => i.code)).toContain('FEEDBACK_HARSH_RED')
      expect(validateTheme(theme).find((i) => i.code === 'FEEDBACK_HARSH_RED')?.path).toBe(`colors.${key}`)
    })

    it('đỏ nhạt (hồng nhạt) được chấp nhận', () => {
      const theme = makeTheme()
      theme.colors = { ...theme.colors, surfaceTryAgain: '#FECACA' }
      expect(codes(theme)).toEqual([])
    })

    it('chỉ kiểm vai trò phản hồi: viền đỏ không bị coi là lỗi này', () => {
      const theme = makeTheme()
      theme.colors = { ...theme.colors, border: '#B91C1C' }
      expect(codes(theme)).not.toContain('FEEDBACK_HARSH_RED')
    })
  })

  describe('phông chữ', () => {
    it('họ phông rỗng', () => {
      expect(codes(makeTheme({ font: { family: ' ', baseSize: 26 } }))).toEqual(['FONT_FAMILY_EMPTY'])
    })
    it.each([0, 11, 73, Number.NaN, Number.POSITIVE_INFINITY, -5])('cỡ chữ %s không hợp lệ', (baseSize) => {
      expect(codes(makeTheme({ font: { family: 'sans-serif', baseSize } }))).toContain('FONT_SIZE_INVALID')
    })
    it.each([12, 24, 72])('cỡ chữ %s ở ranh giới hợp lệ', (baseSize) => {
      expect(codes(makeTheme({ font: { family: 'sans-serif', baseSize } }))).not.toContain('FONT_SIZE_INVALID')
    })
  })

  describe('cơ chế tương thích', () => {
    it('rỗng', () => expect(codes(makeTheme({ compatibleMechanics: [] }))).toEqual(['MECHANICS_EMPTY']))
    it('không biết', () => {
      const issues = validateTheme(makeTheme({ compatibleMechanics: ['QUIZ', 'RACING' as never] }))
      expect(issues).toEqual([expect.objectContaining({ code: 'MECHANIC_UNKNOWN', path: 'compatibleMechanics[1]' })])
    })
    it('trùng', () => {
      expect(codes(makeTheme({ compatibleMechanics: ['QUIZ', 'QUIZ'] }))).toEqual(['MECHANIC_DUPLICATE'])
    })
  })

  describe('cờ an toàn nội dung', () => {
    it('tắt thì báo', () => {
      expect(codes(makeTheme({ contentSafety: { noViolence: false } }))).toEqual(['SAFETY_FLAG_OFF'])
    })
    it('giá trị không phải true (ép kiểu sai) cũng báo', () => {
      expect(codes(makeTheme({ contentSafety: { noViolence: 'true' as never } }))).toEqual(['SAFETY_FLAG_OFF'])
    })
  })

  describe('tài nguyên', () => {
    it('không có tài nguyên vẫn hợp lệ', () => expect(codes(makeTheme({ assets: [] }))).toEqual([]))
    it.each([
      'https://example.com/star.svg',
      '/images/star.svg',
      'data:image/png;base64,AAAA',
      'star.svg',
      'data:image/svg+xmlX,<svg/>', // thiếu dấu ; hoặc , sau loại nội dung
    ])('src ngoài/không phải SVG nhúng %j bị chặn', (src) => {
      const issues = validateTheme(makeTheme({ assets: [{ id: 'a', kind: 'svg', src, alt: 'x' }] }))
      expect(issues).toEqual([expect.objectContaining({ code: 'ASSET_EXTERNAL', path: 'assets[0].src' })])
    })
    it.each([
      'data:image/svg+xml,<svg><script>alert(1)</script></svg>',
      'data:image/svg+xml,<svg onload="x()"/>',
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg"><a href="javascript:x()"/></svg>',
      'data:image/svg+xml,%3Csvg%3E%3Cscript%3Ex()%3C/script%3E%3C/svg%3E', // đã mã hóa %XX
      'data:image/svg+xml,<SVG ONCLICK = "x()"/>',
    ])('SVG chứa mã chạy được %j bị chặn', (src) => {
      const issues = validateTheme(makeTheme({ assets: [{ id: 'a', kind: 'svg', src, alt: 'x' }] }))
      expect(issues).toEqual([expect.objectContaining({ code: 'ASSET_UNSAFE', path: 'assets[0].src' })])
    })
    it('SVG hợp lệ có thuộc tính thường gặp không bị báo nhầm', () => {
      const src =
        'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" opacity="0.5" fill="%23FF0"/></svg>'
      expect(codes(makeTheme({ assets: [{ id: 'a', kind: 'svg', src, alt: 'x' }] }))).toEqual([])
    })
    it('src %XX hỏng vẫn không ném lỗi', () => {
      const src = 'data:image/svg+xml,%E0%A4%A<svg/>'
      expect(() => validateTheme(makeTheme({ assets: [{ id: 'a', kind: 'svg', src, alt: 'x' }] }))).not.toThrow()
    })
    it('mã trùng, mã rỗng và thiếu alt', () => {
      const issues = validateTheme(
        makeTheme({
          assets: [
            { id: 'a', kind: 'svg', src: SVG, alt: 'một' },
            { id: 'a', kind: 'svg', src: SVG, alt: 'hai' },
            { id: ' ', kind: 'svg', src: SVG, alt: ' ' },
          ],
        }),
      )
      expect(issues.map((i) => `${i.code}@${i.path}`)).toEqual([
        'ASSET_ID_DUPLICATE@assets[1].id',
        'ASSET_ID_EMPTY@assets[2].id',
        'ASSET_ALT_EMPTY@assets[2].alt',
      ])
    })
  })

  it('gom nhiều lỗi cùng lúc, mỗi lỗi một đường dẫn rõ', () => {
    const theme = makeTheme({ id: '', ageBands: [], compatibleMechanics: [], contentSafety: { noViolence: false } })
    expect(codes(theme)).toEqual(['ID_EMPTY', 'AGE_BANDS_EMPTY', 'MECHANICS_EMPTY', 'SAFETY_FLAG_OFF'])
  })
})
