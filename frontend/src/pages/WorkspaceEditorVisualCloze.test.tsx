import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { getMockGame, resetMockGames, saveMockGame } from '../services/mock/mockGames'
import { setMockScenario } from '../services/mock/mockRuntime'
import { loginAsTeacher, renderWithProviders } from '../test/renderWithApp'
import WorkspaceEditor from './WorkspaceEditor'

// Canvas không có trong jsdom: mock react-konva thành DOM thường (xem PlayTestPanel.test.tsx) để mở màn chơi thử được trong test.
vi.mock('react-konva', () => ({
  Stage: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Layer: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Group: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Rect: () => null,
  Text: ({ text }: { text?: string }) => <span>{text}</span>,
  Image: () => null,
  Line: () => null,
}))
vi.mock('use-image', () => ({ default: () => [undefined, 'loading'] }))
vi.mock('howler', () => ({ Howl: class { play = vi.fn(); stop = vi.fn(); unload = vi.fn() } }))

// Form sửa câu VISUAL_CLOZE (mock-game-10). Câu 1: "Con mèo đang ___ trên ghế." đúng "ngủ", nhiễu chạy, bay; hình "a cat sleeping on a sofa". Câu 2: "Con chim
// đang ___ trên trời." đúng "bay", nhiễu bơi, ngủ. Câu 3: "Con cá đang ___ dưới ao." đúng "bơi", nhiễu bay, chạy, hát.
const CLOZE_ID = 'mock-game-10'
const UNSAFE = 'Nội dung chỉnh sửa của giáo viên chưa đạt chuẩn an toàn học đường dành cho trẻ nhỏ. Vui lòng điều chỉnh lại từ ngữ.'

const sentenceBox = () => screen.getByRole('textbox', { name: /^Câu có chỗ trống/ }) as HTMLTextAreaElement
const correctBox = () => screen.getByRole('textbox', { name: /^Từ đúng/ })
const promptBox = () => screen.getByRole('textbox', { name: /^Mô tả hình ảnh/ })
const distractorsGroup = () => screen.getByRole('group', { name: 'Các từ sai (từ nhiễu)' })
const distractorRows = () => within(distractorsGroup()).getAllByRole('listitem')
const distractorBox = (index: number) => screen.getByRole('textbox', { name: new RegExp(`^Từ sai ${index + 1}`) })
const insertButton = () => screen.getByRole('button', { name: 'Chèn chỗ trống' })
const addButton = () => screen.getByRole('button', { name: 'Thêm từ sai' })
const removeButton = (number: number) => screen.getByRole('button', { name: `Xóa từ sai ${number}` })
const listItems = () => within(screen.getByRole('list', { name: 'Danh sách câu hỏi' })).getAllByRole('button')
const saveButton = () => screen.getByRole('button', { name: 'Lưu bản nháp' })
const type = (box: HTMLElement, value: string) => {
  fireEvent.change(box, { target: { value } })
  fireEvent.blur(box)
}

async function openLoaded() {
  renderWithProviders(<WorkspaceEditor />, `/workspace/editor?gameId=${CLOZE_ID}`)
  await screen.findByRole('textbox', { name: /Tên trò chơi/ })
}

// Nút Lưu chỉ mở khi mọi chữ vừa gõ đã qua bước kiểm tra từ ngữ và vào game: chờ điều kiện đó (không chờ một khoảng cố định) rồi lưu để đọc kết quả thật từ kho.
async function saveWhenApplied(user: ReturnType<typeof userEvent.setup>) {
  await waitFor(() => expect(saveButton()).toBeEnabled(), { timeout: 8000 })
  await waitFor(() => expect(screen.queryByText('Đang áp dụng chỉnh sửa...')).not.toBeInTheDocument(), { timeout: 8000 })
  await user.click(saveButton())
  await screen.findByText('Bạn đã lưu bản nháp thành công.', {}, { timeout: 8000 })
}

// Nạp sẵn màn chơi thử (kéo theo renderer Canvas) một lần: lần nạp đầu tiên rất chậm khi nhiều file test chạy song song.
beforeAll(async () => {
  await import('../components/editor/PlayTestPanel')
}, 120_000)

