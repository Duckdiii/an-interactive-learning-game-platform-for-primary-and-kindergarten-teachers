import { describe, expect, it } from 'vitest'
import { AUDIO_BUTTON_HEIGHT, AUDIO_BUTTON_WIDTH, STAGE_WIDTH } from '../../games/common/mediaLayout'
import { OPTION_BUTTON_HEIGHT, OPTION_BUTTON_WIDTH } from '../../games/common/optionGrid'
import { mockMatchingQuestion } from '../../games/matching/MatchingRenderer.fixtures'
import { CARD_MIN_HEIGHT, CARD_WIDTH, CONFIRM_BUTTON_HEIGHT, CONFIRM_BUTTON_WIDTH } from '../../games/matching/matchingLayout'
import { mockQuizQuestion, mockQuizQuestionLongText, mockQuizQuestionNoMedia } from '../../games/quiz/QuizRenderer.fixtures'
import type { MatchingQuestion } from '../../types/game-dsl.types'
import { AGE_PROFILES } from './ageProfiles'
import { matchingFacts, quizFacts } from './rendererFacts'
import { validateAgainstProfile } from './validateAgainstProfile'

describe('quizFacts', () => {
  it('vùng chạm lấy đúng hằng số bố cục thật: mỗi đáp án một ô và nút nghe lại khi có audio', () => {
    const facts = quizFacts(mockQuizQuestion, 800)
    const options = facts.touchTargets.filter((t) => t.id.startsWith('option.'))
    expect(options).toHaveLength(mockQuizQuestion.options.length)
    for (const option of options) expect(option).toMatchObject({ width: OPTION_BUTTON_WIDTH, height: OPTION_BUTTON_HEIGHT })
    expect(facts.touchTargets.find((t) => t.id === 'audioButton')).toMatchObject({
      width: AUDIO_BUTTON_WIDTH,
      height: AUDIO_BUTTON_HEIGHT,
    })
    expect(facts.stageWidth).toBe(STAGE_WIDTH)
  })

  it('không có audio thì không có nút nghe lại', () => {
    expect(quizFacts(mockQuizQuestionNoMedia, 800).touchTargets.some((t) => t.id === 'audioButton')).toBe(false)
  })

  it('chữ: câu hỏi là "question", mỗi đáp án là "card"; số lựa chọn = số đáp án', () => {
    const facts = quizFacts(mockQuizQuestion, 800)
    expect(facts.texts[0]).toMatchObject({ id: 'question', kind: 'question', text: mockQuizQuestion.questionText })
    expect(facts.texts.slice(1).every((t) => t.kind === 'card')).toBe(true)
    expect(facts.optionCount).toBe(mockQuizQuestion.options.length)
  })

  it('renderer hiện chưa có đồng hồ đếm ngược hay bảng xếp hạng', () => {
    const facts = quizFacts(mockQuizQuestion, 800)
    expect(facts.showsTimer).toBe(false)
    expect(facts.showsLiveLeaderboard).toBe(false)
    expect(facts.mechanic).toBe('QUIZ')
  })

  it('câu hỏi dài 195 ký tự: đạt lớp 3 đến 5, không đạt mầm non và lớp 1 đến 2', () => {
    const facts = quizFacts(mockQuizQuestionLongText, 1280)
    const codes = (band: keyof typeof AGE_PROFILES) =>
      validateAgainstProfile({ kind: 'game', facts }, AGE_PROFILES[band]).map((i) => i.code)
    expect(codes('GRADE_3_5')).toEqual([])
    expect(codes('GRADE_1_2')).toEqual(['TEXT_TOO_LONG'])
    expect(codes('PRESCHOOL')).toEqual(['TEXT_TOO_LONG'])
  })
})

