import { describe, expect, it } from 'vitest'
import { validationText } from '../constants/validationText'
import { buildMockGameContents } from '../services/mock/gameFixtures'
import type { GameDsl, GameType } from '../types/game-dsl.types'
import { groupByQuestion, summarizeIssues, validateGame, validateQuestion } from './gameValidation'
import type { ValidationMode } from './gameValidation'

type Loose = Record<string, unknown>

const fixtures = buildMockGameContents()
const base = (type: GameType) => fixtures.find((game) => game.gameType === type) as GameDsl

// Sửa câu đầu tiên (và/hoặc cả game) của một game mẫu hợp lệ rồi kiểm tra lại.
function run(type: GameType, change: (question: Loose, game: Loose) => void, mode: ValidationMode = 'save') {
  const game = structuredClone(base(type))

  change(game.questions[0] as unknown as Loose, game as unknown as Loose)

  return validateGame(game, mode)
}

const has = (issues: ReturnType<typeof validateGame>, code: string, field: string) =>
  issues.some((issue) => issue.code === code && issue.field === field)

const text = (length: number) => 'a'.repeat(length)
const list = <T>(items: T[], size: number, make: (index: number) => T) => Array.from({ length: size }, (_, i) => items[i] ?? make(i))

describe('game mẫu', () => {
  it('cả 10 game mẫu hợp lệ ở chế độ lưu nháp', () => {
    for (const game of fixtures) expect(validateGame(game, 'save'), game.metadata.title).toEqual([])
  })

  it('khi xuất bản, chỉ SPOT_THE_TARGET còn câu chưa có vùng đúng (câu 3) bị chặn, 9 game còn lại xuất bản được', () => {
    for (const game of fixtures) {
      const issues = validateGame(game, 'publish')

      if (game.gameType === 'SPOT_THE_TARGET') {
        expect(issues.map((issue) => [issue.questionIndex, issue.code])).toEqual([[2, 'missingHit']])
      } else {
        expect(issues, game.metadata.title).toEqual([])
      }
    }
  })
})

describe('thông tin chung của game', () => {
  const quiz = (change: (game: Loose) => void) => {
    const game = structuredClone(base('QUIZ'))

    change(game as unknown as Loose)

    return validateGame(game, 'save')
  }

  it('tên: 1 đến 100 ký tự; chủ đề: 1 đến 200 ký tự', () => {
    expect(quiz((g) => ((g.metadata as Loose).title = text(100)))).toEqual([])
    expect(has(quiz((g) => ((g.metadata as Loose).title = text(101))), 'tooLong', 'metadata.title')).toBe(true)
    expect(has(quiz((g) => ((g.metadata as Loose).title = '   ')), 'required', 'metadata.title')).toBe(true)
    expect(quiz((g) => ((g.metadata as Loose).topic = text(200)))).toEqual([])
    expect(has(quiz((g) => ((g.metadata as Loose).topic = text(201))), 'tooLong', 'metadata.topic')).toBe(true)
  })

  it('môn học và khối lớp phải thuộc danh sách của API', () => {
    expect(has(quiz((g) => ((g.metadata as Loose).subject = 'PHYSICS')), 'required', 'metadata.subject')).toBe(true)
    expect(has(quiz((g) => ((g.metadata as Loose).gradeLevel = 'GRADE_9')), 'required', 'metadata.gradeLevel')).toBe(true)
  })

  it('số câu hỏi: 1 đến 20; id các câu không trùng', () => {
    const many = (size: number) => (g: Loose) => {
      const questions = g.questions as Loose[]

      g.questions = Array.from({ length: size }, (_, i) => ({ ...questions[0], id: `q${i + 1}` }))
    }

    expect(quiz(many(20))).toEqual([])
    expect(has(quiz(many(21)), 'count', 'questions')).toBe(true)
    expect(has(quiz((g) => (g.questions = [])), 'count', 'questions')).toBe(true)
    expect(has(quiz((g) => ((g.questions as Loose[])[1].id = 'q1')), 'duplicateId', 'questions')).toBe(true)
  })

  it('lỗi cấp trò chơi có tiền tố "Trò chơi:" và questionIndex là null', () => {
    const [issue] = quiz((g) => ((g.metadata as Loose).title = text(101)))

    expect(issue.questionIndex).toBeNull()
    expect(issue.message).toMatch(/^Trò chơi: /)
  })
})

