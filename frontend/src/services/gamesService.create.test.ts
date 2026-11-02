import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { postGenerateGame } from '../api/gamesApi'
import { buildMockGameContents } from './mock/gameFixtures'
import { mockApiError } from './mock/mockErrors'
import { getMockGenerateCalls, resetMockGenerate, setMockGenerateFailure } from './mock/mockGenerate'
import { listMockGames, resetMockGames } from './mock/mockGames'
import { setMockScenario } from './mock/mockRuntime'
import { describeGenerateError } from '../utils/generateErrors'
import type { GenerateGameRequest } from '../utils/generateRequest'
import { createGames } from './gamesService'

vi.mock('../api/gamesApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/gamesApi')>()),
  postGenerateGame: vi.fn(),
}))

const mockedPost = vi.mocked(postGenerateGame)
const NO_FILTERS = { subject: '', gradeLevel: '', status: '' }
const voice = { region: 'NORTH', gender: 'FEMALE' }
const requestFor = (gameType: string, extra: Partial<GenerateGameRequest> = {}): GenerateGameRequest => ({
  gameType,
  idea: 'Trò chơi đếm số lượng con vật',
  subject: 'MATH',
  gradeLevel: 'GRADE_1',
  voice,
  ...extra,
})

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })

  return { promise, resolve, reject }
}

const game = (id: string) => ({ ...buildMockGameContents()[0], gameId: id, status: 'DRAFT', updatedAt: '2026-10-15T00:00:00.000Z' })

beforeEach(() => {
  resetMockGames()
  resetMockGenerate()
})
afterEach(() => {
  vi.stubEnv('VITE_USE_MOCK', 'none')
  vi.stubEnv('VITE_MOCK_LATENCY_MS', '0')
  setMockScenario('normal')
  vi.clearAllMocks()
})

describe('createGames: API thật (nhóm ai không mô phỏng)', () => {
  it('chạy SONG SONG: cả ba yêu cầu được gửi đi trước khi yêu cầu nào xong', async () => {
    const pending = [deferred<ReturnType<typeof game>>(), deferred<ReturnType<typeof game>>(), deferred<ReturnType<typeof game>>()]

    mockedPost.mockImplementation((request) => pending[['QUIZ', 'MATCHING', 'ORDERING'].indexOf(request.gameType ?? '')].promise)

    const all = createGames([requestFor('QUIZ'), requestFor('MATCHING'), requestFor('ORDERING')])

    await Promise.resolve()
    expect(mockedPost).toHaveBeenCalledTimes(3)

    pending[2].resolve(game('g3'))
    pending[0].resolve(game('g1'))
    pending[1].resolve(game('g2'))

    const outcomes = await all

    // Kết quả theo ĐÚNG thứ tự yêu cầu dù hoàn thành khác thứ tự.
    expect(outcomes.map((outcome) => (outcome.ok ? outcome.game.gameId : 'lỗi'))).toEqual(['g1', 'g2', 'g3'])
    expect(outcomes.map((outcome) => outcome.gameType)).toEqual(['QUIZ', 'MATCHING', 'ORDERING'])
  })

  it('lỗi một phần: loại lỗi có lỗi riêng, các loại khác vẫn thành công (allSettled)', async () => {
    mockedPost.mockImplementation((request) =>
      request.gameType === 'MATCHING' ? Promise.reject(mockApiError(504, 'AI_GENERATION_TIMEOUT', 'x')) : Promise.resolve(game('g-' + request.gameType)),
    )

    const outcomes = await createGames([requestFor('QUIZ'), requestFor('MATCHING'), requestFor('ORDERING')])

    expect(outcomes.map((outcome) => outcome.ok)).toEqual([true, false, true])
    expect(describeGenerateError(outcomes[1].ok ? null : outcomes[1].error).kind).toBe('busy')
  })

  it('429 KHÔNG tự thử lại: đúng một lần gọi cho loại bị giới hạn, lỗi mang loại rateLimited với câu chung của bảng mã lỗi', async () => {
    mockedPost.mockRejectedValue(mockApiError(429, 'RATE_LIMITED', 'x'))

    const [outcome] = await createGames([requestFor('QUIZ')])

    expect(mockedPost).toHaveBeenCalledTimes(1)
    expect(outcome.ok).toBe(false)
    expect(outcome.ok ? null : describeGenerateError(outcome.error)).toEqual({ kind: 'rateLimited', message: 'Bạn thao tác quá nhanh. Hãy chờ một lúc rồi thử lại.' })
  })

  it('truyền tín hiệu hủy cho mọi yêu cầu; hủy thì mọi kết quả là lỗi hủy', async () => {
    const controller = new AbortController()

    mockedPost.mockImplementation(
      (_request, signal) =>
        new Promise((_resolve, reject) => {
          signal?.addEventListener('abort', () => reject(Object.assign(new Error('canceled'), { code: 'ERR_CANCELED', __CANCEL__: true })))
        }),
    )

    const all = createGames([requestFor('QUIZ'), requestFor('MATCHING')], controller.signal)

    await Promise.resolve()
    expect(mockedPost.mock.calls.every((call) => call[1] === controller.signal)).toBe(true)

    controller.abort()

    const outcomes = await all

    expect(outcomes.every((outcome) => !outcome.ok)).toBe(true)
  })

  it('thiếu khối lớp hoặc môn học: KHÔNG gọi API thật, lỗi needLesson (lệch contract có chủ đích)', async () => {
    mockedPost.mockResolvedValue(game('g-ordering'))

    const outcomes = await createGames([requestFor('QUIZ', { subject: undefined }), requestFor('MATCHING', { gradeLevel: undefined }), requestFor('ORDERING')])

    expect(mockedPost).toHaveBeenCalledTimes(1)
    expect(outcomes.map((outcome) => (outcome.ok ? 'ok' : describeGenerateError(outcome.error).kind))).toEqual(['needLesson', 'needLesson', 'ok'])
  })

  it('quá 3 loại thì từ chối ngay (lỗi lập trình), không gọi API', async () => {
    await expect(createGames([requestFor('QUIZ'), requestFor('MATCHING'), requestFor('ORDERING'), requestFor('MEMORY_CARD')])).rejects.toThrow(RangeError)
    expect(mockedPost).not.toHaveBeenCalled()
  })
})

