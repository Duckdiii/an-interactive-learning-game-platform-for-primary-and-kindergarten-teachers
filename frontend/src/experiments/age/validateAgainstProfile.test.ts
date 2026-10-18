import { describe, expect, it } from 'vitest'
import { neutralTheme } from '../theme/themes/neutral'
import { spaceTheme } from '../theme/themes/space'
import type { ThemeManifest } from '../theme/themeTypes'
import { AGE_BAND_ORDER, AGE_PROFILES } from './ageProfiles'
import {
  validateAgainstProfile,
  visibleLength,
  type GameFacts,
  type ProfileIssueCode,
} from './validateAgainstProfile'

const baseFacts = (overrides: Partial<GameFacts> = {}): GameFacts => ({
  mechanic: 'TEST',
  stageWidth: 800,
  containerWidth: 800,
  touchTargets: [{ id: 'big', width: 300, height: 200 }],
  texts: [{ id: 'q', text: 'Xin chào', kind: 'question' }],
  optionCount: 2,
  showsTimer: false,
  showsLiveLeaderboard: false,
  ...overrides,
})

const codes = (facts: GameFacts, band: (typeof AGE_BAND_ORDER)[number]): ProfileIssueCode[] =>
  validateAgainstProfile({ kind: 'game', facts }, AGE_PROFILES[band]).map((issue) => issue.code)

describe('visibleLength', () => {
  it('đếm điểm mã sau chuẩn hóa NFC: dạng tổ hợp và dựng sẵn cho cùng độ dài', () => {
    const composed = 'ế'.normalize('NFC')
    const decomposed = 'ế'.normalize('NFD')
    expect(decomposed.length).toBeGreaterThan(composed.length)
    expect(visibleLength(composed)).toBe(1)
    expect(visibleLength(decomposed)).toBe(1)
  })

  it.each([
    ['', 0],
    ['abc', 3],
    ['Việt Nam', 8],
    ['🙂🙂', 2], // điểm mã ngoài BMP đếm một, không đếm hai đơn vị UTF-16
    ['q̣', 1], // dấu tổ hợp không có dạng dựng sẵn: 2 điểm mã nhưng 1 cụm ký tự
    ['👨‍👩‍👧', 1], // emoji ghép bằng ZWJ là một cụm
    ['🇻🇳', 1], // cờ (hai ký tự vùng) là một cụm
    ['a🇻🇳b', 3],
  ])('%j → %s (đếm cụm ký tự người dùng thấy)', (text, expected) => {
    expect(visibleLength(text)).toBe(expected)
  })
})

describe('validateAgainstProfile: theme', () => {
  const themeCodes = (theme: ThemeManifest, band: (typeof AGE_BAND_ORDER)[number], mechanic?: string) =>
    validateAgainstProfile({ kind: 'theme', theme, mechanic }, AGE_PROFILES[band]).map((i) => i.code)

  it('theme khai báo đủ nhóm tuổi và cơ chế thì đạt cả ba nhóm', () => {
    for (const band of AGE_BAND_ORDER) {
      expect(themeCodes(spaceTheme, band, 'QUIZ')).toEqual([])
      expect(themeCodes(neutralTheme, band, 'MATCHING')).toEqual([])
    }
  })

  it('theme không khai báo nhóm tuổi đó thì báo, kèm tên nhóm trong thông báo', () => {
    const noPreschool: ThemeManifest = { ...spaceTheme, ageBands: ['GRADE_3_5'] }
    expect(themeCodes(noPreschool, 'PRESCHOOL')).toEqual(['THEME_NOT_FOR_BAND'])
    expect(themeCodes(noPreschool, 'GRADE_3_5')).toEqual([])
    const [issue] = validateAgainstProfile({ kind: 'theme', theme: noPreschool }, AGE_PROFILES.PRESCHOOL)
    expect(issue.message).toContain('Mầm non')
    expect(issue.message).toContain('space')
  })

  it('cơ chế chưa được theme hỗ trợ thì báo; không nêu cơ chế thì không kiểm', () => {
    expect(themeCodes(spaceTheme, 'GRADE_1_2', 'TIME_ATTACK')).toEqual(['THEME_MECHANIC_UNSUPPORTED'])
    expect(themeCodes(spaceTheme, 'GRADE_1_2')).toEqual([])
  })

  it('cả hai lỗi cùng lúc, theo thứ tự nhóm tuổi rồi cơ chế', () => {
    const narrow: ThemeManifest = { ...spaceTheme, ageBands: ['GRADE_3_5'], compatibleMechanics: ['QUIZ'] }
    expect(themeCodes(narrow, 'PRESCHOOL', 'MATCHING')).toEqual(['THEME_NOT_FOR_BAND', 'THEME_MECHANIC_UNSUPPORTED'])
  })
})

