import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildMockGameContents } from '../services/mock/gameFixtures'
import { getMockGame, resetMockGames } from '../services/mock/mockGames'
import { summarizeQuestion } from '../utils/questionSummary'
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

// mock-game-2: MATCHING. Câu 1 có 3 cặp: a-ao, ă-ăn, â-ấm. Câu 3 có 4 cặp: a-anh, ă-ăn, â-âm, b-ba.
const MATCHING_ID = 'mock-game-2'
const UNSAFE = 'Nội dung chỉnh sửa của giáo viên chưa đạt chuẩn an toàn học đường dành cho trẻ nhỏ. Vui lòng điều chỉnh lại từ ngữ.'

const pairsGroup = () => screen.getByRole('group', { name: 'Các cặp ghép' })
const pairItems = () => within(pairsGroup()).getAllByRole('listitem')
// Mỗi cặp là một nhóm có tên "Cặp N" để trình đọc màn hình phân biệt các ô cùng tên của các cặp khác nhau.
const pairGroup = (index: number) => within(pairsGroup()).getByRole('group', { name: `Cặp ${index + 1}` })
const pairItem = (index: number) => pairItems()[index]
const sideBox = (pair: number, side: 'trái' | 'phải', kind: 'Chữ' | 'Mô tả hình ảnh') =>
  within(within(pairItem(pair)).getByRole('group', { name: `Bên ${side}` })).getByRole('textbox', { name: new RegExp(`^${kind}`) })
const addButton = () => screen.getByRole('button', { name: 'Thêm cặp' })
const removeButton = (pair: number) => screen.getByRole('button', { name: `Xóa cặp ${pair}` })
const listItems = () => within(screen.getByRole('list', { name: 'Danh sách câu hỏi' })).getAllByRole('button')
const saveButton = () => screen.getByRole('button', { name: 'Lưu bản nháp' })

async function openLoaded(gameId: string) {
  renderWithProviders(<WorkspaceEditor />, `/workspace/editor?gameId=${gameId}`)
  await screen.findByRole('textbox', { name: /Tên trò chơi/ })
}

// Nạp sẵn màn chơi thử (kéo theo renderer Canvas) một lần: lần nạp đầu tiên rất chậm khi nhiều file test chạy song song và sẽ làm test đầu tiên quá hạn.
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

