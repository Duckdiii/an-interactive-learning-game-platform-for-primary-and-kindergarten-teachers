import { describe, expect, it } from 'vitest'
import { buildMockGameContents } from '../../../services/mock/gameFixtures'
import type { GameType, QuestionDsl } from '../../../types/game-dsl.types'
import { GAME_TYPES } from '../../../types/game-dsl.types'
import { REQUIRED_COMMON_FIELDS, validateQuestion } from '../../../utils/gameValidation'
import { setMediaUrl, setOptionalText, setPoints, setTimeLimit } from './commonEditing'

const questionOf = (type: GameType): QuestionDsl => structuredClone(buildMockGameContents().find((game) => game.gameType === type)!.questions[0])

describe('trường chung', () => {
  it('đổi thời gian và điểm, không đổi bản cũ', () => {
    const before = questionOf('QUIZ')
    const after = setPoints(setTimeLimit(before, 45), 20)

    expect(after).toMatchObject({ timeLimitSeconds: 45, points: 20 })
    expect(before.timeLimitSeconds).toBe(30)
  })

  it('lời đọc và mô tả hình: đặt giá trị; rỗng hoặc toàn khoảng trắng thì BỎ HẲN trường', () => {
    const filled = setOptionalText(questionOf('QUIZ'), 'audioText', 'Có mấy quả táo?')

    expect(filled.audioText).toBe('Có mấy quả táo?')
    expect('audioText' in setOptionalText(filled, 'audioText', '')).toBe(false)
    expect('audioText' in setOptionalText(filled, 'audioText', '   ')).toBe(false)
  })

  it.each([
    ['QUIZ', 'audioText', false],
    ['AUDIO_VISUAL_MATCH', 'audioText', true],
    ['SPOT_THE_TARGET', 'visualPrompt', true],
    ['VISUAL_CLOZE', 'visualPrompt', true],
    ['MATCHING', 'audioText', false],
  ] as const)('%s: trường %s %s bắt buộc (bảng dùng chung với bộ kiểm tra)', (type, field, required) => {
    expect(REQUIRED_COMMON_FIELDS[type].includes(field)).toBe(required)
  })

  it.each(GAME_TYPES)('%s: bảng trường bắt buộc khớp với luật kiểm tra (xóa trường thì báo "cần nhập" đúng khi và chỉ khi trường bắt buộc)', (type) => {
    for (const field of ['audioText', 'visualPrompt'] as const) {
      const question = setOptionalText(questionOf(type), field, '')
      const issues = validateQuestion(type, question, 0, 'save')
      const reportsRequired = issues.some((issue) => issue.field === field && issue.code === 'required')

      expect(reportsRequired, `${type}.${field}`).toBe(REQUIRED_COMMON_FIELDS[type].includes(field))
    }
  })

  it('xóa lời đọc của AUDIO_VISUAL_MATCH (bắt buộc) thì bộ kiểm tra báo "cần nhập"; xóa của QUIZ (tùy chọn) thì hợp lệ', () => {
    const audio = setOptionalText(questionOf('AUDIO_VISUAL_MATCH'), 'audioText', '')
    const quiz = setOptionalText(questionOf('QUIZ'), 'audioText', '')

    expect(validateQuestion('AUDIO_VISUAL_MATCH', audio, 0, 'save').some((issue) => issue.field === 'audioText' && issue.code === 'required')).toBe(true)
    expect(validateQuestion('QUIZ', quiz, 0, 'save')).toEqual([])
  })
})

describe('setMediaUrl', () => {
  it('gắn ảnh hoặc âm thanh vào câu mà không đụng các trường khác và không đổi bản cũ', () => {
    const before = questionOf('QUIZ')
    const withImage = setMediaUrl(before, 'imageUrl', '/mock/cat.png')
    const withBoth = setMediaUrl(withImage, 'audioUrl', '/mock/q1.wav')

    expect(withBoth).toMatchObject({ imageUrl: '/mock/cat.png', audioUrl: '/mock/q1.wav', points: before.points, timeLimitSeconds: before.timeLimitSeconds })
    expect(before.imageUrl).toBeUndefined()
  })

  it('url undefined (hoặc rỗng) thì BỎ HẲN trường, không để chuỗi rỗng (schema không cho)', () => {
    const filled = setMediaUrl(questionOf('QUIZ'), 'imageUrl', '/mock/cat.png')

    expect('imageUrl' in setMediaUrl(filled, 'imageUrl', undefined)).toBe(false)
    expect('imageUrl' in setMediaUrl(filled, 'imageUrl', '')).toBe(false)
  })

  it('là bản vá lên câu HIỆN HÀNH: áp sau khi câu đã đổi điểm thì giữ điểm mới', () => {
    const patch = (current: QuestionDsl) => setMediaUrl(current, 'imageUrl', '/mock/cat.png')
    const edited = setPoints(questionOf('QUIZ'), 77)

    expect(patch(edited)).toMatchObject({ points: 77, imageUrl: '/mock/cat.png' })
  })
})
