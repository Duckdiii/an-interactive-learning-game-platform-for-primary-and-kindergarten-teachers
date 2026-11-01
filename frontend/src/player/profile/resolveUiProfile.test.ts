import { describe, expect, it } from 'vitest'
import { GRADE_LEVELS } from '../../types/game-dsl.types'
import { PROFILES } from './profiles'
import { resolveAgeBand, resolveUiProfile } from './resolveUiProfile'

describe('resolveAgeBand', () => {
  it.each([
    ['KINDERGARTEN', 'be'],
    ['GRADE_1', 'be'],
    ['GRADE_2', 'hocSinh'],
    ['GRADE_3', 'hocSinh'],
    ['GRADE_4', 'hocSinh'],
    ['GRADE_5', 'hocSinh'],
  ] as const)('không ghi đè: %s thuộc khung %s', (gradeLevel, band) => {
    expect(resolveAgeBand({ gradeLevel })).toBe(band)
    expect(resolveAgeBand({ gradeLevel, uiOverride: 'AUTO' })).toBe(band)
    expect(resolveAgeBand({ gradeLevel, uiOverride: null })).toBe(band)
  })

  it('mọi khối lớp của DSL đều được phân khung', () => {
    for (const gradeLevel of GRADE_LEVELS) expect(['be', 'hocSinh']).toContain(resolveAgeBand({ gradeLevel }))
  })

  it.each(GRADE_LEVELS)('giáo viên ghi đè thắng khối lớp (%s)', (gradeLevel) => {
    expect(resolveAgeBand({ gradeLevel, uiOverride: 'BE' })).toBe('be')
    expect(resolveAgeBand({ gradeLevel, uiOverride: 'HOC_SINH' })).toBe('hocSinh')
  })

  it('ghi đè vẫn đúng khi thiếu khối lớp', () => {
    expect(resolveAgeBand({ uiOverride: 'HOC_SINH' })).toBe('hocSinh')
  })

  it('thiếu hoặc lạ: mặc định khung Bé (không đồng hồ, không điểm)', () => {
    expect(resolveAgeBand({})).toBe('be')
    expect(resolveAgeBand({ gradeLevel: 'GRADE_9' })).toBe('be')
    expect(resolveAgeBand({ gradeLevel: '' })).toBe('be')
    expect(resolveAgeBand({ gradeLevel: 'GRADE_3', uiOverride: 'KHONG_CO' })).toBe('hocSinh') // ghi đè lạ bị bỏ qua, theo khối lớp hợp lệ
    expect(resolveAgeBand({ gradeLevel: 'GRADE_3', uiOverride: 'constructor' })).toBe('hocSinh')
    expect(resolveAgeBand({ gradeLevel: 'GRADE_3', uiOverride: '__proto__' })).toBe('hocSinh')
  })

  it('resolveUiProfile trả đúng profile của khung', () => {
    expect(resolveUiProfile({ gradeLevel: 'KINDERGARTEN' })).toBe(PROFILES.be)
    expect(resolveUiProfile({ gradeLevel: 'GRADE_5' })).toBe(PROFILES.hocSinh)
  })
})

describe('PROFILES', () => {
  it('khung Bé: vùng chạm 64 px, không đồng hồ, chạm là chấm, phản hồi nhẹ nhàng', () => {
    expect(PROFILES.be.tokens.minTouch).toBeGreaterThanOrEqual(64)
    expect(PROFILES.be.interaction).toMatchObject({ timer: false, tapToSubmit: true, askNickname: false })
    expect(PROFILES.be.feedback).toBe('garden')
    expect(PROFILES.be.audio.autoReadPrompt).toBe(true)
  })

  it('khung Học sinh: có đồng hồ và điểm', () => {
    expect(PROFILES.hocSinh.interaction.timer).toBe(true)
    expect(PROFILES.hocSinh.interaction.askNickname).toBe(true)
    expect(PROFILES.hocSinh.feedback).toBe('score')
  })
})
