import { describe, expect, it } from 'vitest'
import { AUDIO_BUTTON_HEIGHT, AUDIO_BUTTON_WIDTH } from '../../../games/common/mediaLayout'
import { AGE_PROFILES } from '../../age/ageProfiles'
import { validateAgainstProfile } from '../../age/validateAgainstProfile'
import { mockNumberLine10, mockNumberLineWithAudio } from './numberLineFixtures'
import { numberLineFacts, ticksOf } from './numberLineFacts'
import { BAND_HEIGHT, BAND_WIDTH, CONFIRM_BUTTON_HEIGHT, CONFIRM_BUTTON_WIDTH, MARKER_RADIUS, STEP_BUTTON_HEIGHT, STEP_BUTTON_WIDTH } from './numberLineLayout'
import { toStudentQuestion } from './numberLineLogic'

const sizeOf = (facts: ReturnType<typeof numberLineFacts>, id: string) => facts.touchTargets.find((t) => t.id === id)

describe('numberLineFacts', () => {
  it('lấy kích thước từ hằng số bố cục thật', () => {
    const facts = numberLineFacts(mockNumberLine10, 800)
    expect(sizeOf(facts, 'band')).toMatchObject({ width: BAND_WIDTH, height: BAND_HEIGHT })
    expect(sizeOf(facts, 'marker')).toMatchObject({ width: MARKER_RADIUS * 2, height: MARKER_RADIUS * 2 })
    expect(sizeOf(facts, 'minusButton')).toMatchObject({ width: STEP_BUTTON_WIDTH, height: STEP_BUTTON_HEIGHT })
    expect(sizeOf(facts, 'plusButton')).toMatchObject({ width: STEP_BUTTON_WIDTH, height: STEP_BUTTON_HEIGHT })
    expect(sizeOf(facts, 'confirmButton')).toMatchObject({ width: CONFIRM_BUTTON_WIDTH, height: CONFIRM_BUTTON_HEIGHT })
  })

  it('nút nghe lại chỉ tính khi có âm thanh', () => {
    expect(sizeOf(numberLineFacts(mockNumberLine10, 800), 'audioButton')).toBeUndefined()
    expect(sizeOf(numberLineFacts(mockNumberLineWithAudio, 800), 'audioButton')).toMatchObject({
      width: AUDIO_BUTTON_WIDTH,
      height: AUDIO_BUTTON_HEIGHT,
    })
  })

  it('xem lại không có nút xác nhận; dạng học sinh cho kết quả giống nhau', () => {
    expect(sizeOf(numberLineFacts(mockNumberLine10, 800, { includeConfirm: false }), 'confirmButton')).toBeUndefined()
    expect(numberLineFacts(toStudentQuestion(mockNumberLine10), 800)).toEqual(numberLineFacts(mockNumberLine10, 800))
  })

  it('không có lựa chọn rời rạc, đồng hồ hay xếp hạng; câu hỏi là mục chữ duy nhất', () => {
    const facts = numberLineFacts(mockNumberLine10, 800)
    expect(facts).toMatchObject({ mechanic: 'NUMBER_LINE', optionCount: 0, showsTimer: false, showsLiveLeaderboard: false })
    expect(facts.texts).toEqual([{ id: 'question', text: mockNumberLine10.questionText, kind: 'question' }])
  })

  it('đạt hồ sơ ở khung 1280 cho cả ba nhóm tuổi; ở 390 thì báo vùng chạm nhỏ (số đo, không phải lỗi tính)', () => {
    for (const band of Object.values(AGE_PROFILES)) {
      expect(validateAgainstProfile({ kind: 'game', facts: numberLineFacts(mockNumberLine10, 1280) }, band)).toEqual([])
    }
    const small = validateAgainstProfile({ kind: 'game', facts: numberLineFacts(mockNumberLine10, 390) }, AGE_PROFILES.PRESCHOOL)
    expect(small.length).toBeGreaterThan(0)
    // Điểm kéo (72 đơn vị) là chỗ nhỏ nhất, nên phải bị nêu tên.
    expect(small.some((i) => i.target === 'marker')).toBe(true)
  })

  it('ticksOf đếm số vạch', () => {
    expect(ticksOf(mockNumberLine10)).toBe(11)
  })
})