describe('trường chung của mỗi câu', () => {
  const field = (change: (question: Loose) => void) => run('QUIZ', change)

  it('thời gian trả lời: số nguyên 10 đến 120 giây (giao của SRS và DSL)', () => {
    for (const ok of [10, 30, 120]) expect(field((q) => (q.timeLimitSeconds = ok))).toEqual([])
    for (const bad of [5, 9, 121, 600]) expect(has(field((q) => (q.timeLimitSeconds = bad)), 'range', 'timeLimitSeconds'), `${bad}`).toBe(true)
    expect(has(field((q) => (q.timeLimitSeconds = 30.5)), 'notInteger', 'timeLimitSeconds')).toBe(true)
    expect(has(field((q) => delete q.timeLimitSeconds), 'required', 'timeLimitSeconds')).toBe(true)
  })

  it('điểm: số nguyên 1 đến 100', () => {
    for (const ok of [1, 100]) expect(field((q) => (q.points = ok))).toEqual([])
    for (const bad of [0, 101, -3]) expect(has(field((q) => (q.points = bad)), 'range', 'points'), `${bad}`).toBe(true)
  })

  it('lời đọc tối đa 200 ký tự, mô tả hình tối đa 100 ký tự (tùy chọn)', () => {
    expect(field((q) => (q.audioText = text(200)))).toEqual([])
    expect(has(field((q) => (q.audioText = text(201))), 'tooLong', 'audioText')).toBe(true)
    expect(field((q) => delete q.audioText)).toEqual([])
    expect(has(field((q) => (q.visualPrompt = text(101))), 'tooLong', 'visualPrompt')).toBe(true)
  })

  it('lỗi ở câu thứ hai có tiền tố "Câu 2:" và questionIndex 1', () => {
    const game = structuredClone(base('QUIZ'))

    ;(game.questions[1] as unknown as Loose).points = 0
    const [issue] = validateGame(game, 'save')

    expect(issue).toMatchObject({ questionIndex: 1, field: 'points' })
    expect(issue.message).toMatch(/^Câu 2: /)
  })

  it('validateQuestion kiểm riêng một câu', () => {
    const question = structuredClone(base('QUIZ').questions[0]) as unknown as Loose

    question.points = 0

    expect(validateQuestion('QUIZ', question as never, 4, 'save')[0]).toMatchObject({ questionIndex: 4, field: 'points' })
  })
})

describe('QUIZ (FLD-05, FLD-06)', () => {
  const optionsOf = (size: number) => (q: Loose) => {
    q.options = list(q.options as Loose[], size, (i) => ({ id: 'abcd'[i], text: `Đáp án ${i}` }))
  }

  it('nội dung câu hỏi tối đa 200 ký tự (SRS ghi 500, DSL ghi 200: lấy 200)', () => {
    expect(run('QUIZ', (q) => (q.questionText = text(200)))).toEqual([])
    expect(has(run('QUIZ', (q) => (q.questionText = text(201))), 'tooLong', 'questionText')).toBe(true)
    expect(has(run('QUIZ', (q) => (q.questionText = '  ')), 'required', 'questionText')).toBe(true)
  })

  it('số đáp án: 2 đến 4', () => {
    expect(run('QUIZ', optionsOf(4))).toEqual([])
    expect(has(run('QUIZ', optionsOf(5)), 'count', 'options')).toBe(true)
    expect(has(run('QUIZ', optionsOf(1)), 'count', 'options')).toBe(true)
  })

  it('bắt buộc đúng một đáp án đúng, thuộc danh sách', () => {
    const noAnswer = run('QUIZ', (q) => delete q.correctOptionId)
    const wrongRef = run('QUIZ', (q) => (q.correctOptionId = 'd'))

    expect(has(noAnswer, 'noCorrect', 'correctOptionId')).toBe(true)
    expect(has(wrongRef, 'badRef', 'correctOptionId')).toBe(true)
    expect(summarizeIssues(noAnswer, 'save')).toBe(validationText.summaryNoCorrect)
  })

  it('đáp án trùng nhau (không phân biệt hoa thường, khoảng trắng thừa) và id không theo vị trí a, b, c', () => {
    const duplicate = run('QUIZ', (q) => ((q.options as Loose[])[1].text = '  ' + String((q.options as Loose[])[0].text).toUpperCase() + ' '))
    const ids = run('QUIZ', (q) => ((q.options as Loose[])[0].id = 'z'))

    expect(has(duplicate, 'duplicate', 'options')).toBe(true)
    expect(has(ids, 'badPositionalId', 'options')).toBe(true)
  })

  it('nội dung mỗi đáp án 1 đến 100 ký tự', () => {
    expect(has(run('QUIZ', (q) => ((q.options as Loose[])[0].text = text(101))), 'tooLong', 'options[0].text')).toBe(true)
    expect(has(run('QUIZ', (q) => ((q.options as Loose[])[2].text = ' ')), 'required', 'options[2].text')).toBe(true)
  })
})

