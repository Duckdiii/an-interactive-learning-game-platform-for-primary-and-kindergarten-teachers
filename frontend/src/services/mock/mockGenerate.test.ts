import axios from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { describeGenerateError } from '../../utils/generateErrors'
import { getMockGenerateCalls, mockGenerateGame, resetMockGenerate, setMockGenerateFailure } from './mockGenerate'
import { listMockGames, resetMockGames } from './mockGames'
import { setMockScenario } from './mockRuntime'

const NO_FILTERS = { subject: '', gradeLevel: '', status: '' }
const request = { gameType: 'QUIZ', idea: 'Trò chơi đếm số lượng con vật', voice: { region: 'NORTH', gender: 'FEMALE' } }

beforeEach(() => {
  resetMockGames()
  resetMockGenerate()
})
afterEach(() => {
  vi.stubEnv('VITE_MOCK_LATENCY_MS', '0')
  setMockScenario('normal')
})

describe('mockGenerateGame', () => {
  it('thành công: thêm đúng MỘT game nháp vào kho và trả game đó', async () => {
    const game = await mockGenerateGame(request)

    expect(game.status).toBe('DRAFT')
    expect(listMockGames(NO_FILTERS)).toHaveLength(11)
    expect(listMockGames(NO_FILTERS)[0].gameId).toBe(game.gameId)
    expect(getMockGenerateCalls()).toBe(1)
  })

  it('kịch bản timeout: 504 AI_GENERATION_TIMEOUT, KHÔNG có game nào trong kho', async () => {
    setMockScenario('timeout')

    const error = await mockGenerateGame(request).catch((caught: unknown) => caught)

    expect(axios.isAxiosError(error) && error.response?.status).toBe(504)
    expect(describeGenerateError(error).kind).toBe('busy')
    expect(listMockGames(NO_FILTERS)).toHaveLength(10)
  })

  it('kịch bản lỗi mạng: ra loại busy, không có game nào', async () => {
    setMockScenario('error')

    const error = await mockGenerateGame(request).catch((caught: unknown) => caught)

    expect(describeGenerateError(error).kind).toBe('busy')
    expect(listMockGames(NO_FILTERS)).toHaveLength(10)
  })

  it('ý tưởng có từ khóa không an toàn thì 422 UNSAFE_CONTENT', async () => {
    const error = await mockGenerateGame({ ...request, idea: 'tạo trò chơi nsfw' }).catch((caught: unknown) => caught)

    expect(axios.isAxiosError(error) && error.response?.status).toBe(422)
    expect(describeGenerateError(error).kind).toBe('unsafe')
    expect(listMockGames(NO_FILTERS)).toHaveLength(10)
  })

  it('gây lỗi riêng từng loại: loại bị đặt lỗi thất bại, loại khác vẫn thành công; 429 ra loại rateLimited', async () => {
    setMockGenerateFailure('MATCHING', 'rateLimited')
    setMockGenerateFailure('ORDERING', 'timeout')
    setMockGenerateFailure('MEMORY_CARD', 'unsafe')

    const ok = await mockGenerateGame(request)
    const limited = await mockGenerateGame({ ...request, gameType: 'MATCHING' }).catch((caught: unknown) => caught)
    const busy = await mockGenerateGame({ ...request, gameType: 'ORDERING' }).catch((caught: unknown) => caught)
    const unsafe = await mockGenerateGame({ ...request, gameType: 'MEMORY_CARD' }).catch((caught: unknown) => caught)

    expect(ok.gameType).toBe('QUIZ')
    expect(describeGenerateError(limited).kind).toBe('rateLimited')
    expect(describeGenerateError(busy).kind).toBe('busy')
    expect(describeGenerateError(unsafe).kind).toBe('unsafe')

    setMockGenerateFailure('MATCHING', null)
    await expect(mockGenerateGame({ ...request, gameType: 'MATCHING' })).resolves.toMatchObject({ gameType: 'MATCHING' })
  })

  it('hủy giữa chừng thì dừng bằng lỗi hủy và KHÔNG thêm game nào vào kho', async () => {
    vi.stubEnv('VITE_MOCK_LATENCY_MS', '50')

    const controller = new AbortController()
    const outcome = mockGenerateGame(request, controller.signal).catch((caught: unknown) => caught)

    setTimeout(() => controller.abort(), 30)

    const error = await outcome

    expect(axios.isCancel(error)).toBe(true)
    expect(describeGenerateError(error).kind).toBe('canceled')
    expect(listMockGames(NO_FILTERS)).toHaveLength(10)
  })

  it('đã hủy từ trước thì không làm gì cả', async () => {
    const controller = new AbortController()

    controller.abort()

    await expect(mockGenerateGame(request, controller.signal)).rejects.toSatisfy((error) => axios.isCancel(error))
    expect(listMockGames(NO_FILTERS)).toHaveLength(10)
  })
})
