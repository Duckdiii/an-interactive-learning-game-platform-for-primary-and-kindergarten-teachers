import { beforeEach, describe, expect, it, vi } from 'vitest'
import axiosInstance from './axiosInstance'
import {
  AI_ATTEMPT_TIMEOUT_MS,
  AI_BACKEND_ATTEMPTS,
  GAMES_REQUEST_TIMEOUT_MS,
  GAME_REQUEST_TIMEOUT_MS,
  REGENERATE_QUESTION_TIMEOUT_MS,
  fetchGame,
  getGames,
  postRegenerateQuestion,
  saveGame,
} from './gamesApi'

vi.mock('./axiosInstance', () => ({ default: { get: vi.fn(), put: vi.fn(), post: vi.fn() } }))

const mockedGet = vi.mocked(axiosInstance.get)
const mockedPut = vi.mocked(axiosInstance.put)
const mockedPost = vi.mocked(axiosInstance.post)

describe('getGames', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedGet.mockResolvedValue({ data: { success: true, data: [] } })
  })

  it('đặt timeout riêng cho lệnh đọc danh sách (không đặt timeout chung)', async () => {
    await getGames({ subject: '', gradeLevel: '', status: '' })

    expect(GAMES_REQUEST_TIMEOUT_MS).toBe(10_000)
    expect(mockedGet).toHaveBeenCalledWith(
      '/games',
      expect.objectContaining({ timeout: GAMES_REQUEST_TIMEOUT_MS }),
    )
  })

  it('chỉ gửi bộ lọc có giá trị, giữ nguyên giá trị enum', async () => {
    await getGames({ subject: 'MATH', gradeLevel: '', status: 'DRAFT' })

    expect(mockedGet).toHaveBeenCalledWith(
      '/games',
      expect.objectContaining({
        params: { subject: 'MATH', gradeLevel: undefined, status: 'DRAFT' },
      }),
    )
  })
})

describe('fetchGame và saveGame', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fetchGame gọi GET /games/{id} (mã hóa id) và trả phần data của phản hồi', async () => {
    const game = { gameId: 'a/b' }
    mockedGet.mockResolvedValue({ data: { success: true, data: game } })

    await expect(fetchGame('a/b')).resolves.toBe(game)

    expect(mockedGet).toHaveBeenCalledWith('/games/a%2Fb', { timeout: GAME_REQUEST_TIMEOUT_MS })
  })

  it('saveGame gọi PUT /games/{id} với thân là envelope DSL và trả phần data của phản hồi', async () => {
    const saved = { gameId: 'g1', status: 'DRAFT' }
    const body = { gameType: 'QUIZ' } as Parameters<typeof saveGame>[1]
    mockedPut.mockResolvedValue({ data: { success: true, data: saved } })

    await expect(saveGame('g1', body)).resolves.toBe(saved)

    expect(mockedPut).toHaveBeenCalledWith('/games/g1', body, { timeout: GAME_REQUEST_TIMEOUT_MS })
    expect(GAME_REQUEST_TIMEOUT_MS).toBe(15_000)
  })

  it('lỗi từ axios được ném lại nguyên vẹn để giao diện xử lý', async () => {
    mockedGet.mockRejectedValue(new Error('mất mạng'))

    await expect(fetchGame('g1')).rejects.toThrow('mất mạng')
  })
})

describe('postRegenerateQuestion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedPost.mockResolvedValue({ data: { success: true, data: { question: { id: 'q1' }, gameType: 'QUIZ' } } })
  })

  it('timeout của lời gọi dài hơn cả 3 lần gọi AI của Backend (1 + 2 lần thử lại, mỗi lần 5 giây), kể cả khoảng đệm', () => {
    expect(AI_ATTEMPT_TIMEOUT_MS).toBe(5_000)
    expect(AI_BACKEND_ATTEMPTS).toBe(3)
    expect(REGENERATE_QUESTION_TIMEOUT_MS).toBeGreaterThan(AI_BACKEND_ATTEMPTS * AI_ATTEMPT_TIMEOUT_MS)
  })

  it('POST tới đúng địa chỉ (mã được mã hóa), kèm gợi ý đã cắt khoảng trắng, timeout riêng và tín hiệu hủy', async () => {
    const controller = new AbortController()
    const result = await postRegenerateQuestion('g 1', 'q/2', { feedback: '  làm dễ hơn  ', signal: controller.signal })

    expect(result).toEqual({ question: { id: 'q1' }, gameType: 'QUIZ' })
    expect(mockedPost).toHaveBeenCalledWith(
      '/games/g%201/questions/q%2F2/regenerate',
      { feedback: 'làm dễ hơn' },
      { timeout: REGENERATE_QUESTION_TIMEOUT_MS, signal: controller.signal },
    )
  })

  it('không có gợi ý (trống hoặc toàn khoảng trắng) thì không gửi thân yêu cầu', async () => {
    await postRegenerateQuestion('g1', 'q1')
    await postRegenerateQuestion('g1', 'q1', { feedback: '   ' })

    expect(mockedPost.mock.calls[0][1]).toBeUndefined()
    expect(mockedPost.mock.calls[1][1]).toBeUndefined()
  })
})