describe('createGames: AI mô phỏng (nhóm ai mô phỏng)', () => {
  beforeEach(() => vi.stubEnv('VITE_USE_MOCK', 'ai,games,editor'))

  it('tạo đủ ba game nháp trong kho mô phỏng, không gọi API thật, kể cả khi thiếu khối lớp và môn', async () => {
    const outcomes = await createGames([requestFor('QUIZ', { subject: undefined }), requestFor('MATCHING'), requestFor('ORDERING')])

    expect(outcomes.every((outcome) => outcome.ok)).toBe(true)
    expect(mockedPost).not.toHaveBeenCalled()
    expect(listMockGames(NO_FILTERS)).toHaveLength(13)
    expect(getMockGenerateCalls()).toBe(3)
  })

  it('lỗi một phần: chỉ loại lỗi không có game; "thử lại phần còn thiếu" không tạo trùng game đã có', async () => {
    setMockGenerateFailure('MATCHING', 'timeout')

    const first = await createGames([requestFor('QUIZ'), requestFor('MATCHING'), requestFor('ORDERING')])

    expect(first.map((outcome) => outcome.ok)).toEqual([true, false, true])
    expect(listMockGames(NO_FILTERS)).toHaveLength(12)

    setMockGenerateFailure('MATCHING', null)

    const missing = first.filter((outcome) => !outcome.ok).map((outcome) => requestFor(outcome.gameType))
    const retry = await createGames(missing)

    expect(retry).toHaveLength(1)
    expect(retry[0].ok).toBe(true)
    expect(listMockGames(NO_FILTERS)).toHaveLength(13)
    expect(getMockGenerateCalls()).toBe(4)
  })

  it('hủy giữa chừng: KHÔNG game nào được thêm vào kho', async () => {
    vi.stubEnv('VITE_MOCK_LATENCY_MS', '60')

    const controller = new AbortController()
    const all = createGames([requestFor('QUIZ'), requestFor('MATCHING')], controller.signal)

    setTimeout(() => controller.abort(), 40)

    const outcomes = await all

    expect(outcomes.map((outcome) => (outcome.ok ? 'ok' : describeGenerateError(outcome.error).kind))).toEqual(['canceled', 'canceled'])
    expect(listMockGames(NO_FILTERS)).toHaveLength(10)
  })
})
