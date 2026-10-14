import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getMockGame, resetMockGames, saveMockGame } from '../services/mock/mockGames'
import { setMockScenario } from '../services/mock/mockRuntime'
import { loginAsTeacher, renderWithProviders } from '../test/renderWithApp'
import { pngFile, trackBlobUrls } from '../test/mediaFiles'
import type { BlobUrlTracker } from '../test/mediaFiles'
import { loadDraft } from '../utils/draftStorage'
import { toContent } from '../utils/gameContent'
import WorkspaceEditor from './WorkspaceEditor'

// A5: tải ảnh và âm thanh trong trang soạn thảo thật: khóa Lưu trong lúc tải, không đưa tệp nhị phân vào bản sao lưu, giọng đọc giữ khi đổi câu.
// mock-game-2 là MATCHING (bản nháp), có 3 câu.
const GAME_ID = 'mock-game-2'
const OWNER = 't1'

const newUser = () => userEvent.setup({ applyAccept: false })
const saveButton = () => screen.getByRole('button', { name: 'Lưu bản nháp' })
const listItems = () => within(screen.getByRole('list', { name: 'Danh sách câu hỏi' })).getAllByRole('button')
const imageInput = () => screen.getByLabelText('Tải ảnh lên')

// Chuỗi bước tải giả lập (nhiều lần chờ liên tiếp) có thể chậm khi nhiều file test chạy song song: nới riêng thời gian chờ ở các chỗ này.
const SLOW = { timeout: 5000 }

async function openLoaded() {
  renderWithProviders(<WorkspaceEditor />, `/workspace/editor?gameId=${GAME_ID}`)
  await screen.findByRole('textbox', { name: /Tên trò chơi/ }, SLOW)
}

let urls: BlobUrlTracker

beforeEach(() => {
  vi.stubEnv('VITE_USE_MOCK', 'editor,media')
  loginAsTeacher()
  resetMockGames()
  urls = trackBlobUrls()
})
afterEach(() => {
  urls.restore()
  vi.stubEnv('VITE_USE_MOCK', 'none')
  vi.stubEnv('VITE_MOCK_LATENCY_MS', '0')
  setMockScenario('normal')
  localStorage.clear()
})

