import { beforeEach, describe, expect, it } from 'vitest'
import { GAME_TYPES } from '../../types/game-dsl.types'
import { validateGame } from '../../utils/gameValidation'
import { createMockGame, getMockGame, isMockGenerated, listMockGames, resetMockGames } from './mockGames'

const NO_FILTERS = { subject: '', gradeLevel: '', status: '' }

beforeEach(() => resetMockGames())

describe('createMockGame (giống kết quả POST /games/generate)', () => {
  it.each(GAME_TYPES)('%s: game NHÁP đúng loại, hợp lệ theo bộ kiểm tra khi mở lại từ máy chủ (bản trả về làm mốc)', (type) => {
    const game = createMockGame({ gameType: type, idea: 'Trò chơi đếm số lượng con vật cho học sinh lớp 1' })

    expect(game.gameType).toBe(type)
    expect(game.status).toBe('DRAFT')
    expect(game.gameId).toMatch(/^mock-game-\d+$/)
    expect(validateGame(game, 'save', { baseline: game })).toEqual([])
  })

  it('mã mới không trùng mã nào, không dùng lại, và game xuất hiện đầu danh sách (mới nhất) cũng như đọc lại được', () => {
    const first = createMockGame({ gameType: 'QUIZ' })
    const second = createMockGame({ gameType: 'MATCHING' })

    expect(new Set(['mock-game-1', 'mock-game-10', first.gameId, second.gameId]).size).toBe(4)
    expect(listMockGames(NO_FILTERS)[0].gameId).toBe(second.gameId)
    expect(listMockGames(NO_FILTERS)[1].gameId).toBe(first.gameId)
    expect(getMockGame(first.gameId).gameType).toBe('QUIZ')
    expect(listMockGames(NO_FILTERS)).toHaveLength(12)
  })

  it('tên và chủ đề lấy từ ý tưởng (cắt ở ranh giới từ, trong giới hạn); môn và khối theo yêu cầu', () => {
    const idea = 'Trò chơi đếm số lượng con vật cho học sinh lớp 1 ' + 'rất vui nhộn '.repeat(30)
    const game = createMockGame({ gameType: 'QUIZ', idea, subject: 'MATH', gradeLevel: 'GRADE_1' })

    expect(game.metadata.title.length).toBeLessThanOrEqual(60)
    expect(game.metadata.title).toMatch(/^Trò chơi đếm số lượng con vật/)
    expect(game.metadata.title.endsWith(' ')).toBe(false)
    expect(game.metadata.topic.length).toBeLessThanOrEqual(200)
    expect(game.metadata).toMatchObject({ subject: 'MATH', gradeLevel: 'GRADE_1' })
  })

  it('tạo ngẫu nhiên (không có ý tưởng): vẫn có tên và chủ đề hợp lệ', () => {
    const game = createMockGame({ gameType: 'ORDERING' })

    expect(game.metadata.title).toMatch(/^Trò chơi ngẫu nhiên/)
    expect(game.metadata.topic.length).toBeGreaterThan(0)
  })

  it('loại lạ thì dùng bộ mẫu mặc định (không văng lỗi)', () => {
    expect(createMockGame({ gameType: 'KHONG_CO' }).gameType).toBe('QUIZ')
  })

  it('đánh dấu là game do AI MÔ PHỎNG tạo (để editor nhắc nội dung chỉ là bản mẫu); game mẫu có sẵn thì không', () => {
    const game = createMockGame({ gameType: 'QUIZ' })

    expect(isMockGenerated(game.gameId)).toBe(true)
    expect(isMockGenerated('mock-game-1')).toBe(false)
  })

  it('đặt lại kho thì mất game đã tạo, dấu mô phỏng và bộ đếm mã', () => {
    const game = createMockGame({ gameType: 'QUIZ' })

    resetMockGames()

    expect(() => getMockGame(game.gameId)).toThrow()
    expect(isMockGenerated(game.gameId)).toBe(false)
    expect(createMockGame({ gameType: 'QUIZ' }).gameId).toBe(game.gameId)
  })

  it('bản trả về là bản sao: sửa nó không làm đổi kho', () => {
    const game = createMockGame({ gameType: 'QUIZ' })

    game.metadata.title = 'Bị sửa'

    expect(getMockGame(game.gameId).metadata.title).not.toBe('Bị sửa')
  })
})
