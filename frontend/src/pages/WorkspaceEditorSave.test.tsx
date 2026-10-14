import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getMockGame, resetMockGames, setMockGameLocked } from '../services/mock/mockGames'
import { setMockScenario } from '../services/mock/mockRuntime'
import { loginAsTeacher, renderWithProviders } from '../test/renderWithApp'
import { clearDraft, loadDraft, saveDraft } from '../utils/draftStorage'
import { toContent } from '../utils/gameContent'
import WorkspaceEditor from './WorkspaceEditor'

// A1: sửa tên/chủ đề, "chưa lưu", Lưu bản nháp, kiểm tra trước khi lưu (UC-04 5a), lỗi lưu, 409, sao lưu và khôi phục.
// mock-game-2 là bản nháp, mock-game-1 là game đã đăng.
const DRAFT_ID = 'mock-game-2'
const PUBLISHED_ID = 'mock-game-1'
const OWNER = 't1'

const open = (gameId: string) => renderWithProviders(<WorkspaceEditor />, `/workspace/editor?gameId=${gameId}`)
const titleBox = () => screen.getByRole('textbox', { name: /Tên trò chơi/ })
const saveButton = () => screen.getByRole('button', { name: 'Lưu bản nháp' })

async function openLoaded(gameId: string) {
  const view = open(gameId)

  await screen.findByRole('textbox', { name: /Tên trò chơi/ })

  return view
}

beforeEach(() => {
  vi.stubEnv('VITE_USE_MOCK', 'editor')
  loginAsTeacher()
  resetMockGames()
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.stubEnv('VITE_USE_MOCK', 'none')
  setMockScenario('normal')
  localStorage.clear()
})

describe('trình soạn thảo: chưa lưu và lưu bản nháp', () => {
  it('mới mở thì "Đã lưu" và nút Lưu bị khóa; sửa tên thì hiện "Chưa lưu" và tiêu đề đổi theo', async () => {
    const user = userEvent.setup()

    await openLoaded(DRAFT_ID)

    expect(screen.getByText('Đã lưu')).toBeInTheDocument()
    expect(saveButton()).toBeDisabled()

    await user.type(titleBox(), ' (bản 2)')

    expect(screen.getByText('Chưa lưu')).toBeInTheDocument()
    expect(saveButton()).toBeEnabled()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('(bản 2)')
  })

  it('sửa rồi gõ lại đúng như cũ thì hết "Chưa lưu"', async () => {
    const user = userEvent.setup()

    await openLoaded(DRAFT_ID)
    await user.type(titleBox(), 'x')
    await user.type(titleBox(), '{Backspace}')

    expect(screen.getByText('Đã lưu')).toBeInTheDocument()
  })

  it('lưu thành công: báo "Bạn đã lưu bản nháp thành công.", ghi vào kho, xóa bản sao lưu', async () => {
    const user = userEvent.setup()

    await openLoaded(DRAFT_ID)
    await user.type(titleBox(), ' (bản 2)')
    // Bản sao lưu xuất hiện sau một nhịp ngừng gõ.
    await waitFor(() => expect(loadDraft(OWNER, DRAFT_ID)).not.toBeNull())

    await user.click(saveButton())

    expect(await screen.findByText('Bạn đã lưu bản nháp thành công.')).toBeInTheDocument()
    expect(screen.getByText('Đã lưu')).toBeInTheDocument()
    expect(getMockGame(DRAFT_ID).metadata.title).toMatch(/\(bản 2\)$/)
    expect(loadDraft(OWNER, DRAFT_ID)).toBeNull()
  })

  it('game đã đăng: câu xác nhận dành cho thay đổi, không nói "bản nháp"', async () => {
    const user = userEvent.setup()

    await openLoaded(PUBLISHED_ID)
    await user.type(titleBox(), '!')
    await user.click(saveButton())

    expect(await screen.findByText('Đã lưu thay đổi của trò chơi.')).toBeInTheDocument()
    expect(getMockGame(PUBLISHED_ID).status).toBe('PUBLISHED')
  })

  it('sửa tiếp sau khi lưu thì câu xác nhận biến mất và lại "Chưa lưu"', async () => {
    const user = userEvent.setup()

    await openLoaded(DRAFT_ID)
    await user.type(titleBox(), '!')
    await user.click(saveButton())
    await screen.findByText('Bạn đã lưu bản nháp thành công.')
    await user.type(titleBox(), '?')

    expect(screen.queryByText('Bạn đã lưu bản nháp thành công.')).not.toBeInTheDocument()
    expect(screen.getByText('Chưa lưu')).toBeInTheDocument()
  })
})