describe('AUDIO_VISUAL_MATCH', () => {
  it('lời đọc bắt buộc; 1 đến 3 hình nhiễu; các hình không trùng nhau', () => {
    expect(has(run('AUDIO_VISUAL_MATCH', (q) => delete q.audioText), 'required', 'audioText')).toBe(true)
    expect(has(run('AUDIO_VISUAL_MATCH', (q) => (q.distractors = [])), 'count', 'distractors')).toBe(true)
    expect(
      has(run('AUDIO_VISUAL_MATCH', (q) => (q.distractors = list([], 4, (i) => ({ visualPrompt: `hình nhiễu ${i}` })))), 'count', 'distractors'),
    ).toBe(true)
    expect(
      has(run('AUDIO_VISUAL_MATCH', (q) => (q.distractors = [{ visualPrompt: (q.correct as Loose).visualPrompt }])), 'duplicate', 'distractors'),
    ).toBe(true)
  })
})

describe('ODD_ONE_OUT', () => {
  it('3 đến 5 phần tử; phần tử khác loại thuộc danh sách; không trùng', () => {
    expect(has(run('ODD_ONE_OUT', (q) => (q.items = (q.items as Loose[]).slice(0, 2))), 'count', 'items')).toBe(true)
    expect(has(run('ODD_ONE_OUT', (q) => (q.items = list([], 6, (i) => ({ id: 'abcde'[i] ?? 'f', text: `Mục ${i}` })))), 'count', 'items')).toBe(true)
    expect(has(run('ODD_ONE_OUT', (q) => (q.oddOneOutId = 'e')), 'badRef', 'oddOneOutId')).toBe(true)
    expect(has(run('ODD_ONE_OUT', (q) => delete q.oddOneOutId), 'noCorrect', 'oddOneOutId')).toBe(true)
    expect(has(run('ODD_ONE_OUT', (q) => ((q.items as Loose[])[1].text = (q.items as Loose[])[0].text)), 'duplicate', 'items')).toBe(true)
  })
})

describe('SPOT_THE_TARGET', () => {
  it('lưu nháp không bắt buộc vùng đúng, xuất bản thì bắt buộc (UC-07 2c)', () => {
    const noHit = (q: Loose) => delete q.hitRegion

    expect(run('SPOT_THE_TARGET', noHit, 'save')).toEqual([])
    expect(has(run('SPOT_THE_TARGET', noHit, 'publish'), 'missingHit', 'hitRegion')).toBe(true)
  })

  it('vùng đúng: x, y trong [0, 1], bán kính trong (0, 1]', () => {
    for (const ok of [{ x: 0, y: 1, radius: 1 }, { x: 0.5, y: 0.5, radius: 0.01 }]) {
      // Chỉ xét câu 1: câu 3 của game mẫu cố ý chưa có vùng đúng.
      expect(run('SPOT_THE_TARGET', (q) => (q.hitRegion = ok), 'publish').filter((issue) => issue.questionIndex === 0)).toEqual([])
    }
    for (const bad of [{ x: -0.1, y: 0.5, radius: 0.1 }, { x: 0.5, y: 1.2, radius: 0.1 }, { x: 0.5, y: 0.5, radius: 0 }, { x: 0.5, y: 0.5, radius: 1.5 }]) {
      expect(has(run('SPOT_THE_TARGET', (q) => (q.hitRegion = bad)), 'range', 'hitRegion'), JSON.stringify(bad)).toBe(true)
    }
  })

  it('ảnh nền và mô tả vật bắt buộc; mô tả tối đa 100 ký tự', () => {
    expect(has(run('SPOT_THE_TARGET', (q) => delete q.visualPrompt), 'required', 'visualPrompt')).toBe(true)
    expect(has(run('SPOT_THE_TARGET', (q) => (q.targetDescription = text(101))), 'tooLong', 'targetDescription')).toBe(true)
  })
})

