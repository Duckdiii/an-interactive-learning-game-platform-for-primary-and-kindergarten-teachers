import { describe, expect, it } from 'vitest'
import { AUDIO_BUTTON_HEIGHT, AUDIO_BUTTON_WIDTH } from '../../../games/common/mediaLayout'
import { AGE_PROFILES } from '../../age/ageProfiles'
import { validateAgainstProfile } from '../../age/validateAgainstProfile'
import { mockPrepositionUnder, mockPrepositionWithAudio } from './prepositionFixtures'
import { prepositionFacts } from './prepositionFacts'
import { SCENE_HEIGHT, SCENE_WIDTH } from './prepositionGeometry'
import { CONFIRM_BUTTON_HEIGHT, CONFIRM_BUTTON_WIDTH, ITEM_MIN_TOUCH, itemHitStroke } from './prepositionLayout'
import { toStudentQuestion } from './prepositionLogic'

const sizeOf = (facts: ReturnType<typeof prepositionFacts>, id: string) => facts.touchTargets.find((t) => t.id === id)

describe('prepositionFacts', () => {
  it('cảnh, vật và nút xác nhận lấy kích thước từ hằng số thật', () => {
    const facts = prepositionFacts(mockPrepositionUnder, 800)
    expect(sizeOf(facts, 'scene')).toMatchObject({ width: SCENE_WIDTH, height: SCENE_HEIGHT })
    // Vật 100: vùng bắt chạm rộng ra thành ITEM_MIN_TOUCH (144) bằng hitStrokeWidth.
    expect(sizeOf(facts, 'item')).toMatchObject({ width: ITEM_MIN_TOUCH, height: ITEM_MIN_TOUCH })
    expect(sizeOf(facts, 'confirmButton')).toMatchObject({ width: CONFIRM_BUTTON_WIDTH, height: CONFIRM_BUTTON_HEIGHT })
  })

  it('nút nghe lại chỉ tính khi có âm thanh', () => {
    expect(sizeOf(prepositionFacts(mockPrepositionUnder, 800), 'audioButton')).toBeUndefined()
    expect(sizeOf(prepositionFacts(mockPrepositionWithAudio, 800), 'audioButton')).toMatchObject({ width: AUDIO_BUTTON_WIDTH, height: AUDIO_BUTTON_HEIGHT })
  })

  it('xem lại không có nút xác nhận; dạng học sinh cho kết quả giống nhau', () => {
    expect(sizeOf(prepositionFacts(mockPrepositionUnder, 800, { includeConfirm: false }), 'confirmButton')).toBeUndefined()
    expect(prepositionFacts(toStudentQuestion(mockPrepositionUnder), 800)).toEqual(prepositionFacts(mockPrepositionUnder, 800))
  })

  it('không có lựa chọn rời rạc, đồng hồ hay xếp hạng; lệnh là mục chữ duy nhất', () => {
    const facts = prepositionFacts(mockPrepositionUnder, 800)
    expect(facts).toMatchObject({ mechanic: 'PREPOSITION_SCENE', optionCount: 0, showsTimer: false, showsLiveLeaderboard: false })
    expect(facts.texts).toEqual([{ id: 'question', text: 'Put the cat under the table.', kind: 'question' }])
  })

  it('vùng bắt chạm của vật: vật nhỏ được nới tới 144; vật đã đủ lớn giữ nguyên', () => {
    expect(itemHitStroke({ width: 100, height: 100 })).toBe(ITEM_MIN_TOUCH - 100)
    expect(itemHitStroke({ width: 160, height: 150 })).toBe(0)
    expect(itemHitStroke({ width: 200, height: 100 })).toBe(ITEM_MIN_TOUCH - 100) // theo cạnh ngắn
  })

  it('đạt cả ba nhóm ở khung 1280 và ở khung 390 theo tỉ lệ lạc quan 0,4875 (vật 144 → 70,2px, nút 144 → 70,2px)', () => {
    const issues = (width: number, band: keyof typeof AGE_PROFILES) =>
      validateAgainstProfile({ kind: 'game', facts: prepositionFacts(mockPrepositionUnder, width) }, AGE_PROFILES[band]).map((i) => i.target)
    for (const band of ['PRESCHOOL', 'GRADE_1_2', 'GRADE_3_5'] as const) {
      expect(issues(1280, band)).toEqual([])
      expect(issues(390, band)).toEqual([])
    }
  })

  it('mọi vùng chạm (không kể nút nghe lại dùng chung của sản phẩm) có cạnh ngắn ≥ 144 đơn vị: ở khung 390px có lề trang (sân co ×0,445) mới đạt 64px', () => {
    for (const target of prepositionFacts(mockPrepositionUnder, 800).touchTargets) {
      expect(Math.min(target.width, target.height), target.id).toBeGreaterThanOrEqual(144)
    }
  })
})