beforeEach(() => {
  vi.stubEnv('VITE_USE_MOCK', 'editor')
  loginAsTeacher()
  resetMockGames()
})
afterEach(() => {
  vi.stubEnv('VITE_USE_MOCK', 'none')
  vi.stubEnv('VITE_MOCK_LATENCY_MS', '0')
  setMockScenario('normal')
  localStorage.clear()
  vi.clearAllMocks()
})

describe('form sửa câu VISUAL_CLOZE', () => {
  it('không còn thông báo "chưa có form"; hiện câu, từ đúng, 2 từ sai và mô tả hình (bắt buộc) của câu 1, kèm trường chung', async () => {
    await openLoaded()

    expect(screen.queryByText('Loại game này chưa có form sửa chi tiết')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Sửa câu 1' })).toBeInTheDocument()
    expect(sentenceBox()).toHaveValue('Con mèo đang ___ trên ghế.')
    expect(correctBox()).toHaveValue('ngủ')
    // Gợi ý cách đặt chỗ trống được gắn vào ô câu cho trình đọc màn hình.
    expect(sentenceBox()).toHaveAccessibleDescription(/ký hiệu ba dấu gạch dưới/)
    expect(distractorRows()).toHaveLength(2)
    expect(distractorBox(0)).toHaveValue('chạy')
    expect(distractorBox(1)).toHaveValue('bay')
    expect(promptBox()).toHaveValue('a cat sleeping on a sofa')
    // Dấu * cạnh nhãn: mô tả hình là bắt buộc ở loại này (ô lời đọc thì không).
    expect(document.querySelector(`label[for="${promptBox().id}"]`)?.textContent).toContain('*')
    expect(document.querySelector(`label[for="${screen.getByRole('textbox', { name: /^Lời đọc/ }).id}"]`)?.textContent).not.toContain('*')
    expect(screen.getByRole('textbox', { name: /^Lời đọc/ })).toHaveValue('Chọn từ điền vào chỗ trống')
    expect(screen.getByRole('textbox', { name: /Thời gian trả lời/ })).toHaveValue('30')
  })

  it('chọn câu khác thì form đổi theo (câu 3 có 3 từ sai)', async () => {
    const user = userEvent.setup()

    await openLoaded()
    await user.click(listItems()[2])

    expect(sentenceBox()).toHaveValue('Con cá đang ___ dưới ao.')
    expect(distractorRows()).toHaveLength(3)
    expect(distractorBox(2)).toHaveValue('hát')
  })

  it('sửa câu: danh sách câu cập nhật và hiện "Chưa lưu"', async () => {
    await openLoaded()
    type(sentenceBox(), 'Con mèo đang ___ trên giường.')

    await waitFor(() => expect(listItems()[0]).toHaveTextContent('Con mèo đang ___ trên giường.'))
    expect(screen.getByText('Chưa lưu')).toBeInTheDocument()
  })

  it('xóa chỗ trống khỏi câu: báo "đúng một chỗ trống" ngay dưới ô câu và danh sách đánh dấu "Cần sửa"; thêm lại thì hết lỗi', async () => {
    await openLoaded()
    type(sentenceBox(), 'Con mèo đang ngủ trên ghế.')

    expect(await screen.findByText(/đúng một chỗ trống "___"/)).toBeInTheDocument()
    expect(listItems()[0]).toHaveTextContent('Cần sửa')

    type(sentenceBox(), 'Con mèo đang ___ trên ghế.')

    await waitFor(() => expect(screen.queryByText(/đúng một chỗ trống "___"/)).not.toBeInTheDocument())
  })

  it('hai chỗ trống hoặc chỗ trống 4 gạch dưới cũng bị báo', async () => {
    await openLoaded()
    type(sentenceBox(), 'Con ___ đang ___ trên ghế.')
    expect(await screen.findByText(/đúng một chỗ trống "___"/)).toBeInTheDocument()

    // Về câu hợp lệ cho lỗi biến mất hẳn, rồi mới thử chỗ trống 4 gạch dưới: lỗi mới phải xuất hiện lại (không phải lỗi cũ còn sót).
    type(sentenceBox(), 'Con mèo đang ___ trên ghế.')
    await waitFor(() => expect(screen.queryByText(/đúng một chỗ trống "___"/)).not.toBeInTheDocument())

    type(sentenceBox(), 'Con mèo đang ____ trên ghế.')
    expect(await screen.findByText(/đúng một chỗ trống "___"/)).toBeInTheDocument()
  })
})

describe('VISUAL_CLOZE: nút "Chèn chỗ trống"', () => {
  it('câu đã có chỗ trống thì nút bị khóa kèm lời giải thích', async () => {
    await openLoaded()

    expect(insertButton()).toBeDisabled()
    expect(screen.getByText('Câu đã có chỗ trống.')).toBeInTheDocument()
  })

  it('xóa chỗ trống thì nút mở; bấm nút chèn "___" đúng vị trí con trỏ rồi khóa lại, câu hợp lệ trở lại', async () => {
    const user = userEvent.setup()

    await openLoaded()
    type(sentenceBox(), 'Con mèo đang trên ghế.')
    await waitFor(() => expect(insertButton()).toBeEnabled())
    expect(screen.getByText(/đúng một chỗ trống "___"/)).toBeInTheDocument()

    // Con trỏ nằm sau "đang " (vị trí 13).
    sentenceBox().focus()
    sentenceBox().setSelectionRange(13, 13)
    await user.click(insertButton())

    await waitFor(() => expect(sentenceBox()).toHaveValue('Con mèo đang ___ trên ghế.'))
    await waitFor(() => expect(listItems()[0]).toHaveTextContent('Con mèo đang ___ trên ghế.'), { timeout: 8000 })
    expect(insertButton()).toBeDisabled()
    expect(screen.queryByText(/đúng một chỗ trống "___"/)).not.toBeInTheDocument()
  })

  it('chèn thay cho đoạn đang chọn', async () => {
    const user = userEvent.setup()

    await openLoaded()
    type(sentenceBox(), 'Con mèo đang ngủ trên ghế.')
    await waitFor(() => expect(insertButton()).toBeEnabled())

    sentenceBox().focus()
    sentenceBox().setSelectionRange(13, 16)
    await user.click(insertButton())

    await waitFor(() => expect(sentenceBox()).toHaveValue('Con mèo đang ___ trên ghế.'))
    // Con trỏ nằm ngay sau chỗ trống vừa chèn (vị trí 16), không nhảy về đầu hay cuối câu.
    await waitFor(() => expect(sentenceBox().selectionStart).toBe(16))
    expect(sentenceBox().selectionEnd).toBe(16)
  })

  it('đã gõ chỗ trống bằng tay nhưng chữ chưa được áp (nút còn mở): bấm nút không chèn thêm, báo "Câu đã có chỗ trống" và giữ tiêu điểm ở ô câu', async () => {
    const user = userEvent.setup()

    await openLoaded()
    type(sentenceBox(), 'Con mèo đang trên ghế.')
    await waitFor(() => expect(insertButton()).toBeEnabled())

    // Gõ chỗ trống rồi bấm nút ngay, khi chữ này chưa vào game (độ trễ kiểm tra từ ngữ).
    vi.stubEnv('VITE_MOCK_LATENCY_MS', '600')
    fireEvent.change(sentenceBox(), { target: { value: 'Con mèo đang ___ trên ghế.' } })
    await user.click(insertButton())

    expect(sentenceBox()).toHaveValue('Con mèo đang ___ trên ghế.')
    expect(screen.getByText('Câu đã có chỗ trống.')).toBeInTheDocument()
    expect(sentenceBox()).toHaveFocus()
  })
})

describe('VISUAL_CLOZE: từ sai', () => {
  it('thêm từ sai đến 3 thì khóa kèm lời giải thích; xóa về 1 thì khóa nút Xóa', async () => {
    const user = userEvent.setup()

    await openLoaded()
    expect(removeButton(1)).toBeEnabled()

    await user.click(addButton())

    expect(distractorRows()).toHaveLength(3)
    expect(addButton()).toBeDisabled()
    expect(screen.getByText('Đã đủ 3 từ sai, không thêm được nữa.')).toBeInTheDocument()

    await user.click(removeButton(3))
    await user.click(removeButton(2))

    expect(distractorRows()).toHaveLength(1)
    expect(removeButton(1)).toBeDisabled()
    expect(screen.getByText('Cần giữ ít nhất 1 từ sai.')).toBeInTheDocument()
  })

  it('từ sai mới còn trống: báo thiếu chữ đúng ô và danh sách đánh dấu "Cần sửa"', async () => {
    const user = userEvent.setup()

    await openLoaded()
    await user.click(addButton())

    expect(distractorBox(2)).toHaveAttribute('aria-invalid', 'true')
    expect(listItems()[0]).toHaveTextContent('Cần sửa')
  })

  it('từ sai trùng từ đúng bị báo ở danh sách và bấm Lưu bị chặn, kho không đổi', async () => {
    const user = userEvent.setup()

    await openLoaded()
    type(distractorBox(0), ' NGỦ ')

    expect(await screen.findByText(/bị trùng nhau/)).toBeInTheDocument()

    await user.click(saveButton())

    expect(await screen.findByRole('alert')).toHaveTextContent('Chưa lưu được')
    expect(getMockGame(CLOZE_ID).questions[0]).toMatchObject({ correctAnswer: 'ngủ', distractors: ['chạy', 'bay'] })
  })

  it('hai từ sai trùng nhau cũng bị báo', async () => {
    await openLoaded()
    type(distractorBox(1), 'Chạy')

    expect(await screen.findByText(/bị trùng nhau/)).toBeInTheDocument()
  })

  it('từ đúng quá 50 ký tự bị báo ngay dưới đúng ô', async () => {
    await openLoaded()
    type(correctBox(), 'a'.repeat(51))

    expect(await screen.findByText(/tối đa 50 ký tự/)).toBeInTheDocument()
  })

  it('xóa từ sai đứng trước: chữ gõ dở đi theo ĐÚNG từ (khóa theo từ, không theo vị trí); lưu xong kho có đúng chữ đó', async () => {
    const user = userEvent.setup()

    await openLoaded()
    await user.click(listItems()[2])
    fireEvent.change(distractorBox(1), { target: { value: 'chạy nhanh' } })
    await user.click(removeButton(1))

    await saveWhenApplied(user)

    expect(getMockGame(CLOZE_ID).questions[2]).toMatchObject({ distractors: ['chạy nhanh', 'hát'] })
  })

  it('kết quả kiểm tra từ ngữ về MUỘN sau khi xóa từ sai đứng trước: chữ vào đúng từ đã sửa, không trượt sang từ khác', async () => {
    const user = userEvent.setup()

    await openLoaded()
    await user.click(listItems()[2])
    vi.stubEnv('VITE_MOCK_LATENCY_MS', '600')

    type(distractorBox(2), 'ca hát')
    await user.click(removeButton(1))
    expect(distractorRows()).toHaveLength(2)

    await saveWhenApplied(user)

    expect(getMockGame(CLOZE_ID).questions[2]).toMatchObject({ distractors: ['chạy', 'ca hát'] })
  })
})

describe('VISUAL_CLOZE: kiểm tra từ ngữ, lưu và chơi thử', () => {
  it('từ ngữ chưa phù hợp (UC-05 2a): giữ nguyên nội dung cũ trong danh sách, hiện đúng câu của SRS', async () => {
    await openLoaded()
    type(sentenceBox(), 'Con mèo đang ___ cảnh máu me.')

    expect((await screen.findAllByText(new RegExp(UNSAFE.slice(0, 40)), {}, { timeout: 5000 })).length).toBeGreaterThan(0)
    expect(listItems()[0]).toHaveTextContent('Con mèo đang ___ trên ghế.')
  })

  it('thời gian: 135 giây do Backend sinh ra giữ nguyên khi chỉ sửa chữ rồi Lưu thành công', async () => {
    const user = userEvent.setup()
    const game = getMockGame(CLOZE_ID)

    game.questions[0].timeLimitSeconds = 135
    saveMockGame(CLOZE_ID, game)

    await openLoaded()
    type(correctBox(), 'ngủ ngon')
    await waitFor(() => expect(screen.getByText('Chưa lưu')).toBeInTheDocument())
    await waitFor(() => expect(screen.queryByText('Đang áp dụng chỉnh sửa...')).not.toBeInTheDocument())

    await user.click(saveButton())
    await screen.findByText('Bạn đã lưu bản nháp thành công.')

    expect(getMockGame(CLOZE_ID).questions[0]).toMatchObject({ timeLimitSeconds: 135, correctAnswer: 'ngủ ngon' })
  })

  it('lưu: nội dung đã sửa (câu, từ đúng, từ sai mới, bỏ khoảng trắng thừa) được ghi vào kho', async () => {
    const user = userEvent.setup()

    await openLoaded()
    type(sentenceBox(), 'Con mèo đang ___ trên giường.')
    type(correctBox(), '  nằm  ')
    await user.click(addButton())
    type(distractorBox(2), '  hát  ')
    await waitFor(() => expect(listItems()[0]).toHaveTextContent('trên giường'))
    await waitFor(() => expect(screen.queryByText('Đang áp dụng chỉnh sửa...')).not.toBeInTheDocument())

    await user.click(saveButton())
    await screen.findByText('Bạn đã lưu bản nháp thành công.')

    expect(getMockGame(CLOZE_ID).questions[0]).toMatchObject({
      sentenceTemplate: 'Con mèo đang ___ trên giường.',
      correctAnswer: 'nằm',
      distractors: ['chạy', 'bay', 'hát'],
    })
  })

  it('chơi thử vẫn "chưa hỗ trợ" (chưa có renderer Canvas cho loại này)', async () => {
    const user = userEvent.setup()

    await openLoaded()
    await user.click(screen.getByRole('button', { name: 'Chơi thử' }))

    expect(await screen.findByText(/chưa hỗ trợ chơi thử/, {}, { timeout: 10_000 })).toBeInTheDocument()
  })
})

describe('VISUAL_CLOZE: dùng được bằng bàn phím', () => {
  it('Tab tới nút Thêm từ sai, Enter thì thêm và tiêu điểm chuyển tới ô của từ mới, gõ được ngay', async () => {
    const user = userEvent.setup()

    await openLoaded()
    addButton().focus()
    await user.keyboard('{Enter}')

    expect(distractorRows()).toHaveLength(3)
    await waitFor(() => expect(distractorBox(2)).toHaveFocus())

    await user.keyboard('hát')
    await waitFor(() => expect(distractorBox(2)).toHaveValue('hát'))
  })

  it('xóa từ sai bằng phím Space khi nút đang có tiêu điểm; tiêu điểm không rơi về đầu trang', async () => {
    const user = userEvent.setup()

    await openLoaded()
    await user.click(addButton())
    await waitFor(() => expect(distractorBox(2)).toHaveFocus())
    removeButton(3).focus()
    await user.keyboard(' ')

    expect(distractorRows()).toHaveLength(2)
    await waitFor(() => expect(document.body).not.toHaveFocus())
    expect(document.activeElement?.id).toMatch(/^cloze-distractor-\d$/)
  })

  it('thứ tự Tab đi theo thứ tự trên màn hình: câu, nút Chèn chỗ trống (khi mở), từ đúng, rồi nút Xóa và ô của từ sai', async () => {
    const user = userEvent.setup()

    await openLoaded()
    type(sentenceBox(), 'Con mèo đang trên ghế.')
    await waitFor(() => expect(insertButton()).toBeEnabled())
    sentenceBox().focus()

    const order: string[] = []

    for (let step = 0; step < 4; step += 1) {
      await user.tab()
      const active = document.activeElement as HTMLElement

      order.push(active.id || active.textContent || active.getAttribute('aria-label') || '')
    }

    expect(order).toEqual(['Chèn chỗ trống', 'cloze-correct', 'Xóa từ sai 1', 'cloze-distractor-0'])
  })

  it('mỗi ô và nút có tên riêng để trình đọc màn hình phân biệt (từ sai 1, từ sai 2, xóa từ sai 1...)', async () => {
    await openLoaded()

    for (const number of [1, 2]) {
      expect(distractorBox(number - 1)).toBeInTheDocument()
      expect(removeButton(number)).toBeInTheDocument()
    }
  })
})
