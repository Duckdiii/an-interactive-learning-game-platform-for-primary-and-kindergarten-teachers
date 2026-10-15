import axios from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AI_BACKEND_ATTEMPTS } from '../../api/gamesApi'
import { GAME_TYPES } from '../../types/game-dsl.types'
import type { GameType, QuestionDsl } from '../../types/game-dsl.types'
import { parseApiError } from '../../utils/apiError'
import { validateQuestion } from '../../utils/gameValidation'
import { describeRegenerateError } from '../../utils/regenerateErrors'
import { buildMockGameContents } from './gameFixtures'
import { getMockAiAttempts, mockRegenerateQuestion, MOCK_UNSAFE_HINT, resetMockAi, setMockAiFlakiness } from './mockAi'
import type { MockRegenerateRequest } from './mockAi'
import { getMockGame, resetMockGames, setMockGameLocked } from './mockGames'
import { setMockScenario } from './mockRuntime'

const fixtures = buildMockGameContents()
const firstQuestion = (type: GameType): QuestionDsl => structuredClone(fixtures.find((game) => game.gameType === type)!.questions[0])

const requestFor = (type: GameType, overrides: Partial<MockRegenerateRequest> = {}): MockRegenerateRequest => {
  const current = firstQuestion(type)

  return { gameId: 'mock-game-x', questionId: current.id, gameType: type, current, feedback: '', voice: 'FEMALE', ...overrides }
}

// Nội dung câu, bỏ phần do giáo viên đặt (mã thẻ, thời gian, điểm) và phần AI tự gán thêm (ảnh, giọng đọc).
const contentOf = (question: QuestionDsl) => {
  const { id: _id, timeLimitSeconds: _time, points: _points, imageUrl: _image, audioUrl: _audio, ...rest } = question

  return rest
}

beforeEach(() => resetMockAi())
afterEach(() => {
  vi.stubEnv('VITE_USE_MOCK', 'none')
  vi.stubEnv('VITE_MOCK_LATENCY_MS', '0')
  setMockScenario('normal')
  resetMockAi()
})

describe('mockRegenerateQuestion: câu mới', () => {
  it.each(GAME_TYPES)('%s: cùng loại và giữ nguyên mã thẻ, thời gian, điểm; nội dung KHÁC câu cũ và hợp lệ theo bộ kiểm tra', async (type) => {
    // Mã thẻ khác mọi mã trong bộ câu mẫu: nếu mock không giữ mã của thẻ thì lộ ngay.
    const current = { ...firstQuestion(type), id: 'q7', timeLimitSeconds: 40, points: 25 }
    const request = requestFor(type, { current, questionId: 'q7' })
    const result = await mockRegenerateQuestion(request)

    expect(result.gameType).toBe(type)
    expect(result.question).toMatchObject({ id: 'q7', timeLimitSeconds: 40, points: 25 })
    expect(contentOf(result.question)).not.toEqual(contentOf(request.current))
    expect(validateQuestion(type, result.question, 0, 'save')).toEqual([])
  })

  it('bấm làm lại liên tiếp ra các câu khác nhau (xoay vòng), và không làm hỏng bộ câu mẫu', async () => {
    const request = requestFor('QUIZ')
    const first = await mockRegenerateQuestion(request)
    const second = await mockRegenerateQuestion(request)

    expect(contentOf(first.question)).not.toEqual(contentOf(second.question))
    first.question.id = 'bi-sua'
    expect(buildMockGameContents().find((game) => game.gameType === 'QUIZ')!.questions[0].id).toBe('q1')
  })

  it('gán ảnh theo mô tả hình và giọng đọc theo giọng đã chọn (nam hoặc nữ)', async () => {
    const female = await mockRegenerateQuestion(requestFor('QUIZ', { voice: 'FEMALE' }))
    const male = await mockRegenerateQuestion(requestFor('QUIZ', { voice: 'MALE' }))

    expect(female.question.audioUrl).toBe('/mock/q1.wav?voice=FEMALE')
    expect(male.question.audioUrl).toBe('/mock/q1.wav?voice=MALE')
    expect(female.question.imageUrl).toMatch(/^\/mock\/.+\.png$/)
  })

  it('không mang ảnh hay âm thanh của câu cũ sang câu mới (kể cả ảnh blob: giáo viên vừa tải)', async () => {
    const current = { ...firstQuestion('QUIZ'), imageUrl: 'blob:http://localhost/cu', audioUrl: 'blob:http://localhost/cu2' } as QuestionDsl
    const result = await mockRegenerateQuestion(requestFor('QUIZ', { current }))

    expect(JSON.stringify(result.question)).not.toContain('blob:')
  })

  it('gợi ý "dễ hơn" thêm thời gian, "khó hơn" bớt đi, đều trong khoảng 10 đến 120 giây; gợi ý khác thì giữ nguyên', async () => {
    const at = (seconds: number) => ({ ...firstQuestion('QUIZ'), timeLimitSeconds: seconds }) as QuestionDsl
    const time = async (seconds: number, feedback: string) =>
      (await mockRegenerateQuestion(requestFor('QUIZ', { current: at(seconds), feedback }))).question.timeLimitSeconds

    expect(await time(30, 'Làm cho câu hỏi dễ hơn')).toBe(45)
    expect(await time(30, 'khó hơn nữa')).toBe(21)
    expect(await time(100, 'dễ hơn')).toBe(120)
    expect(await time(12, 'khó hơn')).toBe(10)
    expect(await time(30, 'đổi chủ đề khác')).toBe(30)
    // "dễ dàng" không phải "dễ hơn".
    expect(await time(30, 'dễ dàng hiểu')).toBe(30)
  })
})

