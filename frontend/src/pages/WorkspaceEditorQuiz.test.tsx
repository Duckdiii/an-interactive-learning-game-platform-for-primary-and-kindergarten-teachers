import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getMockGame, resetMockGames } from '../services/mock/mockGames'
import { setMockScenario } from '../services/mock/mockRuntime'
import { loginAsTeacher, renderWithProviders } from '../test/renderWithApp'
import WorkspaceEditor from './WorkspaceEditor'

// Canvas không có trong jsdom: mock react-konva thành DOM thường (xem PlayTestPanel.test.tsx) để chơi thử được trong test.
vi.mock('react-konva', () => ({
  Stage: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Layer: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Group: ({ children, onClick }: { children?: React.ReactNode; onClick?: () => void }) => (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div onClick={onClick}>{children}</div>
  ),
  Rect: () => null,
  Text: ({ text }: { text?: string }) => <span>{text}</span>,
  Image: () => null,
  Line: () => null,
}))
vi.mock('use-image', () => ({ default: () => [undefined, 'loading'] }))
vi.mock('howler', () => ({ Howl: class { play = vi.fn(); stop = vi.fn(); unload = vi.fn() } }))
vi.mock('../games/common/measureText', () => ({ measureWrappedTextHeight: () => null }))
vi.mock('../games/common/useFeedback', () => ({ useFeedback: () => ({ showFeedback: vi.fn() }) }))
vi.mock('../games/common/sound', () => ({ playSound: vi.fn() }))

// mock-game-1: QUIZ "Đếm số đến 10"; câu 1 có 3 đáp án 2 / 3 / 4, đúng là 3 (B). mock-game-5 là ORDERING (chưa có form).
const QUIZ_ID = 'mock-game-1'
const ORDERING_ID = 'mock-game-5'
const UNSAFE = 'Nội dung chỉnh sửa của giáo viên chưa đạt chuẩn an toàn học đường dành cho trẻ nhỏ. Vui lòng điều chỉnh lại từ ngữ.'

const questionBox = () => screen.getByRole('textbox', { name: /Nội dung câu hỏi/ })
const optionBox = (letter: string) => screen.getByRole('textbox', { name: new RegExp(`Đáp án ${letter}`) })
const radio = (letter: string) => screen.getByRole('radio', { name: new RegExp(`Đáp án ${letter}`) })
const timeBox = () => screen.getByRole('textbox', { name: /Thời gian trả lời/ })
const pointsBox = () => screen.getByRole('textbox', { name: /^Điểm/ })
const addButton = () => screen.getByRole('button', { name: 'Thêm đáp án' })
const removeButtons = () => screen.getAllByRole('button', { name: /^Xóa đáp án/ })
const listItems = () => within(screen.getByRole('list', { name: 'Danh sách câu hỏi' })).getAllByRole('button')

async function openLoaded(gameId: string) {
  renderWithProviders(<WorkspaceEditor />, `/workspace/editor?gameId=${gameId}`)
  await screen.findByRole('textbox', { name: /Tên trò chơi/ })
}

beforeEach(() => {
  vi.stubEnv('VITE_USE_MOCK', 'editor')
  loginAsTeacher()
  resetMockGames()
})
afterEach(() => {
  vi.stubEnv('VITE_USE_MOCK', 'none')
  setMockScenario('normal')
  localStorage.clear()
  vi.clearAllMocks()
})

