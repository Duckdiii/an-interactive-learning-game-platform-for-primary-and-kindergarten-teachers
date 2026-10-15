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

// Form sửa câu ODD_ONE_OUT (mock-game-9). Câu 1: 3 mục (Hình tròn nhỏ, Hình tròn to, Hình vuông), khác loại là C. Câu 2: 4 mục, khác loại là C (Con cá).
// Câu 3: 4 mục, khác loại là D (Cái bàn).
const ODD_ID = 'mock-game-9'
const UNSAFE = 'Nội dung chỉnh sửa của giáo viên chưa đạt chuẩn an toàn học đường dành cho trẻ nhỏ. Vui lòng điều chỉnh lại từ ngữ.'

const itemsGroup = () => screen.getByRole('group', { name: 'Các mục để chọn' })
const itemRows = () => within(itemsGroup()).getAllByRole('listitem')
const itemBox = (index: number) => screen.getByRole('textbox', { name: new RegExp(`^Mục ${'ABCDE'[index]}`) })
const oddRadio = (index: number) => within(itemRows()[index]).getByRole('radio')
const addButton = () => screen.getByRole('button', { name: 'Thêm mục' })
const removeButton = (letter: string) => screen.getByRole('button', { name: `Xóa mục ${letter}` })
const listItems = () => within(screen.getByRole('list', { name: 'Danh sách câu hỏi' })).getAllByRole('button')
const saveButton = () => screen.getByRole('button', { name: 'Lưu bản nháp' })
const type = (box: HTMLElement, value: string) => {
  fireEvent.change(box, { target: { value } })
  fireEvent.blur(box)
}

async function openLoaded() {
  renderWithProviders(<WorkspaceEditor />, `/workspace/editor?gameId=${ODD_ID}`)
  await screen.findByRole('textbox', { name: /Tên trò chơi/ })
}

const toSecondQuestion = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(listItems()[1])
  expect(itemRows()).toHaveLength(4)
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

