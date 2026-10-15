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

// Form sửa câu MEMORY_CARD (mock-game-6). Câu 1 có 3 cặp: cat, dog, bird. Câu 2 có 4 cặp: fish, duck, cow, pig. Câu 3 có 2 cặp: red, blue.
const MEMORY_ID = 'mock-game-6'
const UNSAFE = 'Nội dung chỉnh sửa của giáo viên chưa đạt chuẩn an toàn học đường dành cho trẻ nhỏ. Vui lòng điều chỉnh lại từ ngữ.'

const pairsGroup = () => screen.getByRole('group', { name: 'Các cặp thẻ' })
const pairItems = () => within(pairsGroup()).getAllByRole('listitem')
const pairItem = (index: number) => pairItems()[index]
const cardBox = (pair: number, kind: 'Chữ trên thẻ' | 'Mô tả hình trên thẻ') => within(pairItem(pair)).getByRole('textbox', { name: new RegExp(`^${kind}`) })
const addButton = () => screen.getByRole('button', { name: 'Thêm cặp' })
const removeButton = (pair: number) => screen.getByRole('button', { name: `Xóa cặp ${pair}` })
const listItems = () => within(screen.getByRole('list', { name: 'Danh sách câu hỏi' })).getAllByRole('button')
const saveButton = () => screen.getByRole('button', { name: 'Lưu bản nháp' })
const type = (box: HTMLElement, value: string) => {
  fireEvent.change(box, { target: { value } })
  fireEvent.blur(box)
}

