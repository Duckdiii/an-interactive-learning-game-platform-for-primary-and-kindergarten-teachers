import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { scrambleLetters, seededRandom, splitLetters } from '../components/editor/forms/scrambleEditing'
import { getMockGame, resetMockGames, saveMockGame } from '../services/mock/mockGames'
import { setMockScenario } from '../services/mock/mockRuntime'
import { loginAsTeacher, renderWithProviders } from '../test/renderWithApp'
import type { WordScrambleQuestion } from '../types/game-dsl.types'
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

// Form sửa câu WORD_SCRAMBLE (mock-game-8). Câu 1: "mẹ" xáo [ẹ, m] (chỉ có MỘT cách xáo hợp lệ). Câu 2: "bố". Câu 3: "anh" xáo [h, a, n] (5 cách khác thứ tự gốc).
const SCRAMBLE_ID = 'mock-game-8'
const UNSAFE = 'Nội dung chỉnh sửa của giáo viên chưa đạt chuẩn an toàn học đường dành cho trẻ nhỏ. Vui lòng điều chỉnh lại từ ngữ.'

const wordBox = () => screen.getByRole('textbox', { name: /^Từ đáp án/ })
const lettersGroup = () => screen.getByRole('group', { name: 'Các chữ đã xáo' })
const shown = () => within(lettersGroup()).queryAllByRole('listitem').map((item) => item.textContent ?? '')
const reshuffleButton = () => screen.getByRole('button', { name: 'Xáo lại' })
const listItems = () => within(screen.getByRole('list', { name: 'Danh sách câu hỏi' })).getAllByRole('button')
const saveButton = () => screen.getByRole('button', { name: 'Lưu bản nháp' })
const key = (letters: ReadonlyArray<string>) => letters.map((letter) => letter.toUpperCase()).join('')
const sortedKey = (letters: ReadonlyArray<string>) => [...letters].map((letter) => letter.toUpperCase()).sort().join('')
const sortedWord = (word: string) => sortedKey(splitLetters(word))
const type = (box: HTMLElement, value: string) => {
  fireEvent.change(box, { target: { value } })
  fireEvent.blur(box)
}

async function openLoaded() {
  renderWithProviders(<WorkspaceEditor />, `/workspace/editor?gameId=${SCRAMBLE_ID}`)
  await screen.findByRole('textbox', { name: /Tên trò chơi/ })
}

const toThirdQuestion = () => fireEvent.click(listItems()[2])

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
  vi.restoreAllMocks()
  vi.stubEnv('VITE_USE_MOCK', 'none')
  vi.stubEnv('VITE_MOCK_LATENCY_MS', '0')
  setMockScenario('normal')
  localStorage.clear()
  vi.clearAllMocks()
})