describe('form sửa câu QUIZ (UC-05)', () => {
  it('hiện đúng nội dung câu đang chọn: câu hỏi, 3 đáp án, đáp án đúng, thời gian, điểm', async () => {
    await openLoaded(QUIZ_ID)

    expect(screen.getByRole('heading', { name: 'Sửa câu 1' })).toBeInTheDocument()
    expect(questionBox()).toHaveValue('Có mấy quả táo trong hình?')
    expect(optionBox('A')).toHaveValue('2')
    expect(optionBox('B')).toHaveValue('3')
    expect(optionBox('C')).toHaveValue('4')
    expect(radio('B')).toBeChecked()
    expect(radio('A')).not.toBeChecked()
    expect(timeBox()).toHaveValue('30')
    expect(pointsBox()).toHaveValue('10')
  })

  it('chọn câu khác thì form đổi sang câu đó', async () => {
    const user = userEvent.setup()

    await openLoaded(QUIZ_ID)
    await user.click(listItems()[1])

    expect(screen.getByRole('heading', { name: 'Sửa câu 2' })).toBeInTheDocument()
    expect(questionBox()).toHaveValue('Có mấy bông hoa?')
    expect(optionBox('D')).toHaveValue('7')
  })

  it('sửa chữ câu hỏi: vùng xem và danh sách cập nhật ngay, hiện "Chưa lưu"', async () => {
    const user = userEvent.setup()

    await openLoaded(QUIZ_ID)
    await user.clear(questionBox())
    await user.type(questionBox(), 'Trong hình có bao nhiêu quả táo?')

    await waitFor(() => expect(listItems()[0]).toHaveTextContent('Trong hình có bao nhiêu quả táo?'))
    expect(screen.getAllByText('Trong hình có bao nhiêu quả táo?').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('Chưa lưu')).toBeInTheDocument()
  })

  it('không thể có 5 đáp án: đủ 4 thì nút Thêm bị khóa kèm lời giải thích', async () => {
    const user = userEvent.setup()

    await openLoaded(QUIZ_ID)
    expect(addButton()).toBeEnabled()
    await user.click(addButton())

    expect(removeButtons()).toHaveLength(4)
    expect(addButton()).toBeDisabled()
    expect(screen.getByText('Đã đủ 4 đáp án, không thêm được nữa.')).toBeInTheDocument()
  })

  it('không thể có 1 đáp án: còn 2 thì mọi nút Xóa bị khóa kèm lời giải thích', async () => {
    const user = userEvent.setup()

    await openLoaded(QUIZ_ID)
    await user.click(removeButtons()[2])

    expect(removeButtons()).toHaveLength(2)
    for (const button of removeButtons()) expect(button).toBeDisabled()
    expect(screen.getByText('Cần giữ ít nhất 2 đáp án.')).toBeInTheDocument()
  })

  it('đáp án mới thêm còn trống thì báo lỗi ngay dưới ô và danh sách đánh dấu "Cần sửa"', async () => {
    const user = userEvent.setup()

    await openLoaded(QUIZ_ID)
    await user.click(addButton())

    expect(screen.getByText(/Cần nhập Nội dung đáp án/)).toBeInTheDocument()
    expect(listItems()[0]).toHaveTextContent('Cần sửa')
  })

  it('xóa đúng đáp án đang là đáp án đúng thì báo "chưa có đáp án đúng" cho tới khi chọn lại', async () => {
    const user = userEvent.setup()

    await openLoaded(QUIZ_ID)
    await user.click(screen.getByRole('button', { name: 'Xóa đáp án B' }))

    expect(screen.getByText(/Chưa có đáp án đúng/)).toBeInTheDocument()

    await user.click(radio('A'))

    expect(screen.queryByText(/Chưa có đáp án đúng/)).not.toBeInTheDocument()
  })

  it('nội dung câu quá 200 ký tự: lỗi hiện ngay dưới ô, bộ đếm đổi kiểu, và bấm Lưu bị chặn', async () => {
    const user = userEvent.setup()

    await openLoaded(QUIZ_ID)
    fireEvent.change(questionBox(), { target: { value: 'a'.repeat(201) } })
    fireEvent.blur(questionBox())

    expect(await screen.findByText(/Nội dung câu hỏi tối đa 200 ký tự/)).toBeInTheDocument()
    expect(screen.getByText('201/200 ký tự')).toHaveClass('font-bold')

    await user.click(screen.getByRole('button', { name: 'Lưu bản nháp' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Chưa lưu được')
    expect(getMockGame(QUIZ_ID).questions[0]).toMatchObject({ questionText: 'Có mấy quả táo trong hình?' })
  })

  it('đúng 200 ký tự thì hợp lệ', async () => {
    await openLoaded(QUIZ_ID)
    fireEvent.change(questionBox(), { target: { value: 'a'.repeat(200) } })
    fireEvent.blur(questionBox())

    await waitFor(() => expect(listItems()[0]).toHaveTextContent('a'.repeat(200)))
    expect(screen.queryByText(/tối đa 200 ký tự/)).not.toBeInTheDocument()
  })

  it('thời gian: 10 đến 120 giây, ngoài khoảng thì báo ngay; chữ không phải số thì nhắc và không đổi game', async () => {
    const user = userEvent.setup()

    await openLoaded(QUIZ_ID)

    for (const bad of ['9', '121']) {
      await user.clear(timeBox())
      await user.type(timeBox(), bad)
      expect(screen.getAllByText(/Thời gian trả lời \(giây\) phải từ 10 đến 120/).length).toBeGreaterThan(0)
    }

    await user.clear(timeBox())
    await user.type(timeBox(), '45')
    expect(screen.queryByText(/phải từ 10 đến 120/)).not.toBeInTheDocument()

    await user.clear(timeBox())
    await user.type(timeBox(), 'abc')
    expect(screen.getByText('Nhập một số nguyên, ví dụ 30.')).toBeInTheDocument()
    // Chữ không phải số không được ghi vào game: danh sách vẫn thấy giá trị cũ (45 giây).
    expect(listItems()[0]).toHaveTextContent('45 giây')
  })

  it('điểm: 1 đến 100', async () => {
    const user = userEvent.setup()

    await openLoaded(QUIZ_ID)
    await user.clear(pointsBox())
    await user.type(pointsBox(), '101')

    expect(screen.getAllByText(/Điểm phải từ 1 đến 100/).length).toBeGreaterThan(0)
  })

  it('từ ngữ chưa phù hợp (UC-05 2a): hiện đúng câu của SRS và GIỮ NGUYÊN nội dung cũ trong game', async () => {
    await openLoaded(QUIZ_ID)
    fireEvent.change(questionBox(), { target: { value: 'Cảnh máu me trong hình?' } })
    fireEvent.blur(questionBox())

    expect((await screen.findAllByText(new RegExp(UNSAFE.slice(0, 40)))).length).toBeGreaterThan(0)
    // Danh sách và vùng xem vẫn là nội dung cũ; chữ vừa gõ còn nằm trong ô để sửa.
    expect(listItems()[0]).toHaveTextContent('Có mấy quả táo trong hình?')
    expect(questionBox()).toHaveValue('Cảnh máu me trong hình?')
    expect(screen.getByText('Đã lưu')).toBeInTheDocument()
  })

  it('có nhãn "Dữ liệu mô phỏng" ở chỗ kiểm tra từ ngữ (bộ lọc là giả lập)', async () => {
    await openLoaded(QUIZ_ID)

    const note = screen.getByText('Từ ngữ được kiểm tra cho phù hợp với trẻ nhỏ.')

    expect(within(note.parentElement as HTMLElement).getByText('Dữ liệu mô phỏng')).toBeInTheDocument()
  })

  it('lưu: nội dung đã sửa (chữ, đáp án đúng, thời gian) được ghi vào kho', async () => {
    const user = userEvent.setup()

    await openLoaded(QUIZ_ID)
    fireEvent.change(questionBox(), { target: { value: 'Đếm số táo nhé?' } })
    fireEvent.blur(questionBox())
    await user.click(radio('C'))
    await user.clear(timeBox())
    await user.type(timeBox(), '40')
    await waitFor(() => expect(listItems()[0]).toHaveTextContent('Đếm số táo nhé?'))

    await user.click(screen.getByRole('button', { name: 'Lưu bản nháp' }))
    await screen.findByText('Đã lưu thay đổi của trò chơi.')

    expect(getMockGame(QUIZ_ID).questions[0]).toMatchObject({ questionText: 'Đếm số táo nhé?', correctOptionId: 'c', timeLimitSeconds: 40 })
  })

  it('đổi đáp án đúng thì chơi thử thấy ngay: chọn đáp án mới được tính đúng, đáp án cũ tính sai', async () => {
    const user = userEvent.setup()

    await openLoaded(QUIZ_ID)
    await user.click(radio('A'))
    await user.click(screen.getByRole('button', { name: 'Chơi thử' }))

    expect(await screen.findByText('Câu 1 trên 3', {}, { timeout: 10_000 })).toBeInTheDocument()
    fireEvent.click(screen.getByText('2'))

    expect(screen.getByRole('status')).toHaveTextContent('Đúng rồi!')

    await user.click(screen.getByRole('button', { name: 'Thử lại câu này' }))
    fireEvent.click(screen.getByText('3'))

    expect(screen.getByRole('status')).toHaveTextContent('Chưa đúng.')
  })
})

describe('loại game chưa có form sửa', () => {
  it('hiện thông báo rõ, không vỡ trang và vẫn xem được nội dung', async () => {
    await openLoaded(ORDERING_ID)

    expect(screen.getByText('Loại game này chưa có form sửa chi tiết')).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: /Nội dung câu hỏi/ })).not.toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Danh sách câu hỏi' })).toBeInTheDocument()
  })
})