describe('validateAgainstProfile: hẹn giờ và bảng xếp hạng sống', () => {
  it('mầm non không được hiện đồng hồ đếm ngược', () => {
    expect(codes(baseFacts({ showsTimer: true }), 'PRESCHOOL')).toEqual(['TIMER_NOT_ALLOWED'])
  })

  it('mầm non không được hiện bảng xếp hạng sống', () => {
    expect(codes(baseFacts({ showsLiveLeaderboard: true }), 'PRESCHOOL')).toEqual(['LEADERBOARD_NOT_ALLOWED'])
  })

  it('lớp 1 trở lên được phép cả hai', () => {
    for (const band of ['GRADE_1_2', 'GRADE_3_5'] as const) {
      expect(codes(baseFacts({ showsTimer: true, showsLiveLeaderboard: true }), band)).toEqual([])
    }
  })

  it('không hiện thì không lỗi ở mọi nhóm', () => {
    for (const band of AGE_BAND_ORDER) expect(codes(baseFacts(), band)).toEqual([])
  })

  it('cả hai lỗi cùng lúc ở mầm non', () => {
    expect(codes(baseFacts({ showsTimer: true, showsLiveLeaderboard: true }), 'PRESCHOOL')).toEqual([
      'TIMER_NOT_ALLOWED',
      'LEADERBOARD_NOT_ALLOWED',
    ])
  })
})

