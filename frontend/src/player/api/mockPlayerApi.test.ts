import { afterEach, describe, expect, it, vi } from 'vitest'
import { GAME_TYPES } from '../../types/game-dsl.types'
import type { GameType } from '../../types/game-dsl.types'
import type { AnswerPayload, MatchingStudentQuestion, StudentGame, StudentOddOneOutQuestion } from '../../types/game-student.types'
import { getPlayerApi } from './index'
import { RealPlayerApi } from './realPlayerApi'
import { MockPlayerApi, mockShareCodes } from './mockPlayerApi'

// Tên mọi trường [ĐA] của DSL v1.0.0 (docs/game-json-dsl-v1.0.0.md, các mục có ký hiệu [ĐA]) cộng `correctAnswer`, chỉ được có SAU khi chấm.
const SECRET_KEYS = ['correctOptionId', 'oddOneOutId', 'correct', 'distractors', 'hitRegion', 'correctWord', 'targetZoneId', 'correctPosition', 'correctAnswer']
// MATCHING giấu cả quan hệ cặp; MEMORY_CARD thì `pairs`/`pairId` là dữ liệu hợp lệ.
const MATCHING_SECRET_KEYS = ['pairs', 'pairId', 'left', 'right']

function collectKeys(value: unknown, found = new Set<string>()): Set<string> {
  if (Array.isArray(value)) value.forEach((item) => collectKeys(item, found))
  else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      found.add(key)
      collectKeys(child, found)
    }
  }

  return found
}

describe('biệt danh', () => {
  it('chứa từ cấm thì 422 UNSAFE_CONTENT, không phân biệt hoa thường', async () => {
    const api = new MockPlayerApi()

    await expect(api.createSession('MOCK00', 'Bạn NGU ngốc')).rejects.toMatchObject({ response: { status: 422, data: { error: { code: 'UNSAFE_CONTENT' } } } })
    await expect(api.createSession('MOCK00', 'nói bậy')).rejects.toMatchObject({ response: { status: 422 } })
    await expect(api.createSession('MOCK00', 'Sao Băng')).resolves.toMatchObject({ nickname: 'Sao Băng' })
  })
})

async function openSession(api: MockPlayerApi, shareCode: string) {
  const { sessionId } = await api.createSession(shareCode, 'Bé An')

  return { sessionId, game: await api.getGameForStudent(sessionId) }
}

async function openByType(api: MockPlayerApi, type: GameType) {
  for (const code of mockShareCodes()) {
    if ((await api.getPublishInfo(code)).gameType === type) return { code, ...(await openSession(api, code)) }
  }

  throw new Error(`Không có game mẫu loại ${type}`)
}

// Không dùng vi.unstubAllEnvs(): nó gỡ cả VITE_MOCK_LATENCY_MS=0 của test-setup nên mỗi lời gọi mô phỏng chờ 400 ms.
afterEach(() => {
  vi.stubEnv('VITE_PLAYER_API', '')
  vi.stubEnv('VITE_USE_MOCK', 'none')
})

