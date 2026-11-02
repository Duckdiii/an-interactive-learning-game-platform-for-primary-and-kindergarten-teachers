import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchGame, saveGame } from '../api/gamesApi'
import { GAME_TYPE_VALUES } from '../constants/labels'
import type { QuizGame } from '../types/game-dsl.types'
import { parseApiError } from '../utils/apiError'
import { getGame, updateGame } from './gameService'
import { listGames } from './gamesService'
import { resetMockGames, setMockGameLocked } from './mock/mockGames'
import { setMockScenario } from './mock/mockRuntime'

vi.mock('../api/gamesApi', () => ({ getGames: vi.fn(), fetchGame: vi.fn(), saveGame: vi.fn() }))

const mockedFetch = vi.mocked(fetchGame)
const mockedSave = vi.mocked(saveGame)
const NO_FILTERS = { subject: '', gradeLevel: '', status: '' }

beforeEach(() => resetMockGames())
afterEach(() => {
  vi.stubEnv('VITE_USE_MOCK', 'none')
  setMockScenario('normal')
  vi.clearAllMocks()
})

describe('getGame và updateGame khi nhóm "editor" KHÔNG mô phỏng', () => {
  it('gọi API thật, không đụng kho mô phỏng', async () => {
    vi.stubEnv('VITE_USE_MOCK', 'games,ai')
    const real = { gameId: 'real-1' } as Awaited<ReturnType<typeof fetchGame>>
    mockedFetch.mockResolvedValue(real)
    mockedSave.mockResolvedValue(real)

    await expect(getGame('real-1')).resolves.toBe(real)
    const body = { gameType: 'QUIZ' } as QuizGame
    await expect(updateGame('real-1', body)).resolves.toBe(real)

    expect(mockedFetch).toHaveBeenCalledWith('real-1')
    expect(mockedSave).toHaveBeenCalledWith('real-1', body)
  })
})

describe('getGame khi nhóm "editor" đang mô phỏng', () => {
  beforeEach(() => vi.stubEnv('VITE_USE_MOCK', 'editor,games'))

  it('trả game đầy đủ theo GameResponse: envelope DSL cộng gameId, status, updatedAt', async () => {
    const game = await getGame('mock-game-1')

    expect(game).toMatchObject({
      gameId: 'mock-game-1',
      status: 'PUBLISHED',
      schemaVersion: '1.0.0',
      gameType: 'QUIZ',
      metadata: { title: 'Đếm số đến 10', subject: 'MATH', gradeLevel: 'KINDERGARTEN' },
    })
    expect(game.questions).toHaveLength(3)
    expect(Date.parse(game.updatedAt)).not.toBeNaN()
    expect(mockedFetch).not.toHaveBeenCalled()
  })

  it('mỗi loại game trong API có đúng một game mẫu, mỗi game 1 đến 20 câu và id câu dạng q1, q2...', async () => {
    const summaries = await listGames(NO_FILTERS)
    const games = await Promise.all(summaries.map((summary) => getGame(summary.gameId)))

    expect(games.map((game) => game.gameType).sort()).toEqual([...GAME_TYPE_VALUES].sort())
    for (const game of games) {
      expect(game.questions.length).toBeGreaterThanOrEqual(1)
      expect(game.questions.length).toBeLessThanOrEqual(20)
      game.questions.forEach((question, index) => expect(question.id).toBe(`q${index + 1}`))
    }
  })

  it('danh sách tóm tắt và nội dung đầy đủ khớp nhau (tên, loại, môn, khối lớp, trạng thái)', async () => {
    for (const summary of await listGames(NO_FILTERS)) {
      const game = await getGame(summary.gameId)

      expect(summary).toMatchObject({
        title: game.metadata.title,
        gameType: game.gameType,
        subject: game.metadata.subject,
        gradeLevel: game.metadata.gradeLevel,
        status: game.status,
        updatedAt: game.updatedAt,
      })
    }
  })

  it('trả bản sao: sửa kết quả không làm đổi kho', async () => {
    const first = await getGame('mock-game-1')
    first.metadata.title = 'Đã bị sửa ở ngoài'

    expect((await getGame('mock-game-1')).metadata.title).toBe('Đếm số đến 10')
  })

  it('không có game: lỗi 404 đúng hình dạng backend, parseApiError ra câu tiếng Việt', async () => {
    const error = await getGame('khong-co').catch((caught: unknown) => caught)

    expect(error).toMatchObject({ response: { status: 404 } })
    expect(parseApiError(error, 'dự phòng')).toMatchObject({ code: 'NOT_FOUND' })
    expect(parseApiError(error, 'dự phòng').message).toMatch(/Không tìm thấy/)
  })

  it('kịch bản lỗi mạng ném lỗi mất kết nối; kịch bản quá thời gian ném ECONNABORTED (câu "phản hồi quá chậm")', async () => {
    setMockScenario('error')
    await expect(getGame('mock-game-1')).rejects.toMatchObject({ code: 'ERR_NETWORK' })

    setMockScenario('timeout')
    const error = await getGame('mock-game-1').catch((caught: unknown) => caught)
    expect(error).toMatchObject({ code: 'ECONNABORTED' })
    expect(parseApiError(error, 'dự phòng').message).toMatch(/quá chậm/)
  })

  it('kịch bản trống (chưa có game nào): mở thẳng một game cũng là 404', async () => {
    setMockScenario('empty')

    await expect(getGame('mock-game-1')).rejects.toMatchObject({ response: { status: 404 } })
  })
})