describe('validateAgainstProfile: vùng chạm (px màn hình sau co giãn)', () => {
  const targetFacts = (height: number, containerWidth: number) =>
    baseFacts({ containerWidth, touchTargets: [{ id: 'btn', width: 400, height }] })

  it('lấy cạnh NGẮN của vùng chạm, không phải cạnh dài', () => {
    expect(codes(baseFacts({ touchTargets: [{ id: 't', width: 1000, height: 50 }] }), 'PRESCHOOL')).toEqual(['TOUCH_TARGET_TOO_SMALL'])
    expect(codes(baseFacts({ touchTargets: [{ id: 't', width: 50, height: 1000 }] }), 'PRESCHOOL')).toEqual(['TOUCH_TARGET_TOO_SMALL'])
  })

  it.each([
    ['PRESCHOOL', 64],
    ['GRADE_1_2', 56],
    ['GRADE_3_5', 48],
  ] as const)('%s: đúng %spx thì đạt, thiếu 0,5px thì không', (band, min) => {
    expect(codes(targetFacts(min, 800), band)).toEqual([])
    expect(codes(targetFacts(min - 0.5, 800), band)).toEqual(['TOUCH_TARGET_TOO_SMALL'])
  })

  it('co giãn: cùng vùng chạm 110 đạt ở khung rộng nhưng trượt ở khung hẹp', () => {
    expect(codes(targetFacts(110, 800), 'PRESCHOOL')).toEqual([])
    // 110 × (390/800) = 53,6 px < 64
    expect(codes(targetFacts(110, 390), 'PRESCHOOL')).toEqual(['TOUCH_TARGET_TOO_SMALL'])
    // cùng 53,6px vẫn trượt 56 nhưng đạt 48
    expect(codes(targetFacts(110, 390), 'GRADE_1_2')).toEqual(['TOUCH_TARGET_TOO_SMALL'])
    expect(codes(targetFacts(110, 390), 'GRADE_3_5')).toEqual([])
  })

  it('khung rộng hơn sân thì không phóng to thêm (tối đa hệ số 1)', () => {
    expect(codes(targetFacts(60, 5000), 'PRESCHOOL')).toEqual(['TOUCH_TARGET_TOO_SMALL']) // 60 < 64, không được nhờ khung rộng
  })

  it('vùng chạm nhỏ hơn ngưỡng ngay cả ở hệ số 1: thông báo KHÔNG hứa "đạt khi sân rộng từ ..." (mở rộng khung vô ích)', () => {
    const [issue] = validateAgainstProfile({ kind: 'game', facts: targetFacts(60, 5000) }, AGE_PROFILES.PRESCHOOL)
    expect(issue.message).toContain('không đạt ở mọi chiều rộng khung')
    expect(issue.message).toContain('tăng kích thước thiết kế')
    expect(issue.message).not.toContain('đạt khi sân rộng từ')
  })

  it('đạt được khi mở rộng khung thì thông báo nêu chiều rộng cần (≤ sân)', () => {
    const [issue] = validateAgainstProfile({ kind: 'game', facts: targetFacts(110, 390) }, AGE_PROFILES.PRESCHOOL)
    expect(issue.message).toContain('đạt khi sân rộng từ 466px')
    expect(issue.message).not.toContain('không đạt ở mọi chiều rộng')
  })

  it.each([
    ['NaN', { width: Number.NaN, height: 100 }],
    ['Infinity', { width: Number.POSITIVE_INFINITY, height: 100 }],
    ['cao NaN', { width: 100, height: Number.NaN }],
  ])('kích thước vùng chạm %s: báo INVALID_FACTS (không âm thầm cho là đạt), các vùng chạm khác vẫn được kiểm', (_label, bad) => {
    const facts = baseFacts({
      touchTargets: [
        { id: 'bad', ...bad },
        { id: 'small', width: 300, height: 20 },
      ],
    })
    const issues = validateAgainstProfile({ kind: 'game', facts }, AGE_PROFILES.PRESCHOOL)
    expect(issues.map((i) => `${i.code}:${i.target}`)).toEqual(['INVALID_FACTS:bad', 'TOUCH_TARGET_TOO_SMALL:small'])
  })

  it('thông báo nêu số px thực và chiều rộng khung cần để đạt', () => {
    const [issue] = validateAgainstProfile({ kind: 'game', facts: targetFacts(110, 390) }, AGE_PROFILES.PRESCHOOL)
    expect(issue.target).toBe('btn')
    expect(issue.message).toContain('53.6px')
    expect(issue.message).toContain('64px')
    expect(issue.message).toContain('466px')
  })

  it('mỗi vùng chạm trượt cho một lỗi riêng, mang đúng mã của nó', () => {
    const facts = baseFacts({
      touchTargets: [
        { id: 'a', width: 300, height: 30 },
        { id: 'b', width: 300, height: 200 },
        { id: 'c', width: 300, height: 40 },
      ],
    })
    const issues = validateAgainstProfile({ kind: 'game', facts }, AGE_PROFILES.PRESCHOOL)
    expect(issues.map((i) => i.target)).toEqual(['a', 'c'])
  })

  it('không có vùng chạm nào thì không lỗi vùng chạm', () => {
    expect(codes(baseFacts({ touchTargets: [] }), 'PRESCHOOL')).toEqual([])
  })

  it('vùng chạm có cạnh 0 hoặc âm thì trượt và không ném lỗi', () => {
    expect(codes(baseFacts({ touchTargets: [{ id: 'z', width: 0, height: 100 }] }), 'GRADE_3_5')).toEqual(['TOUCH_TARGET_TOO_SMALL'])
  })
})