describe('MockPlayerApi: JSON trả cho học sinh không lộ đáp án', () => {
  it.each([['MOCK14', 4], ['MOCK15', 5], ['MOCK16', 6]] as const)('keeps IMAGE media/marker, hides the answer and grades %s once', async (code, count) => {
    const api = new MockPlayerApi()
    expect(await api.getPublishInfo(code)).toMatchObject({ gameType: 'ODD_ONE_OUT' })
    const { sessionId, game } = await openSession(api, code)
    expect(collectKeys(game).has('oddOneOutId')).toBe(false)
    const q = game.questions[0] as StudentOddOneOutQuestion
    expect(q.renderMode).toBe('IMAGE')
    expect(q.items).toHaveLength(count)
    expect(q.items.every((i) => i.imageUrl?.startsWith('/assets/noto/'))).toBe(true)
    const dog = q.items.find((i) => i.id === 'b')!
    const cat = q.items.find((i) => i.id === 'a')!
    const wrong = await api.submitInteraction(sessionId, q.id, { selectedItemId: cat.id })
    expect(wrong).toMatchObject({ isCorrect: false, correctAnswer: { selectedItemId: dog.id } })
    expect(await api.submitInteraction(sessionId, q.id, { selectedItemId: dog.id })).toEqual(wrong)
    const next = await openSession(api, code)
    const correct = await api.submitInteraction(next.sessionId, q.id, { selectedItemId: dog.id })
    expect(correct.isCorrect).toBe(true)
    expect(correct.pointsEarned).toBeGreaterThan(0)
    expect(await api.submitInteraction(next.sessionId, q.id, { selectedItemId: dog.id })).toEqual(correct)
  })
  it('IMAGE demo accepts retry per pair, restores partial progress, and scores once on the final blank', async () => {
    const api = new MockPlayerApi()
    const { sessionId, game } = await openSession(api, 'MOCK12')
    expect(collectKeys(game).has('correctOptionId')).toBe(false)
    const q = game.questions[0] as { id: string; options: { id: string; visualPrompt: string }[] }
    const idOf = (label: string) => q.options.find((o) => o.visualPrompt === label)!.id
    const first = await api.submitInteraction(sessionId, q.id, { placements: [{ blankId: 'b1', optionId: idOf('Con bướm') }] })
    expect(first).toMatchObject({ status: 'IN_PROGRESS', placementCorrect: true, retryable: true, correctAnswer: null, pointsEarned: 0 })
    const resumed = await api.getGameForStudent(sessionId)
    expect(resumed.answeredQuestionIds).toEqual([])
    expect(resumed.questions[0]).toHaveProperty('acceptedPlacements', [{ blankId: 'b1', optionId: idOf('Con bướm') }])
    const wrong = await api.submitInteraction(sessionId, q.id, { placements: [{ blankId: 'b2', optionId: idOf('Bọ rùa') }] })
    expect(wrong).toMatchObject({ status: 'INCORRECT', placementCorrect: false, retryable: true, correctAnswer: null })
    const final = await api.submitInteraction(sessionId, q.id, { placements: [{ blankId: 'b2', optionId: idOf('Con ong') }] })
    expect(final).toMatchObject({ status: 'CORRECT', retryable: false })
    expect(final.pointsEarned).toBeGreaterThan(0)
    expect(await api.submitInteraction(sessionId, q.id, { placements: [{ blankId: 'b2', optionId: idOf('Con ong') }] })).toEqual(final)
  })
  it('có đủ 10 loại game, mỗi loại một mã chia sẻ', async () => {
    const api = new MockPlayerApi()
    const types = await Promise.all(mockShareCodes().map(async (code) => (await api.getPublishInfo(code)).gameType))

    expect([...types].sort()).toEqual([...GAME_TYPES].sort())
  })

  it.each(GAME_TYPES)('%s: không có khóa [ĐA] nào ở bất kỳ độ sâu nào', async (type) => {
    const { game } = await openByType(new MockPlayerApi(), type)
    const keys = collectKeys(game)

    expect(game.questions.length).toBeGreaterThan(0)
    for (const key of SECRET_KEYS) expect(keys.has(key), `lộ khóa "${key}"`).toBe(false)
    if (type === 'MATCHING') for (const key of MATCHING_SECRET_KEYS) expect(keys.has(key), `lộ khóa "${key}"`).toBe(false)
  })

  it('thông tin xuất bản và phiên cũng không chứa khóa [ĐA]', async () => {
    const api = new MockPlayerApi()
    const keys = collectKeys([await api.getPublishInfo('MOCK00'), await api.createSession('MOCK00', 'Bé An')])

    for (const key of SECRET_KEYS) expect(keys.has(key)).toBe(false)
  })

  it('thứ tự xáo không đổi giữa các lần tải lại cùng phiên', async () => {
    const api = new MockPlayerApi()
    const { sessionId, game } = await openSession(api, 'MOCK01')

    expect(await api.getGameForStudent(sessionId)).toEqual(game)
  })
})

