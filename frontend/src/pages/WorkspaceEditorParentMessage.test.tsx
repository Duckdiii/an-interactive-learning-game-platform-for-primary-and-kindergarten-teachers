import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getMockGame, resetMockGames } from '../services/mock/mockGames'
import { resetMockPublish } from '../services/mock/mockPublish'
import { setMockScenario } from '../services/mock/mockRuntime'
import { loginAsTeacher, renderWithProviders } from '../test/renderWithApp'
import WorkspaceEditor from './WorkspaceEditor'

// B3: tin nhắn mẫu gửi phụ huynh trong hộp chia sẻ (chỉ văn bản để sửa và sao chép, không gửi đi đâu).
const GAME_ID = 'mock-game-2'

const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard')
const stubClipboard = (writeText: (value: string) => Promise<void>) => {
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
}

async function openShareDialog() {
  const user = userEvent.setup()

  renderWithProviders(<WorkspaceEditor />, `/workspace/editor?gameId=${GAME_ID}`)
  await screen.findByRole('textbox', { name: /Tên trò chơi/ })
  await user.click(screen.getByRole('button', { name: /^Xuất bản/ }))

  const dialog = await screen.findByRole('dialog')

  return { user, dialog }
}

const toggle = (dialog: HTMLElement) => within(dialog).getByRole('button', { name: /tin nhắn gửi phụ huynh/ })

beforeEach(() => {
  vi.stubEnv('VITE_USE_MOCK', 'editor,games')
  loginAsTeacher()
  resetMockGames()
  resetMockPublish()
})
afterEach(() => {
  if (originalClipboard) Object.defineProperty(navigator, 'clipboard', originalClipboard)
  else Reflect.deleteProperty(navigator, 'clipboard')
  vi.restoreAllMocks()
  vi.stubEnv('VITE_USE_MOCK', 'none')
  setMockScenario('normal')
  localStorage.clear()
})

describe('tin nhắn mẫu gửi phụ huynh', () => {
  it('mặc định thu gọn; mở ra thì thấy văn bản điền sẵn tên trò chơi, liên kết, mã và lời nhắc không nhập thông tin cá nhân của học sinh', async () => {
    const { user, dialog } = await openShareDialog()

    expect(toggle(dialog)).toHaveAttribute('aria-expanded', 'false')
    expect(within(dialog).queryByRole('textbox', { name: 'Tin nhắn mẫu gửi phụ huynh' })).not.toBeInTheDocument()

    await user.click(toggle(dialog))

    expect(toggle(dialog)).toHaveAttribute('aria-expanded', 'true')

    const message = within(dialog).getByRole('textbox', { name: 'Tin nhắn mẫu gửi phụ huynh' }) as HTMLTextAreaElement
    const code = (within(dialog).getByRole('textbox', { name: 'Mã chia sẻ' }) as HTMLInputElement).value
    const link = (within(dialog).getByRole('textbox', { name: 'Liên kết chia sẻ' }) as HTMLInputElement).value

    expect(message.value).toContain(`"${getMockGame(GAME_ID).metadata.title}"`)
    expect(message.value).toContain(link)
    expect(message.value).toContain(code)
    expect(within(dialog).getByText(/Đừng ghi tên, ảnh, số điện thoại hay thông tin cá nhân của học sinh/)).toBeInTheDocument()
    expect(within(dialog).getByText(/không gửi và không lưu/)).toBeInTheDocument()
  })

  it('sửa được văn bản, sao chép đúng phần đã sửa, "Đặt lại theo mẫu" trả về bản gốc', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    const { user, dialog } = await openShareDialog()

    stubClipboard(writeText)
    await user.click(toggle(dialog))

    const message = within(dialog).getByRole('textbox', { name: 'Tin nhắn mẫu gửi phụ huynh' }) as HTMLTextAreaElement
    const original = message.value
    const reset = within(dialog).getByRole('button', { name: 'Đặt lại theo mẫu' })

    expect(reset).toBeDisabled()

    await user.type(message, ' Xin cảm ơn!')

    expect(message.value).toBe(`${original} Xin cảm ơn!`)
    expect(reset).toBeEnabled()

    await user.click(within(dialog).getByRole('button', { name: 'Sao chép tin nhắn mẫu gửi phụ huynh' }))

    expect(writeText).toHaveBeenCalledWith(`${original} Xin cảm ơn!`)
    await waitFor(() => expect(within(dialog).getAllByText('Đã sao chép').length).toBeGreaterThan(0))

    await user.click(reset)

    expect(message.value).toBe(original)
  })

  it('trình duyệt TỪ CHỐI sao chép: chọn sẵn toàn bộ văn bản trong ô và báo cách tự nhấn Ctrl+C', async () => {
    const { user, dialog } = await openShareDialog()

    stubClipboard(vi.fn().mockRejectedValue(new Error('NotAllowedError')))
    await user.click(toggle(dialog))

    const message = within(dialog).getByRole('textbox', { name: 'Tin nhắn mẫu gửi phụ huynh' }) as HTMLTextAreaElement

    await user.click(within(dialog).getByRole('button', { name: 'Sao chép tin nhắn mẫu gửi phụ huynh' }))

    await waitFor(() => expect(message).toHaveFocus())
    expect(message.selectionStart).toBe(0)
    expect(message.selectionEnd).toBe(message.value.length)
    expect(message).toHaveAccessibleDescription(/Ctrl\+C/)
    expect(within(dialog).queryByText('Đã sao chép')).not.toBeInTheDocument()

    // Sửa tiếp thì lời nhắc "hãy nhấn Ctrl+C" cũ không còn đúng nữa.
    await user.type(message, '!')
    expect(message).not.toHaveAccessibleDescription(/Ctrl\+C/)
  })

  it('giới hạn độ dài; gõ và sao chép không gọi mạng, không ghi bộ nhớ trình duyệt, không có nút gửi; lời nhắc quyền riêng tư được đọc kèm ô', async () => {
    const { user, dialog } = await openShareDialog()

    stubClipboard(vi.fn().mockResolvedValue(undefined))
    await user.click(toggle(dialog))

    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const sendSpy = vi.spyOn(XMLHttpRequest.prototype, 'send')
    const storeSpy = vi.spyOn(Storage.prototype, 'setItem')
    const area = within(dialog).getByRole('textbox', { name: 'Tin nhắn mẫu gửi phụ huynh' })

    await user.type(area, ' thêm')
    await user.click(within(dialog).getByRole('button', { name: 'Sao chép tin nhắn mẫu gửi phụ huynh' }))

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(sendSpy).not.toHaveBeenCalled()
    expect(storeSpy).not.toHaveBeenCalled()
    expect(area).toHaveAccessibleDescription(/Đừng ghi tên, ảnh, số điện thoại/)

    expect(within(dialog).getByRole('textbox', { name: 'Tin nhắn mẫu gửi phụ huynh' })).toHaveAttribute('maxlength', '1000')
    expect(within(dialog).queryByRole('button', { name: /^Gửi/ })).not.toBeInTheDocument()
  })
})
