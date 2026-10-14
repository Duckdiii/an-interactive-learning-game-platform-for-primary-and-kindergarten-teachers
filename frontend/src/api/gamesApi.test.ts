import { beforeEach, describe, expect, it, vi } from 'vitest'
import axiosInstance from './axiosInstance'
import { GAMES_REQUEST_TIMEOUT_MS, GAME_REQUEST_TIMEOUT_MS, fetchGame, getGames, saveGame } from './gamesApi'

vi.mock('./axiosInstance', () => ({ default: { get: vi.fn(), put: vi.fn() } }))

const mockedGet = vi.mocked(axiosInstance.get)
const mockedPut = vi.mocked(axiosInstance.put)

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