describe('WORD_SCRAMBLE', () => {
  it('từ đáp án 2 đến 10 ký tự, không khoảng trắng', () => {
    expect(has(run('WORD_SCRAMBLE', (q) => ((q.correctWord = 'a'), (q.scrambledLetters = ['a', 'b']))), 'tooShort', 'correctWord')).toBe(true)
    expect(has(run('WORD_SCRAMBLE', (q) => (q.correctWord = text(11))), 'tooLong', 'correctWord')).toBe(true)
    expect(has(run('WORD_SCRAMBLE', (q) => (q.correctWord = 'a b')), 'hasSpace', 'correctWord')).toBe(true)
  })

  it('chữ cái xáo trộn: 2 đến 10 phần tử, mỗi phần tử một chữ, đúng các chữ của từ đáp án và khác thứ tự gốc', () => {
    expect(has(run('WORD_SCRAMBLE', (q) => (q.scrambledLetters = ['ẹ'])), 'count', 'scrambledLetters')).toBe(true)
    expect(has(run('WORD_SCRAMBLE', (q) => (q.scrambledLetters = ['ẹm', 'x'])), 'badLetter', 'scrambledLetters[0]')).toBe(true)
    expect(has(run('WORD_SCRAMBLE', (q) => (q.scrambledLetters = ['m', 'x'])), 'scrambleMismatch', 'scrambledLetters')).toBe(true)
    expect(has(run('WORD_SCRAMBLE', (q) => (q.scrambledLetters = ['m', 'ẹ'])), 'scrambleSame', 'scrambledLetters')).toBe(true)
  })

  it('chữ có dấu được đếm là một ký tự', () => {
    expect(run('WORD_SCRAMBLE', (q) => ((q.correctWord = 'BÒ'), (q.scrambledLetters = ['Ò', 'B'])))).toEqual([])
  })
})

describe('MATCHING và MEMORY_CARD', () => {
  const pairsOf = (size: number) => (q: Loose) => {
    q.pairs = list(q.pairs as Loose[], size, (i) => ({
      pairId: `p${i + 1}`,
      left: { text: `trái ${i}` },
      right: { text: `phải ${i}` },
    }))
  }

  it('MATCHING: 3 đến 6 cặp', () => {
    expect(run('MATCHING', pairsOf(6))).toEqual([])
    expect(has(run('MATCHING', pairsOf(7)), 'count', 'pairs')).toBe(true)
    expect(has(run('MATCHING', pairsOf(2)), 'count', 'pairs')).toBe(true)
  })

  it('MATCHING: id cặp không trùng, nội dung mỗi phía không trùng, mỗi phía cần chữ hoặc mô tả hình, chữ tối đa 100 ký tự', () => {
    const pairs = (q: Loose) => q.pairs as Loose[]

    expect(has(run('MATCHING', (q) => (pairs(q)[1].pairId = 'p1')), 'duplicateId', 'pairs')).toBe(true)
    expect(has(run('MATCHING', (q) => ((pairs(q)[1].left as Loose).text = (pairs(q)[0].left as Loose).text)), 'duplicate', 'pairs')).toBe(true)
    expect(has(run('MATCHING', (q) => (pairs(q)[0].right = {})), 'needContent', 'pairs[0].right')).toBe(true)
    expect(has(run('MATCHING', (q) => ((pairs(q)[0].left as Loose).text = text(101))), 'tooLong', 'pairs[0].left.text')).toBe(true)
    expect(run('MATCHING', (q) => (pairs(q)[0].right = { visualPrompt: 'a cat' }))).toEqual([])
  })

  it('MEMORY_CARD: 2 đến 8 cặp, nội dung các thẻ không trùng', () => {
    const memory = (size: number) => (q: Loose) => {
      q.pairs = list(q.pairs as Loose[], size, (i) => ({ pairId: `p${i + 1}`, content: { text: `thẻ ${i}` } }))
    }

    expect(run('MEMORY_CARD', memory(8))).toEqual([])
    expect(has(run('MEMORY_CARD', memory(9)), 'count', 'pairs')).toBe(true)
    expect(has(run('MEMORY_CARD', memory(1)), 'count', 'pairs')).toBe(true)
    expect(
      has(run('MEMORY_CARD', (q) => ((q.pairs as Loose[])[1].content = (q.pairs as Loose[])[0].content)), 'duplicate', 'pairs'),
    ).toBe(true)
  })
})