describe('trình soạn thảo: nội dung chưa hợp lệ (UC-04 5a)', () => {
  it('xóa tên rồi lưu: báo lỗi dưới ô, không gửi lên kho, giữ nguyên bản đang soạn', async () => {
    const user = userEvent.setup()
    const before = getMockGame(DRAFT_ID).metadata.title

    await openLoaded(DRAFT_ID)
    await user.clear(titleBox())
    await user.click(saveButton())

    const alert = await screen.findByRole('alert')

    expect(alert).toHaveTextContent('Chưa lưu được')
    expect(alert).toHaveTextContent('Tên trò chơi')
    expect(titleBox()).toHaveAttribute('aria-invalid', 'true')
    expect(getMockGame(DRAFT_ID).metadata.title).toBe(before)
  })

  it('sửa xong thì lỗi biến mất ngay, rồi lưu được', async () => {
    const user = userEvent.setup()

    await openLoaded(DRAFT_ID)
    await user.clear(titleBox())
    await user.click(saveButton())
    await screen.findByRole('alert')
    await user.type(titleBox(), 'Tên mới')

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    await user.click(saveButton())

    expect(await screen.findByText('Bạn đã lưu bản nháp thành công.')).toBeInTheDocument()
    expect(getMockGame(DRAFT_ID).metadata.title).toBe('Tên mới')
  })
})

