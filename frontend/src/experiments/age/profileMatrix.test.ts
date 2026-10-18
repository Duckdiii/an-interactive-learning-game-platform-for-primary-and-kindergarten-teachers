import { describe, expect, it } from 'vitest'
import { AGE_BAND_ORDER } from './ageProfiles'
import { ALL_THEMES } from '../theme/themes'
import { ALL_MECHANICS, gameMatrix, MATRIX_CONTAINER_WIDTHS, PRODUCT_MECHANICS, themeMatrix } from './profileMatrix'

const targetsOf = (mechanic: 'QUIZ' | 'MATCHING' | 'NUMBER_LINE' | 'SYLLABLE_BUILDER' | 'PREPOSITION_SCENE', width: number, band: string) =>
  gameMatrix(MATRIX_CONTAINER_WIDTHS, ALL_MECHANICS)
    .find((c) => c.mechanic === mechanic && c.containerWidth === width && c.band === band)!
    .issues.map((issue) => issue.target)

describe('gameMatrix: đủ ô và kết quả xác định', () => {
  it('2 cơ chế × 3 khung × 3 nhóm tuổi = 18 ô, mỗi tổ hợp đúng một ô', () => {
    const cells = gameMatrix()
    expect(cells).toHaveLength(2 * MATRIX_CONTAINER_WIDTHS.length * AGE_BAND_ORDER.length)
    const keys = cells.map((c) => `${c.mechanic}|${c.containerWidth}|${c.band}`)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('cùng đầu vào cho cùng kết quả', () => {
    expect(gameMatrix()).toEqual(gameMatrix())
  })

  it('nhận danh sách chiều rộng khác', () => {
    expect(gameMatrix([500])).toHaveLength(6)
  })
})

describe('gameMatrix: phát hiện của thử nghiệm (ghim để không bị quên)', () => {
  it('khung 768 và 1280: cả hai cơ chế đạt cả ba nhóm tuổi', () => {
    for (const width of [768, 1280]) {
      for (const band of AGE_BAND_ORDER) {
        expect(targetsOf('QUIZ', width, band)).toEqual([])
        expect(targetsOf('MATCHING', width, band)).toEqual([])
      }
    }
  })

  it('khung 390 (điện thoại): nút «Nghe lại» cao 96 đơn vị chỉ còn 46,8px nên trượt MỌI nhóm tuổi, kể cả lớp 3 đến 5 (48px)', () => {
    for (const band of AGE_BAND_ORDER) expect(targetsOf('QUIZ', 390, band)).toEqual(['audioButton'])
  })

  it('khung 390: các ô đáp án QUIZ (cao 200) đạt cả ba nhóm; chỉ nút nghe lại trượt', () => {
    for (const band of AGE_BAND_ORDER) {
      expect(targetsOf('QUIZ', 390, band).some((target) => target.startsWith('option.'))).toBe(false)
    }
  })

  it('khung 390: thẻ MATCHING (cao tối thiểu 110 → 53,6px) trượt mầm non (64) và lớp 1 đến 2 (56) nhưng đạt lớp 3 đến 5 (48)', () => {
    const cards = (band: string) => targetsOf('MATCHING', 390, band).filter((t) => t.startsWith('left.') || t.startsWith('right.'))
    expect(cards('PRESCHOOL')).toHaveLength(6)
    expect(cards('GRADE_1_2')).toHaveLength(6)
    expect(cards('GRADE_3_5')).toEqual([])
  })

  it('khung 390: nút «Xong rồi!» và «Nghe lại» của MATCHING trượt mọi nhóm tuổi', () => {
    for (const band of AGE_BAND_ORDER) {
      const targets = targetsOf('MATCHING', 390, band)
      expect(targets).toContain('confirmButton')
      expect(targets).toContain('audioButton')
    }
  })

  it('không có lỗi nào ngoài vùng chạm với dữ liệu mẫu (chữ ngắn, 3 cặp, không đồng hồ)', () => {
    const codes = new Set(gameMatrix().flatMap((c) => c.issues.map((i) => i.code)))
    expect([...codes]).toEqual(['TOUCH_TARGET_TOO_SMALL'])
  })
})

describe('themeMatrix', () => {
  it('3 theme × 2 cơ chế × 3 nhóm tuổi = 18 ô', () => {
    expect(themeMatrix()).toHaveLength(18)
  })

  it('mọi theme hiện có đều đạt mọi nhóm tuổi và cả hai cơ chế (cùng khai báo đủ nhóm tuổi, QUIZ và MATCHING)', () => {
    expect(themeMatrix().filter((c) => c.issues.length > 0)).toEqual([])
  })
})

describe('gameMatrix: NUMBER_LINE (T4.1)', () => {
  it('mặc định chỉ gồm hai renderer sản phẩm; thêm loại thử nghiệm phải nêu rõ', () => {
    expect(PRODUCT_MECHANICS).toEqual(['QUIZ', 'MATCHING'])
    expect(gameMatrix().some((c) => c.mechanic === 'NUMBER_LINE')).toBe(false)
    expect(gameMatrix(MATRIX_CONTAINER_WIDTHS, ALL_MECHANICS)).toHaveLength(ALL_MECHANICS.length * MATRIX_CONTAINER_WIDTHS.length * AGE_BAND_ORDER.length)
  })

  it('khung 768 và 1280: đạt cả ba nhóm tuổi', () => {
    for (const width of [768, 1280]) {
      for (const band of AGE_BAND_ORDER) expect(targetsOf('NUMBER_LINE', width, band)).toEqual([])
    }
  })

  it('khung 390 (tỉ lệ 0,4875): điểm kéo 72 → 35,1px trượt mọi nhóm; − + và «Xong rồi!» (120 → 58,5px) chỉ trượt mầm non', () => {
    expect(targetsOf('NUMBER_LINE', 390, 'GRADE_3_5')).toEqual(['marker'])
    expect(targetsOf('NUMBER_LINE', 390, 'GRADE_1_2')).toEqual(['marker'])
    expect(targetsOf('NUMBER_LINE', 390, 'PRESCHOOL').sort()).toEqual(['confirmButton', 'marker', 'minusButton', 'plusButton'])
  })

  it('cả dải thang (200 → 97,5px) luôn đạt: có lối chạm lớn thay cho điểm kéo nhỏ', () => {
    for (const band of AGE_BAND_ORDER) expect(targetsOf('NUMBER_LINE', 390, band)).not.toContain('band')
  })
})

describe('gameMatrix: SYLLABLE_BUILDER (T4.2)', () => {
  it('khung 768 và 1280: đạt cả ba nhóm tuổi', () => {
    for (const width of [768, 1280]) {
      for (const band of AGE_BAND_ORDER) expect(targetsOf('SYLLABLE_BUILDER', width, band)).toEqual([])
    }
  })

  it('khung 390: nút 132 đơn vị → 64,4px nên đạt cả ba nhóm tuổi, kể cả mầm non (64)', () => {
    for (const band of AGE_BAND_ORDER) expect(targetsOf('SYLLABLE_BUILDER', 390, band)).toEqual([])
  })
})

describe('gameMatrix: PREPOSITION_SCENE (T4.3)', () => {
  it('khung 768 và 1280: đạt cả ba nhóm tuổi', () => {
    for (const width of [768, 1280]) {
      for (const band of AGE_BAND_ORDER) expect(targetsOf('PREPOSITION_SCENE', width, band)).toEqual([])
    }
  })

  it('khung 390: vật 100 đơn vị → 48,75px chỉ đạt lớp 3 đến 5 (48); trượt lớp 1 đến 2 (56) và mầm non (64); cảnh và nút «Done!» đạt', () => {
    expect(targetsOf('PREPOSITION_SCENE', 390, 'GRADE_3_5')).toEqual([])
    expect(targetsOf('PREPOSITION_SCENE', 390, 'GRADE_1_2')).toEqual(['item'])
    expect(targetsOf('PREPOSITION_SCENE', 390, 'PRESCHOOL')).toEqual(['item'])
  })
})

describe('theme và NUMBER_LINE', () => {
  it('mọi theme khai báo tương thích cả ba loại thử nghiệm T4', () => {
    for (const theme of ALL_THEMES) {
      expect([theme.id, theme.compatibleMechanics]).toEqual([theme.id, expect.arrayContaining(['NUMBER_LINE', 'SYLLABLE_BUILDER', 'PREPOSITION_SCENE'])])
    }
  })
})