describe('mockRegenerateQuestion: kiểm duyệt an toàn đầu ra (5a)', () => {
  it('gợi ý khiến "AI" trả nội dung không an toàn thì bị chặn 422 UNSAFE_CONTENT và ra đúng câu 5a', async () => {
    const error = await mockRegenerateQuestion(requestFor('QUIZ', { feedback: 'làm câu nsfw' })).catch((caught: unknown) => caught)

    expect(axios.isAxiosError(error) && error.response?.status).toBe(422)
    expect(parseApiError(error, '').code).toBe('UNSAFE_CONTENT')
    expect(describeRegenerateError(error)).toEqual({
      kind: 'unsafe',
      message: 'Nội dung tạo lại chưa đạt chuẩn an toàn học đường. Hệ thống đã khôi phục câu hỏi cũ, vui lòng thử lại với gợi ý mô tả khác.',
    })
    expect(MOCK_UNSAFE_HINT.test('KHONG-AN-TOAN')).toBe(true)
    expect(MOCK_UNSAFE_HINT.test('làm câu dễ hơn')).toBe(false)
  })

  it('việc chặn đi qua bộ lọc an toàn thật của giả lập (không phải cờ cứng): nội dung sạch không bị chặn', async () => {
    await expect(mockRegenerateQuestion(requestFor('QUIZ', { feedback: 'đổi chủ đề sang con vật' }))).resolves.toBeDefined()
  })
})