async function openLoaded() {
  renderWithProviders(<WorkspaceEditor />, `/workspace/editor?gameId=${MEMORY_ID}`)
  await screen.findByRole('textbox', { name: /Tên trò chơi/ })
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

describe('form sửa câu MEMORY_CARD', () => {
  it('không còn thông báo "chưa có form"; hiện đúng 3 cặp thẻ của câu 1, mỗi cặp một mặt thẻ (chữ, mô tả hình), kèm trường chung', async () => {
    await openLoaded()

    expect(screen.queryByText('Loại game này chưa có form sửa chi tiết')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Sửa câu 1' })).toBeInTheDocument()
    expect(pairItems()).toHaveLength(3)
    expect(cardBox(0, 'Chữ trên thẻ')).toHaveValue('cat')
    expect(cardBox(2, 'Chữ trên thẻ')).toHaveValue('bird')
    expect(cardBox(0, 'Mô tả hình trên thẻ')).toHaveValue('')
    expect(screen.getByRole('textbox', { name: /^Lời đọc/ })).toHaveValue('Tìm hai thẻ giống nhau')
    expect(screen.getByRole('textbox', { name: /Thời gian trả lời/ })).toHaveValue('30')
    expect(screen.getByRole('textbox', { name: /^Điểm/ })).toHaveValue('10')
  })

  it('chọn câu khác thì form đổi theo (câu 2 có 4 cặp, câu 3 có 2 cặp)', async () => {
    const user = userEvent.setup()

    await openLoaded()
    await user.click(listItems()[1])
    expect(pairItems()).toHaveLength(4)
    expect(cardBox(3, 'Chữ trên thẻ')).toHaveValue('pig')

    await user.click(listItems()[2])
    expect(pairItems()).toHaveLength(2)
    expect(cardBox(1, 'Chữ trên thẻ')).toHaveValue('blue')
  })

  it('sửa chữ một thẻ: danh sách câu cập nhật và hiện "Chưa lưu"', async () => {
    await openLoaded()
    type(cardBox(0, 'Chữ trên thẻ'), 'kitten')

    await waitFor(() => expect(listItems()[0]).toHaveTextContent('kitten'))
    expect(screen.getByText('Chưa lưu')).toBeInTheDocument()
  })

  it('thêm cặp đến 8 thì khóa kèm lời giải thích; xóa về 2 thì khóa nút Xóa', async () => {
    const user = userEvent.setup()

    await openLoaded()
    // 3 cặp: còn xóa được (tối thiểu 2).
    expect(removeButton(1)).toBeEnabled()

    for (let count = 3; count < 8; count += 1) await user.click(addButton())

    expect(pairItems()).toHaveLength(8)
    expect(addButton()).toBeDisabled()
    expect(screen.getByText('Đã đủ 8 cặp, không thêm được nữa.')).toBeInTheDocument()

    for (let count = 8; count > 2; count -= 1) await user.click(removeButton(count))

    expect(pairItems()).toHaveLength(2)
    expect(removeButton(1)).toBeDisabled()
    expect(screen.getByText('Cần giữ ít nhất 2 cặp.')).toBeInTheDocument()
  })

  it('cặp mới còn trống: báo "cần chữ hoặc mô tả hình" và danh sách đánh dấu "Cần sửa"', async () => {
    const user = userEvent.setup()

    await openLoaded()
    await user.click(addButton())

    expect(within(pairItem(3)).getAllByText(/cần có chữ hoặc mô tả hình/i).length).toBeGreaterThan(0)
    expect(listItems()[0]).toHaveTextContent('Cần sửa')
    // Cả hai ô của thẻ đó được đánh dấu không hợp lệ cho trình đọc màn hình.
    expect(cardBox(3, 'Chữ trên thẻ')).toHaveAttribute('aria-invalid', 'true')
    expect(cardBox(3, 'Mô tả hình trên thẻ')).toHaveAttribute('aria-invalid', 'true')
    expect(cardBox(0, 'Chữ trên thẻ')).not.toHaveAttribute('aria-invalid', 'true')
  })

  it('chữ đang gõ dở đi theo ĐÚNG cặp khi xóa cặp đứng trước (khóa theo mã cặp, không theo vị trí)', async () => {
    const user = userEvent.setup()

    await openLoaded()
    fireEvent.change(cardBox(1, 'Chữ trên thẻ'), { target: { value: 'dogg' } })
    await user.click(removeButton(1))

    expect(pairItems()).toHaveLength(2)
    expect(cardBox(0, 'Chữ trên thẻ')).toHaveValue('dogg')
    expect(cardBox(1, 'Chữ trên thẻ')).toHaveValue('bird')
  })

  it('mặt thẻ là chữ HOẶC mô tả hình: chỉ cần một trong hai thì hết lỗi', async () => {
    const user = userEvent.setup()

    await openLoaded()
    await user.click(addButton())
    type(cardBox(3, 'Mô tả hình trên thẻ'), 'con mèo ngồi trên ghế')

    await waitFor(() => expect(within(pairItem(3)).queryAllByText(/cần có chữ hoặc mô tả hình/i)).toHaveLength(0))
    expect(listItems()[0]).not.toHaveTextContent('Cần sửa')
  })

  it('không cho trùng: hai cặp cùng chữ bị báo ngay và bấm Lưu bị chặn, kho không đổi', async () => {
    const user = userEvent.setup()

    await openLoaded()
    type(cardBox(1, 'Chữ trên thẻ'), 'cat')

    expect(await screen.findByText(/bị trùng nhau/)).toBeInTheDocument()

    await user.click(saveButton())

    expect(await screen.findByRole('alert')).toHaveTextContent('Chưa lưu được')
    expect(getMockGame(MEMORY_ID).questions[0]).toMatchObject({ pairs: [{ content: { text: 'cat' } }, { content: { text: 'dog' } }, { content: { text: 'bird' } }] })
  })

  it('chữ quá 100 ký tự bị báo ngay dưới đúng ô', async () => {
    await openLoaded()
    type(cardBox(0, 'Chữ trên thẻ'), 'a'.repeat(101))

    expect(await screen.findByText(/tối đa 100 ký tự/)).toBeInTheDocument()
  })

  it('từ ngữ chưa phù hợp (UC-05 2a): giữ nguyên nội dung cũ trong danh sách, hiện đúng câu của SRS', async () => {
    await openLoaded()
    type(cardBox(0, 'Chữ trên thẻ'), 'cảnh máu me')

    expect((await screen.findAllByText(new RegExp(UNSAFE.slice(0, 40)), {}, { timeout: 5000 })).length).toBeGreaterThan(0)
    expect(listItems()[0]).toHaveTextContent('cat')
    expect(cardBox(0, 'Chữ trên thẻ')).toHaveValue('cảnh máu me')
  })

  it('thời gian trả lời: 135 giây do Backend sinh ra (mầm non) giữ nguyên khi chưa sửa; giáo viên nhập 130 thì bị báo (tối đa 120 theo SRS)', async () => {
    // Backend đặt 90 x 1,5 = 135 giây cho MEMORY_CARD mầm non: hợp lệ theo DSL (5 đến 600) nên giữ nguyên nếu giáo viên không đụng tới.
    const game = getMockGame(MEMORY_ID)

    game.questions[0].timeLimitSeconds = 135
    saveMockGame(MEMORY_ID, game)

    await openLoaded()
    const time = screen.getByRole('textbox', { name: /Thời gian trả lời/ })

    expect(time).toHaveValue('135')
    // Chờ danh sách câu dựng xong rồi mới khẳng định không có lỗi (tránh đúng một cách rỗng).
    await waitFor(() => expect(listItems()[0]).toHaveTextContent('cat'))
    expect(screen.queryByText(/tối đa 120/)).not.toBeInTheDocument()
    expect(listItems()[0]).not.toHaveTextContent('Cần sửa')

    type(time, '130')

    expect((await screen.findAllByText(/120/)).length).toBeGreaterThan(0)
  })

  it('lưu: nội dung đã sửa (cặp mới có mã p4, bỏ khoảng trắng thừa) được ghi vào kho', async () => {
    const user = userEvent.setup()

    await openLoaded()
    await user.click(addButton())
    type(cardBox(3, 'Chữ trên thẻ'), '  fox  ')
    await waitFor(() => expect(listItems()[0]).toHaveTextContent('4 cặp'))
    await waitFor(() => expect(screen.queryByText('Đang áp dụng chỉnh sửa...')).not.toBeInTheDocument())

    await user.click(saveButton())
    await screen.findByText('Bạn đã lưu bản nháp thành công.')

    expect(getMockGame(MEMORY_ID).questions[0]).toMatchObject({
      pairs: [
        { pairId: 'p1', content: { text: 'cat' } },
        { pairId: 'p2', content: { text: 'dog' } },
        { pairId: 'p3', content: { text: 'bird' } },
        { pairId: 'p4', content: { text: 'fox' } },
      ],
    })
  })

  it('chơi thử vẫn "chưa hỗ trợ" (chưa có renderer Canvas cho loại này)', async () => {
    const user = userEvent.setup()

    await openLoaded()
    await user.click(screen.getByRole('button', { name: 'Chơi thử' }))

    expect(await screen.findByText(/chưa hỗ trợ chơi thử/, {}, { timeout: 10_000 })).toBeInTheDocument()
  })
})

describe('MEMORY_CARD: dùng được bằng bàn phím', () => {
  it('Tab tới nút Thêm cặp, bấm Enter thì thêm cặp và tiêu điểm chuyển tới ô chữ của cặp mới, gõ được ngay', async () => {
    const user = userEvent.setup()

    await openLoaded()
    addButton().focus()
    await user.keyboard('{Enter}')

    expect(pairItems()).toHaveLength(4)
    await waitFor(() => expect(cardBox(3, 'Chữ trên thẻ')).toHaveFocus())

    await user.keyboard('fox')
    await waitFor(() => expect(cardBox(3, 'Chữ trên thẻ')).toHaveValue('fox'))
  })

  it('xóa cặp bằng phím Space khi nút đang có tiêu điểm; tiêu điểm không rơi về đầu trang', async () => {
    const user = userEvent.setup()

    await openLoaded()
    await user.click(addButton())
    await waitFor(() => expect(cardBox(3, 'Chữ trên thẻ')).toHaveFocus())
    removeButton(4).focus()
    await user.keyboard(' ')

    expect(pairItems()).toHaveLength(3)
    await waitFor(() => expect(document.body).not.toHaveFocus())
    expect(document.activeElement?.id).toMatch(/^memory-p\d+-text$/)
  })

  it('thứ tự Tab đi theo thứ tự trên màn hình: nút Xóa cặp, chữ trên thẻ, mô tả hình trên thẻ, rồi sang cặp kế', async () => {
    const user = userEvent.setup()

    await openLoaded()
    removeButton(1).focus()

    const order: string[] = []

    for (let step = 0; step < 4; step += 1) {
      await user.tab()
      order.push((document.activeElement as HTMLElement).id || (document.activeElement as HTMLElement).getAttribute('aria-label') || '')
    }

    expect(order).toEqual(['memory-p1-text', 'memory-p1-image', 'Xóa cặp 2', 'memory-p2-text'])
  })

  it('mỗi cặp là một nhóm có tên riêng và mặt thẻ là nhóm con', async () => {
    await openLoaded()

    expect(within(pairsGroup()).getByRole('group', { name: 'Cặp 1' })).toBeInTheDocument()
    expect(within(pairItem(0)).getByRole('group', { name: 'Mặt thẻ' })).toBeInTheDocument()
  })
})

describe('MEMORY_CARD: bố cục', () => {
  // jsdom không có bố cục thật: độ vừa khít ở 390px được kiểm bằng ảnh chụp trình duyệt (docs/screenshots/form-memory-card-mobile-390.jpg).
  it('mặt thẻ chỉ xếp một cột (không dùng lưới hai cột như MATCHING)', async () => {
    await openLoaded()

    expect(pairItem(0).querySelector('.md\\:grid-cols-2')).toBeNull()
  })
})
