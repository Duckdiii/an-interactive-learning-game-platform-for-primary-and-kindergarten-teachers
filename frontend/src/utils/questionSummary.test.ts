import { describe, expect, it } from 'vitest'
import { buildMockGameContents } from '../services/mock/gameFixtures'
import { GAME_TYPES } from '../types/game-dsl.types'
import type { GameType, QuestionDsl } from '../types/game-dsl.types'
import { summarizeQuestion, summarizeQuestions } from './questionSummary'

const fixtures = buildMockGameContents()

describe('summarizeQuestions', () => {
  it('mỗi câu của mỗi loại game mẫu có một dòng tóm tắt khác rỗng, không dài bất thường', () => {
    for (const type of GAME_TYPES) {
      const game = fixtures.find((item) => item.gameType === type)

      expect(game, type).toBeDefined()
      const summaries = summarizeQuestions(game!)

      expect(summaries, type).toHaveLength(game!.questions.length)
      summaries.forEach((summary) => {
        expect(summary.trim(), type).not.toBe('')
        expect(summary.length, type).toBeLessThan(260)
        expect(summary).not.toMatch(/undefined|NaN|\[object/)
      })
    }
  })

  it('QUIZ: chính là nội dung câu hỏi', () => {
    const quiz = fixtures.find((game) => game.gameType === 'QUIZ')!

    expect(summarizeQuestions(quiz)[0]).toBe((quiz.questions[0] as { questionText: string }).questionText)
  })

  it('ORDERING: liệt kê bước theo thứ tự đúng chứ không theo thứ tự hiển thị', () => {
    const summary = summarizeQuestion('ORDERING', {
      steps: [
        { id: 's1', text: 'Ăn', correctPosition: 3 },
        { id: 's2', text: 'Rửa tay', correctPosition: 1 },
        { id: 's3', text: 'Ngồi vào bàn', correctPosition: 2 },
      ],
    } as unknown as QuestionDsl)

    expect(summary).toBe('3 bước: Rửa tay → Ngồi vào bàn → Ăn')
  })

  it('MATCHING: ghi số cặp và các mục bên trái, kể cả khi chỉ có mô tả hình', () => {
    const summary = summarizeQuestion('MATCHING', {
      pairs: [
        { pairId: 'p1', left: { text: 'Mèo' }, right: { visualPrompt: 'con mèo' } },
        { pairId: 'p2', left: { visualPrompt: 'con chó' }, right: { text: 'Chó' } },
      ],
    } as unknown as QuestionDsl)

    expect(summary).toBe('2 cặp: Mèo, con chó')
  })

  it('câu chưa có nội dung thì báo "Câu chưa có nội dung" thay vì để trống', () => {
    const empty: Array<[GameType, object]> = [
      ['QUIZ', { questionText: '   ' }],
      ['AUDIO_VISUAL_MATCH', {}],
      ['SPOT_THE_TARGET', {}],
      ['WORD_SCRAMBLE', { scrambledLetters: [] }],
      ['VISUAL_CLOZE', { sentenceTemplate: '' }],
    ]

    for (const [type, question] of empty) {
      expect(summarizeQuestion(type, question as unknown as QuestionDsl), type).toBe('Câu chưa có nội dung')
    }
  })
})

describe('câu rỗng của mọi loại game', () => {
  const emptyOf: Record<GameType, object> = {
    QUIZ: { questionText: '' },
    AUDIO_VISUAL_MATCH: {},
    ODD_ONE_OUT: { items: [{ id: 'a', text: '  ' }, { id: 'b', text: '' }, { id: 'c', text: '' }] },
    SPOT_THE_TARGET: {},
    WORD_SCRAMBLE: { scrambledLetters: [] },
    MATCHING: { pairs: [{ pairId: 'p1', left: {}, right: {} }] },
    MEMORY_CARD: { pairs: [{ pairId: 'p1', content: {} }] },
    DRAG_DROP: { dropZones: [{ id: 'z1', label: '' }], items: [] },
    ORDERING: { steps: [{ id: 's1', correctPosition: 1 }] },
    VISUAL_CLOZE: { sentenceTemplate: '' },
  }

  it.each(GAME_TYPES)('%s: không có nội dung thì ra "Câu chưa có nội dung", không treo dấu hai chấm', (type) => {
    expect(summarizeQuestion(type, emptyOf[type] as unknown as QuestionDsl)).toBe('Câu chưa có nội dung')
  })
})
