import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getMockGame, resetMockGames, setMockGameLocked } from '../services/mock/mockGames'
import { getMockAiAttempts, resetMockAi, setMockAiFlakiness } from '../services/mock/mockAi'
import { setMockScenario } from '../services/mock/mockRuntime'
import { loginAsTeacher, renderWithProviders } from '../test/renderWithApp'
import { saveDraft } from '../utils/draftStorage'
import { toContent } from '../utils/gameContent'
import WorkspaceEditor from './WorkspaceEditor'

// A6.3: nút "Yêu cầu AI làm lại", hộp thoại, các nhánh lỗi 5a, 5b, thông báo thành công, Hoàn tác (UC-06).
// mock-game-1 là QUIZ có 3 câu đã lưu; mock-game-2 là MATCHING.
const QUIZ_ID = 'mock-game-1'
const MATCHING_ID = 'mock-game-2'
const OWNER = 't1'
const SLOW = { timeout: 5000 }

const SUCCESS = 'Điều chỉnh trò chơi thành công.'
const UNSAFE =
  'Nội dung tạo lại chưa đạt chuẩn an toàn học đường. Hệ thống đã khôi phục câu hỏi cũ, vui lòng thử lại với gợi ý mô tả khác.'
const BUSY = 'Máy chủ trí tuệ nhân tạo đang bận xử lý dữ liệu. Yêu cầu tạo lại của giáo viên chưa thực hiện được, vui lòng thử lại sau ít phút.'

const trigger = () => screen.getByRole('button', { name: 'Yêu cầu AI làm lại' })
const dialog = () => screen.getByRole('dialog', { name: 'Yêu cầu AI làm lại câu 1' })
const feedbackBox = () => within(dialog()).getByRole('textbox', { name: /Gợi ý điều chỉnh/ })
const listButtons = () => within(screen.getByRole('list', { name: 'Danh sách câu hỏi' })).getAllByRole('button')
const notice = () => document.getElementById('regenerate-notice')!
const saveButton = () => screen.getByRole('button', { name: 'Lưu bản nháp' })

async function openEditor(gameId = QUIZ_ID) {
  renderWithProviders(<WorkspaceEditor />, `/workspace/editor?gameId=${gameId}`)
  await screen.findByRole('textbox', { name: /Tên trò chơi/ }, SLOW)
}

async function openDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(trigger())
  await screen.findByRole('dialog', {}, SLOW)
}

beforeEach(() => {
  vi.stubEnv('VITE_USE_MOCK', 'editor,ai,media')
  loginAsTeacher()
  resetMockGames()
  resetMockAi()
})
afterEach(() => {
  vi.stubEnv('VITE_USE_MOCK', 'none')
  vi.stubEnv('VITE_MOCK_LATENCY_MS', '0')
  setMockScenario('normal')
  localStorage.clear()
})

