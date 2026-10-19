import { describe, expect, it } from 'vitest'
import { AUDIO_BUTTON_HEIGHT } from '../../games/common/mediaLayout'
import { CARD_MIN_HEIGHT, CONFIRM_BUTTON_HEIGHT as MATCHING_CONFIRM_BUTTON_HEIGHT } from '../../games/matching/matchingLayout'
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

  it('khung 390 (điện thoại, tỉ lệ lạc quan 0,4875): QUIZ và MATCHING đạt cả ba nhóm tuổi sau T5.4 (nút nghe lại, nút xác nhận, thẻ đều 144 đơn vị → 70,2px)', () => {
    for (const mechanic of ['QUIZ', 'MATCHING'] as const) {
      for (const band of AGE_BAND_ORDER) expect(targetsOf(mechanic, 390, band)).toEqual([])
    }
  })

  it('hằng số bố cục sản phẩm giữ ≥ 144 đơn vị: ở khung 390 có lề trang (sân co ×0,445) 144 mới đạt 64px (ma trận lạc quan 0,4875 không thấy biên này)', () => {
    expect(AUDIO_BUTTON_HEIGHT).toBeGreaterThanOrEqual(144)
    expect(CARD_MIN_HEIGHT).toBeGreaterThanOrEqual(144)
    expect(MATCHING_CONFIRM_BUTTON_HEIGHT).toBeGreaterThanOrEqual(144)
  })

  it('không có lỗi nào (kể cả vùng chạm) với dữ liệu mẫu của hai renderer sản phẩm (chữ ngắn, 3 cặp, không đồng hồ)', () => {
    expect(gameMatrix().flatMap((c) => c.issues)).toEqual([])
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

  it('khung 390 (tỉ lệ 0,4875): nút − + «Xong rồi!» 144 đơn vị và vùng bắt chạm điểm kéo 144 → 70,2px nên đạt cả ba nhóm, kể cả mầm non (64)', () => {
    for (const band of AGE_BAND_ORDER) expect(targetsOf('NUMBER_LINE', 390, band)).toEqual([])
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

  it('khung 390: nút 144 đơn vị → 70,2px nên đạt cả ba nhóm tuổi, kể cả mầm non (64)', () => {
    for (const band of AGE_BAND_ORDER) expect(targetsOf('SYLLABLE_BUILDER', 390, band)).toEqual([])
  })
})

describe('gameMatrix: PREPOSITION_SCENE (T4.3)', () => {
  it('khung 768 và 1280: đạt cả ba nhóm tuổi', () => {
    for (const width of [768, 1280]) {
      for (const band of AGE_BAND_ORDER) expect(targetsOf('PREPOSITION_SCENE', width, band)).toEqual([])
    }
  })

  it('khung 390: vùng bắt chạm của vật (100 + 44 = 144 đơn vị → 70,2px) và nút «Done!» (144) đạt cả ba nhóm, kể cả mầm non (64)', () => {
    for (const band of AGE_BAND_ORDER) expect(targetsOf('PREPOSITION_SCENE', 390, band)).toEqual([])
  })
})

describe('theme và NUMBER_LINE', () => {
  it('mọi theme khai báo tương thích cả ba loại thử nghiệm T4', () => {
    for (const theme of ALL_THEMES) {
      expect([theme.id, theme.compatibleMechanics]).toEqual([theme.id, expect.arrayContaining(['NUMBER_LINE', 'SYLLABLE_BUILDER', 'PREPOSITION_SCENE'])])
    }
  })
})
