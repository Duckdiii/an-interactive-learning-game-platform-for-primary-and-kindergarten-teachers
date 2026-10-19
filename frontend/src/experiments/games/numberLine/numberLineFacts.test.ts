import { describe, expect, it } from 'vitest'
import { AUDIO_BUTTON_HEIGHT, AUDIO_BUTTON_WIDTH } from '../../../games/common/mediaLayout'
import { AGE_PROFILES } from '../../age/ageProfiles'
import { validateAgainstProfile } from '../../age/validateAgainstProfile'
import { mockNumberLine10, mockNumberLineWithAudio } from './numberLineFixtures'
import { numberLineFacts, ticksOf } from './numberLineFacts'
import { BAND_HEIGHT, BAND_WIDTH, CONFIRM_BUTTON_HEIGHT, CONFIRM_BUTTON_WIDTH, MARKER_HIT_RADIUS, STEP_BUTTON_HEIGHT, STEP_BUTTON_WIDTH } from './numberLineLayout'
import { toStudentQuestion } from './numberLineLogic'

const sizeOf = (facts: ReturnType<typeof numberLineFacts>, id: string) => facts.touchTargets.find((t) => t.id === id)

describe('numberLineFacts', () => {
  it('lấy kích thước từ hằng số bố cục thật', () => {
    const facts = numberLineFacts(mockNumberLine10, 800)
    expect(sizeOf(facts, 'band')).toMatchObject({ width: BAND_WIDTH, height: BAND_HEIGHT })
    expect(sizeOf(facts, 'marker')).toMatchObject({ width: MARKER_HIT_RADIUS * 2, height: MARKER_HIT_RADIUS * 2 })
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

  it('đạt hồ sơ ở khung 1280 và ở khung 390 theo tỉ lệ lạc quan 0,4875 (144 đơn vị → 70,2px) cho ba nhóm tuổi', () => {
    for (const band of Object.values(AGE_PROFILES)) {
      for (const width of [1280, 390]) {
        expect(validateAgainstProfile({ kind: 'game', facts: numberLineFacts(mockNumberLine10, width) }, band)).toEqual([])
      }
    }
  })

  it('có nút nghe lại (dùng chung, nay 144 đơn vị): vẫn đạt ở khung 390 theo tỉ lệ lạc quan, và nút đó có trong vùng chạm', () => {
    const facts = numberLineFacts({ ...mockNumberLine10, audioUrl: '/a.wav' }, 390)
    expect(facts.touchTargets.map((t) => t.id)).toContain('audioButton')
    expect(validateAgainstProfile({ kind: 'game', facts }, AGE_PROFILES.PRESCHOOL)).toEqual([])
    for (const target of facts.touchTargets) expect(Math.min(target.width, target.height), target.id).toBeGreaterThanOrEqual(144)
  })

  it('ticksOf đếm số vạch', () => {
    expect(ticksOf(mockNumberLine10)).toBe(11)
  })

  it('mọi vùng chạm (không kể nút nghe lại dùng chung của sản phẩm) có cạnh ngắn ≥ 144 đơn vị: ở khung 390px có lề trang (sân co ×0,445) mới đạt 64px', () => {
    for (const target of numberLineFacts(mockNumberLine10, 800).touchTargets) {
      expect(Math.min(target.width, target.height), target.id).toBeGreaterThanOrEqual(144)
    }
  })
})