describe('DRAG_DROP', () => {
  it('2 đến 4 vùng thả, 3 đến 8 vật', () => {
    const zones = (size: number) => (q: Loose) => {
      q.dropZones = list(q.dropZones as Loose[], size, (i) => ({ id: `z${i + 1}`, label: `Vùng ${i}` }))
    }
    const items = (size: number) => (q: Loose) => {
      q.items = list(q.items as Loose[], size, (i) => ({ id: `i${i + 1}`, text: `Vật ${i}`, targetZoneId: 'z1' }))
    }

    expect(has(run('DRAG_DROP', zones(1)), 'count', 'dropZones')).toBe(true)
    expect(has(run('DRAG_DROP', zones(5)), 'count', 'dropZones')).toBe(true)
    expect(has(run('DRAG_DROP', items(2)), 'count', 'items')).toBe(true)
    expect(has(run('DRAG_DROP', items(9)), 'count', 'items')).toBe(true)
  })

  it('vật phải thuộc một vùng có thật, mỗi vùng có ít nhất một vật, tên vùng và id không trùng', () => {
    const items = (q: Loose) => q.items as Loose[]
    const zones = (q: Loose) => q.dropZones as Loose[]

    expect(has(run('DRAG_DROP', (q) => (items(q)[0].targetZoneId = 'z9')), 'badRef', 'items[0].targetZoneId')).toBe(true)
    expect(has(run('DRAG_DROP', (q) => items(q).forEach((item) => (item.targetZoneId = 'z1'))), 'emptyZone', 'dropZones')).toBe(true)
    expect(has(run('DRAG_DROP', (q) => (zones(q)[1].label = zones(q)[0].label)), 'duplicate', 'dropZones')).toBe(true)
    expect(has(run('DRAG_DROP', (q) => (items(q)[1].id = 'i1')), 'duplicateId', 'items')).toBe(true)
    expect(has(run('DRAG_DROP', (q) => (zones(q)[0].label = text(51))), 'tooLong', 'dropZones[0].label')).toBe(true)
    expect(has(run('DRAG_DROP', (q) => (items(q)[0] = { id: 'i1', targetZoneId: 'z1' })), 'needContent', 'items[0]')).toBe(true)
  })
})

describe('ORDERING', () => {
  const steps = (q: Loose) => q.steps as Loose[]

  it('2 đến 6 bước', () => {
    const make = (size: number) => (q: Loose) => {
      q.steps = Array.from({ length: size }, (_, i) => ({ id: `s${i + 1}`, text: `Bước ${i + 1}`, correctPosition: i + 1 }))
    }

    expect(run('ORDERING', make(6))).toEqual([])
    expect(has(run('ORDERING', make(7)), 'count', 'steps')).toBe(true)
    expect(has(run('ORDERING', make(1)), 'count', 'steps')).toBe(true)
  })

  it('thứ tự đúng là các số 1..n không trùng và đủ dãy', () => {
    expect(run('ORDERING', (q) => steps(q).forEach((step, i) => (step.correctPosition = i + 1)))).toEqual([])
    expect(has(run('ORDERING', (q) => (steps(q)[0].correctPosition = steps(q)[1].correctPosition)), 'positions', 'steps')).toBe(true)
    expect(has(run('ORDERING', (q) => (steps(q)[0].correctPosition = 4)), 'positions', 'steps')).toBe(true)
    expect(has(run('ORDERING', (q) => (steps(q)[0].correctPosition = 0)), 'positions', 'steps')).toBe(true)
  })

  it('mỗi bước cần chữ hoặc mô tả hình; id bước không trùng', () => {
    expect(has(run('ORDERING', (q) => (steps(q)[0] = { id: 's1', correctPosition: 3 })), 'needContent', 'steps[0]')).toBe(true)
    expect(has(run('ORDERING', (q) => (steps(q)[1].id = 's1')), 'duplicateId', 'steps')).toBe(true)
  })
})

describe('VISUAL_CLOZE', () => {
  it('câu có đúng một chỗ trống "___"', () => {
    expect(has(run('VISUAL_CLOZE', (q) => (q.sentenceTemplate = 'Con mèo đang ngủ.')), 'blankCount', 'sentenceTemplate')).toBe(true)
    expect(has(run('VISUAL_CLOZE', (q) => (q.sentenceTemplate = 'Con ___ đang ___ trên ghế.')), 'blankCount', 'sentenceTemplate')).toBe(true)
    expect(run('VISUAL_CLOZE', (q) => (q.sentenceTemplate = '___ là con mèo'))).toEqual([])
  })

  it('từ đúng không trùng từ nhiễu; 1 đến 3 từ nhiễu; ảnh bắt buộc; độ dài', () => {
    expect(has(run('VISUAL_CLOZE', (q) => (q.distractors = [q.correctAnswer])), 'duplicate', 'distractors')).toBe(true)
    expect(has(run('VISUAL_CLOZE', (q) => (q.distractors = [])), 'count', 'distractors')).toBe(true)
    expect(has(run('VISUAL_CLOZE', (q) => (q.distractors = ['a', 'b', 'c', 'd'])), 'count', 'distractors')).toBe(true)
    expect(has(run('VISUAL_CLOZE', (q) => delete q.visualPrompt), 'required', 'visualPrompt')).toBe(true)
    expect(has(run('VISUAL_CLOZE', (q) => (q.correctAnswer = text(51))), 'tooLong', 'correctAnswer')).toBe(true)
    expect(has(run('VISUAL_CLOZE', (q) => (q.sentenceTemplate = `${text(198)}___`)), 'tooLong', 'sentenceTemplate')).toBe(true)
  })
})

