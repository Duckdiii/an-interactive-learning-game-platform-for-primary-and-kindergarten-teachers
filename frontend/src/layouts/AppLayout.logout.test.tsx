import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getGames } from '../api/gamesApi'
import App from '../App'
import { buildMockGameContents } from '../services/mock/gameFixtures'
import { loginAsTeacher, makeGame, renderWithProviders } from '../test/renderWithApp'
import { storeSession } from '../utils/authStorage'
import { loadDraft, saveDraft } from '../utils/draftStorage'
import { resetMockGames } from '../services/mock/mockGames'

vi.mock('../api/gamesApi', () => ({ getGames: vi.fn() }))
// Sandbox Canvas (chỉ có ở bản dev) kéo theo react-konva, không cần cho test này.
vi.mock('../pages/dev/CanvasSandbox', () => ({ default: () => null }))

const mockedGetGames = vi.mocked(getGames)

beforeEach(() => {
  loginAsTeacher()
  mockedGetGames.mockResolvedValue([makeGame(1)])
})
afterEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

describe('đăng xuất trên máy dùng chung', () => {
  it('xóa bộ nhớ đệm truy vấn và mọi bản sao lưu nháp, rồi về trang đăng nhập', async () => {
    const user = userEvent.setup()
    const { queryClient } = renderWithProviders(<App />, '/dashboard')

    await screen.findByText(makeGame(1).title, {}, { timeout: 10_000 })
    saveDraft('t1', 'g1', buildMockGameContents()[0], '2026-10-14T07:00:00.000Z')
    saveDraft('t-khac', 'g2', buildMockGameContents()[0], '2026-10-14T07:00:00.000Z')
    expect(queryClient.getQueryCache().getAll().length).toBeGreaterThan(0)

    await user.click(within(screen.getByRole('complementary')).getByRole('button', { name: 'Đăng xuất' }))

    await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: 'Đăng nhập' })).toBeInTheDocument(), { timeout: 10_000 })
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0)
    expect(loadDraft('t1', 'g1')).toBeNull()
    expect(loadDraft('t-khac', 'g2')).toBeNull()
  })
})

describe('đăng xuất khi đang soạn dở', () => {
  afterEach(() => vi.stubEnv('VITE_USE_MOCK', 'none'))

  it('không ghi lại bản sao lưu sau khi đã xóa sạch (dọn dẹp lúc rời trang không được phép ghi)', async () => {
    const user = userEvent.setup()

    vi.stubEnv('VITE_USE_MOCK', 'editor')
    resetMockGames()
    renderWithProviders(<App />, '/workspace/editor?gameId=mock-game-2')

    await user.type(await screen.findByRole('textbox', { name: /Tên trò chơi/ }, { timeout: 10_000 }), 'đang gõ dở')
    await user.click(within(screen.getByRole('complementary')).getByRole('button', { name: 'Đăng xuất' }))

    await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: 'Đăng nhập' })).toBeInTheDocument(), { timeout: 10_000 })
    await new Promise((resolve) => setTimeout(resolve, 800))
    expect(Object.keys(localStorage).filter((key) => key.startsWith('ai-game:editor-draft'))).toEqual([])
  })
})

describe('phiên không rõ là ai', () => {
  it('thiếu cả mã giáo viên lẫn email thì về trang đăng nhập, không kẹt ở khung chờ', async () => {
    localStorage.clear()
    storeSession({} as never, 'token', 'refresh')
    renderWithProviders(<App />, '/dashboard')

    expect(await screen.findByRole('heading', { level: 1, name: 'Đăng nhập' })).toBeInTheDocument()
  })
})
