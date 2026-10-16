import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { getMockGame, resetMockGames, saveMockGame } from '../services/mock/mockGames'
import { setMockScenario } from '../services/mock/mockRuntime'
import { loginAsTeacher, renderWithProviders } from '../test/renderWithApp'
import type { AudioVisualMatchGame } from '../types/game-dsl.types'
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

// Form sửa câu AUDIO_VISUAL_MATCH (mock-game-4). Câu 1: lời đọc "Cat", hình đúng "a cute cat", hình sai "a brown dog", "a small bird". Câu 2: "Dog", đúng "a brown dog",
// sai "a cute cat", "a white rabbit". Câu 3: "Fish", đúng "a goldfish in a bowl", 3 hình sai ("a small bird", "a white rabbit", "a cute cat").
const AVM_ID = 'mock-game-4'
// mock-game-4 là game ĐÃ XUẤT BẢN: lưu xong hiện lời "Đã lưu thay đổi của trò chơi." (game nháp thì "Bạn đã lưu bản nháp thành công.").
const IMAGE_NOTE = /Ảnh hiện tại có thể không khớp với mô tả mới./

const audioBox = () => screen.getByRole('textbox', { name: /^Lời đọc/ })
const correctBox = () => screen.getByRole('textbox', { name: /^Mô tả hình đúng/ })
const promptBox = () => screen.getByRole('textbox', { name: /^Mô tả hình ảnh/ })
const distractorsGroup = () => screen.getByRole('group', { name: 'Các hình sai (hình nhiễu)' })
const distractorRows = () => within(distractorsGroup()).getAllByRole('listitem')
const distractorBox = (index: number) => screen.getByRole('textbox', { name: new RegExp(`^Mô tả hình sai ${index + 1}`) })
const addButton = () => screen.getByRole('button', { name: 'Thêm hình sai' })
const removeButton = (number: number) => screen.getByRole('button', { name: `Xóa hình sai ${number}` })
const listItems = () => within(screen.getByRole('list', { name: 'Danh sách câu hỏi' })).getAllByRole('button')
const saveButton = () => screen.getByRole('button', { name: 'Lưu bản nháp' })
const type = (box: HTMLElement, value: string) => {
  fireEvent.change(box, { target: { value } })
  fireEvent.blur(box)
}
const stored = (index = 0) => getMockGame(AVM_ID).questions[index] as AudioVisualMatchGame['questions'][number]
// Hai lần bấm liền trong CÙNG một lượt xử lý, khi React chưa kịp vẽ lại giữa hai lần (nút còn ở trạng thái cũ).
const clickTwice = (first: HTMLElement, second: HTMLElement) =>
  act(() => {
    first.click()
    second.click()
  })

async function openLoaded() {
  renderWithProviders(<WorkspaceEditor />, `/workspace/editor?gameId=${AVM_ID}`)
  await screen.findByRole('textbox', { name: /Tên trò chơi/ })
}