describe('khớp luật của Backend (nhận xét review F3)', () => {
  const nfd = (value: string) => value.normalize('NFD')

  it('VISUAL_CLOZE: chỗ trống phải đúng 3 gạch dưới, không phải 4 hoặc 5', () => {
    for (const bad of ['Con ____ kêu meo', 'Con _____ kêu', 'Con __ kêu']) {
      expect(has(run('VISUAL_CLOZE', (q) => (q.sentenceTemplate = bad)), 'blankCount', 'sentenceTemplate'), bad).toBe(true)
    }
  })

  it('ORDERING: hai bước cùng nội dung bị báo trùng; vị trí đúng là hoán vị bất kỳ của 1..n', () => {
    const steps = (q: Loose) => q.steps as Loose[]

    expect(has(run('ORDERING', (q) => (steps(q)[1].text = steps(q)[0].text)), 'duplicate', 'steps')).toBe(true)
    expect(run('ORDERING', (q) => steps(q).forEach((step, i) => (step.correctPosition = steps(q).length - i)))).toEqual([])
    expect(has(run('ORDERING', (q) => (steps(q)[0].correctPosition = 1.5)), 'positions', 'steps')).toBe(true)
    expect(has(run('ORDERING', (q) => (steps(q)[0].correctPosition = '1')), 'positions', 'steps')).toBe(true)
  })

  it('trường tùy chọn đã có mặt thì không được rỗng (form phải bỏ hẳn trường khi để trống)', () => {
    expect(has(run('QUIZ', (q) => (q.audioText = '')), 'tooShort', 'audioText')).toBe(true)
    expect(has(run('QUIZ', (q) => (q.visualPrompt = '   ')), 'tooShort', 'visualPrompt')).toBe(true)
    expect(
      has(run('MATCHING', (q) => ((q.pairs as Loose[])[0].left = { text: '', visualPrompt: 'con mèo' })), 'tooShort', 'pairs[0].left.text'),
    ).toBe(true)
  })

  it('so trùng: chữ "apple" và hình "apple" là hai nội dung khác nhau, nhưng có/không NFC, hoa/thường thì trùng', () => {
    const matching = (left0: Loose, left1: Loose) => (q: Loose) => {
      ;(q.pairs as Loose[])[0].left = left0
      ;(q.pairs as Loose[])[1].left = left1
    }

    expect(has(run('MATCHING', matching({ text: 'apple' }, { visualPrompt: 'apple' })), 'duplicate', 'pairs')).toBe(false)
    expect(has(run('MATCHING', matching({ text: 'apple' }, { text: ' APPLE ' })), 'duplicate', 'pairs')).toBe(true)
    expect(has(run('QUIZ', (q) => ((q.options as Loose[])[0].text = 'Ộ', (q.options as Loose[])[1].text = nfd('ộ'))), 'duplicate', 'options')).toBe(true)
  })

  it('WORD_SCRAMBLE: không phân biệt hoa thường, chấp nhận chữ gõ dạng tổ hợp; từ toàn chữ giống nhau không báo "giữ nguyên thứ tự"', () => {
    expect(run('WORD_SCRAMBLE', (q) => ((q.correctWord = 'BÒ'), (q.scrambledLetters = ['ò', 'b'])))).toEqual([])
    expect(run('WORD_SCRAMBLE', (q) => ((q.correctWord = nfd('BÒ')), (q.scrambledLetters = [nfd('Ò'), 'B'])))).toEqual([])
    expect(run('WORD_SCRAMBLE', (q) => ((q.correctWord = 'OO'), (q.scrambledLetters = ['O', 'O'])))).toEqual([])
  })

  it('mã (id) phải đúng mẫu của schema: câu q1, cặp p1, vùng z1, vật i1, bước s1', () => {
    expect(has(run('QUIZ', (q) => (q.id = 'new-1')), 'badId', 'questions')).toBe(true)
    expect(has(run('QUIZ', (q) => delete q.id), 'badId', 'questions')).toBe(true)
    expect(has(run('MATCHING', (q) => ((q.pairs as Loose[])[0].pairId = 'x1')), 'badId', 'pairs')).toBe(true)
    expect(has(run('DRAG_DROP', (q) => ((q.dropZones as Loose[])[0].id = 'a')), 'badId', 'dropZones')).toBe(true)
    expect(has(run('DRAG_DROP', (q) => ((q.items as Loose[])[0].id = 'a')), 'badId', 'items')).toBe(true)
    expect(has(run('ORDERING', (q) => ((q.steps as Loose[])[0].id = 'b1')), 'badId', 'steps')).toBe(true)
  })

  it('số không hợp lệ (NaN, Infinity, chuỗi) không lọt qua', () => {
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, '30']) {
      expect(has(run('QUIZ', (q) => (q.timeLimitSeconds = bad)), 'required', 'timeLimitSeconds'), String(bad)).toBe(true)
    }

    for (const field of ['x', 'y', 'radius']) {
      const region = { x: 0.5, y: 0.5, radius: 0.1, [field]: Number.NaN }

      expect(has(run('SPOT_THE_TARGET', (q) => (q.hitRegion = region)), 'range', 'hitRegion'), field).toBe(true)
    }
  })

  it('hitRegion: null được coi như chưa chọn (lưu nháp được, xuất bản thì chặn)', () => {
    expect(run('SPOT_THE_TARGET', (q) => (q.hitRegion = null)).filter((issue) => issue.questionIndex === 0)).toEqual([])
    expect(has(run('SPOT_THE_TARGET', (q) => (q.hitRegion = null), 'publish'), 'missingHit', 'hitRegion')).toBe(true)
  })

  it('trường chung do luật loại game đã kiểm thì chỉ báo một lần', () => {
    expect(run('SPOT_THE_TARGET', (q) => (q.visualPrompt = text(101))).filter((issue) => issue.field === 'visualPrompt')).toHaveLength(1)
    expect(run('AUDIO_VISUAL_MATCH', (q) => (q.audioText = text(201))).filter((issue) => issue.field === 'audioText')).toHaveLength(1)
  })

  it('dữ liệu hỏng không làm hàm văng lỗi: loại game lạ, câu rỗng, cặp rỗng', () => {
    const unknown = structuredClone(base('QUIZ')) as unknown as Loose

    unknown.gameType = 'FUTURE_TYPE'
    expect(validateGame(unknown as unknown as GameDsl, 'save').some((issue) => issue.code === 'unknownType')).toBe(true)

    const holes = structuredClone(base('QUIZ')) as unknown as Loose

    ;(holes.questions as unknown[])[0] = null
    expect(has(validateGame(holes as unknown as GameDsl, 'save'), 'required', 'question')).toBe(true)

    expect(() => run('MATCHING', (q) => ((q.pairs as unknown[])[0] = null))).not.toThrow()
    expect(() => run('MEMORY_CARD', (q) => ((q.pairs as unknown[])[0] = null))).not.toThrow()
  })

  it('mọi loại game trong GAME_TYPES đều có luật riêng', () => {
    for (const game of fixtures) {
      expect(validateQuestion(game.gameType, game.questions[0], 0, 'save').some((issue) => issue.code === 'unknownType')).toBe(false)
    }

    expect(fixtures).toHaveLength(10)
  })

  describe('thời gian trả lời: giá trị của Backend chỉ theo DSL (5-600), giá trị giáo viên nhập theo SRS (10-120)', () => {
    // MEMORY_CARD mầm non: Backend tự đặt 90 x 1,5 = 135 giây (GameDefaults), hợp lệ theo DSL nhưng vượt 120 của SRS.
    const fromBackend = () => {
      const game = structuredClone(base('MEMORY_CARD'))

      game.questions.forEach((question) => (question.timeLimitSeconds = 135))

      return game
    }
    const timeIssue = (issues: ReturnType<typeof validateGame>) => issues.find((issue) => issue.field === 'timeLimitSeconds')

    it('135 giây còn nguyên như Backend sinh ra thì hợp lệ, lưu nháp và xuất bản đều được', () => {
      const game = fromBackend()

      expect(validateGame(game, 'save', { baseline: structuredClone(game) })).toEqual([])
      expect(validateGame(game, 'publish', { baseline: structuredClone(game) })).toEqual([])
    })

    it('cùng giá trị 135 nhưng không có bản gốc (giáo viên nhập tay) thì bị chặn theo SRS với câu "từ 10 đến 120"', () => {
      const issue = timeIssue(validateGame(fromBackend(), 'save'))

      expect(issue).toMatchObject({ code: 'range', questionIndex: 0 })
      expect(issue?.message).toContain('từ 10 đến 120')
    })

    it('giáo viên sửa giá trị sang số khác ngoài SRS thì bị chặn, kể cả khi bản gốc là 135', () => {
      const baseline = fromBackend()
      const edited = structuredClone(baseline)

      edited.questions[0].timeLimitSeconds = 140

      expect(timeIssue(validateGame(edited, 'save', { baseline }))).toMatchObject({ code: 'range', questionIndex: 0 })
      // Các câu còn lại vẫn nguyên 135 nên không bị báo.
      expect(validateGame(edited, 'save', { baseline }).filter((issue) => issue.field === 'timeLimitSeconds')).toHaveLength(1)
    })

    it('giáo viên sửa về số trong SRS thì hợp lệ', () => {
      const baseline = fromBackend()
      const edited = structuredClone(baseline)

      edited.questions[0].timeLimitSeconds = 120

      expect(validateGame(edited, 'save', { baseline })).toEqual([])
    })

    it('giá trị Backend nguyên vẹn nhưng ngoài DSL (4 hoặc 601 giây) vẫn bị chặn, câu báo "từ 5 đến 600"', () => {
      for (const bad of [4, 601]) {
        const baseline = structuredClone(base('QUIZ'))

        baseline.questions[0].timeLimitSeconds = bad

        const issue = timeIssue(validateGame(baseline, 'save', { baseline: structuredClone(baseline) }))

        expect(issue, String(bad)).toMatchObject({ code: 'range' })
        expect(issue?.message).toContain('từ 5 đến 600')
      }
    })

    it('câu mới thêm (id không có trong bản gốc) luôn theo SRS', () => {
      const baseline = structuredClone(base('QUIZ'))
      const game = structuredClone(baseline)

      ;(game.questions as unknown[]).push({ ...structuredClone(game.questions[0]), id: 'q99', timeLimitSeconds: 200 })

      expect(timeIssue(validateGame(game, 'save', { baseline }))).toMatchObject({ code: 'range', questionIndex: game.questions.length - 1 })
    })

    it('bản gốc ghép theo id chứ không theo vị trí: đổi chỗ câu hỏi không làm giá trị Backend bị coi là nhập tay', () => {
      const baseline = fromBackend()
      const reordered = structuredClone(baseline)

      reordered.questions.reverse()

      expect(validateGame(reordered, 'save', { baseline })).toEqual([])
    })
  })
})