describe('mockRegenerateQuestion: Backend tự thử lại tối đa 2 lần (5b)', () => {
  it('trả lời ngay thì chỉ gọi AI 1 lần', async () => {
    await mockRegenerateQuestion(requestFor('QUIZ'))

    expect(getMockAiAttempts()).toBe(1)
  })

  it.each([
    [1, 2],
    [2, 3],
  ])('quá thời gian %i lần đầu rồi thành công: tổng %i lần gọi', async (failures, total) => {
    setMockAiFlakiness(failures)

    await expect(mockRegenerateQuestion(requestFor('QUIZ'))).resolves.toBeDefined()
    expect(getMockAiAttempts()).toBe(total)
  })

  it('quá thời gian cả 3 lần (1 + 2 lần thử lại) thì dừng với 504 AI_GENERATION_TIMEOUT, không thử lần thứ 4', async () => {
    setMockAiFlakiness(3)

    const error = await mockRegenerateQuestion(requestFor('QUIZ')).catch((caught: unknown) => caught)

    expect(AI_BACKEND_ATTEMPTS).toBe(3)
    expect(getMockAiAttempts()).toBe(3)
    expect(axios.isAxiosError(error) && error.response?.status).toBe(504)
    expect(parseApiError(error, '').code).toBe('AI_GENERATION_TIMEOUT')
    expect(describeRegenerateError(error)).toEqual({
      kind: 'busy',
      message: 'Máy chủ trí tuệ nhân tạo đang bận xử lý dữ liệu. Yêu cầu tạo lại của giáo viên chưa thực hiện được, vui lòng thử lại sau ít phút.',
    })
  })

  it('kịch bản timeout: AI không bao giờ kịp trả lời, cũng đúng 3 lần gọi', async () => {
    setMockScenario('timeout')

    await expect(mockRegenerateQuestion(requestFor('QUIZ'))).rejects.toMatchObject({ response: { status: 504 } })
    expect(getMockAiAttempts()).toBe(3)
  })

  it('kịch bản lỗi mạng: không tới được máy chủ nên chưa lần gọi AI nào, ra câu "máy chủ bận"', async () => {
    setMockScenario('error')

    const error = await mockRegenerateQuestion(requestFor('QUIZ')).catch((caught: unknown) => caught)

    expect(getMockAiAttempts()).toBe(0)
    expect(describeRegenerateError(error).kind).toBe('busy')
  })

  it('mỗi lần yêu cầu đếm lại từ đầu', async () => {
    setMockAiFlakiness(2)
    await mockRegenerateQuestion(requestFor('QUIZ'))
    expect(getMockAiAttempts()).toBe(3)

    setMockAiFlakiness(0)
    await mockRegenerateQuestion(requestFor('QUIZ'))
    expect(getMockAiAttempts()).toBe(1)
  })
})

describe('mockRegenerateQuestion: máy chủ chỉ biết bản ĐÃ LƯU', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_USE_MOCK', 'editor,ai')
    resetMockGames()
  })

  const savedRequest = (overrides: Partial<MockRegenerateRequest> = {}) => {
    const game = getMockGame('mock-game-1')

    return requestFor('QUIZ', { gameId: 'mock-game-1', questionId: game.questions[0].id, current: game.questions[0], ...overrides })
  }

  it('câu đã lưu thì làm lại được', async () => {
    await expect(mockRegenerateQuestion(savedRequest())).resolves.toBeDefined()
  })

  it('câu MỚI THÊM chưa lưu (mã không có trên máy chủ) thì 404 và chưa gọi AI lần nào', async () => {
    const error = await mockRegenerateQuestion(savedRequest({ questionId: 'q99' })).catch((caught: unknown) => caught)

    expect(axios.isAxiosError(error) && error.response?.status).toBe(404)
    expect(getMockAiAttempts()).toBe(0)
    expect(describeRegenerateError(error).kind).toBe('notSaved')
  })

  it('game không có trong kho (chỉ là bản nháp cục bộ) cũng 404', async () => {
    await expect(mockRegenerateQuestion(savedRequest({ gameId: 'khong-co' }))).rejects.toMatchObject({ response: { status: 404 } })
  })

  it('game có phiên chơi chưa kết thúc thì 409 và ra câu "đang có phòng chơi"', async () => {
    setMockGameLocked('mock-game-1', true)

    const error = await mockRegenerateQuestion(savedRequest()).catch((caught: unknown) => caught)

    expect(axios.isAxiosError(error) && error.response?.status).toBe(409)
    expect(describeRegenerateError(error).kind).toBe('locked')
  })

  it('khi nhóm editor KHÔNG mô phỏng (game thật), giả lập AI không đoán số phận của mã câu', async () => {
    vi.stubEnv('VITE_USE_MOCK', 'ai')

    await expect(mockRegenerateQuestion(savedRequest({ gameId: 'khong-co', questionId: 'q99' }))).resolves.toBeDefined()
  })
})

describe('mockRegenerateQuestion: hủy', () => {
  it('hủy giữa chừng thì dừng bằng lỗi hủy của axios, không đếm thêm lần gọi AI', async () => {
    vi.stubEnv('VITE_MOCK_LATENCY_MS', '20')
    setMockScenario('timeout')

    const controller = new AbortController()
    const outcome = mockRegenerateQuestion(requestFor('QUIZ'), controller.signal).catch((caught: unknown) => caught)

    setTimeout(() => controller.abort(), 30)

    expect(axios.isCancel(await outcome)).toBe(true)
    expect(getMockAiAttempts()).toBeLessThan(3)
  })
})
