import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getGames } from '../api/gamesApi'
import { GAME_TYPE_VALUES } from '../constants/labels'
import { listGames } from './gamesService'
import { resetMockGames } from './mock/mockGames'
import { setMockScenario } from './mock/mockRuntime'

vi.mock('../api/gamesApi', () => ({ getGames: vi.fn() }))

const mockedGetGames = vi.mocked(getGames)
const NO_FILTERS = { subject: '', gradeLevel: '', status: '' }

beforeEach(() => resetMockGames())
afterEach(() => {
  vi.stubEnv('VITE_USE_MOCK', 'none')
  setMockScenario('normal')
  vi.clearAllMocks()
})

describe('listGames khi nhóm "games" KHÔNG mô phỏng', () => {
  it('gọi API thật với đúng bộ lọc và không dùng dữ liệu mẫu', async () => {
    vi.stubEnv('VITE_USE_MOCK', 'ai,sessions')
    mockedGetGames.mockResolvedValue([])

    await expect(listGames({ subject: 'MATH', gradeLevel: '', status: 'DRAFT' })).resolves.toEqual([])

    expect(mockedGetGames).toHaveBeenCalledWith({ subject: 'MATH', gradeLevel: '', status: 'DRAFT' })
  })

  it('lỗi của API thật được giữ nguyên để giao diện báo lỗi', async () => {
    vi.stubEnv('VITE_USE_MOCK', 'none')
    mockedGetGames.mockRejectedValue(new Error('máy chủ lỗi'))

    await expect(listGames(NO_FILTERS)).rejects.toThrow('máy chủ lỗi')
  })
})

describe('listGames khi nhóm "games" đang mô phỏng', () => {
  beforeEach(() => vi.stubEnv('VITE_USE_MOCK', 'games'))

  it('không gọi API thật; trả game mẫu sắp theo updatedAt giảm dần', async () => {
    const games = await listGames(NO_FILTERS)

    expect(mockedGetGames).not.toHaveBeenCalled()
    expect(games).toHaveLength(10)
    const times = games.map((game) => Date.parse(game.updatedAt))
    expect(times).toEqual([...times].sort((a, b) => b - a))
  })

  it('tên game mẫu có nghĩa (không phải "Trò chơi N"), đủ 10 loại game của API', async () => {
    const games = await listGames(NO_FILTERS)

    games.forEach((game) => expect(game.title).not.toMatch(/^Trò chơi \d+$/))
    expect(new Set(games.map((game) => game.gameType))).toEqual(new Set(GAME_TYPE_VALUES))
    expect(games.map((game) => game.title)).toContain('Nhận biết chữ cái A Ă Â')
  })

  it('game đã xuất bản có mã chia sẻ và đường dẫn; bản nháp thì không', async () => {
    const games = await listGames(NO_FILTERS)

    for (const game of games) {
      if (game.status === 'PUBLISHED') {
        expect(game.shareCode).toMatch(/^[A-Z0-9]{6}$/)
        expect(game.shareUrl).toContain(game.shareCode as string)
      } else {
        expect(game.shareCode).toBeNull()
      }
    }
  })

  it('lọc theo môn, khối lớp và trạng thái giống GET /games', async () => {
    const math = await listGames({ ...NO_FILTERS, subject: 'MATH' })
    const published = await listGames({ ...NO_FILTERS, status: 'PUBLISHED' })
    const none = await listGames({ subject: 'ENGLISH', gradeLevel: 'GRADE_5', status: '' })

    expect(math.length).toBeGreaterThan(0)
    math.forEach((game) => expect(game.subject).toBe('MATH'))
    published.forEach((game) => expect(game.status).toBe('PUBLISHED'))
    expect(none).toEqual([])
  })

  it('kịch bản trống trả danh sách rỗng; kịch bản lỗi ném lỗi mất kết nối', async () => {
    setMockScenario('empty')
    await expect(listGames(NO_FILTERS)).resolves.toEqual([])

    setMockScenario('error')
    await expect(listGames(NO_FILTERS)).rejects.toMatchObject({ code: 'ERR_NETWORK' })
  })
})