describe('form sửa câu WORD_SCRAMBLE', () => {
  it('không còn thông báo "chưa có form"; hiện từ đáp án, các chữ đã xáo và nút "Xáo lại", kèm trường chung', async () => {
    await openLoaded()

    expect(screen.queryByText('Loại game này chưa có form sửa chi tiết')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Sửa câu 1' })).toBeInTheDocument()
    expect(wordBox()).toHaveValue('mẹ')
    expect(shown()).toEqual(['ẹ', 'm'])
    expect(screen.getByRole('textbox', { name: /^Lời đọc/ })).toHaveValue('Ghép chữ thành từ chỉ người sinh ra con')
    expect(screen.getByRole('textbox', { name: /Thời gian trả lời/ })).toHaveValue('30')
    expect(wordBox()).toHaveAccessibleDescription(/Từ từ 2 đến 10 chữ/)
  })

  it('từ chỉ có một cách xáo hợp lệ ("mẹ"): nút "Xáo lại" khóa kèm lời giải thích', async () => {
    await openLoaded()

    expect(reshuffleButton()).toBeDisabled()
    expect(screen.getByText(/chỉ có một cách xáo hợp lệ/)).toBeInTheDocument()
    // Lời giải thích được gắn vào nút (trình đọc màn hình đọc kèm tên nút).
    expect(reshuffleButton()).toHaveAccessibleDescription(/chỉ có một cách xáo hợp lệ/)
  })

  it('chọn câu khác thì form đổi theo; từ có nhiều cách xáo thì nút "Xáo lại" mở', async () => {
    await openLoaded()
    toThirdQuestion()

    expect(wordBox()).toHaveValue('anh')
    expect(shown()).toEqual(['h', 'a', 'n'])
    expect(reshuffleButton()).toBeEnabled()
  })

  it('"Xáo lại": ra một hoán vị hợp lệ KHÁC cách đang hiện và khác thứ tự gốc, kết quả xác định theo nguồn ngẫu nhiên, hiện "Chưa lưu"', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.3)
    await openLoaded()
    toThirdQuestion()

    const seed = Math.floor(0.3 * 4294967296)
    const expected = scrambleLetters('anh', seededRandom(seed), ['h', 'a', 'n'])

    fireEvent.click(reshuffleButton())

    await waitFor(() => expect(shown()).toEqual(expected))
    expect(shown()).not.toEqual(['h', 'a', 'n'])
    expect(key(shown())).not.toBe('ANH')
    expect(sortedKey(shown())).toBe('AHN')
    expect(screen.getByText('Chưa lưu')).toBeInTheDocument()
    expect(listItems()[2]).toHaveTextContent(expected.join(' '))
  })

  it('đổi từ đáp án thì các chữ xáo được tạo lại theo từ mới (luôn hợp lệ, không còn chữ của từ cũ)', async () => {
    await openLoaded()
    toThirdQuestion()
    type(wordBox(), 'bà')

    await waitFor(() => expect(sortedKey(shown())).toBe(sortedWord('bà')))
    expect(key(shown())).not.toBe('BÀ')
    expect(screen.queryByText(/phải đúng là các chữ của từ đáp án/)).not.toBeInTheDocument()
    expect(screen.queryByText(/phải khác thứ tự/)).not.toBeInTheDocument()

    type(wordBox(), 'bàn')

    await waitFor(() => expect(sortedKey(shown())).toBe(sortedWord('bàn')))
    expect(key(shown())).not.toBe('BÀN')
  })

  it('chữ lặp ("ABA"): xáo ra hoán vị khác thứ tự gốc, đủ chữ', async () => {
    await openLoaded()
    toThirdQuestion()
    type(wordBox(), 'ABA')

    await waitFor(() => expect(sortedKey(shown())).toBe('AAB'))
    expect(key(shown())).not.toBe('ABA')
  })

  it('từ chỉ một loại chữ ("AAA") được chấp nhận, không báo lỗi, nút "Xáo lại" khóa', async () => {
    await openLoaded()
    toThirdQuestion()
    type(wordBox(), 'AAA')

    await waitFor(() => expect(shown()).toEqual(['A', 'A', 'A']))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(reshuffleButton()).toBeDisabled()
    expect(listItems()[2]).not.toHaveTextContent('Cần sửa')
  })

  it('từ nhập dạng tổ hợp (e + dấu nặng rời) được đếm theo NFC (2 chữ) và lưu dạng "mẹ"', async () => {
    await openLoaded()
    fireEvent.change(wordBox(), { target: { value: 'mẹ' } })

    // Đếm sau NFC: "mẹ" là 2 chữ, không phải 3 code point.
    expect(screen.getByText('2/10 ký tự')).toBeInTheDocument()

    fireEvent.blur(wordBox())
    await waitFor(() => expect(screen.queryByText('Đang áp dụng chỉnh sửa...')).not.toBeInTheDocument())

    // Sau khi áp: ô hiện dạng NFC và các chữ xáo là 2 chữ đã NFC (không còn dấu rời).
    expect(wordBox()).toHaveValue('mẹ')
    expect(sortedKey(shown())).toBe(sortedWord('mẹ'))
    expect(shown().every((letter) => letter === letter.normalize('NFC'))).toBe(true)
  })

  it('dữ liệu cũ có chữ xáo SAI (trùng thứ tự gốc) dù từ chỉ có một cách xáo: nút "Xáo lại" vẫn mở và bấm là sửa được', async () => {
    const game = getMockGame(SCRAMBLE_ID)

    ;(game.questions[0] as WordScrambleQuestion).scrambledLetters = ['m', 'ẹ']
    saveMockGame(SCRAMBLE_ID, game)

    await openLoaded()

    expect(reshuffleButton()).toBeEnabled()
    expect(listItems()[0]).toHaveTextContent('Cần sửa')

    fireEvent.click(reshuffleButton())

    await waitFor(() => expect(shown()).toEqual(['ẹ', 'm']))
    expect(listItems()[0]).not.toHaveTextContent('Cần sửa')
    expect(reshuffleButton()).toBeDisabled()
  })

  it('gõ thêm dấu cách sau từ rồi rời ô: từ không đổi nên các chữ đã xáo GIỮ NGUYÊN (không xáo lại)', async () => {
    await openLoaded()
    toThirdQuestion()

    const before = shown()

    type(wordBox(), 'anh ')
    await waitFor(() => expect(screen.queryByText('Đang áp dụng chỉnh sửa...')).not.toBeInTheDocument())

    expect(shown()).toEqual(before)
  })

  it('từ dán có khoảng trắng: báo "không được có khoảng trắng" đúng một lần (lỗi của các chữ xáo được ẩn) và danh sách đánh dấu "Cần sửa"', async () => {
    await openLoaded()
    type(wordBox(), 'con mèo')

    expect(await screen.findByText(/không được có khoảng trắng/)).toBeInTheDocument()
    expect(screen.getAllByText(/không được có khoảng trắng/)).toHaveLength(1)
    expect(screen.queryByText(/phải đúng là các chữ của từ đáp án/)).not.toBeInTheDocument()
    expect(shown().some((letter) => /\s/.test(letter))).toBe(false)
    expect(listItems()[0]).toHaveTextContent('Cần sửa')
  })

  it('từ quá 10 chữ hoặc chỉ 1 chữ bị báo đúng ô', async () => {
    await openLoaded()
    type(wordBox(), 'abcdefghijk')
    expect(await screen.findByText(/tối đa 10 ký tự/)).toBeInTheDocument()

    type(wordBox(), 'a')
    expect(await screen.findByText(/ít nhất 2 ký tự/)).toBeInTheDocument()
  })

  it('từ ngữ chưa phù hợp (UC-05 2a): giữ nguyên nội dung cũ, hiện đúng câu của SRS', async () => {
    await openLoaded()
    type(wordBox(), 'cảnh máu me')

    expect((await screen.findAllByText(new RegExp(UNSAFE.slice(0, 40)), {}, { timeout: 5000 })).length).toBeGreaterThan(0)
    expect(shown()).toEqual(['ẹ', 'm'])
  })

  it('lưu: từ mới và các chữ xáo (hoán vị hợp lệ) được ghi vào kho; bấm "Xáo lại" rồi lưu cũng ghi đúng', async () => {
    await openLoaded()
    toThirdQuestion()
    type(wordBox(), 'HàNội')
    await waitFor(() => expect(sortedKey(shown())).toBe(sortedWord('HàNội')))
    await waitFor(() => expect(screen.queryByText('Đang áp dụng chỉnh sửa...')).not.toBeInTheDocument())
    fireEvent.click(reshuffleButton())
    await waitFor(() => expect(screen.queryByText('Đang áp dụng chỉnh sửa...')).not.toBeInTheDocument())

    const onScreen = shown()

    fireEvent.click(saveButton())
    await screen.findByText('Đã lưu thay đổi của trò chơi.', {}, { timeout: 8000 })

    const stored = getMockGame(SCRAMBLE_ID).questions[2] as WordScrambleQuestion

    expect(stored.correctWord).toBe('HàNội')
    expect(stored.scrambledLetters).toEqual(onScreen)
    expect(sortedKey(stored.scrambledLetters)).toBe(sortedKey(splitLetters('HàNội')))
    expect(key(stored.scrambledLetters)).not.toBe(key(splitLetters('HàNội')))
  })

  it('chơi thử vẫn "chưa hỗ trợ" (chưa có renderer Canvas cho loại này)', async () => {
    await openLoaded()
    fireEvent.click(screen.getByRole('button', { name: 'Chơi thử' }))

    expect(await screen.findByText(/chưa hỗ trợ chơi thử/, {}, { timeout: 10_000 })).toBeInTheDocument()
  })
})

describe('WORD_SCRAMBLE: dùng được bằng bàn phím', () => {
  it('Tab từ ô từ đáp án tới nút "Xáo lại"; bấm Enter thì đổi thứ tự và tiêu điểm vẫn ở nút', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.7)
    const user = userEvent.setup()

    await openLoaded()
    toThirdQuestion()
    wordBox().focus()
    await user.tab()

    expect(reshuffleButton()).toHaveFocus()

    const before = shown()

    await user.keyboard('{Enter}')

    await waitFor(() => expect(shown()).not.toEqual(before))
    expect(reshuffleButton()).toHaveFocus()
  })

  it('các chữ đã xáo nằm trong danh sách có tên để trình đọc màn hình đọc được', async () => {
    await openLoaded()

    expect(within(lettersGroup()).getByRole('list', { name: 'Các chữ đã xáo' })).toBeInTheDocument()
    expect(wordBox()).toHaveAttribute('id', 'scramble-word')
  })
})