describe('validateAgainstProfile: số chữ', () => {
  const card = (text: string) => baseFacts({ texts: [{ id: 'c', text, kind: 'card' }] })
  const question = (text: string) => baseFacts({ texts: [{ id: 'q', text, kind: 'question' }] })

  it('thẻ: đúng giới hạn thì đạt, thừa 1 ký tự thì không (12 / 20 / 30)', () => {
    for (const [band, limit] of [
      ['PRESCHOOL', 12],
      ['GRADE_1_2', 20],
      ['GRADE_3_5', 30],
    ] as const) {
      expect(codes(card('a'.repeat(limit)), band)).toEqual([])
      expect(codes(card('a'.repeat(limit + 1)), band)).toEqual(['TEXT_TOO_LONG'])
    }
  })

  it('câu hỏi: dùng giới hạn riêng (60 / 100 / 200), không dùng giới hạn của thẻ', () => {
    expect(codes(question('a'.repeat(60)), 'PRESCHOOL')).toEqual([])
    expect(codes(question('a'.repeat(61)), 'PRESCHOOL')).toEqual(['TEXT_TOO_LONG'])
    expect(codes(question('a'.repeat(100)), 'GRADE_1_2')).toEqual([])
    expect(codes(question('a'.repeat(200)), 'GRADE_3_5')).toEqual([])
    expect(codes(question('a'.repeat(201)), 'GRADE_3_5')).toEqual(['TEXT_TOO_LONG'])
  })

  it('cùng 13 ký tự: quá dài cho thẻ mầm non nhưng bình thường cho một câu', () => {
    expect(codes(card('a'.repeat(13)), 'PRESCHOOL')).toEqual(['TEXT_TOO_LONG'])
    expect(codes(question('a'.repeat(13)), 'PRESCHOOL')).toEqual([])
  })

  it('đếm theo ký tự người dùng thấy: chữ có dấu dạng NFD không bị tính gấp đôi', () => {
    const word = 'Việt Nam ơi'.normalize('NFD') // 11 ký tự nhìn thấy, nhiều đơn vị mã hơn
    expect(word.length).toBeGreaterThan(12)
    expect(codes(card(word), 'PRESCHOOL')).toEqual([])
  })

  it('thông báo nêu độ dài, giới hạn và nhóm tuổi', () => {
    const [issue] = validateAgainstProfile({ kind: 'game', facts: card('a'.repeat(15)) }, AGE_PROFILES.PRESCHOOL)
    expect(issue).toMatchObject({ code: 'TEXT_TOO_LONG', target: 'c' })
    expect(issue.message).toContain('15')
    expect(issue.message).toContain('12')
    expect(issue.message).toContain('Mầm non')
  })

  it('chữ rỗng không lỗi', () => {
    expect(codes(card(''), 'PRESCHOOL')).toEqual([])
  })
})

describe('validateAgainstProfile: số lựa chọn không hợp lệ', () => {
  it.each([Number.NaN, Number.POSITIVE_INFINITY])('optionCount = %s → INVALID_FACTS thay vì lặng lẽ đạt', (optionCount) => {
    const issues = validateAgainstProfile({ kind: 'game', facts: baseFacts({ optionCount }) }, AGE_PROFILES.PRESCHOOL)
    expect(issues.map((i) => i.code)).toEqual(['INVALID_FACTS'])
    expect(issues[0].target).toBe('optionCount')
  })
})

describe('validateAgainstProfile: số lựa chọn', () => {
  it.each([
    ['PRESCHOOL', 3],
    ['GRADE_1_2', 4],
    ['GRADE_3_5', 4],
  ] as const)('%s: tối đa %s lựa chọn; thêm một thì lỗi', (band, max) => {
    expect(codes(baseFacts({ optionCount: max }), band)).toEqual([])
    expect(codes(baseFacts({ optionCount: max + 1 }), band)).toEqual(['TOO_MANY_OPTIONS'])
  })
})

describe('validateAgainstProfile: dữ liệu đầu vào hỏng', () => {
  it.each([
    [{ stageWidth: 0 }],
    [{ containerWidth: 0 }],
    [{ stageWidth: -1 }],
    [{ containerWidth: Number.NaN }],
  ] as const)('%j → INVALID_FACTS và không kiểm gì thêm (không chia cho 0)', (overrides) => {
    const facts = baseFacts({ ...overrides, showsTimer: true, touchTargets: [{ id: 'x', width: 1, height: 1 }] })
    expect(codes(facts, 'PRESCHOOL')).toEqual(['INVALID_FACTS'])
  })
})

describe('validateAgainstProfile: nhiều lỗi cùng lúc', () => {
  it('gom đủ các loại lỗi theo thứ tự cố định: hẹn giờ, xếp hạng, vùng chạm, chữ, lựa chọn', () => {
    const facts = baseFacts({
      showsTimer: true,
      showsLiveLeaderboard: true,
      touchTargets: [{ id: 't', width: 300, height: 20 }],
      texts: [{ id: 'c', text: 'a'.repeat(40), kind: 'card' }],
      optionCount: 9,
    })
    expect(codes(facts, 'PRESCHOOL')).toEqual([
      'TIMER_NOT_ALLOWED',
      'LEADERBOARD_NOT_ALLOWED',
      'TOUCH_TARGET_TOO_SMALL',
      'TEXT_TOO_LONG',
      'TOO_MANY_OPTIONS',
    ])
  })
})
