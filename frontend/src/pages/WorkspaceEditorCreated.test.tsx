import { screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GAME_TYPES } from '../types/game-dsl.types'
import { createMockGame, resetMockGames } from '../services/mock/mockGames'
import { loginAsTeacher, renderWithProviders } from '../test/renderWithApp'
import { clearNewGames, isNewGame, markNewGames } from '../utils/newGames'
import WorkspaceEditor from './WorkspaceEditor'

// A8.2: mở trình soạn thảo từ game vừa tạo bằng AI mô phỏng: game hợp lệ theo bản trả về làm mốc (đúng quy tắc F4/A1), banner nhắc đây là bản mẫu, hết dấu "Mới".
const SLOW = { timeout: 5000 }
const BANNER = /Trò chơi này do AI mô phỏng tạo: các câu hỏi là bản mẫu/

beforeEach(() => {
  vi.stubEnv('VITE_USE_MOCK', 'ai,games,editor')
  loginAsTeacher()
  resetMockGames()
  clearNewGames()
})
afterEach(() => {
  vi.stubEnv('VITE_USE_MOCK', 'none')
  clearNewGames()
  localStorage.clear()
})

async function openCreated(gameType: string) {
  const game = createMockGame({ gameType, idea: 'Trò chơi đếm số lượng con vật cho các bé' })

  markNewGames([game.gameId])
  renderWithProviders(<WorkspaceEditor />, `/workspace/editor?gameId=${game.gameId}`)
  await screen.findByRole('textbox', { name: /Tên trò chơi/ }, SLOW)

  return game
}

describe('mở game vừa tạo bằng AI mô phỏng', () => {
  it('có banner nhắc nội dung chỉ là bản mẫu (ngay trên trình soạn thảo, kèm nhãn "Dữ liệu mô phỏng")', async () => {
    await openCreated('QUIZ')

    expect(screen.getByText(BANNER)).toBeInTheDocument()
    expect(screen.getByText(BANNER).closest('[role="note"]')).toHaveTextContent('Dữ liệu mô phỏng')
  })

  it('game mẫu có sẵn của kho thì KHÔNG có banner này', async () => {
    renderWithProviders(<WorkspaceEditor />, '/workspace/editor?gameId=mock-game-1')
    await screen.findByRole('textbox', { name: /Tên trò chơi/ }, SLOW)

    expect(screen.queryByText(BANNER)).not.toBeInTheDocument()
  })

  it('mở game thì hết dấu "Mới" của game đó (chỉ game đó)', async () => {
    const other = createMockGame({ gameType: 'MATCHING' })

    markNewGames([other.gameId])

    const game = await openCreated('QUIZ')

    await waitFor(() => expect(isNewGame(game.gameId)).toBe(false))
    expect(isNewGame(other.gameId)).toBe(true)
  })

  it.each(GAME_TYPES)('%s: mở được, không có lỗi dữ liệu nào ("Đã lưu", Lưu bị khóa, không thẻ "Cần sửa")', async (type) => {
    await openCreated(type)

    expect(screen.getByText('Đã lưu')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Lưu bản nháp' })).toBeDisabled()
    expect(screen.queryByText('Cần sửa')).not.toBeInTheDocument()
  })
})