// Nút Lưu chỉ mở khi mọi chữ vừa gõ đã qua bước kiểm tra từ ngữ và vào game: chờ điều kiện đó (không chờ một khoảng cố định) rồi lưu để đọc kết quả thật từ kho.
async function saveWhenApplied() {
  await waitFor(() => expect(saveButton()).toBeEnabled(), { timeout: 8000 })
  await waitFor(() => expect(screen.queryByText('Đang áp dụng chỉnh sửa...')).not.toBeInTheDocument(), { timeout: 8000 })
  fireEvent.click(saveButton())
  await screen.findByText('Đã lưu thay đổi của trò chơi.', {}, { timeout: 8000 })
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

describe('form sửa câu AUDIO_VISUAL_MATCH', () => {
  it('không còn thông báo "chưa có form"; hiện lời đọc (bắt buộc), hình đúng, 2 hình sai của câu 1, kèm trường chung', async () => {
    await openLoaded()

    expect(screen.queryByText('Loại game này chưa có form sửa chi tiết')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Sửa câu 1' })).toBeInTheDocument()
    expect(audioBox()).toHaveValue('Cat')
    expect(correctBox()).toHaveValue('a cute cat')
    expect(correctBox()).toHaveAccessibleDescription(/Hình học sinh cần chọn/)
    expect(distractorRows()).toHaveLength(2)
    expect(distractorBox(0)).toHaveValue('a brown dog')
    expect(distractorBox(1)).toHaveValue('a small bird')
    expect(screen.getByText(/Từ 1 đến 3 hình sai/)).toBeInTheDocument()
    // Lời đọc là bắt buộc ở loại này (dấu *), mô tả hình chung thì không.
    expect(document.querySelector(`label[for="${audioBox().id}"]`)?.textContent).toContain('*')
    expect(document.querySelector(`label[for="${promptBox().id}"]`)?.textContent).not.toContain('*')
    expect(screen.getByRole('textbox', { name: /Thời gian trả lời/ })).toBeInTheDocument()
  })

  it('nhóm hình sai có gợi ý số lượng gắn kèm, và thêm lỗi của danh sách khi hình sai bị trùng', async () => {
    await openLoaded()

    expect(distractorsGroup()).toHaveAccessibleDescription(/Từ 1 đến 3 hình sai/)

    type(distractorBox(1), 'a brown dog')

    await waitFor(() => expect(distractorsGroup()).toHaveAccessibleDescription(/bị trùng nhau/))
  })

  it('chọn câu khác thì form đổi theo (câu 3 có 3 hình sai và nút Thêm khóa)', async () => {
    await openLoaded()
    fireEvent.click(listItems()[2])

    expect(correctBox()).toHaveValue('a goldfish in a bowl')
    expect(distractorRows()).toHaveLength(3)
    expect(addButton()).toBeDisabled()
  })

  it('thêm hình sai đến 3 thì khóa kèm lời giải thích; xóa về 1 thì khóa nút Xóa cuối cùng', async () => {
    await openLoaded()
    expect(removeButton(1)).toBeEnabled()

    fireEvent.click(addButton())

    expect(distractorRows()).toHaveLength(3)
    expect(addButton()).toBeDisabled()
    expect(screen.getByText('Đã đủ 3 hình sai, không thêm được nữa.')).toBeInTheDocument()

    fireEvent.click(removeButton(3))
    fireEvent.click(removeButton(2))

    expect(distractorRows()).toHaveLength(1)
    expect(removeButton(1)).toBeDisabled()
    expect(removeButton(1)).toHaveAccessibleDescription('Cần giữ ít nhất 1 hình sai.')
    expect(screen.getByText('Cần giữ ít nhất 1 hình sai.')).toBeInTheDocument()
  })

  it('sửa mô tả hình đúng: danh sách câu cập nhật, hiện "Chưa lưu", và lưu vào kho (bỏ khoảng trắng thừa)', async () => {
    await openLoaded()
    type(correctBox(), '  a sleepy cat  ')
    await waitFor(() => expect(screen.getByText('Chưa lưu')).toBeInTheDocument())

    await saveWhenApplied()

    expect(stored().correct.visualPrompt).toBe('a sleepy cat')
    expect(stored().distractors.map((choice) => choice.visualPrompt)).toEqual(['a brown dog', 'a small bird'])
  })

  it('hình sai mới còn trống: báo thiếu chữ đúng ô và danh sách đánh dấu "Cần sửa"', async () => {
    await openLoaded()
    fireEvent.click(addButton())

    expect(distractorBox(2)).toHaveAttribute('aria-invalid', 'true')
    expect(listItems()[0]).toHaveTextContent('Cần sửa')
  })

  it('xóa mô tả hình đúng: báo thiếu ngay dưới đúng ô', async () => {
    await openLoaded()
    type(correctBox(), '')

    expect(await screen.findByText(/Cần nhập Hình đúng/)).toBeInTheDocument()
    expect(correctBox()).toHaveAttribute('aria-invalid', 'true')
  })

  it('mô tả quá 100 ký tự bị báo ngay dưới đúng ô', async () => {
    await openLoaded()
    type(distractorBox(1), 'a'.repeat(101))

    expect(await screen.findByText(/tối đa 100 ký tự/)).toBeInTheDocument()
    expect(distractorBox(1)).toHaveAttribute('aria-invalid', 'true')
  })

  it('hình sai trùng hình đúng (khác hoa thường, khoảng trắng) bị báo ở danh sách và bấm Lưu bị chặn, kho không đổi', async () => {
    await openLoaded()
    type(distractorBox(0), '  A CUTE  cat ')

    expect(await screen.findByText(/bị trùng nhau/)).toBeInTheDocument()

    fireEvent.click(saveButton())

    expect(await screen.findByRole('alert')).toHaveTextContent('Chưa lưu được')
    expect(stored().distractors.map((choice) => choice.visualPrompt)).toEqual(['a brown dog', 'a small bird'])
  })

  it('hai hình sai trùng nhau cũng bị báo', async () => {
    await openLoaded()
    type(distractorBox(1), 'A brown dog')

    expect(await screen.findByText(/bị trùng nhau/)).toBeInTheDocument()
  })

  it('lời lẽ chưa phù hợp (UC-05 2a): giữ nguyên nội dung cũ trong danh sách, hiện đúng câu của SRS', async () => {
    await openLoaded()
    type(correctBox(), 'a cat trong cảnh máu me')

    expect((await screen.findAllByText(/Nội dung chỉnh sửa của giáo viên chưa đạt chuẩn/, {}, { timeout: 5000 })).length).toBeGreaterThan(0)
    expect(stored().correct.visualPrompt).toBe('a cute cat')
  })
})

describe('AUDIO_VISUAL_MATCH: ảnh của lựa chọn', () => {
  const withImages = () => {
    const game = getMockGame(AVM_ID) as unknown as AudioVisualMatchGame

    game.questions[0].correct = { visualPrompt: 'a cute cat', imageUrl: 'https://example.com/cat.png' }
    game.questions[0].distractors[0] = { visualPrompt: 'a brown dog', imageUrl: 'https://example.com/dog.png' }
    saveMockGame(AVM_ID, game)
  }

  it('lựa chọn có ảnh thì có lời nhắc không chặn; lựa chọn không có ảnh thì không có', async () => {
    withImages()
    await openLoaded()

    const rows = distractorRows()

    expect(screen.getAllByText(IMAGE_NOTE)).toHaveLength(2)
    expect(within(rows[0]).getByText(IMAGE_NOTE)).toBeInTheDocument()
    // Lời nhắc nằm trong mô tả của ô nên trình đọc màn hình nghe được khi ô có tiêu điểm.
    expect(correctBox()).toHaveAccessibleDescription(IMAGE_NOTE)
    expect(distractorBox(0)).toHaveAccessibleDescription(IMAGE_NOTE)
    expect(distractorBox(1)).not.toHaveAccessibleDescription(IMAGE_NOTE)
    expect(within(rows[1]).queryByText(IMAGE_NOTE)).not.toBeInTheDocument()
    expect(saveButton()).toBeDisabled() // chưa sửa gì nên chưa có gì để lưu; lời nhắc không phải lỗi
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('đường dẫn ảnh rỗng thì coi như chưa có ảnh: không có lời nhắc', async () => {
    const game = getMockGame(AVM_ID) as unknown as AudioVisualMatchGame

    game.questions[0].correct = { visualPrompt: 'a cute cat', imageUrl: '  ' }
    saveMockGame(AVM_ID, game)
    await openLoaded()

    expect(screen.queryByText(IMAGE_NOTE)).not.toBeInTheDocument()
  })

  it('game không có ảnh ở lựa chọn nào thì không có lời nhắc', async () => {
    await openLoaded()

    expect(screen.queryByText(IMAGE_NOTE)).not.toBeInTheDocument()
  })

  it('đổi mô tả của lựa chọn có ảnh: GIỮ nguyên imageUrl (đúng và sai), lời nhắc còn đó và vẫn lưu được', async () => {
    withImages()
    await openLoaded()
    type(correctBox(), 'a sleepy cat')
    type(distractorBox(0), 'a sleepy dog')

    await saveWhenApplied()

    expect(stored().correct).toEqual({ visualPrompt: 'a sleepy cat', imageUrl: 'https://example.com/cat.png' })
    expect(stored().distractors[0]).toEqual({ visualPrompt: 'a sleepy dog', imageUrl: 'https://example.com/dog.png' })
    expect(screen.getAllByText(IMAGE_NOTE)).toHaveLength(2)
  })

  it('xóa hình sai đứng trước một hình có ảnh: lời nhắc và ảnh đi theo đúng hình, không trượt sang hình khác', async () => {
    const game = getMockGame(AVM_ID) as unknown as AudioVisualMatchGame

    game.questions[0].distractors[1] = { visualPrompt: 'a small bird', imageUrl: 'https://example.com/bird.png' }
    saveMockGame(AVM_ID, game)
    await openLoaded()
    fireEvent.click(removeButton(1))

    expect(distractorRows()).toHaveLength(1)
    expect(distractorBox(0)).toHaveValue('a small bird')
    expect(within(distractorRows()[0]).getByText(IMAGE_NOTE)).toBeInTheDocument()

    await saveWhenApplied()

    expect(stored().distractors).toEqual([{ visualPrompt: 'a small bird', imageUrl: 'https://example.com/bird.png' }])
  })
})

describe('AUDIO_VISUAL_MATCH: thêm và xóa hình sai không làm lệch khóa', () => {
  it('xóa hình sai đứng trước: chữ gõ dở đi theo ĐÚNG hình (khóa theo hình, không theo vị trí); lưu xong kho có đúng chữ đó', async () => {
    await openLoaded()
    fireEvent.click(listItems()[2])
    fireEvent.change(distractorBox(1), { target: { value: 'a white bunny' } })
    fireEvent.blur(distractorBox(1))
    fireEvent.click(removeButton(1))

    await saveWhenApplied()

    expect(stored(2).distractors.map((choice) => choice.visualPrompt)).toEqual(['a white bunny', 'a cute cat'])
  })

  it('kết quả kiểm tra từ ngữ về MUỘN sau khi xóa hình sai đứng trước: chữ vào đúng hình đã sửa, không trượt sang hình khác', async () => {
    await openLoaded()
    fireEvent.click(listItems()[2])
    vi.stubEnv('VITE_MOCK_LATENCY_MS', '600')

    type(distractorBox(2), 'a pink cat')
    fireEvent.click(removeButton(1))
    expect(distractorRows()).toHaveLength(2)

    await saveWhenApplied()

    expect(stored(2).distractors.map((choice) => choice.visualPrompt)).toEqual(['a white rabbit', 'a pink cat'])
  })

  it('bấm "Thêm hình sai" hai lần liền khi chưa kịp vẽ lại (đang có 2): chỉ thêm ĐÚNG MỘT hình, tiêu điểm ở hình mới, gõ và lưu vào đúng hình đó', async () => {
    await openLoaded()
    const add = addButton()

    clickTwice(add, add)

    expect(distractorRows()).toHaveLength(3)
    await waitFor(() => expect(distractorBox(2)).toHaveFocus())

    type(distractorBox(2), 'a green frog')
    await saveWhenApplied()

    expect(stored().distractors.map((choice) => choice.visualPrompt)).toEqual(['a brown dog', 'a small bird', 'a green frog'])
  })

  it('sau hai lần bấm "Thêm" liền: danh sách khóa vẫn khớp số hình (xóa một hình rồi Thêm lại, tiêu điểm vào đúng ô mới, chữ vào đúng hình)', async () => {
    await openLoaded()
    const add = addButton()

    clickTwice(add, add)
    expect(distractorRows()).toHaveLength(3)

    fireEvent.click(removeButton(1))
    expect(distractorRows()).toHaveLength(2)
    fireEvent.click(addButton())

    expect(distractorRows()).toHaveLength(3)
    await waitFor(() => expect(distractorBox(2)).toHaveFocus())

    type(distractorBox(1), 'a green frog')
    type(distractorBox(2), 'a pink pig')
    await saveWhenApplied()

    expect(stored().distractors.map((choice) => choice.visualPrompt)).toEqual(['a small bird', 'a green frog', 'a pink pig'])
  })

  it('bấm "Thêm hình sai" hai lần liền khi chỉ có 1: thêm đủ 2 hình, mỗi hình giữ đúng chữ của mình sau khi xóa hình đầu', async () => {
    await openLoaded()
    fireEvent.click(removeButton(2))
    expect(distractorRows()).toHaveLength(1)
    const add = addButton()

    clickTwice(add, add)

    expect(distractorRows()).toHaveLength(3)

    type(distractorBox(1), 'a green frog')
    type(distractorBox(2), 'a pink pig')
    fireEvent.click(removeButton(1))

    await saveWhenApplied()

    expect(stored().distractors.map((choice) => choice.visualPrompt)).toEqual(['a green frog', 'a pink pig'])
  })

  it('bấm "Xóa" hai hình khác nhau liền khi chưa kịp vẽ lại (đang có 2): chỉ xóa một, còn lại một hình sửa và lưu được bình thường', async () => {
    await openLoaded()

    clickTwice(removeButton(1), removeButton(2))

    expect(distractorRows()).toHaveLength(1)
    expect(distractorBox(0)).toHaveValue('a small bird')

    type(distractorBox(0), 'a small owl')
    await saveWhenApplied()

    expect(stored().distractors.map((choice) => choice.visualPrompt)).toEqual(['a small owl'])
  })
})

describe('AUDIO_VISUAL_MATCH: thời gian, lưu và chơi thử', () => {
  it('thời gian: 135 giây do Backend sinh ra giữ nguyên khi chỉ sửa chữ rồi Lưu thành công', async () => {
    const game = getMockGame(AVM_ID)

    game.questions[0].timeLimitSeconds = 135
    saveMockGame(AVM_ID, game)

    await openLoaded()
    type(correctBox(), 'a sleepy cat')
    await waitFor(() => expect(screen.getByText('Chưa lưu')).toBeInTheDocument())

    await saveWhenApplied()

    expect(stored()).toMatchObject({ timeLimitSeconds: 135, correct: { visualPrompt: 'a sleepy cat' } })
  })

  it('lưu: lời đọc, hình đúng và các hình sai (kể cả hình mới thêm) được ghi vào kho', async () => {
    await openLoaded()
    type(audioBox(), 'Kitty')
    type(correctBox(), 'a kitten')
    fireEvent.click(addButton())
    type(distractorBox(2), 'a green frog')

    await saveWhenApplied()

    expect(stored()).toMatchObject({
      audioText: 'Kitty',
      correct: { visualPrompt: 'a kitten' },
      distractors: [{ visualPrompt: 'a brown dog' }, { visualPrompt: 'a small bird' }, { visualPrompt: 'a green frog' }],
    })
  })

  it('chơi thử vẫn "chưa hỗ trợ" (chưa có renderer Canvas cho loại này)', async () => {
    await openLoaded()
    fireEvent.click(screen.getByRole('button', { name: 'Chơi thử' }))

    expect(await screen.findByText(/chưa hỗ trợ chơi thử/, {}, { timeout: 10_000 })).toBeInTheDocument()
  })
})

describe('AUDIO_VISUAL_MATCH: dùng được bằng bàn phím', () => {
  it('Tab tới nút Thêm hình sai, Enter thì thêm và tiêu điểm chuyển tới ô của hình mới, gõ được ngay', async () => {
    const user = userEvent.setup()

    await openLoaded()
    addButton().focus()
    await user.keyboard('{Enter}')

    expect(distractorRows()).toHaveLength(3)
    await waitFor(() => expect(distractorBox(2)).toHaveFocus())

    await user.keyboard('frog')
    await waitFor(() => expect(distractorBox(2)).toHaveValue('frog'))
  })

  it('xóa hình sai bằng phím Space khi nút đang có tiêu điểm; tiêu điểm không rơi về đầu trang', async () => {
    const user = userEvent.setup()

    await openLoaded()
    await user.click(addButton())
    await waitFor(() => expect(distractorBox(2)).toHaveFocus())
    removeButton(3).focus()
    await user.keyboard(' ')

    expect(distractorRows()).toHaveLength(2)
    await waitFor(() => expect(document.body).not.toHaveFocus())
    expect(document.activeElement?.id).toMatch(/^avm-distractor-\d$/)
  })

  it('thứ tự Tab đi theo thứ tự trên màn hình: hình đúng, rồi nút Xóa và ô của hình sai', async () => {
    const user = userEvent.setup()

    await openLoaded()
    correctBox().focus()

    const order: string[] = []

    for (let step = 0; step < 3; step += 1) {
      await user.tab()
      const active = document.activeElement as HTMLElement

      order.push(active.id || active.textContent || active.getAttribute('aria-label') || '')
    }

    expect(order).toEqual(['Xóa hình sai 1', 'avm-distractor-0', 'Xóa hình sai 2'])
  })

  it('mỗi ô và nút có tên riêng để trình đọc màn hình phân biệt (hình sai 1, hình sai 2, xóa hình sai 1...)', async () => {
    await openLoaded()

    for (const number of [1, 2]) {
      expect(distractorBox(number - 1)).toBeInTheDocument()
      expect(removeButton(number)).toBeInTheDocument()
    }

    expect(correctBox()).toBeInTheDocument()
  })
})