describe('mở hộp thoại', () => {
  it('nút nằm trên thẻ câu; bấm thì mở hộp thoại có tên, tiêu điểm vào ô gợi ý, ghi rõ ảnh/âm thanh sẽ được thay và nhãn dữ liệu mô phỏng kèm giọng đọc', async () => {
    const user = userEvent.setup()

    await openEditor()
    await user.click(screen.getByRole('radio', { name: 'Giọng nam' }))
    await openDialog(user)

    expect(feedbackBox()).toHaveFocus()
    expect(within(dialog()).getByText('AI sẽ thiết kế lại riêng câu này. Các câu khác được giữ nguyên.')).toBeInTheDocument()
    expect(within(dialog()).getByText(/Ảnh, âm thanh và phần bạn đã sửa tay \(chưa lưu\) của câu này cũng sẽ được thay bằng bản mới/)).toBeInTheDocument()
    expect(within(dialog()).getByText('Dữ liệu mô phỏng')).toBeInTheDocument()
    expect(within(dialog()).getByText('Giọng nam')).toBeInTheDocument()
    expect(dialog()).toHaveAttribute('aria-modal', 'true')
  })

  it('Hủy hoặc Esc đóng hộp thoại không đổi gì và trả tiêu điểm về nút đã bấm; bấm ra ngoài vùng tối không đóng (kẻo mất gợi ý đã gõ)', async () => {
    const user = userEvent.setup()

    await openEditor()
    await openDialog(user)
    await user.type(feedbackBox(), 'làm dễ hơn')
    fireEvent.mouseDown(document.body)
    fireEvent.click(document.body)
    expect(dialog()).toBeInTheDocument()

    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(trigger()).toHaveFocus()
    expect(screen.getByText('Đã lưu')).toBeInTheDocument()

    await openDialog(user)
    await user.click(within(dialog()).getByRole('button', { name: 'Hủy' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(trigger()).toHaveFocus()
  })

  it('gợi ý dài tối đa 500 ký tự: đúng 500 gửi được, 501 thì báo và khóa nút xác nhận', async () => {
    const user = userEvent.setup()

    await openEditor()
    await openDialog(user)
    fireEvent.change(feedbackBox(), { target: { value: 'a'.repeat(500) } })
    expect(within(dialog()).getByRole('button', { name: 'Xác nhận tạo lại' })).toBeEnabled()

    fireEvent.change(feedbackBox(), { target: { value: 'a'.repeat(501) } })
    expect(within(dialog()).getByText('Gợi ý tối đa 500 ký tự.')).toBeInTheDocument()
    expect(within(dialog()).getByRole('button', { name: 'Xác nhận tạo lại' })).toBeDisabled()
    expect(feedbackBox()).toBeInvalid()
  })
})

describe('thành công và hoàn tác', () => {
  it('đưa câu mới vào đúng thẻ (các thẻ khác nguyên), báo "Điều chỉnh trò chơi thành công.", game "Chưa lưu", chưa gửi lên máy chủ; giọng đã chọn nằm ở âm thanh mới', async () => {
    const user = userEvent.setup()

    await openEditor()
    const before = listButtons().map((button) => button.textContent)
    const serverBefore = structuredClone(getMockGame(QUIZ_ID))

    await user.click(screen.getByRole('radio', { name: 'Giọng nam' }))
    await openDialog(user)
    await user.type(feedbackBox(), 'đổi chủ đề khác')
    await user.click(within(dialog()).getByRole('button', { name: 'Xác nhận tạo lại' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument(), SLOW)
    expect(within(notice()).getByText(SUCCESS)).toBeInTheDocument()
    expect(within(notice()).getByText('Câu mới chưa được lưu cho tới khi bạn bấm "Lưu bản nháp".')).toBeInTheDocument()
    expect(notice()).toHaveFocus()

    const after = listButtons().map((button) => button.textContent)

    expect(after[0]).not.toBe(before[0])
    expect(after.slice(1)).toEqual(before.slice(1))
    expect(screen.getByText('Chưa lưu')).toBeInTheDocument()
    // Máy chủ KHÔNG đổi: câu mới chỉ nằm trong bản đang soạn.
    expect(getMockGame(QUIZ_ID).questions[0]).toEqual(serverBefore.questions[0])
    // Ảnh và âm thanh là của câu mới (kèm giọng đã chọn), không phải của câu cũ.
    await waitFor(() => expect(document.querySelector('audio')?.getAttribute('src')).toContain('voice=MALE'))
  })

  it('Hoàn tác trả đúng câu cũ, hết "Chưa lưu", báo "Đã khôi phục câu cũ." và nút Hoàn tác biến mất', async () => {
    const user = userEvent.setup()

    await openEditor()
    const before = listButtons().map((button) => button.textContent)

    await openDialog(user)
    await user.click(within(dialog()).getByRole('button', { name: 'Xác nhận tạo lại' }))
    await within(notice()).findByText(SUCCESS, {}, SLOW)

    await user.click(within(notice()).getByRole('button', { name: 'Hoàn tác' }))

    expect(within(notice()).getByText('Đã khôi phục câu cũ.')).toBeInTheDocument()
    expect(within(notice()).queryByRole('button', { name: 'Hoàn tác' })).not.toBeInTheDocument()
    expect(listButtons().map((button) => button.textContent)).toEqual(before)
    expect(screen.getByText('Đã lưu')).toBeInTheDocument()
  })

  it('sửa tiếp CHÍNH câu đó thì hết Hoàn tác; đổi sang câu khác rồi quay lại vẫn còn (cho tới khi sửa hoặc lưu)', async () => {
    const user = userEvent.setup()

    await openEditor()
    await openDialog(user)
    await user.click(within(dialog()).getByRole('button', { name: 'Xác nhận tạo lại' }))
    await within(notice()).findByText(SUCCESS, {}, SLOW)

    await user.click(listButtons()[1])
    expect(within(notice()).queryByRole('button', { name: 'Hoàn tác' })).not.toBeInTheDocument()
    await user.click(listButtons()[0])
    expect(within(notice()).getByRole('button', { name: 'Hoàn tác' })).toBeInTheDocument()
    expect(within(notice()).getByText(/vừa được AI làm lại và chưa được lưu/)).toBeInTheDocument()

    fireEvent.change(screen.getByRole('textbox', { name: /^Điểm/ }), { target: { value: '55' } })
    fireEvent.blur(screen.getByRole('textbox', { name: /^Điểm/ }))
    await waitFor(() => expect(within(notice()).queryByRole('button', { name: 'Hoàn tác' })).not.toBeInTheDocument())
  })

  it('bấm Lưu thì hết Hoàn tác và câu mới được lưu lên máy chủ', async () => {
    const user = userEvent.setup()

    await openEditor()
    const serverBefore = structuredClone(getMockGame(QUIZ_ID))
    await openDialog(user)
    await user.click(within(dialog()).getByRole('button', { name: 'Xác nhận tạo lại' }))
    await within(notice()).findByText(SUCCESS, {}, SLOW)

    await user.click(saveButton())

    await screen.findByText(/Đã lưu thay đổi|Bạn đã lưu/, {}, SLOW)
    expect(within(notice()).queryByRole('button', { name: 'Hoàn tác' })).not.toBeInTheDocument()
    // Máy chủ nhận câu MỚI do AI làm lại (khác câu cũ), đúng thẻ q1.
    expect(getMockGame(QUIZ_ID).questions[0].id).toBe('q1')
    expect(getMockGame(QUIZ_ID).questions[0]).not.toEqual(serverBefore.questions[0])
    expect(listButtons()[0].textContent).toContain((getMockGame(QUIZ_ID).questions[0] as { questionText: string }).questionText)
  })

  it('trong lúc AI làm việc: nút Lưu bị khóa và hiện "Đang áp dụng chỉnh sửa..."; xong thì mở lại', async () => {
    vi.stubEnv('VITE_MOCK_LATENCY_MS', '300')

    const user = userEvent.setup()

    await openEditor()
    await openDialog(user)
    await user.click(within(dialog()).getByRole('button', { name: 'Xác nhận tạo lại' }))

    expect(await screen.findByText('Đang nhờ AI làm lại câu này', {}, SLOW)).toBeInTheDocument()
    expect(screen.getByText('Đang áp dụng chỉnh sửa...')).toBeInTheDocument()
    expect(saveButton()).toBeDisabled()

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument(), { timeout: 10000 })
    expect(saveButton()).toBeEnabled()
  })
})

describe('lỗi', () => {
  it('nội dung không an toàn (5a): đúng câu SRS, câu cũ giữ nguyên, hộp thoại còn mở, tiêu điểm về ô gợi ý; sửa gợi ý rồi xác nhận lại thì thành công', async () => {
    const user = userEvent.setup()

    await openEditor()
    const before = listButtons().map((button) => button.textContent)

    await openDialog(user)
    await user.type(feedbackBox(), 'làm câu nsfw')
    await user.click(within(dialog()).getByRole('button', { name: 'Xác nhận tạo lại' }))

    expect(await within(dialog()).findByRole('alert', {}, SLOW)).toHaveTextContent(UNSAFE)
    expect(feedbackBox()).toHaveFocus()
    expect(feedbackBox()).toHaveValue('làm câu nsfw')
    expect(listButtons().map((button) => button.textContent)).toEqual(before)
    expect(screen.getByText('Đã lưu')).toBeInTheDocument()
    expect(saveButton()).toBeDisabled()

    await user.clear(feedbackBox())
    await user.type(feedbackBox(), 'đổi chủ đề khác')
    await user.click(within(dialog()).getByRole('button', { name: 'Xác nhận tạo lại' }))
    await within(notice()).findByText(SUCCESS, {}, SLOW)
  })

  it('máy chủ AI bận (5b): đúng câu SRS, Backend đã thử đủ 3 lần, giao diện KHÔNG tự thử thêm; "Thử lại" do giáo viên bấm', async () => {
    const user = userEvent.setup()

    await openEditor()
    setMockScenario('timeout')
    await openDialog(user)
    await user.click(within(dialog()).getByRole('button', { name: 'Xác nhận tạo lại' }))

    expect(await within(dialog()).findByRole('alert', {}, SLOW)).toHaveTextContent(BUSY)
    expect(getMockAiAttempts()).toBe(3)
    expect(screen.getByText('Đã lưu')).toBeInTheDocument()
    // Chờ thêm một lúc: nếu giao diện tự thử lại thì số lần gọi sẽ tăng.
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(getMockAiAttempts()).toBe(3)

    setMockScenario('normal')
    await user.click(within(dialog()).getByRole('button', { name: 'Thử lại' }))
    await within(notice()).findByText(SUCCESS, {}, SLOW)
    expect(getMockAiAttempts()).toBe(1)
  })

  it('AI chậm lần đầu nhưng Backend thử lại thành công thì giáo viên chỉ thấy thành công', async () => {
    const user = userEvent.setup()

    setMockAiFlakiness(2)
    await openEditor()
    await openDialog(user)
    await user.click(within(dialog()).getByRole('button', { name: 'Xác nhận tạo lại' }))
    await within(notice()).findByText(SUCCESS, {}, SLOW)

    expect(getMockAiAttempts()).toBe(3)
  })

  it('đang có phòng chơi chưa kết thúc (409): báo rõ, câu cũ giữ nguyên, không có nút thử lại, chỉ còn nút Đóng', async () => {
    const user = userEvent.setup()

    await openEditor()
    setMockGameLocked(QUIZ_ID, true)
    await openDialog(user)
    await user.click(within(dialog()).getByRole('button', { name: 'Xác nhận tạo lại' }))

    expect(await within(dialog()).findByRole('alert', {}, SLOW)).toHaveTextContent('phòng chơi chưa kết thúc')
    expect(within(dialog()).queryByRole('button', { name: 'Thử lại' })).not.toBeInTheDocument()
    expect(within(dialog()).queryByRole('button', { name: 'Xác nhận tạo lại' })).not.toBeInTheDocument()

    await user.click(within(dialog()).getByRole('button', { name: 'Đóng' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('mất mạng: cũng ra câu "máy chủ AI bận", câu cũ giữ nguyên', async () => {
    const user = userEvent.setup()

    await openEditor()
    setMockScenario('error')
    await openDialog(user)
    await user.click(within(dialog()).getByRole('button', { name: 'Xác nhận tạo lại' }))

    expect(await within(dialog()).findByRole('alert', {}, SLOW)).toHaveTextContent(BUSY)
    expect(screen.getByText('Đã lưu')).toBeInTheDocument()
  })
})

describe('câu chưa lưu trên máy chủ (404)', () => {
  // Bản sao lưu có thêm câu q4 mà máy chủ chưa biết: khôi phục xong thì q4 là câu "mới thêm chưa lưu".
  function seedUnsavedQuestion() {
    const saved = structuredClone(toContent(getMockGame(MATCHING_ID)))
    const extra = { ...structuredClone(saved.questions[2]), id: 'q4' }

    saveDraft(OWNER, MATCHING_ID, { ...saved, questions: [...saved.questions, extra] } as typeof saved, getMockGame(MATCHING_ID).updatedAt)
  }

  async function openWithUnsavedQuestion(user: ReturnType<typeof userEvent.setup>) {
    seedUnsavedQuestion()
    await openEditor(MATCHING_ID)
    await user.click(await screen.findByRole('button', { name: 'Khôi phục bản chỉnh sửa' }, SLOW))
    await user.click(listButtons()[3])
  }

  it('nút khóa (aria-disabled, vẫn tới được bằng bàn phím), ghi "Hãy lưu trước" ngay dưới nút, bấm không mở hộp thoại; câu đã lưu thì bấm được', async () => {
    const user = userEvent.setup()

    await openWithUnsavedQuestion(user)

    expect(trigger()).toHaveAttribute('aria-disabled', 'true')
    expect(trigger()).toHaveAccessibleDescription(/Hãy lưu trước/)
    expect(screen.getByText(/Hãy bấm "Lưu bản nháp" rồi mới nhờ AI làm lại/)).toBeInTheDocument()
    expect(trigger()).toHaveAttribute('title', 'Hãy lưu trước')
    trigger().focus()
    expect(trigger()).toHaveFocus()

    await user.click(trigger())
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(listButtons()[0])
    expect(trigger()).not.toHaveAttribute('aria-disabled')
    expect(screen.queryByText(/Hãy bấm "Lưu bản nháp" rồi mới nhờ AI làm lại/)).not.toBeInTheDocument()
  })

  it('lưu xong thì câu mới có trên máy chủ và nút mở khóa', async () => {
    const user = userEvent.setup()

    await openWithUnsavedQuestion(user)
    expect(trigger()).toHaveAttribute('aria-disabled', 'true')

    await user.click(saveButton())
    await screen.findByText(/Bạn đã lưu bản nháp thành công|Đã lưu thay đổi/, {}, SLOW)

    await waitFor(() => expect(trigger()).not.toHaveAttribute('aria-disabled'))
  })
})

describe('các nhánh khác', () => {
  it('bấm đúp "Xác nhận tạo lại" chỉ nhờ AI một lần', async () => {
    vi.stubEnv('VITE_MOCK_LATENCY_MS', '100')

    const user = userEvent.setup()

    await openEditor()
    await openDialog(user)
    await user.dblClick(within(dialog()).getByRole('button', { name: 'Xác nhận tạo lại' }))
    await within(notice()).findByText(SUCCESS, {}, SLOW)

    expect(getMockAiAttempts()).toBe(1)
  })

  it('Hoàn tác trả lại cả phần ĐÃ SỬA TAY (chưa lưu) trước khi nhờ AI, không phải bản đã lưu', async () => {
    const user = userEvent.setup()

    await openEditor()
    fireEvent.change(screen.getByRole('textbox', { name: /^Điểm/ }), { target: { value: '47' } })
    fireEvent.blur(screen.getByRole('textbox', { name: /^Điểm/ }))
    await waitFor(() => expect(listButtons()[0].textContent).toContain('47 điểm'), SLOW)

    await openDialog(user)
    await user.click(within(dialog()).getByRole('button', { name: 'Xác nhận tạo lại' }))
    await within(notice()).findByText(SUCCESS, {}, SLOW)
    await user.click(within(notice()).getByRole('button', { name: 'Hoàn tác' }))

    expect(listButtons()[0].textContent).toContain('47 điểm')
    expect(screen.getByText('Chưa lưu')).toBeInTheDocument()
  })

  it('đóng hộp thoại đang có lỗi rồi mở lại thì sạch lỗi và không còn gợi ý cũ', async () => {
    const user = userEvent.setup()

    await openEditor()
    setMockScenario('timeout')
    await openDialog(user)
    await user.type(feedbackBox(), 'gợi ý cũ')
    await user.click(within(dialog()).getByRole('button', { name: 'Xác nhận tạo lại' }))
    await within(dialog()).findByRole('alert', {}, SLOW)

    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await openDialog(user)

    expect(within(dialog()).queryByRole('alert')).not.toBeInTheDocument()
    expect(feedbackBox()).toHaveValue('')
  })

  it('lỗi 409: tiêu điểm không rơi ra ngoài mà về nút Đóng', async () => {
    const user = userEvent.setup()

    await openEditor()
    setMockGameLocked(QUIZ_ID, true)
    await openDialog(user)
    await user.click(within(dialog()).getByRole('button', { name: 'Xác nhận tạo lại' }))
    await within(dialog()).findByRole('alert', {}, SLOW)

    await waitFor(() => expect(within(dialog()).getByRole('button', { name: 'Đóng' })).toHaveFocus())
  })

  it('đang có bản sao lưu chờ hỏi khôi phục thì nút khóa kèm lý do; chọn xong thì mở lại', async () => {
    const user = userEvent.setup()
    const saved = structuredClone(toContent(getMockGame(QUIZ_ID)))

    saved.metadata.title = 'Bản chưa lưu hôm qua'
    saveDraft(OWNER, QUIZ_ID, saved, getMockGame(QUIZ_ID).updatedAt)
    await openEditor()

    expect(trigger()).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByText(/Hãy chọn "Khôi phục bản chỉnh sửa" hoặc "Bỏ bản chỉnh sửa"/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Bỏ bản chỉnh sửa' }))
    await waitFor(() => expect(trigger()).not.toHaveAttribute('aria-disabled'))
  })

  it('còn chữ gõ dở chưa áp vào bản đang soạn thì Hoàn tác cũng khóa kèm lý do (kẻo dựng lại thẻ làm mất chữ đang gõ)', async () => {
    const user = userEvent.setup()

    await openEditor()
    await openDialog(user)
    await user.click(within(dialog()).getByRole('button', { name: 'Xác nhận tạo lại' }))
    await within(notice()).findByText(SUCCESS, {}, SLOW)

    vi.stubEnv('VITE_MOCK_LATENCY_MS', '400')
    fireEvent.change(screen.getByRole('textbox', { name: /^Nội dung câu hỏi/ }), { target: { value: 'Đang gõ dở một câu mới' } })

    const undo = within(notice()).getByRole('button', { name: 'Hoàn tác' })

    await waitFor(() => expect(undo).toHaveAttribute('aria-disabled', 'true'))
    expect(within(notice()).getByText('Đang áp dụng chỉnh sửa, đợi một chút rồi bấm lại.')).toBeInTheDocument()

    await user.click(undo)
    expect(within(notice()).queryByText('Đã khôi phục câu cũ.')).not.toBeInTheDocument()

    await waitFor(() => expect(within(notice()).queryByRole('button', { name: 'Hoàn tác' })).not.toBeInTheDocument(), { timeout: 6000 })
  })

  it('"Đã khôi phục câu cũ." tự mất khi giáo viên sửa tiếp câu', async () => {
    const user = userEvent.setup()

    await openEditor()
    await openDialog(user)
    await user.click(within(dialog()).getByRole('button', { name: 'Xác nhận tạo lại' }))
    await within(notice()).findByText(SUCCESS, {}, SLOW)
    await user.click(within(notice()).getByRole('button', { name: 'Hoàn tác' }))
    expect(within(notice()).getByText('Đã khôi phục câu cũ.')).toBeInTheDocument()

    fireEvent.change(screen.getByRole('textbox', { name: /^Điểm/ }), { target: { value: '63' } })
    fireEvent.blur(screen.getByRole('textbox', { name: /^Điểm/ }))

    await waitFor(() => expect(within(notice()).queryByText('Đã khôi phục câu cũ.')).not.toBeInTheDocument())
  })
})