describe('trình soạn thảo: tải ảnh', () => {
  it('tải ảnh xong thì game "Chưa lưu" và lưu được; bản sao lưu trong localStorage KHÔNG có đường dẫn blob: (không đưa tệp vào bản sao lưu)', async () => {
    const user = newUser()

    await openLoaded()
    await user.upload(imageInput(), pngFile('meo.png'))
    await user.click(await screen.findByRole('button', { name: 'Xác nhận tải lên' }, SLOW))

    expect(await screen.findByRole('img', { name: 'Ảnh minh họa hiện tại' }, SLOW)).toHaveAttribute('src', urls.created[1])
    expect(screen.getByText('Chưa lưu')).toBeInTheDocument()

    // Bản sao lưu xuất hiện sau một nhịp, và phải không có tệp nào bên trong.
    await waitFor(() => expect(loadDraft(OWNER, GAME_ID)).not.toBeNull(), SLOW)

    const raw = localStorage.getItem(`ai-game:editor-draft:${OWNER}:${GAME_ID}`)!

    expect(raw).not.toContain('blob:')
    expect(raw).not.toContain('data:')
    expect(loadDraft(OWNER, GAME_ID)!.content.questions[0]).not.toHaveProperty('imageUrl')

    await user.click(saveButton())

    expect(await screen.findByText('Bạn đã lưu bản nháp thành công.', {}, SLOW)).toBeInTheDocument()
    expect(getMockGame(GAME_ID).questions[0].imageUrl).toBe(urls.created[1])
  })

  it('thay ảnh ĐÃ LƯU bằng ảnh vừa tải: bản sao lưu giữ ảnh cũ (không bỏ mất ảnh đang dùng), chỉ không chứa ảnh tạm', async () => {
    const user = newUser()
    const saved = structuredClone(toContent(getMockGame(GAME_ID)))

    saved.questions[0].imageUrl = '/mock/dog.png'
    saveMockGame(GAME_ID, saved)

    await openLoaded()
    await user.upload(imageInput(), pngFile('meo.png'))
    await user.click(await screen.findByRole('button', { name: 'Xác nhận tải lên' }, SLOW))
    expect(await screen.findByRole('img', { name: 'Ảnh minh họa hiện tại' }, SLOW)).toHaveAttribute('src', urls.created[1])

    await waitFor(() => expect(loadDraft(OWNER, GAME_ID)).not.toBeNull(), SLOW)
    expect(loadDraft(OWNER, GAME_ID)!.content.questions[0]).toMatchObject({ imageUrl: '/mock/dog.png' })
    expect(localStorage.getItem(`ai-game:editor-draft:${OWNER}:${GAME_ID}`)).not.toContain('blob:')
  })

  it('tải lỗi hoặc không an toàn thì game KHÔNG đổi: vẫn "Đã lưu", nút Lưu vẫn khóa', async () => {
    const user = newUser()

    await openLoaded()
    await user.upload(imageInput(), pngFile('anh-nsfw.png'))
    await user.click(await screen.findByRole('button', { name: 'Xác nhận tải lên' }, SLOW))

    expect(await screen.findByText(/Tệp tải lên không đáp ứng tiêu chuẩn an toàn nội dung/, {}, SLOW)).toBeInTheDocument()
    expect(screen.getByText('Đã lưu')).toBeInTheDocument()
    expect(saveButton()).toBeDisabled()
  })

  it('trong lúc đang tải thì khóa Lưu và hiện "Đang áp dụng chỉnh sửa..."; xong thì mở lại', async () => {
    vi.stubEnv('VITE_MOCK_LATENCY_MS', '60')

    const user = newUser()

    await openLoaded()
    await user.upload(imageInput(), pngFile())
    await user.click(await screen.findByRole('button', { name: 'Xác nhận tải lên' }, SLOW))

    expect(await screen.findByText('Đang áp dụng chỉnh sửa...', {}, SLOW)).toBeInTheDocument()
    expect(saveButton()).toBeDisabled()

    await waitFor(() => expect(screen.queryByText('Đang áp dụng chỉnh sửa...')).not.toBeInTheDocument(), { timeout: 4000 })
    expect(saveButton()).toBeEnabled()
  })

  it('đang tải mà sang câu khác thì lần tải bị hủy, hết khóa Lưu và câu cũ không nhận ảnh muộn', async () => {
    vi.stubEnv('VITE_MOCK_LATENCY_MS', '60')

    const user = newUser()

    await openLoaded()
    await user.upload(imageInput(), pngFile())
    await user.click(await screen.findByRole('button', { name: 'Xác nhận tải lên' }, SLOW))
    expect(await screen.findByText('Đang áp dụng chỉnh sửa...', {}, SLOW)).toBeInTheDocument()

    await user.click(listItems()[1])
    await waitFor(() => expect(screen.queryByText('Đang áp dụng chỉnh sửa...')).not.toBeInTheDocument())

    // Chờ quá thời gian tải giả lập: không có ảnh nào được gắn vào câu nào, game vẫn "Đã lưu".
    await new Promise((resolve) => setTimeout(resolve, 600))
    expect(screen.getByText('Đã lưu')).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: 'Ảnh minh họa hiện tại' })).not.toBeInTheDocument()
    await user.click(listItems()[0])
    expect(screen.queryByRole('img', { name: 'Ảnh minh họa hiện tại' })).not.toBeInTheDocument()
  })
})

describe('trình soạn thảo: giọng đọc', () => {
  it('giọng đã chọn được giữ khi đổi sang câu khác', async () => {
    const user = newUser()

    await openLoaded()
    expect(screen.getByRole('radio', { name: 'Giọng nữ' })).toBeChecked()
    await user.click(screen.getByRole('radio', { name: 'Giọng nam' }))

    await user.click(listItems()[1])

    expect(screen.getByRole('radio', { name: 'Giọng nam' })).toBeChecked()
  })
})
