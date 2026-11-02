import { describe, expect, it, vi } from 'vitest'
import { GAME_TYPE_VALUES } from '../constants/labels'
import {
  DESCRIPTIONS,
  FIT,
  MIN_FIT_SCORE,
  SUGGESTION_MAX,
  TOP_FIT_SCORE,
  detectGoals,
  rankGameTypes,
  selectSuggestions,
  suggestGameTypes,
} from './gameTypeSuggestionService'
import type { Fit } from './gameTypeSuggestionService'

const input = (idea: string, gradeLevel = '', subject = '') => ({ idea, gradeLevel, subject })

const IDEAS = [
  '',
  'abc',
  'Đếm số lượng con vật',
  'Chữ cái a ă â',
  'Ghép vần ăn, ân',
  'Phân loại đồ vật theo nhóm',
  'Sắp xếp thứ tự các số',
  'Ghi nhớ từ vựng tiếng Anh',
  'Đếm số và sắp xếp thứ tự',
]

describe('bảng điểm FIT', () => {
  it('mọi loại game trong bảng đều là enum GameType có thật và có mô tả cách chơi (kể cả ô điểm thấp)', () => {
    for (const row of Object.values(FIT)) {
      for (const [type, fit] of Object.entries(row)) {
        expect(GAME_TYPE_VALUES).toContain(type)
        expect(DESCRIPTIONS[type]?.length).toBeGreaterThan(10)
        expect(fit.score).toBeGreaterThan(0)
        expect(fit.score).toBeLessThanOrEqual(1)
        expect(fit.reason.length).toBeGreaterThan(15)
      }
    }
  })

  it('mỗi mục tiêu có ít nhất 5 loại đủ ngưỡng hiển thị (không bao giờ ra ít hơn 3 loại)', () => {
    for (const [goal, row] of Object.entries(FIT)) {
      const visible = Object.values(row).filter((fit) => fit.score >= MIN_FIT_SCORE)

      expect(visible.length, goal).toBeGreaterThanOrEqual(5)
    }
  })
})

describe('detectGoals', () => {
  it.each([
    ['Đếm số lượng con vật', ['COUNTING']],
    ['Đếm từ 1 đến 10', ['COUNTING']],
    ['Nhận biết chữ số từ 1 đến 5', ['COUNTING']],
    ['Làm quen chữ cái a, ă, â', ['LETTERS']],
    ['Sắp xếp chữ cái thành từ', ['LETTERS', 'SPELLING']],
    ['Ghép vần ăn, ân', ['SPELLING']],
    ['Phân loại con vật theo nơi sống', ['CLASSIFY']],
    ['Ghi nhớ từ vựng về trái cây', ['MEMORY']],
    ['Sắp xếp các số theo thứ tự', ['ORDERING']],
    ['Đếm số rồi sắp xếp thứ tự', ['COUNTING', 'ORDERING']],
    ['Một bài học bất kỳ', ['GENERAL']],
  ])('"%s" => %j', (idea, goals) => {
    expect(detectGoals(idea)).toEqual(goals)
  })

  it.each([
    ['Nghề nghiệp của bố mẹ, ban đêm yên tĩnh'],
    ['Làm việc nhóm và ôn tập chung'], // "nhóm", "ôn tập" đứng riêng không phải mục tiêu phân loại hay ghi nhớ
    ['Phân biệt chữ b và d'],
  ])('"%s" không bị đoán nhầm mục tiêu', (idea) => {
    expect(detectGoals(idea)).toEqual(['GENERAL'])
  })
})