describe('chỉnh sửa chồng nhau khi kiểm tra từ ngữ còn đang chạy (nhận xét review A3)', () => {
  beforeEach(() => vi.stubEnv('VITE_MOCK_LATENCY_MS', '150'))
  afterEach(() => vi.stubEnv('VITE_MOCK_LATENCY_MS', '0'))

  const waitUntilApplied = () =>
    waitFor(() => expect(screen.queryByText('Đang áp dụng chỉnh sửa...')).not.toBeInTheDocument(), { timeout: 4000 })

  it('gõ chữ đáp án rồi bấm chọn đáp án đúng ngay trong lúc kiểm tra: CẢ HAI thay đổi đều được giữ', async () => {
    const user = userEvent.setup()

    await openLoaded(QUIZ_ID)
    fireEvent.change(optionBox('A'), { target: { value: 'Hai quả' } })
    fireEvent.blur(optionBox('A'))
    await user.click(radio('C'))
    await waitUntilApplied()

    expect(radio('C')).toBeChecked()
    expect(optionBox('A')).toHaveValue('Hai quả')

    await user.click(screen.getByRole('button', { name: 'Lưu bản nháp' }))
    await screen.findByText('Đã lưu thay đổi của trò chơi.')

    expect(getMockGame(QUIZ_ID).questions[0]).toMatchObject({
      correctOptionId: 'c',
      options: [{ id: 'a', text: 'Hai quả' }, { id: 'b', text: '3' }, { id: 'c', text: '4' }],
    })
  })

  it('gõ chữ rồi sửa thời gian ngay trong lúc kiểm tra: không bên nào ghi đè bên nào', async () => {
    const user = userEvent.setup()

    await openLoaded(QUIZ_ID)
    fireEvent.change(questionBox(), { target: { value: 'Đếm táo nhé?' } })
    fireEvent.blur(questionBox())
    await user.clear(timeBox())
    await user.type(timeBox(), '40')
    await waitUntilApplied()

    expect(listItems()[0]).toHaveTextContent('Đếm táo nhé?')
    expect(listItems()[0]).toHaveTextContent('40 giây')
  })

  it('đang chờ áp chữ vừa gõ thì hiện "Đang áp dụng chỉnh sửa..." và khóa Lưu/Chơi thử (không Lưu bản cũ rồi báo "Đã lưu")', async () => {
    await openLoaded(QUIZ_ID)
    fireEvent.change(questionBox(), { target: { value: 'Đếm táo nhé?' } })

    expect(screen.getByText('Đang áp dụng chỉnh sửa...')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Lưu bản nháp' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Chơi thử' })).toBeDisabled()

    await waitUntilApplied()

    expect(screen.getByRole('button', { name: 'Lưu bản nháp' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Chơi thử' })).toBeEnabled()
  })

  it('chữ bị từ chối ở đáp án B rồi xóa B: đáp án C (dồn lên làm B) giữ NGUYÊN chữ của mình, không dính chữ bị từ chối', async () => {
    const user = userEvent.setup()

    await openLoaded(QUIZ_ID)
    fireEvent.change(optionBox('B'), { target: { value: 'cảnh máu me' } })
    fireEvent.blur(optionBox('B'))
    await screen.findAllByText(new RegExp(UNSAFE.slice(0, 40)))

    await user.click(screen.getByRole('button', { name: 'Xóa đáp án B' }))

    expect(optionBox('A')).toHaveValue('2')
    expect(optionBox('B')).toHaveValue('4')
    expect(screen.queryAllByText(new RegExp(UNSAFE.slice(0, 40)))).toHaveLength(0)
  })

  it('xóa đáp án ngay sau khi gõ chữ cho đáp án khác: chữ đó đi theo đúng đáp án của nó', async () => {
    const user = userEvent.setup()

    await openLoaded(QUIZ_ID)
    fireEvent.change(optionBox('C'), { target: { value: 'Bốn quả' } })
    fireEvent.blur(optionBox('C'))
    await user.click(screen.getByRole('button', { name: 'Xóa đáp án A' }))
    await waitUntilApplied()

    // Còn {3, Bốn quả}: chữ vừa gõ ở C nay là đáp án B.
    expect(optionBox('A')).toHaveValue('3')
    expect(optionBox('B')).toHaveValue('Bốn quả')
  })
})