describe('updateGame khi nhóm "editor" đang mô phỏng', () => {
  beforeEach(() => vi.stubEnv('VITE_USE_MOCK', 'editor,games'))

  async function editedQuiz() {
    const game = (await getGame('mock-game-1')) as QuizGame & { gameId: string; status: string; updatedAt: string }
    const { gameId, status, updatedAt, ...body } = game

    void gameId
    void status
    void updatedAt
    body.metadata = { ...body.metadata, title: 'Đếm số đến 20' }
    body.questions = body.questions.slice(0, 2)

    return { body: body as QuizGame, before: updatedAt }
  }

  it('lưu nội dung mới, cập nhật updatedAt và giữ nguyên trạng thái (game đã đăng vẫn đã đăng)', async () => {
    const { body, before } = await editedQuiz()

    const saved = await updateGame('mock-game-1', body)

    expect(saved.metadata.title).toBe('Đếm số đến 20')
    expect(saved.questions).toHaveLength(2)
    expect(saved.status).toBe('PUBLISHED')
    expect(Date.parse(saved.updatedAt)).toBeGreaterThan(Date.parse(before))
    expect((await getGame('mock-game-1')).questions).toHaveLength(2)
  })

  it('sửa thân đã gửi sau khi lưu không làm đổi kho (kho giữ bản sao riêng)', async () => {
    const { body } = await editedQuiz()

    await updateGame('mock-game-1', body)
    body.metadata.title = 'Sửa lén sau khi lưu'
    body.questions.length = 0

    const stored = await getGame('mock-game-1')
    expect(stored.metadata.title).toBe('Đếm số đến 20')
    expect(stored.questions).toHaveLength(2)
  })

  it('danh sách phản ánh bản vừa lưu và game vừa sửa lên đầu', async () => {
    const current = await getGame('mock-game-3')

    await updateGame('mock-game-3', { ...current, metadata: { ...current.metadata, title: 'Vừa sửa xong' } })

    const games = await listGames(NO_FILTERS)
    expect(games[0]).toMatchObject({ gameId: 'mock-game-3', title: 'Vừa sửa xong' })
  })

  it('gửi lại nguyên GameResponse thì gameId, status, updatedAt cũ không bị ghi đè vào nội dung', async () => {
    const current = await getGame('mock-game-3')

    const saved = await updateGame('mock-game-3', { ...current, status: 'PUBLISHED', gameId: 'khac' } as typeof current)

    expect(saved.gameId).toBe('mock-game-3')
    expect(saved.status).toBe('DRAFT')
  })

  it('không đổi được loại game: 400 VALIDATION_ERROR và nội dung cũ được giữ', async () => {
    const other = await getGame('mock-game-2')

    const error = await updateGame('mock-game-1', other).catch((caught: unknown) => caught)

    expect(parseApiError(error, 'dự phòng')).toMatchObject({ code: 'VALIDATION_ERROR' })
    expect((await getGame('mock-game-1')).gameType).toBe('QUIZ')
  })

  it('game đang có phiên chưa kết thúc: 409 CONFLICT và không bị sửa', async () => {
    const { body } = await editedQuiz()
    setMockGameLocked('mock-game-1', true)

    const error = await updateGame('mock-game-1', body).catch((caught: unknown) => caught)

    expect(error).toMatchObject({ response: { status: 409 } })
    expect(parseApiError(error, 'dự phòng').code).toBe('CONFLICT')
    expect((await getGame('mock-game-1')).metadata.title).toBe('Đếm số đến 10')
  })

  it('không có game: 404; kịch bản lỗi mạng: không sửa gì', async () => {
    const { body } = await editedQuiz()

    await expect(updateGame('khong-co', body)).rejects.toMatchObject({ response: { status: 404 } })

    setMockScenario('error')
    await expect(updateGame('mock-game-1', body)).rejects.toMatchObject({ code: 'ERR_NETWORK' })
    setMockScenario('normal')
    expect((await getGame('mock-game-1')).metadata.title).toBe('Đếm số đến 10')
  })
})
