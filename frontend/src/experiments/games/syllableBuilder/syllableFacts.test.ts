import { describe, expect, it } from 'vitest'
import { AUDIO_BUTTON_HEIGHT, AUDIO_BUTTON_WIDTH } from '../../../games/common/mediaLayout'
import { AGE_PROFILES } from '../../age/ageProfiles'
import { validateAgainstProfile } from '../../age/validateAgainstProfile'
import { mockSyllableMeo, mockSyllableWithAudio } from './syllableFixtures'
import { syllableFacts } from './syllableFacts'
import { CONFIRM_BUTTON_HEIGHT, CONFIRM_BUTTON_WIDTH, SLOT_BUTTON_HEIGHT, SLOT_WIDTH } from './syllableLayout'
import { toStudentQuestion } from './syllableLogic'

const sizeOf = (facts: ReturnType<typeof syllableFacts>, id: string) => facts.touchTargets.find((t) => t.id === id)

describe('syllableFacts', () => {
  it('sáu nút ▲▼ và nút xác nhận lấy kích thước từ hằng số bố cục thật', () => {
    const facts = syllableFacts(mockSyllableMeo, 800)
    for (const id of ['onsetUp', 'onsetDown', 'rhymeUp', 'rhymeDown', 'toneUp', 'toneDown']) {
      expect(sizeOf(facts, id)).toMatchObject({ width: SLOT_WIDTH, height: SLOT_BUTTON_HEIGHT })
    }
    expect(sizeOf(facts, 'confirmButton')).toMatchObject({ width: CONFIRM_BUTTON_WIDTH, height: CONFIRM_BUTTON_HEIGHT })
    expect(facts.touchTargets).toHaveLength(7)
  })

  it('nút nghe lại chỉ tính khi có âm thanh', () => {
    expect(sizeOf(syllableFacts(mockSyllableMeo, 800), 'audioButton')).toBeUndefined()
    expect(sizeOf(syllableFacts(mockSyllableWithAudio, 800), 'audioButton')).toMatchObject({ width: AUDIO_BUTTON_WIDTH, height: AUDIO_BUTTON_HEIGHT })
  })

  it('xem lại không có nút xác nhận; dạng học sinh cho kết quả giống nhau', () => {
    expect(sizeOf(syllableFacts(mockSyllableMeo, 800, { includeConfirm: false }), 'confirmButton')).toBeUndefined()
    expect(syllableFacts(toStudentQuestion(mockSyllableMeo), 800)).toEqual(syllableFacts(mockSyllableMeo, 800))
  })

  it('không có danh sách lựa chọn cùng hiện, đồng hồ hay xếp hạng; câu hỏi là mục chữ duy nhất', () => {
    const facts = syllableFacts(mockSyllableMeo, 800)
    expect(facts).toMatchObject({ mechanic: 'SYLLABLE_BUILDER', optionCount: 0, showsTimer: false, showsLiveLeaderboard: false })
    expect(facts.texts).toEqual([{ id: 'question', text: mockSyllableMeo.questionText, kind: 'question' }])
  })

  it('khung 1280 và 390 đều đạt cả ba nhóm (nút 144 đơn vị → 70,2px ở khung 390)', () => {
    for (const profile of Object.values(AGE_PROFILES)) {
      expect(validateAgainstProfile({ kind: 'game', facts: syllableFacts(mockSyllableMeo, 1280) }, profile)).toEqual([])
    }
    for (const profile of Object.values(AGE_PROFILES)) {
      expect(validateAgainstProfile({ kind: 'game', facts: syllableFacts(mockSyllableMeo, 390) }, profile)).toEqual([])
    }
  })

  it('mọi vùng chạm (không kể nút nghe lại dùng chung của sản phẩm) có cạnh ngắn ≥ 144 đơn vị: ở khung 390px có lề trang (sân co ×0,445) mới đạt 64px', () => {
    for (const target of syllableFacts(mockSyllableMeo, 800).touchTargets) {
      expect(Math.min(target.width, target.height), target.id).toBeGreaterThanOrEqual(144)
    }
  })
})