describe('trình soạn thảo: lỗi khi lưu', () => {
  it('mất mạng: báo lỗi, GIỮ nội dung đang soạn, bấm Thử lại thì lưu được', async () => {
    const user = userEvent.setup()

    await openLoaded(DRAFT_ID)
    await user.type(titleBox(), ' (bản 2)')
    setMockScenario('error')
    await user.click(saveButton())

    const alert = await screen.findByRole('alert')

    expect(alert).toHaveTextContent('Chưa lưu được trò chơi')
    expect(alert).toHaveTextContent('Nội dung bạn đang soạn vẫn được giữ nguyên.')
    expect(titleBox()).toHaveValue(`${getMockGame(DRAFT_ID).metadata.title} (bản 2)`)
    expect(screen.getByText('Chưa lưu')).toBeInTheDocument()

    setMockScenario('normal')
    await user.click(screen.getByRole('button', { name: 'Thử lại' }))

    expect(await screen.findByText('Bạn đã lưu bản nháp thành công.')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('409: game đang có phòng chơi chưa kết thúc, giải thích rõ, giữ nội dung và không mời thử lại', async () => {
    const user = userEvent.setup()

    await openLoaded(DRAFT_ID)
    setMockGameLocked(DRAFT_ID, true)
    await user.type(titleBox(), '!')
    await user.click(saveButton())

    const alert = await screen.findByRole('alert')

    expect(alert).toHaveTextContent('phòng chơi chưa kết thúc')
    expect(screen.queryByRole('button', { name: 'Thử lại' })).not.toBeInTheDocument()
    expect(titleBox()).toHaveValue(`${getMockGame(DRAFT_ID).metadata.title}!`)
  })
})

describe('trình soạn thảo: sao lưu và khôi phục', () => {
  const backupOf = (title: string) => {
    const content = toContent(getMockGame(DRAFT_ID))

    return { ...content, metadata: { ...content.metadata, title } }
  }

  it('có bản sao lưu khác bản đang mở: hỏi trước, chọn Khôi phục thì nội dung quay lại và còn "Chưa lưu"', async () => {
    const user = userEvent.setup()

    saveDraft(OWNER, DRAFT_ID, backupOf('Bản chưa lưu hôm qua'), getMockGame(DRAFT_ID).updatedAt)
    await openLoaded(DRAFT_ID)

    expect(screen.getByRole('heading', { name: 'Có bản chỉnh sửa chưa lưu trên máy này' })).toBeInTheDocument()
    expect(titleBox()).not.toHaveValue('Bản chưa lưu hôm qua')

    await user.click(screen.getByRole('button', { name: 'Khôi phục bản chỉnh sửa' }))

    expect(titleBox()).toHaveValue('Bản chưa lưu hôm qua')
    expect(screen.getByText('Chưa lưu')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Có bản chỉnh sửa chưa lưu trên máy này' })).not.toBeInTheDocument()
  })

  it('chọn Bỏ: xóa bản sao lưu và giữ bản trên máy chủ', async () => {
    const user = userEvent.setup()

    saveDraft(OWNER, DRAFT_ID, backupOf('Bản chưa lưu hôm qua'), getMockGame(DRAFT_ID).updatedAt)
    await openLoaded(DRAFT_ID)
    await user.click(screen.getByRole('button', { name: 'Bỏ bản chỉnh sửa' }))

    expect(loadDraft(OWNER, DRAFT_ID)).toBeNull()
    expect(titleBox()).toHaveValue(getMockGame(DRAFT_ID).metadata.title)
    expect(screen.getByText('Đã lưu')).toBeInTheDocument()
  })

  it('bản sao lưu giống hệt bản đang mở thì không hỏi mà xóa luôn', async () => {
    saveDraft(OWNER, DRAFT_ID, toContent(getMockGame(DRAFT_ID)), getMockGame(DRAFT_ID).updatedAt)
    await openLoaded(DRAFT_ID)

    expect(screen.queryByRole('heading', { name: 'Có bản chỉnh sửa chưa lưu trên máy này' })).not.toBeInTheDocument()
    expect(loadDraft(OWNER, DRAFT_ID)).toBeNull()
  })

  it('bản sao lưu của game đã được lưu ở nơi khác sau đó: có cảnh báo sẽ ghi đè bản mới hơn', async () => {
    saveDraft(OWNER, DRAFT_ID, backupOf('Cũ'), '2020-01-01T00:00:00.000Z')
    await openLoaded(DRAFT_ID)

    expect(screen.getByText(/sẽ ghi đè lên bản mới hơn/)).toBeInTheDocument()
  })

  it('bản sao lưu của giáo viên khác trên cùng máy không bao giờ hiện ra', async () => {
    saveDraft('t-khac', DRAFT_ID, backupOf('Của người khác'), getMockGame(DRAFT_ID).updatedAt)
    await openLoaded(DRAFT_ID)

    expect(screen.queryByRole('heading', { name: 'Có bản chỉnh sửa chưa lưu trên máy này' })).not.toBeInTheDocument()
    clearDraft('t-khac', DRAFT_ID)
  })

  it('trình duyệt chặn localStorage: trang vẫn mở, sửa và lưu bình thường', async () => {
    const user = userEvent.setup()

    const originalGetItem = Storage.prototype.getItem

    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (this: Storage, key: string) {
      // Phiên đăng nhập vẫn đọc được (nằm ngoài phạm vi sao lưu); chỉ bản sao lưu bị chặn.
      if (key.startsWith('ai-game:editor-draft')) throw new DOMException('bị chặn', 'SecurityError')

      return originalGetItem.call(this, key)
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('đầy', 'QuotaExceededError')
    })

    await openLoaded(DRAFT_ID)
    await user.type(titleBox(), '!')
    await user.click(saveButton())

    expect(await screen.findByText('Bạn đã lưu bản nháp thành công.')).toBeInTheDocument()
  })
})

describe('trình soạn thảo: các lỗi tinh vi (nhận xét review A1)', () => {
  it('tên và chủ đề được cắt khoảng trắng hai đầu trước khi gửi, và không còn "Chưa lưu" vì dấu cách thừa', async () => {
    const user = userEvent.setup()

    await openLoaded(DRAFT_ID)
    await user.clear(titleBox())
    await user.type(titleBox(), '   Tên có dấu cách   ')
    await user.click(saveButton())

    expect(await screen.findByText('Bạn đã lưu bản nháp thành công.')).toBeInTheDocument()
    expect(getMockGame(DRAFT_ID).metadata.title).toBe('Tên có dấu cách')
    expect(titleBox()).toHaveValue('Tên có dấu cách')
    expect(screen.getByText('Đã lưu')).toBeInTheDocument()
  })

  it('sửa rồi hoàn tác về như cũ thì bản sao lưu cũng bị xóa', async () => {
    const user = userEvent.setup()

    await openLoaded(DRAFT_ID)
    await user.type(titleBox(), 'x')
    await waitFor(() => expect(loadDraft(OWNER, DRAFT_ID)).not.toBeNull())
    await user.type(titleBox(), '{Backspace}')

    await waitFor(() => expect(loadDraft(OWNER, DRAFT_ID)).toBeNull())
  })

  it('rời trang ngay sau khi gõ (chưa kịp đợi 0,5 giây) vẫn ghi sao lưu', async () => {
    const user = userEvent.setup()
    const { unmount } = await openLoaded(DRAFT_ID)

    await user.type(titleBox(), 'kịp ghi')
    unmount()

    expect(loadDraft(OWNER, DRAFT_ID)?.content.metadata.title).toMatch(/kịp ghi$/)
  })

  it('bản sao lưu thiếu metadata hoặc ngày hỏng bị bỏ qua, không làm trắng trang', async () => {
    const content = toContent(getMockGame(DRAFT_ID))
    const broken = { content: { gameType: content.gameType, questions: [] }, savedAt: 'hôm qua', baseUpdatedAt: 'x' }

    localStorage.setItem(`ai-game:editor-draft:${OWNER}:${DRAFT_ID}`, JSON.stringify(broken))
    await openLoaded(DRAFT_ID)

    expect(screen.queryByRole('heading', { name: 'Có bản chỉnh sửa chưa lưu trên máy này' })).not.toBeInTheDocument()
    expect(titleBox()).toHaveValue(content.metadata.title)
  })

  it('lỗi lưu lần trước biến mất khi sửa tiếp', async () => {
    const user = userEvent.setup()

    await openLoaded(DRAFT_ID)
    await user.type(titleBox(), '!')
    setMockScenario('error')
    await user.click(saveButton())
    await screen.findByRole('alert')
    await user.type(titleBox(), '?')

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('lưu bị chặn vì tên trống: tiêu điểm chuyển tới ô tên', async () => {
    const user = userEvent.setup()

    await openLoaded(DRAFT_ID)
    await user.clear(titleBox())
    await user.click(saveButton())

    await waitFor(() => expect(titleBox()).toHaveFocus())
  })

  it('đang hỏi khôi phục thì khóa ô nhập; chọn xong thì mở khóa và đưa tiêu điểm vào ô tên', async () => {
    const user = userEvent.setup()
    const content = toContent(getMockGame(DRAFT_ID))

    saveDraft(OWNER, DRAFT_ID, { ...content, metadata: { ...content.metadata, title: 'Bản cũ' } }, getMockGame(DRAFT_ID).updatedAt)
    await openLoaded(DRAFT_ID)

    expect(titleBox()).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Bỏ bản chỉnh sửa' }))

    expect(titleBox()).toBeEnabled()
    await waitFor(() => expect(titleBox()).toHaveFocus())
  })

  it('mốc cập nhật ghi trong bản sao lưu là mốc lúc bắt đầu soạn, không bị đổi theo lần tải lại nền', async () => {
    const user = userEvent.setup()
    const { queryClient } = await openLoaded(DRAFT_ID)
    const opened = getMockGame(DRAFT_ID).updatedAt

    await user.type(titleBox(), 'a')
    await waitFor(() => expect(loadDraft(OWNER, DRAFT_ID)).not.toBeNull())

    // Nơi khác vừa lưu game này: tải lại nền trả về `updatedAt` mới hơn.
    queryClient.setQueryData(['game', OWNER, DRAFT_ID], { ...getMockGame(DRAFT_ID), updatedAt: '2030-01-01T00:00:00.000Z' })
    await user.type(titleBox(), 'b')

    await waitFor(() => expect(loadDraft(OWNER, DRAFT_ID)?.content.metadata.title).toMatch(/ab$/))
    expect(loadDraft(OWNER, DRAFT_ID)?.baseUpdatedAt).toBe(opened)
  })
})