describe('MockPlayerApi: chấm điểm', () => {
  it('đáp án đúng/sai của QUIZ, kèm correctAnswer sau khi chấm', async () => {
    const api = new MockPlayerApi()
    const { sessionId } = await openByType(api, 'QUIZ')

    const wrong = await api.submitInteraction(sessionId, 'q1', { selectedOptionId: 'a' })
    const right = await api.submitInteraction(sessionId, 'q2', { selectedOptionId: 'b' })

    expect(wrong).toMatchObject({ status: 'INCORRECT', isCorrect: false, pointsEarned: 0, correctAnswer: { selectedOptionId: 'b' } })
    expect(right).toMatchObject({ status: 'CORRECT', isCorrect: true, pointsEarned: 10, totalScore: 10 })
  })

  it('MATCHING: nối đúng theo nội dung thì đúng, hoán hai cặp thì sai', async () => {
    const api = new MockPlayerApi()
    const { sessionId, game } = await openByType(api, 'MATCHING')
    const q = game.questions[0] as MatchingStudentQuestion
    const rightIdOf = (text: string) => q.rightItems.find((item) => item.text === text)?.id ?? ''
    const left = (text: string) => q.leftItems.find((item) => item.text === text)?.id ?? ''
    const link = (l: string, r: string) => ({ leftPairId: left(l), rightPairId: rightIdOf(r) })

    const right = await api.submitInteraction(sessionId, 'q1', { matches: [link('a', 'ao'), link('ă', 'ăn'), link('â', 'ấm')] })
    const swapped = await api.submitInteraction(sessionId, 'q2', { matches: [link('A', 'ă'), link('Ă', 'a'), link('Â', 'â')] })

    expect(right.isCorrect).toBe(true)
    expect(swapped.isCorrect).toBe(false)
    // Không cặp nào nằm cùng hàng ở hai cột (không lộ đáp án qua vị trí).
    const partner: Record<string, string> = { a: 'ao', ă: 'ăn', â: 'ấm' }
    q.leftItems.forEach((item, i) => expect(q.rightItems[i].text).not.toBe(partner[item.text ?? '']))
  })

  it.each(GAME_TYPES)('%s: nộp lại đúng đáp án trong correctAnswer thì CORRECT', async (type) => {
    const api = new MockPlayerApi()
    const { code, sessionId, game } = await openByType(api, type)
    const questionId = game.questions[0].id
    const skipped = await api.submitInteraction(sessionId, questionId, { outcome: 'SKIPPED' })
    const fresh = await api.createSession(code, 'Bé Bo')
    const answer = { ...skipped.correctAnswer, ...(type === 'MEMORY_CARD' ? { flips: 6 } : {}) } as AnswerPayload

    expect(skipped).toMatchObject({ status: 'SKIPPED', isCorrect: false, pointsEarned: 0 })
    expect(skipped.correctAnswer).not.toBeNull()
    expect((await api.submitInteraction(fresh.sessionId, questionId, answer)).status).toBe('CORRECT')
  })

  it('gửi lại cùng câu trả về kết quả đã lưu, không cộng điểm lần hai', async () => {
    const api = new MockPlayerApi()
    const { sessionId } = await openByType(api, 'QUIZ')
    const first = await api.submitInteraction(sessionId, 'q2', { selectedOptionId: 'b' })
    const again = await api.submitInteraction(sessionId, 'q2', { selectedOptionId: 'a' })

    expect(again).toEqual(first)
    expect((await api.getGameForStudent(sessionId)).answeredQuestionIds).toEqual(['q2'])
  })

  it('điểm giảm theo thời gian đã dùng (FLD-16)', async () => {
    const api = new MockPlayerApi()
    const { sessionId } = await openByType(api, 'QUIZ')
    const result = await api.submitInteraction(sessionId, 'q2', { selectedOptionId: 'b' }, 30_000)

    expect(result.pointsEarned).toBe(5)
  })
})

describe('MockPlayerApi: lỗi', () => {
  it('mã chia sẻ không có thì 404, biệt danh sai thì 400, phần trả lời sai dạng thì 400', async () => {
    const api = new MockPlayerApi()
    const { sessionId } = await openByType(api, 'WORD_SCRAMBLE')

    await expect(api.getPublishInfo('ZZZZZZ')).rejects.toMatchObject({ response: { status: 404 } })
    await expect(api.createSession('MOCK00', '   ')).rejects.toMatchObject({ response: { status: 400 } })
    await expect(api.createSession('MOCK00', 'x'.repeat(21))).rejects.toMatchObject({ response: { status: 400 } })
    await expect(api.submitInteraction(sessionId, 'q1', { selectedOptionId: 'a' })).rejects.toMatchObject({ response: { status: 400 } })
    await expect(api.getGameForStudent('khong-co')).rejects.toMatchObject({ response: { status: 404 } })
  })
})