describe('matchingFacts', () => {
  it('vùng chạm: hai thẻ mỗi cặp (cao tối thiểu thật), nút nghe lại và nút "Xong rồi!"', () => {
    const facts = matchingFacts(mockMatchingQuestion, 800)
    const pairs = mockMatchingQuestion.pairs.length
    const cards = facts.touchTargets.filter((t) => t.id.startsWith('left.') || t.id.startsWith('right.'))
    expect(cards).toHaveLength(pairs * 2)
    for (const card of cards) expect(card).toMatchObject({ width: CARD_WIDTH, height: CARD_MIN_HEIGHT })
    expect(facts.touchTargets.find((t) => t.id === 'confirmButton')).toMatchObject({
      width: CONFIRM_BUTTON_WIDTH,
      height: CONFIRM_BUTTON_HEIGHT,
    })
    expect(facts.touchTargets.find((t) => t.id === 'audioButton')).toBeDefined()
    expect(facts.touchTargets).toHaveLength(pairs * 2 + 2)
  })

  it('chế độ xem lại (không có nút xác nhận): bỏ nút "Xong rồi!"', () => {
    const facts = matchingFacts(mockMatchingQuestion, 800, { includeConfirm: false })
    expect(facts.touchTargets.some((t) => t.id === 'confirmButton')).toBe(false)
  })

  it('số lựa chọn là số cặp, không phải số thẻ', () => {
    expect(matchingFacts(mockMatchingQuestion, 800).optionCount).toBe(mockMatchingQuestion.pairs.length)
  })

  it('chữ của thẻ lấy từ text, nếu không có thì từ mô tả hình; bên chỉ có ảnh thì không có mục chữ', () => {
    const question: MatchingQuestion = {
      ...mockMatchingQuestion,
      audioText: undefined,
      audioUrl: undefined,
      pairs: [
        { pairId: 'p1', left: { text: 'apple' }, right: { visualPrompt: 'quả táo', imageUrl: '/x.png' } },
        { pairId: 'p2', left: { imageUrl: '/y.png' }, right: { text: 'chó' } },
        { pairId: 'p3', left: { text: 'cat' }, right: { text: 'mèo' } },
      ],
    }
    const facts = matchingFacts(question, 800)
    const texts = Object.fromEntries(facts.texts.map((t) => [t.id, t.text]))
    expect(texts['left.p1']).toBe('apple')
    // Có ảnh mà không có text: renderer không hiện mô tả hình, nên trẻ không thấy chữ nào (khớp `sideDisplay`).
    expect(texts['right.p1']).toBeUndefined()
    expect(texts['left.p2']).toBeUndefined()
    expect(texts['right.p2']).toBe('chó')
    expect(facts.texts.some((t) => t.id === 'heading')).toBe(false)
    expect(facts.touchTargets.some((t) => t.id === 'audioButton')).toBe(false)
  })

  it('mô tả hình dài chỉ là chữ tạm khi CHƯA có ảnh; có ảnh thì trẻ không thấy nó nên không tính vào số chữ', () => {
    const longPrompt = 'một quả táo đỏ bóng nằm trên chiếc bàn gỗ trong căn bếp nhỏ'
    const pairs = (right: MatchingQuestion['pairs'][number]['right']): MatchingQuestion => ({
      ...mockMatchingQuestion,
      pairs: [{ pairId: 'p1', left: { text: 'táo' }, right }, ...mockMatchingQuestion.pairs.slice(1)],
    })
    const preschoolCodes = (q: MatchingQuestion) =>
      validateAgainstProfile({ kind: 'game', facts: matchingFacts(q, 1280) }, AGE_PROFILES.PRESCHOOL).map((i) => i.code)

    // Có ảnh: chỉ thấy ảnh, không báo quá dài.
    expect(preschoolCodes(pairs({ visualPrompt: longPrompt, imageUrl: '/x.png' }))).toEqual([])
    // Chưa có ảnh: mô tả hình hiện làm chữ tạm nên bị tính (và quá dài cho mầm non).
    expect(preschoolCodes(pairs({ visualPrompt: longPrompt }))).toEqual(['TEXT_TOO_LONG'])
  })

  it('câu dẫn là "question", thẻ là "card"', () => {
    const facts = matchingFacts(mockMatchingQuestion, 800)
    expect(facts.texts.find((t) => t.id === 'heading')).toMatchObject({ kind: 'question', text: mockMatchingQuestion.audioText })
    expect(facts.texts.filter((t) => t.id !== 'heading').every((t) => t.kind === 'card')).toBe(true)
  })

  it('mẫu 3 cặp đạt mầm non về số lựa chọn (tối đa 3) nhưng 4 cặp thì không', () => {
    const four: MatchingQuestion = {
      ...mockMatchingQuestion,
      pairs: [...mockMatchingQuestion.pairs, { pairId: 'p4', left: { text: 'bird' }, right: { text: 'chim' } }],
    }
    const codes = (q: MatchingQuestion) =>
      validateAgainstProfile({ kind: 'game', facts: matchingFacts(q, 1280) }, AGE_PROFILES.PRESCHOOL).map((i) => i.code)
    expect(codes(mockMatchingQuestion)).toEqual([])
    expect(codes(four)).toEqual(['TOO_MANY_OPTIONS'])
  })
})