describe('form sửa câu ODD_ONE_OUT', () => {
  it('không còn thông báo "chưa có form"; hiện đúng 3 mục của câu 1, mục khác loại được chọn sẵn, kèm trường chung', async () => {
    await openLoaded()

    expect(screen.queryByText('Loại game này chưa có form sửa chi tiết')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Sửa câu 1' })).toBeInTheDocument()
    expect(itemRows()).toHaveLength(3)
    expect(itemBox(0)).toHaveValue('Hình tròn nhỏ')
    expect(itemBox(2)).toHaveValue('Hình vuông')
    expect(oddRadio(2)).toBeChecked()
    expect(oddRadio(0)).not.toBeChecked()
    expect(screen.getByRole('textbox', { name: /^Lời đọc/ })).toHaveValue('Con hãy chọn hình khác loại')
    expect(screen.getByRole('textbox', { name: /Thời gian trả lời/ })).toHaveValue('30')
  })

  it('đúng MỘT mục khác loại: chọn mục khác thì mục cũ bỏ chọn', async () => {
    const user = userEvent.setup()

    await openLoaded()
    await user.click(oddRadio(0))

    expect(oddRadio(0)).toBeChecked()
    expect(oddRadio(2)).not.toBeChecked()
    expect(screen.getByText('Chưa lưu')).toBeInTheDocument()
  })

  it('sửa chữ một mục: danh sách câu cập nhật, mục khác loại vẫn đúng mục đó', async () => {
    await openLoaded()
    type(itemBox(2), 'Hình tam giác')

    await waitFor(() => expect(listItems()[0]).toHaveTextContent('Hình tam giác'))
    expect(oddRadio(2)).toBeChecked()
  })

  it('thêm mục đến 5 thì khóa kèm lời giải thích; xóa về 3 thì khóa nút Xóa', async () => {
    const user = userEvent.setup()

    await openLoaded()
    expect(removeButton('A')).toBeDisabled()
    expect(screen.getByText('Cần giữ ít nhất 3 mục.')).toBeInTheDocument()

    await user.click(addButton())
    await user.click(addButton())

    expect(itemRows()).toHaveLength(5)
    expect(addButton()).toBeDisabled()
    expect(screen.getByText('Đã đủ 5 mục, không thêm được nữa.')).toBeInTheDocument()

    await user.click(removeButton('E'))
    await user.click(removeButton('D'))

    expect(itemRows()).toHaveLength(3)
    expect(removeButton('A')).toBeDisabled()
  })

  it('mục mới còn trống: báo thiếu chữ đúng ô và danh sách đánh dấu "Cần sửa"', async () => {
    const user = userEvent.setup()

    await openLoaded()
    await user.click(addButton())

    expect(itemBox(3)).toHaveAttribute('aria-invalid', 'true')
    expect(listItems()[0]).toHaveTextContent('Cần sửa')
  })

  it('xóa đúng mục đang là mục khác loại: không mục nào được chọn và báo phải chọn lại; chọn lại thì hết lỗi', async () => {
    const user = userEvent.setup()

    await openLoaded()
    await toSecondQuestion(user)
    expect(oddRadio(2)).toBeChecked()

    await user.click(removeButton('C'))

    expect(itemRows()).toHaveLength(3)
    for (let index = 0; index < 3; index += 1) expect(oddRadio(index)).not.toBeChecked()
    expect(screen.getByText(/chưa có đáp án đúng/i)).toBeInTheDocument()
    expect(listItems()[1]).toHaveTextContent('Cần sửa')

    await user.click(oddRadio(1))

    await waitFor(() => expect(screen.queryByText(/chưa có đáp án đúng/i)).not.toBeInTheDocument())
  })

  it('xóa mục đứng TRƯỚC mục khác loại: lựa chọn đi theo đúng mục (Con cá), không trượt sang mục khác', async () => {
    const user = userEvent.setup()

    await openLoaded()
    await toSecondQuestion(user)
    await user.click(removeButton('A'))

    expect(itemRows()).toHaveLength(3)
    expect(itemBox(1)).toHaveValue('Con cá')
    expect(oddRadio(1)).toBeChecked()
  })

  it('kết quả kiểm tra từ ngữ về MUỘN sau khi xóa mục đứng trước: chữ vẫn vào đúng mục đã sửa (theo khóa, không theo vị trí cũ) và mục khác loại không trượt', async () => {
    const user = userEvent.setup()

    await openLoaded()
    await toSecondQuestion(user)
    vi.stubEnv('VITE_MOCK_LATENCY_MS', '600')

    // Sửa mục C (Con cá, đang là mục khác loại) rồi xóa mục A trước khi kết quả kiểm tra về.
    type(itemBox(2), 'Cá heo')
    await user.click(removeButton('A'))

    // Ô vẫn hiện chữ vừa gõ trong lúc chờ: đợi kết quả kiểm tra thật sự vào game (danh sách câu đổi) rồi mới kiểm.
    await waitFor(() => expect(listItems()[1]).toHaveTextContent('Cá heo'), { timeout: 8000 })
    expect(itemBox(1)).toHaveValue('Cá heo')
    expect(itemBox(0)).toHaveValue('Con chó')
    expect(itemBox(2)).toHaveValue('Con bò')
    expect(oddRadio(1)).toBeChecked()
  })

  it('đổi mục khác loại rồi xóa mục đứng trước khi bấm: lựa chọn theo đúng mục được bấm', async () => {
    const user = userEvent.setup()

    await openLoaded()
    await toSecondQuestion(user)
    await user.click(oddRadio(3))
    await user.click(removeButton('A'))

    expect(itemRows()).toHaveLength(3)
    expect(itemBox(2)).toHaveValue('Con bò')
    expect(oddRadio(2)).toBeChecked()
  })

  it('chữ đang gõ dở đi theo ĐÚNG mục khi xóa mục đứng trước (khóa theo mục, không theo vị trí)', async () => {
    const user = userEvent.setup()

    await openLoaded()
    await toSecondQuestion(user)
    fireEvent.change(itemBox(1), { target: { value: 'Con chó con' } })
    await user.click(removeButton('A'))

    await waitFor(() => expect(itemRows()).toHaveLength(3))
    await waitFor(() => expect(itemBox(0)).toHaveValue('Con chó con'))
    expect(itemBox(1)).toHaveValue('Con cá')
  })

  it('không cho trùng: hai mục cùng chữ bị báo ngay và bấm Lưu bị chặn, kho không đổi', async () => {
    const user = userEvent.setup()

    await openLoaded()
    type(itemBox(1), '  hình tròn NHỎ ')

    expect(await screen.findByText(/bị trùng nhau/)).toBeInTheDocument()

    await user.click(saveButton())

    expect(await screen.findByRole('alert')).toHaveTextContent('Chưa lưu được')
    expect(getMockGame(ODD_ID).questions[0]).toMatchObject({ items: [{ text: 'Hình tròn nhỏ' }, { text: 'Hình tròn to' }, { text: 'Hình vuông' }] })
  })

  it('chữ quá 100 ký tự bị báo ngay dưới đúng ô', async () => {
    await openLoaded()
    type(itemBox(0), 'a'.repeat(101))

    expect(await screen.findByText(/tối đa 100 ký tự/)).toBeInTheDocument()
  })

  it('từ ngữ chưa phù hợp (UC-05 2a): giữ nguyên nội dung cũ trong danh sách, hiện đúng câu của SRS', async () => {
    await openLoaded()
    type(itemBox(0), 'cảnh máu me')

    expect((await screen.findAllByText(new RegExp(UNSAFE.slice(0, 40)), {}, { timeout: 5000 })).length).toBeGreaterThan(0)
    expect(listItems()[0]).toHaveTextContent('Hình tròn nhỏ')
    expect(itemBox(0)).toHaveValue('cảnh máu me')
  })

  it('thời gian: 135 giây do Backend sinh ra giữ nguyên khi chỉ sửa chữ rồi Lưu thành công', async () => {
    const user = userEvent.setup()
    const game = getMockGame(ODD_ID)

    game.questions[0].timeLimitSeconds = 135
    saveMockGame(ODD_ID, game)

    await openLoaded()
    type(itemBox(0), 'Hình tròn bé')
    await waitFor(() => expect(listItems()[0]).toHaveTextContent('Hình tròn bé'))
    await waitFor(() => expect(screen.queryByText('Đang áp dụng chỉnh sửa...')).not.toBeInTheDocument())

    await user.click(saveButton())
    await screen.findByText('Bạn đã lưu bản nháp thành công.')

    expect(getMockGame(ODD_ID).questions[0]).toMatchObject({ timeLimitSeconds: 135 })
  })

  it('lưu: nội dung đã sửa (mục mới mã d, mục khác loại đổi, bỏ khoảng trắng thừa) được ghi vào kho', async () => {
    const user = userEvent.setup()

    await openLoaded()
    await user.click(addButton())
    type(itemBox(3), '  Hình tam giác  ')
    await user.click(oddRadio(3))
    await waitFor(() => expect(listItems()[0]).toHaveTextContent('Hình tam giác'))
    await waitFor(() => expect(screen.queryByText('Đang áp dụng chỉnh sửa...')).not.toBeInTheDocument())

    await user.click(saveButton())
    await screen.findByText('Bạn đã lưu bản nháp thành công.')

    expect(getMockGame(ODD_ID).questions[0]).toMatchObject({
      items: [
        { id: 'a', text: 'Hình tròn nhỏ' },
        { id: 'b', text: 'Hình tròn to' },
        { id: 'c', text: 'Hình vuông' },
        { id: 'd', text: 'Hình tam giác' },
      ],
      oddOneOutId: 'd',
    })
  })

  it('chơi thử vẫn "chưa hỗ trợ" (chưa có renderer Canvas cho loại này)', async () => {
    const user = userEvent.setup()

    await openLoaded()
    await user.click(screen.getByRole('button', { name: 'Chơi thử' }))

    expect(await screen.findByText(/chưa hỗ trợ chơi thử/, {}, { timeout: 10_000 })).toBeInTheDocument()
  })
})

describe('ODD_ONE_OUT: dùng được bằng bàn phím', () => {
  it('Tab tới nút Thêm mục, Enter thì thêm mục và tiêu điểm chuyển tới ô chữ của mục mới, gõ được ngay', async () => {
    const user = userEvent.setup()

    await openLoaded()
    addButton().focus()
    await user.keyboard('{Enter}')

    expect(itemRows()).toHaveLength(4)
    await waitFor(() => expect(itemBox(3)).toHaveFocus())

    await user.keyboard('Hình thoi')
    await waitFor(() => expect(itemBox(3)).toHaveValue('Hình thoi'))
  })

  it('chọn mục khác loại bằng phím mũi tên (nhóm nút chọn một); xóa mục bằng phím Space thì tiêu điểm không rơi về đầu trang', async () => {
    const user = userEvent.setup()

    await openLoaded()
    oddRadio(2).focus()
    await user.keyboard('{ArrowUp}')

    expect(oddRadio(1)).toBeChecked()

    await user.click(addButton())
    await waitFor(() => expect(itemBox(3)).toHaveFocus())
    removeButton('D').focus()
    await user.keyboard(' ')

    expect(itemRows()).toHaveLength(3)
    await waitFor(() => expect(document.body).not.toHaveFocus())
    expect(document.activeElement?.id).toMatch(/^odd-item-\d$/)
  })

  it('thứ tự Tab đi theo thứ tự trên màn hình: nút chọn, nút Xóa, ô chữ của mục, rồi sang mục kế', async () => {
    const user = userEvent.setup()

    await openLoaded()
    await user.click(addButton())
    await waitFor(() => expect(itemBox(3)).toHaveFocus())
    oddRadio(0).focus()

    const order: string[] = []

    // Nhóm nút chọn một chỉ có MỘT điểm dừng Tab (nút đang chọn), nên từ nút chọn mục A đi tới Xóa mục A, ô chữ mục A, rồi Xóa mục B.
    for (let step = 0; step < 3; step += 1) {
      await user.tab()
      order.push((document.activeElement as HTMLElement).id || (document.activeElement as HTMLElement).getAttribute('aria-label') || '')
    }

    expect(order).toEqual(['Xóa mục A', 'odd-item-0', 'Xóa mục B'])
  })

  it('mỗi mục có nút Xóa và ô chữ mang tên riêng theo chữ cái (trình đọc màn hình phân biệt được)', async () => {
    await openLoaded()

    for (const letter of ['A', 'B', 'C']) {
      expect(screen.getByRole('textbox', { name: new RegExp(`^Mục ${letter}`) })).toBeInTheDocument()
      expect(removeButton(letter)).toBeInTheDocument()
    }
  })
})