describe('getPlayerApi', () => {
  it('VITE_PLAYER_API=real: endpoint chưa có thì báo "chưa hỗ trợ" rõ ràng', async () => {
    vi.stubEnv('VITE_PLAYER_API', 'real')

    expect(await getPlayerApi()).toBeInstanceOf(RealPlayerApi)
  })

  it('VITE_PLAYER_API=mock: dùng một bản mô phỏng duy nhất (giữ phiên giữa các lần gọi)', async () => {
    vi.stubEnv('VITE_PLAYER_API', 'mock')
    const { sessionId } = await (await getPlayerApi()).createSession('MOCK00', 'Bé An')

    expect(await getPlayerApi()).toBe(await getPlayerApi())
    expect(((await (await getPlayerApi()).getGameForStudent(sessionId)) as StudentGame).gameType).toBe('QUIZ')
  })

  it('bỏ trống: theo nhóm mô phỏng "sessions" của VITE_USE_MOCK', async () => {
    vi.stubEnv('VITE_PLAYER_API', '')
    vi.stubEnv('VITE_USE_MOCK', 'sessions')
    expect(await (await getPlayerApi()).getPublishInfo('MOCK00')).toMatchObject({ gameType: 'QUIZ' })

    vi.stubEnv('VITE_USE_MOCK', 'none')
    expect(await getPlayerApi()).toBeInstanceOf(RealPlayerApi)
  })
})

// Lộ qua VỊ TRÍ/ID (không phải qua tên khóa): đáp án đúng phải có thể đứng ở mọi vị trí qua nhiều phiên.
describe('MockPlayerApi: không lộ đáp án qua vị trí hay id', () => {
  const SESSIONS = 60

  async function correctAnswers(type: GameType, pick: (answer: Record<string, unknown>, game: StudentGame) => unknown) {
    const api = new MockPlayerApi()
    const found = new Set<unknown>()

    for (let i = 0; i < SESSIONS; i++) {
      const { sessionId, game } = await openByType(api, type)
      const { correctAnswer } = await api.submitInteraction(sessionId, game.questions[0].id, { outcome: 'SKIPPED' })

      found.add(pick(correctAnswer ?? {}, game))
    }

    return found
  }

  it('AUDIO_VISUAL_MATCH: hình đúng có lúc là lựa chọn "a"', async () => {
    expect(await correctAnswers('AUDIO_VISUAL_MATCH', (answer) => answer.selectedOptionId)).toContain('a')
  })

  it('VISUAL_CLOZE: từ đúng có lúc đứng đầu danh sách', async () => {
    const positions = await correctAnswers('VISUAL_CLOZE', (answer, game) => {
      const options = (game.questions[0] as { options: string[] }).options

      return options.indexOf(String(answer.answer))
    })

    expect(positions).toContain(0)
  })

  it('ORDERING: id hiển thị không mang thứ tự đúng; thứ tự đúng đổi qua các phiên', async () => {
    const orders = await correctAnswers('ORDERING', (answer) => (answer.order as string[]).join(','))

    expect(orders.size).toBeGreaterThanOrEqual(3)
  })

  it('ORDERING: không bao giờ hiện sẵn đúng thứ tự đúng', async () => {
    const orders = await correctAnswers('ORDERING', (answer) => (answer.order as string[]).join(','))

    expect(orders.has('s1,s2,s3')).toBe(false)
  })
})

describe('MockPlayerApi: mã thử lỗi', () => {
  it.each([
    ['MOCKNP', 'GAME_NOT_PUBLISHED'],
    ['mockex', 'GAME_EXPIRED'],
    ['MOCKDS', 'GAME_DISABLED'],
    ['ZZZZZZ', 'SHARE_CODE_NOT_FOUND'],
  ])('%s: getPublishInfo và createSession cùng 404 %s', async (code, errorCode) => {
    const api = new MockPlayerApi()
    const expected = { response: { status: 404, data: { error: { code: errorCode } } } }

    await expect(api.getPublishInfo(code)).rejects.toMatchObject(expected)
    await expect(api.createSession(code, 'Bé An')).rejects.toMatchObject(expected)
  })
})

describe('MockPlayerApi: mã mở lại với giáo viên ghi đè khung', () => {
  it('MOCK10 là QUIZ, MOCK11 là MATCHING, cả hai ghi đè sang khung Học sinh', async () => {
    const api = new MockPlayerApi()

    expect(await api.getPublishInfo('MOCK10')).toMatchObject({ gameType: 'QUIZ', uiOverride: 'HOC_SINH' })
    expect(await api.getPublishInfo('MOCK11')).toMatchObject({ gameType: 'MATCHING', uiOverride: 'HOC_SINH' })
    expect(await api.getPublishInfo('MOCK00')).toMatchObject({ uiOverride: 'AUTO' })
  })
})