describe('gom lỗi và câu tổng quát', () => {
  it('groupByQuestion gom lỗi theo vị trí câu, null là cấp trò chơi', () => {
    const game = structuredClone(base('QUIZ'))

    ;(game.questions[0] as unknown as Loose).points = 0
    ;(game.questions[2] as unknown as Loose).points = 0
    game.metadata.title = ''
    const groups = groupByQuestion(validateGame(game, 'save'))

    expect([...groups.keys()].sort()).toEqual([0, 2, null].sort())
    expect(groups.get(0)).toHaveLength(1)
  })

  it('câu tổng quát theo SRS: thiếu đáp án đúng, xuất bản, lưu nháp; hợp lệ thì null', () => {
    expect(summarizeIssues([], 'save')).toBeNull()

    const other = run('QUIZ', (q) => (q.points = 0))

    expect(summarizeIssues(other, 'save')).toBe(validationText.summarySave)
    expect(summarizeIssues(other, 'publish')).toBe(validationText.summaryPublish)
    expect(validationText.summaryPublish).toBe('Bạn hãy kiểm tra và điều chỉnh lại nội dung.')
    expect(validationText.summaryNoCorrect).toContain('chưa có đáp án đúng')
  })

  it('mọi thông báo lỗi là tiếng Việt, không còn chỗ trống mẫu chưa điền', () => {
    const issues = [
      ...run('QUIZ', (q) => ((q.options = []), delete q.correctOptionId, (q.points = 500))),
      ...run('MATCHING', (q) => (q.pairs = [])),
      ...run('ORDERING', (q) => ((q.steps as Loose[])[0].correctPosition = 9)),
    ]

    expect(issues.length).toBeGreaterThan(3)
    issues.forEach((issue) => {
      expect(issue.message).not.toMatch(/[{}]|undefined|NaN/)
      expect(issue.message).toMatch(/^Câu 1: /)
    })
  })
})
