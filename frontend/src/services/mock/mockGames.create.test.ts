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

  it('BR-05: tạo game MATCHING cho môn Toán / đếm số: sinh nội dung đếm số đồ vật, không bị lẫn vần tiếng Việt', () => {
    const game = createMockGame({ gameType: 'MATCHING', subject: 'MATH', gradeLevel: 'KINDERGARTEN', idea: 'Bé đếm số con vật từ 1 đến 5' })

    expect(game.gameType).toBe('MATCHING')
    expect(game.metadata.subject).toBe('MATH')
    const firstQuestion = game.questions[0] as { pairs: Array<{ left: { text?: string }; right: { text?: string } }> }
    expect(firstQuestion.pairs[0].left.text).toContain('quả táo')
    expect(firstQuestion.pairs[0].right.text).toBe('Số 1')
  })
  it('BR-06: tạo game MATCHING Tiếng Việt mầm non / lớp 1: sinh thẻ chữ gắn liền với hình vector CC0 (a - quả táo, c - con cá...)', () => {
    const game = createMockGame({ gameType: 'MATCHING', subject: 'VIETNAMESE', gradeLevel: 'KINDERGARTEN', idea: 'Nhận biết chữ cái' })

    expect(game.gameType).toBe('MATCHING')
    const firstQuestion = game.questions[0] as { pairs: Array<{ left: { text?: string; imageUrl?: string }; right: { text?: string; imageUrl?: string } }> }
    expect(firstQuestion.pairs).toHaveLength(4)
    expect(firstQuestion.pairs[0].left.text).toBe('a')
    expect(firstQuestion.pairs[0].left.imageUrl).toBe('/assets/fruits/apple.svg')
    expect(firstQuestion.pairs[0].right.text).toBe('Quả táo')
    expect(firstQuestion.pairs[0].right.imageUrl).toBe('/assets/fruits/apple.svg')

    expect(firstQuestion.pairs[1].left.text).toBe('c')
    expect(firstQuestion.pairs[1].left.imageUrl).toBe('/assets/animals/fish.svg')
    expect(firstQuestion.pairs[1].right.text).toBe('Con cá')
    expect(firstQuestion.pairs[1].right.imageUrl).toBe('/assets/animals/fish.svg')

    // 100% thẻ đều có imageUrl
    for (const pair of firstQuestion.pairs) {
      expect(pair.left.imageUrl).toBeTruthy()
      expect(pair.right.imageUrl).toBeTruthy()
    }
  })

  it('BR-07: tạo game MATCHING với bối cảnh đại dương: tự động bóc tách thực thể và gán asset biển', () => {
    const game = createMockGame({ gameType: 'MATCHING', subject: 'SCIENCE', gradeLevel: 'GRADE_1', idea: 'Bé nối các sinh vật biển: cá hề, rùa biển, sao biển, bạch tuộc' })

    expect(game.gameType).toBe('MATCHING')
    const firstQuestion = game.questions[0] as { pairs: Array<{ left: { text?: string; imageUrl?: string }; right: { text?: string; imageUrl?: string } }> }
    expect(firstQuestion.pairs.length).toBeGreaterThanOrEqual(3)
    for (const pair of firstQuestion.pairs) {
      expect(pair.left.imageUrl).toContain('/assets/')
      expect(pair.right.imageUrl).toContain('/assets/')
    }
  })

  it('BR-08: tạo game QUIZ phép cộng có nhớ phạm vi 50 trong nông trại: sinh câu hỏi toán động chính xác', () => {
    const game = createMockGame({ gameType: 'QUIZ', subject: 'MATH', gradeLevel: 'GRADE_2', idea: 'Phép cộng có nhớ trong phạm vi 50 ở nông trại' })

    expect(game.gameType).toBe('QUIZ')
    expect(game.questions).toHaveLength(3)
    for (const q of game.questions as any[]) {
      expect(q.options.length).toBeGreaterThanOrEqual(2)
      expect(q.correctOptionId).toBeTruthy()
      expect(q.imageUrl).toContain('/assets/themes/farm/')
    }
  })

  it('BR-09: tạo game MATCHING phân biệt âm l và n: sinh các cặp ngữ âm động', () => {
    const game = createMockGame({ gameType: 'MATCHING', subject: 'VIETNAMESE', gradeLevel: 'GRADE_1', idea: 'Phân biệt âm l và n' })

    expect(game.gameType).toBe('MATCHING')
    const firstQuestion = game.questions[0] as any
    expect(firstQuestion.pairs.length).toBeGreaterThanOrEqual(2)
    const hasLOrN = firstQuestion.pairs.some((p: any) => p.left.text.includes('l') || p.left.text.includes('n'))
    expect(hasLOrN).toBe(true)
  })
});