describe('form sửa câu MATCHING', () => {
  it('hiện đúng 3 cặp của câu 1, mỗi bên có ô chữ và ô mô tả hình, kèm trường chung (lời đọc, thời gian, điểm)', async () => {
    await openLoaded(MATCHING_ID)

    expect(screen.getByRole('heading', { name: 'Sửa câu 1' })).toBeInTheDocument()
    expect(pairItems()).toHaveLength(3)
    expect(sideBox(0, 'trái', 'Chữ')).toHaveValue('a')
    expect(sideBox(0, 'phải', 'Chữ')).toHaveValue('ao')
    expect(sideBox(2, 'phải', 'Chữ')).toHaveValue('ấm')
    expect(sideBox(0, 'trái', 'Mô tả hình ảnh')).toHaveValue('')
    expect(screen.getByRole('textbox', { name: /^Lời đọc/ })).toHaveValue('Nối chữ cái với hình')
    expect(screen.getByRole('textbox', { name: /Thời gian trả lời/ })).toHaveValue('30')
    expect(screen.getByRole('textbox', { name: /^Điểm/ })).toHaveValue('10')
  })

  it('sửa chữ một bên: danh sách câu cập nhật, hiện "Chưa lưu", chơi thử thấy chữ mới', async () => {
    const user = userEvent.setup()

    await openLoaded(MATCHING_ID)
    fireEvent.change(sideBox(0, 'trái', 'Chữ'), { target: { value: 'Ao' } })
    fireEvent.blur(sideBox(0, 'trái', 'Chữ'))

    await waitFor(() => expect(listItems()[0]).toHaveTextContent('3 cặp: Ao, ă, â'))
    expect(screen.getByText('Chưa lưu')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Chơi thử' }))
    expect(await screen.findByText('Câu 1 trên 3', {}, { timeout: 10_000 })).toBeInTheDocument()
    expect(screen.getByText('Ao')).toBeInTheDocument()
  })

  it('thêm cặp đến 6 thì khóa kèm lời giải thích; xóa về 3 thì khóa nút Xóa', async () => {
    const user = userEvent.setup()

    await openLoaded(MATCHING_ID)
    expect(removeButton(1)).toBeDisabled()
    expect(screen.getByText('Cần giữ ít nhất 3 cặp.')).toBeInTheDocument()

    for (let count = 3; count < 6; count += 1) await user.click(addButton())

    expect(pairItems()).toHaveLength(6)
    expect(addButton()).toBeDisabled()
    expect(screen.getByText('Đã đủ 6 cặp, không thêm được nữa.')).toBeInTheDocument()

    for (let count = 6; count > 3; count -= 1) await user.click(removeButton(count))

    expect(pairItems()).toHaveLength(3)
    expect(removeButton(1)).toBeDisabled()
  })

  it('cặp mới còn trống: báo "cần chữ hoặc mô tả hình" ở cả hai bên và danh sách đánh dấu "Cần sửa"', async () => {
    const user = userEvent.setup()

    await openLoaded(MATCHING_ID)
    await user.click(addButton())

    const item = pairItem(3)

    expect(within(item).getAllByText(/cần có chữ hoặc mô tả hình/i)).toHaveLength(2)
    expect(listItems()[0]).toHaveTextContent('Cần sửa')
  })

  it('mỗi bên là chữ HOẶC mô tả hình: chỉ cần một trong hai thì hết lỗi', async () => {
    const user = userEvent.setup()

    await openLoaded(MATCHING_ID)
    await user.click(addButton())
    fireEvent.change(sideBox(3, 'trái', 'Mô tả hình ảnh'), { target: { value: 'con mèo ngồi trên ghế' } })
    fireEvent.blur(sideBox(3, 'trái', 'Mô tả hình ảnh'))
    fireEvent.change(sideBox(3, 'phải', 'Chữ'), { target: { value: 'mèo' } })
    fireEvent.blur(sideBox(3, 'phải', 'Chữ'))

    await waitFor(() => expect(within(pairItem(3)).queryAllByText(/cần có chữ hoặc mô tả hình/i)).toHaveLength(0))
    expect(listItems()[0]).not.toHaveTextContent('Cần sửa')
  })

  it('không cho trùng: hai cặp cùng chữ bên trái bị báo ngay và bấm Lưu bị chặn', async () => {
    const user = userEvent.setup()

    await openLoaded(MATCHING_ID)
    fireEvent.change(sideBox(1, 'trái', 'Chữ'), { target: { value: 'a' } })
    fireEvent.blur(sideBox(1, 'trái', 'Chữ'))

    expect(await screen.findByText(/Các mục bên trái bị trùng nhau/)).toBeInTheDocument()

    await user.click(saveButton())

    expect(await screen.findByRole('alert')).toHaveTextContent('Chưa lưu được')
    expect(getMockGame(MATCHING_ID).questions[0]).toMatchObject({ pairs: [{ left: { text: 'a' } }, { left: { text: 'ă' } }, { left: { text: 'â' } }] })
  })

  it('chữ quá 100 ký tự bị báo ngay dưới đúng ô', async () => {
    await openLoaded(MATCHING_ID)
    fireEvent.change(sideBox(0, 'phải', 'Chữ'), { target: { value: 'a'.repeat(101) } })
    fireEvent.blur(sideBox(0, 'phải', 'Chữ'))

    expect(await screen.findByText(/tối đa 100 ký tự/)).toBeInTheDocument()
  })

  it('từ ngữ chưa phù hợp (UC-05 2a): giữ nguyên nội dung cũ, hiện đúng câu của SRS', async () => {
    await openLoaded(MATCHING_ID)
    fireEvent.change(sideBox(0, 'phải', 'Chữ'), { target: { value: 'cảnh máu me' } })
    fireEvent.blur(sideBox(0, 'phải', 'Chữ'))

    expect((await screen.findAllByText(new RegExp(UNSAFE.slice(0, 40)), {}, { timeout: 5000 })).length).toBeGreaterThan(0)
    expect(listItems()[0]).toHaveTextContent('3 cặp: a, ă, â')
    expect(sideBox(0, 'phải', 'Chữ')).toHaveValue('cảnh máu me')
  })

  it('lưu: nội dung đã sửa (chữ, cặp mới có mã p4, bỏ khoảng trắng thừa) được ghi vào kho', async () => {
    const user = userEvent.setup()

    await openLoaded(MATCHING_ID)
    await user.click(addButton())
    fireEvent.change(sideBox(3, 'trái', 'Chữ'), { target: { value: '  b  ' } })
    fireEvent.blur(sideBox(3, 'trái', 'Chữ'))
    fireEvent.change(sideBox(3, 'phải', 'Chữ'), { target: { value: 'ba' } })
    fireEvent.blur(sideBox(3, 'phải', 'Chữ'))
    await waitFor(() => expect(listItems()[0]).toHaveTextContent('4 cặp'))
    await waitFor(() => expect(screen.queryByText('Đang áp dụng chỉnh sửa...')).not.toBeInTheDocument())

    await user.click(saveButton())
    await screen.findByText('Bạn đã lưu bản nháp thành công.')

    expect(getMockGame(MATCHING_ID).questions[0]).toMatchObject({
      pairs: [
        { pairId: 'p1', left: { text: 'a' }, right: { text: 'ao' } },
        { pairId: 'p2', left: { text: 'ă' }, right: { text: 'ăn' } },
        { pairId: 'p3', left: { text: 'â' }, right: { text: 'ấm' } },
        { pairId: 'p4', left: { text: 'b' }, right: { text: 'ba' } },
      ],
    })
  })
})

describe('MATCHING: dùng được bằng bàn phím', () => {
  it('Tab tới nút Thêm cặp, bấm Enter thì thêm cặp và tiêu điểm chuyển tới ô chữ của cặp mới, gõ được ngay', async () => {
    const user = userEvent.setup()

    await openLoaded(MATCHING_ID)
    addButton().focus()
    await user.keyboard('{Enter}')

    expect(pairItems()).toHaveLength(4)
    await waitFor(() => expect(sideBox(3, 'trái', 'Chữ')).toHaveFocus())

    await user.keyboard('con mèo')
    await waitFor(() => expect(sideBox(3, 'trái', 'Chữ')).toHaveValue('con mèo'))
  })

  it('xóa cặp bằng phím Space khi nút đang có tiêu điểm; tiêu điểm không rơi về đầu trang', async () => {
    const user = userEvent.setup()

    await openLoaded(MATCHING_ID)
    await user.click(addButton())
    removeButton(4).focus()
    await user.keyboard(' ')

    expect(pairItems()).toHaveLength(3)
    await waitFor(() => expect(document.body).not.toHaveFocus())
    expect(document.activeElement?.id).toMatch(/^matching-p\d+-left-text$/)
  })

  it('thứ tự Tab thật đi theo thứ tự trên màn hình: nút Xóa cặp, rồi chữ và mô tả hình bên trái, chữ và mô tả hình bên phải, rồi sang cặp kế', async () => {
    const user = userEvent.setup()

    await openLoaded(MATCHING_ID)
    // Có 3 cặp thì nút Xóa bị khóa (không nhận tiêu điểm): thêm một cặp để mọi nút Xóa dùng được.
    await user.click(addButton())
    removeButton(1).focus()

    const order: string[] = []

    for (let step = 0; step < 6; step += 1) {
      await user.tab()
      order.push((document.activeElement as HTMLElement).id || (document.activeElement as HTMLElement).getAttribute('aria-label') || '')
    }

    expect(order).toEqual([
      'matching-p1-left-text',
      'matching-p1-left-image',
      'matching-p1-right-text',
      'matching-p1-right-image',
      'Xóa cặp 2',
      'matching-p2-left-text',
    ])
  })

  it('mỗi cặp là một nhóm có tên riêng và các ô trong cặp có nhãn riêng của bên đó', async () => {
    await openLoaded(MATCHING_ID)

    expect(pairGroup(0)).toBeInTheDocument()
    expect(pairGroup(2)).toBeInTheDocument()
    expect(within(pairGroup(1)).getByRole('group', { name: 'Bên phải' })).toBeInTheDocument()
    // Ô bên của cặp trống được đánh dấu không hợp lệ cùng lời nhắn dùng chung.
    await userEvent.setup().click(addButton())
    expect(within(pairGroup(3)).getAllByRole('textbox', { name: /^Chữ/ }).every((box) => box.getAttribute('aria-invalid') === 'true')).toBe(true)
  })

  it('mã cặp mới KHÔNG dùng lại mã của cặp đã xóa trong phiên (p4 rồi p5, không quay lại p2)', async () => {
    const user = userEvent.setup()

    await openLoaded(MATCHING_ID)
    await user.click(addButton())
    expect(document.getElementById('matching-p4-left-text')).not.toBeNull()
    await user.click(removeButton(2))
    await user.click(addButton())

    expect(document.getElementById('matching-p2-left-text')).toBeNull()
    expect(document.getElementById('matching-p5-left-text')).not.toBeNull()
  })
})

describe('MATCHING: chỉnh sửa chồng nhau khi kiểm tra từ ngữ còn đang chạy', () => {
  beforeEach(() => vi.stubEnv('VITE_MOCK_LATENCY_MS', '150'))

  const waitUntilApplied = () => waitFor(() => expect(screen.queryByText('Đang áp dụng chỉnh sửa...')).not.toBeInTheDocument(), { timeout: 4000 })

  it('gõ chữ cặp 1 rồi xóa cặp 4 ngay: cả hai thay đổi đều được giữ', async () => {
    const user = userEvent.setup()

    await openLoaded(MATCHING_ID)
    await user.click(listItems()[2])
    fireEvent.change(sideBox(0, 'trái', 'Chữ'), { target: { value: 'Anh' } })
    fireEvent.blur(sideBox(0, 'trái', 'Chữ'))
    await user.click(removeButton(4))
    await waitUntilApplied()

    expect(pairItems()).toHaveLength(3)
    expect(sideBox(0, 'trái', 'Chữ')).toHaveValue('Anh')

    await user.click(saveButton())
    await screen.findByText('Bạn đã lưu bản nháp thành công.')

    expect(getMockGame(MATCHING_ID).questions[2]).toMatchObject({
      pairs: [{ pairId: 'p1', left: { text: 'Anh' } }, { pairId: 'p2' }, { pairId: 'p3' }],
    })
  })

  it('xóa cặp 1 ngay sau khi gõ chữ cho cặp 3: chữ đi theo đúng cặp của nó', async () => {
    const user = userEvent.setup()

    await openLoaded(MATCHING_ID)
    await user.click(addButton())
    fireEvent.change(sideBox(2, 'phải', 'Chữ'), { target: { value: 'ấm áp' } })
    fireEvent.blur(sideBox(2, 'phải', 'Chữ'))
    await user.click(removeButton(1))
    await waitUntilApplied()

    // Còn {ă, â, (mới)}: chữ vừa gõ ở "â" (nay là cặp 2).
    expect(sideBox(0, 'trái', 'Chữ')).toHaveValue('ă')
    expect(sideBox(1, 'trái', 'Chữ')).toHaveValue('â')
    expect(sideBox(1, 'phải', 'Chữ')).toHaveValue('ấm áp')
  })

  it('chữ bị từ chối ở cặp 2 rồi xóa cặp 1: chữ bị từ chối đi theo cặp 2, không dính sang cặp khác', async () => {
    const user = userEvent.setup()

    await openLoaded(MATCHING_ID)
    await user.click(listItems()[2])
    fireEvent.change(sideBox(1, 'phải', 'Chữ'), { target: { value: 'cảnh máu me' } })
    fireEvent.blur(sideBox(1, 'phải', 'Chữ'))
    await screen.findAllByText(new RegExp(UNSAFE.slice(0, 40)), {}, { timeout: 5000 })

    await user.click(removeButton(1))

    // Cặp 2 cũ (ă-ăn) nay là cặp 1 và vẫn giữ chữ vừa gõ dở; các cặp khác nguyên vẹn.
    expect(sideBox(0, 'phải', 'Chữ')).toHaveValue('cảnh máu me')
    expect(sideBox(1, 'phải', 'Chữ')).toHaveValue('âm')
    expect(sideBox(2, 'phải', 'Chữ')).toHaveValue('ba')
  })
})

describe('các loại game còn lại: chỉ sửa trường chung, nội dung chữ chỉ đọc', () => {
  // mock-game-3 DRAG_DROP, 4 AUDIO_VISUAL_MATCH, 5 ORDERING, 6 MEMORY_CARD, 7 SPOT_THE_TARGET, 8 WORD_SCRAMBLE, 9 ODD_ONE_OUT, 10 VISUAL_CLOZE.
  const OTHER_IDS = [3, 4, 5, 6, 7, 8, 9, 10].map((n) => `mock-game-${n}`)

  // Cùng thứ tự với `OTHER_IDS`.
  const OTHER_TYPES = ['DRAG_DROP', 'AUDIO_VISUAL_MATCH', 'ORDERING', 'MEMORY_CARD', 'SPOT_THE_TARGET', 'WORD_SCRAMBLE', 'ODD_ONE_OUT', 'VISUAL_CLOZE'] as const

  it.each(OTHER_IDS.map((gameId, position) => [gameId, OTHER_TYPES[position]] as const))('%s (%s): có thông báo, nội dung chỉ đọc và đủ 4 trường chung; không có ô sửa nội dung', async (gameId, type) => {
    await openLoaded(gameId)

    expect(screen.getByText('Loại game này chưa có form sửa chi tiết')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Nội dung câu (chỉ đọc)' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /^Lời đọc/ })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /^Mô tả hình ảnh/ })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /Thời gian trả lời/ })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /^Điểm/ })).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: /Nội dung câu hỏi/ })).not.toBeInTheDocument()
    // Nội dung chữ chỉ đọc: một đoạn văn, không phải ô nhập.
    const readOnly = screen.getByRole('heading', { name: 'Nội dung câu (chỉ đọc)' }).parentElement as HTMLElement

    expect(within(readOnly).queryAllByRole('textbox')).toHaveLength(0)
    // Đúng bằng dòng tóm tắt dùng cho danh sách câu (không thiếu, không thừa).
    const game = buildMockGameContents().find((item) => item.gameType === type)!

    expect(readOnly.querySelector('p')?.textContent).toBe(summarizeQuestion(game.gameType, game.questions[0]))
  })

  it('sửa thời gian ở loại chỉ có trường chung: danh sách cập nhật và lưu được', async () => {
    const user = userEvent.setup()

    await openLoaded('mock-game-5')
    const time = screen.getByRole('textbox', { name: /Thời gian trả lời/ })

    await user.clear(time)
    await user.type(time, '55')
    await user.click(saveButton())
    await screen.findByText('Bạn đã lưu bản nháp thành công.')

    expect(listItems()[0]).toHaveTextContent('55 giây')
    expect(getMockGame('mock-game-5').questions[0].timeLimitSeconds).toBe(55)
  })

  it('lời đọc là TÙY CHỌN ở loại thường: xóa hết thì bỏ hẳn trường và vẫn lưu được', async () => {
    const user = userEvent.setup()

    await openLoaded('mock-game-5')
    const audio = screen.getByRole('textbox', { name: /^Lời đọc/ })

    fireEvent.change(audio, { target: { value: '' } })
    fireEvent.blur(audio)
    await waitFor(() => expect(screen.queryByText('Đang áp dụng chỉnh sửa...')).not.toBeInTheDocument())
    await user.click(saveButton())
    await screen.findByText('Bạn đã lưu bản nháp thành công.')

    expect('audioText' in getMockGame('mock-game-5').questions[0]).toBe(false)
  })

  it('AUDIO_VISUAL_MATCH: lời đọc là BẮT BUỘC (có dấu sao), xóa thì báo lỗi ngay', async () => {
    await openLoaded('mock-game-4')
    const audio = screen.getByRole('textbox', { name: /^Lời đọc/ })

    fireEvent.change(audio, { target: { value: '' } })
    fireEvent.blur(audio)

    expect(await screen.findByText(/Cần nhập Lời đọc/)).toBeInTheDocument()
    expect(screen.getByText('Lời đọc', { selector: 'label' }).textContent).toContain('*')
  })

  it.each(['mock-game-7', 'mock-game-10'])('%s: mô tả hình ảnh là BẮT BUỘC, xóa thì báo lỗi ngay', async (gameId) => {
    await openLoaded(gameId)
    const visual = screen.getByRole('textbox', { name: /^Mô tả hình ảnh/ })

    fireEvent.change(visual, { target: { value: '' } })
    fireEvent.blur(visual)

    expect(await screen.findByText(/Cần nhập Mô tả hình ảnh/)).toBeInTheDocument()
  })
})