describe('rankGameTypes (mock)', () => {
  it('kết quả luôn hợp lệ: không trùng, 3 đến 5 loại, đủ lý do và cách chơi', () => {
    for (const idea of IDEAS) {
      const result = rankGameTypes(input(idea, 'KINDERGARTEN', 'MATH'))
      const types = result.map((item) => item.type)

      expect(result.length).toBeGreaterThanOrEqual(3)
      expect(result.length).toBeLessThanOrEqual(SUGGESTION_MAX)
      expect(new Set(types).size).toBe(types.length)
      result.forEach((item) => {
        expect(item.reason.length).toBeGreaterThan(15)
        expect(item.description.length).toBeGreaterThan(10)
      })
    }
  })

  it('fitScore trong khoảng [0,3 ; 1] và sắp giảm dần', () => {
    for (const idea of IDEAS) {
      const scores = rankGameTypes(input(idea)).map((item) => item.fitScore)

      scores.forEach((score) => {
        expect(score).toBeGreaterThanOrEqual(MIN_FIT_SCORE)
        expect(score).toBeLessThanOrEqual(1)
      })
      expect(scores).toEqual([...scores].sort((a, b) => b - a))
    }
  })

  it('đếm số: Nối cặp đứng đầu với lý do gắn mục tiêu "quan hệ số lượng và chữ số", đủ điểm để được nhãn "phù hợp nhất"', () => {
    const [top] = rankGameTypes(input('Đếm số lượng con vật', 'KINDERGARTEN', 'MATH'))

    expect(top.type).toBe('MATCHING')
    expect(top.reason).toBe('Bé nối nhóm 3 con vật với số 3, rèn quan hệ giữa số lượng và chữ số.')
    expect(top.fitScore).toBeGreaterThanOrEqual(TOP_FIT_SCORE)
  })

  it.each([
    ['Làm quen chữ cái a ă â', 'MATCHING'],
    ['Phân loại con vật theo nơi sống', 'DRAG_DROP'],
    ['Ghi nhớ từ vựng', 'MEMORY_CARD'],
    ['Sắp xếp các số theo thứ tự', 'ORDERING'],
    ['Sắp xếp chữ cái thành từ', 'WORD_SCRAMBLE'], // không bị "sắp xếp" kéo sang loại Sắp xếp thứ tự
    ['Nhận biết chữ số từ 1 đến 5', 'MATCHING'], // chữ SỐ là đếm, không phải chữ cái
  ])('"%s": loại đứng đầu là %s', (idea, expected) => {
    expect(rankGameTypes(input(idea))[0].type).toBe(expected)
  })

  it('"Nhận biết chữ số" không lẫn loại ghép chữ của mục tiêu chữ cái', () => {
    const types = rankGameTypes(input('Nhận biết chữ số từ 1 đến 5')).map((item) => item.type)

    expect(types).not.toContain('WORD_SCRAMBLE')
  })

  it('cùng một loại game nhưng mục tiêu khác nhau thì lý do khác nhau (mỗi cặp một câu riêng)', () => {
    const reasonOf = (idea: string, type: string) => rankGameTypes(input(idea)).find((item) => item.type === type)?.reason

    const counting = reasonOf('Đếm số lượng', 'MATCHING')
    const letters = reasonOf('Nhận biết chữ cái', 'MATCHING')
    const classify = reasonOf('Phân loại đồ vật', 'MATCHING')

    expect(new Set([counting, letters, classify]).size).toBe(3)
    expect(letters).toMatch(/chữ cái/)
    expect(classify).toMatch(/nhóm/)
  })

  it('ý tưởng có nhiều mục tiêu thì mỗi loại lấy điểm cao nhất trong các mục tiêu', () => {
    const result = rankGameTypes(input('Đếm số và sắp xếp thứ tự'))

    expect(result.find((item) => item.type === 'ORDERING')?.fitScore).toBe(0.95) // từ mục tiêu ORDERING (0,95), không phải COUNTING (0,55)
    expect(result.find((item) => item.type === 'MATCHING')?.fitScore).toBe(0.95) // từ mục tiêu COUNTING
  })

  it('ý tưởng chung chung (hoặc rỗng, Tạo ngẫu nhiên) vẫn có vài đề xuất nhưng không loại nào được nhãn "phù hợp nhất"', () => {
    for (const idea of ['', 'Một bài học bất kỳ']) {
      const result = rankGameTypes(input(idea))

      expect(result.length).toBeGreaterThanOrEqual(3)
      expect(result[0].fitScore).toBeLessThan(TOP_FIT_SCORE)
    }
  })

  it('môn Tiếng Anh nghiêng thêm về nghe và chọn hình, Mầm non nghiêng thêm về nối cặp', () => {
    const scoreOf = (inputValue: ReturnType<typeof input>, type: string) =>
      rankGameTypes(inputValue).find((item) => item.type === type)?.fitScore ?? 0

    expect(scoreOf(input('Ghi nhớ từ vựng', '', 'ENGLISH'), 'AUDIO_VISUAL_MATCH')).toBeGreaterThan(
      scoreOf(input('Ghi nhớ từ vựng'), 'AUDIO_VISUAL_MATCH'),
    )
    expect(scoreOf(input('Ghi nhớ từ vựng', 'KINDERGARTEN'), 'MATCHING')).toBeGreaterThan(
      scoreOf(input('Ghi nhớ từ vựng'), 'MATCHING'),
    )
  })

  it('điểm không vượt quá 1 dù cộng thêm điều chỉnh', () => {
    rankGameTypes(input('Đếm số lượng', 'KINDERGARTEN', 'ENGLISH')).forEach((item) => {
      expect(item.fitScore).toBeLessThanOrEqual(1)
    })
  })
})

describe('selectSuggestions: lọc, sắp xếp, cắt', () => {
  const fit = (score: number): Fit => ({ score, reason: `Lý do cho điểm ${score} của loại game này.` })

  it('ẩn loại có điểm dưới 0,3 (kể cả khi chưa đủ 5 loại để bị cắt)', () => {
    const table = new Map([
      ['QUIZ', fit(0.6)],
      ['MATCHING', fit(0.5)],
      ['MEMORY_CARD', fit(0.45)],
      ['ODD_ONE_OUT', fit(0.29)],
      ['ORDERING', fit(0.1)],
    ])

    expect(selectSuggestions(table, input('')).map((item) => item.type)).toEqual(['QUIZ', 'MATCHING', 'MEMORY_CARD'])
  })

  it('điểm đúng ngưỡng 0,3 vẫn được giữ', () => {
    const table = new Map([['QUIZ', fit(0.3)]])

    expect(selectSuggestions(table, input('')).map((item) => item.type)).toEqual(['QUIZ'])
  })

  it('sắp giảm dần, điểm bằng nhau giữ thứ tự khai báo, và chỉ lấy 5 loại đầu', () => {
    const table = new Map([
      ['QUIZ', fit(0.5)],
      ['MATCHING', fit(0.9)],
      ['MEMORY_CARD', fit(0.5)],
      ['DRAG_DROP', fit(0.7)],
      ['ORDERING', fit(0.4)],
      ['ODD_ONE_OUT', fit(0.35)],
    ])
    const result = selectSuggestions(table, input(''))

    expect(result.map((item) => item.type)).toEqual(['MATCHING', 'DRAG_DROP', 'QUIZ', 'MEMORY_CARD', 'ORDERING'])
  })
})

describe('suggestGameTypes (mock có độ trễ)', () => {
  it('trả kết quả sau độ trễ giả lập', async () => {
    vi.useFakeTimers()
    let done = false
    const promise = suggestGameTypes(input('Đếm số lượng'), 1000).then((result) => {
      done = true
      return result
    })

    await vi.advanceTimersByTimeAsync(999)
    expect(done).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect((await promise).length).toBeGreaterThanOrEqual(3)
    vi.useRealTimers()
  })
})
