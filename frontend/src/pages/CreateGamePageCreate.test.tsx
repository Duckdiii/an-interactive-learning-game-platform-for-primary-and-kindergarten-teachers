import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { gameTypeLabel } from '../constants/labels'
import { rankGameTypes, suggestGameTypes } from '../services/gameTypeSuggestionService'
import { getMockGenerateCalls, resetMockGenerate, setMockGenerateFailure } from '../services/mock/mockGenerate'
import { getMockGame, listMockGames, resetMockGames } from '../services/mock/mockGames'
import { setMockScenario } from '../services/mock/mockRuntime'
import { loginAsTeacher, renderWithProviders } from '../test/renderWithApp'
import { clearNewGames, isNewGame } from '../utils/newGames'
import CreateGamePage from './CreateGamePage'
import MyGamesPage from './MyGamesPage'

// A8.2: nút "Tạo N trò chơi" gọi AI mô phỏng: một game thì vào trình soạn thảo, nhiều game thì về danh sách có dấu "Mới"; lỗi một phần, thử lại phần thiếu, hủy.
vi.mock('../services/gameTypeSuggestionService', async (original) => ({
  ...(await original<typeof import('../services/gameTypeSuggestionService')>()),
  suggestGameTypes: vi.fn(),
}))

const mockedSuggest = vi.mocked(suggestGameTypes)
const IDEA = 'Đếm số lượng con vật cho các bé'
const NO_FILTERS = { subject: '', gradeLevel: '', status: '' }
const SLOW = { timeout: 5000 }
const SUGGESTED = rankGameTypes({ idea: IDEA, gradeLevel: '', subject: '' }).map((item) => item.type)

function Probe() {
  const location = useLocation()

  return (
    <p data-testid="location">
      {location.pathname}
      {location.search}|{JSON.stringify(location.state)}
    </p>
  )
}

function renderFlow() {
  return renderWithProviders(
    <Routes>
      <Route path="/games/new" element={<CreateGamePage />} />
      <Route path="/workspace/editor" element={<Probe />} />
      <Route
        path="/workspace"
        element={
          <>
            <Probe />
            <MyGamesPage />
          </>
        }
      />
    </Routes>,
    '/games/new',
  )
}

const cards = () => screen.getAllByRole('button', { name: /^Dùng kiểu này:/ })
// Nút "Dùng kiểu này" của thẻ đầu (phù hợp nhất).
const createButton = () => cards()[0]
const probe = () => screen.getByTestId('location').textContent ?? ''

// Điền ý tưởng kèm giáo án rồi sang bước đề xuất (chờ có thẻ "Dùng kiểu này"); không có giáo án thì đường mô tả sang khung chat.
async function toSuggestions(user: ReturnType<typeof userEvent.setup>) {
  fireEvent.change(screen.getByLabelText('Ý tưởng bài học'), { target: { value: IDEA } })
  const lesson = new File(['x'], 'giao-an.pdf', { type: 'application/pdf' })
  fireEvent.change(document.getElementById('create-file') as HTMLInputElement, { target: { files: [lesson] } })
  await user.click(screen.getByRole('button', { name: 'Để AI soạn giúp' }))
  await screen.findByRole('heading', { name: 'AI đề xuất kiểu chơi cho bài này' })
  await screen.findAllByRole('button', { name: /^Dùng kiểu này:/ })
}

beforeEach(() => {
  vi.stubEnv('VITE_USE_MOCK', 'ai,games,editor')
  mockedSuggest.mockReset()
  mockedSuggest.mockImplementation(async (input) => rankGameTypes(input))
  loginAsTeacher()
  resetMockGames()
  resetMockGenerate()
  clearNewGames()
})
afterEach(() => {
  vi.stubEnv('VITE_USE_MOCK', 'none')
  vi.stubEnv('VITE_MOCK_LATENCY_MS', '0')
  setMockScenario('normal')
  clearNewGames()
  localStorage.clear()
})

describe('tạo một game', () => {
  it('chọn 1 loại: tạo game nháp, đánh dấu "Mới" và mở thẳng trình soạn thảo của game đó', async () => {
    const user = userEvent.setup()

    renderFlow()
    await user.click(screen.getByRole('button', { name: 'Lớp 2–5' }))
    await user.click(screen.getByRole('button', { name: 'Lớp 2' }))
    await user.click(screen.getByRole('button', { name: 'Toán' }))
    await toSuggestions(user)
    await user.click(createButton())

    await waitFor(() => expect(probe()).toMatch(/^\/workspace\/editor\?gameId=mock-game-11\|/), SLOW)
    expect(listMockGames(NO_FILTERS)).toHaveLength(11)
    expect(listMockGames(NO_FILTERS)[0]).toMatchObject({ gameId: 'mock-game-11', status: 'DRAFT', gameType: SUGGESTED[0] })
    expect(isNewGame('mock-game-11')).toBe(true)
    // Yêu cầu dựng từ ĐÚNG dữ liệu đã nhập: tên từ ý tưởng, khối lớp và môn đã chọn.
    const created = getMockGame('mock-game-11')

    expect(created.metadata.title).toBe(IDEA)
    expect(created.metadata).toMatchObject({ gradeLevel: 'GRADE_2', subject: 'MATH' })
  })

  it('trong lúc đang tạo chỉ còn màn tiến trình ước tính (không bấm lại Tạo hay đổi lựa chọn được); bấm đúp chỉ tạo một lần', async () => {
    vi.stubEnv('VITE_MOCK_LATENCY_MS', '400')

    const user = userEvent.setup()

    renderFlow()
    await toSuggestions(user)
    await user.dblClick(createButton())

    const panel = await screen.findByRole('group', { name: /AI đang soạn trò chơi/ })

    expect(within(panel).getByRole('progressbar', { name: 'Tiến độ ước tính' })).toBeInTheDocument()
    expect(within(panel).getByText(/tạm thời/)).toBeInTheDocument()
    expect(within(panel).queryByText(/Đang soạn \d trò chơi/)).toBeNull()
    expect(screen.queryByRole('button', { name: 'Sửa mô tả' })).toBeNull()
    await waitFor(() => expect(probe()).toContain('/workspace/editor'), { timeout: 8000 })
    expect(getMockGenerateCalls()).toBe(1)
    expect(listMockGames(NO_FILTERS)).toHaveLength(11)
  })

  it('chọn thẻ thứ hai thì tạo đúng kiểu của thẻ đó', async () => {
    const user = userEvent.setup()

    renderFlow()
    await toSuggestions(user)
    await user.click(cards()[1])

    await waitFor(() => expect(probe()).toMatch(/^\/workspace\/editor\?gameId=mock-game-11\|/), SLOW)
    expect(getMockGame('mock-game-11').gameType).toBe(SUGGESTED[1])
  })
})

describe('lỗi một phần và thử lại', () => {
  it('lỗi tạm thời: hiện câu riêng và nút "Thử lại phần còn thiếu"; ở lại trang, tiêu điểm vào khối kết quả; KHÔNG tự thử lại', async () => {
    const user = userEvent.setup()

    setMockGenerateFailure(SUGGESTED[0], 'timeout')
    renderFlow()
    await toSuggestions(user)
    await user.click(createButton())

    const results = (await screen.findByRole('heading', { name: 'Có trò chơi chưa tạo được' }, SLOW)).closest('div[tabindex="-1"]') as HTMLElement

    expect(within(results).getByText('Trợ lý AI trả lời quá lâu. Hãy thử lại sau ít phút.')).toBeInTheDocument()
    expect(within(results).getByRole('button', { name: 'Thử lại phần còn thiếu' })).toBeInTheDocument()
    await waitFor(() => expect(results).toHaveFocus())
    // Vẫn ở trang tạo game, thẻ đề xuất còn đó để chọn kiểu khác.
    expect(screen.queryByTestId('location')).not.toBeInTheDocument()
    expect(cards().length).toBeGreaterThan(0)
    expect(listMockGames(NO_FILTERS)).toHaveLength(10)

    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(getMockGenerateCalls()).toBe(1)
  })

  it('"Thử lại phần còn thiếu" tạo lại đúng kiểu đã chọn; xong thì vào trình soạn thảo', async () => {
    const user = userEvent.setup()

    setMockGenerateFailure(SUGGESTED[0], 'timeout')
    renderFlow()
    await toSuggestions(user)
    await user.click(createButton())
    await screen.findByRole('button', { name: 'Thử lại phần còn thiếu' }, SLOW)

    setMockGenerateFailure(SUGGESTED[0], null)
    await user.click(screen.getByRole('button', { name: 'Thử lại phần còn thiếu' }))

    await waitFor(() => expect(probe()).toMatch(/^\/workspace\/editor\?gameId=mock-game-11\|/), SLOW)
    expect(getMockGenerateCalls()).toBe(2)
    expect(getMockGame('mock-game-11').gameType).toBe(SUGGESTED[0])
  })

  it('429: dùng câu chung của bảng mã lỗi, không tự thử lại (đúng một lần gọi), có nút thử lại', async () => {
    const user = userEvent.setup()

    setMockGenerateFailure(SUGGESTED[0], 'rateLimited')
    renderFlow()
    await toSuggestions(user)
    await user.click(createButton())

    expect(await screen.findByText('Bạn thao tác quá nhanh. Hãy chờ một lúc rồi thử lại.', {}, SLOW)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Thử lại phần còn thiếu' })).toBeInTheDocument()
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(getMockGenerateCalls()).toBe(1)
    expect(listMockGames(NO_FILTERS)).toHaveLength(10)
  })

  it('nội dung không an toàn (422): hiện câu, KHÔNG có nút thử lại y nguyên (vô ích), vẫn có "Quay lại sửa mô tả"; lựa chọn được giữ', async () => {
    const user = userEvent.setup()

    setMockGenerateFailure(SUGGESTED[0], 'unsafe')
    renderFlow()
    await toSuggestions(user)
    await user.click(createButton())

    expect(await screen.findByText('Nội dung chưa phù hợp với học sinh nhỏ tuổi. Hãy đổi chủ đề hoặc cách diễn đạt rồi thử lại.', {}, SLOW)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Thử lại phần còn thiếu' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sửa mô tả' })).toBeEnabled()
  })

  it('bấm lại đúng kiểu vừa bị "không an toàn": không gọi AI lại (vô ích) nhưng tiêu điểm tới khối lỗi để cô biết vì sao', async () => {
    const user = userEvent.setup()

    setMockGenerateFailure(SUGGESTED[0], 'unsafe')
    renderFlow()
    await toSuggestions(user)
    await user.click(createButton())

    const results = (await screen.findByRole('heading', { name: 'Có trò chơi chưa tạo được' }, SLOW)).closest('div[tabindex="-1"]') as HTMLElement

    createButton().focus()
    await user.click(createButton())

    await waitFor(() => expect(results).toHaveFocus())
    expect(getMockGenerateCalls()).toBe(1)
  })

  it('đổi ý tưởng (sửa mô tả rồi đề xuất lại) thì quên kết quả cũ: kiểu từng bị "không an toàn" được gửi lại AI', async () => {
    const user = userEvent.setup()

    renderFlow()
    await toSuggestions(user)
    setMockGenerateFailure(SUGGESTED[0], 'unsafe')
    await user.click(createButton())
    await screen.findByText(/Nội dung chưa phù hợp/, {}, SLOW)

    await user.click(screen.getByRole('button', { name: 'Sửa mô tả' }))
    setMockGenerateFailure(SUGGESTED[0], null)
    await user.click(screen.getByRole('button', { name: 'Để AI soạn giúp' }))
    await screen.findAllByRole('button', { name: /^Dùng kiểu này:/ })

    // Đề xuất lại: kết quả lỗi của lần trước đã bị quên.
    expect(screen.queryByRole('heading', { name: 'Có trò chơi chưa tạo được' })).not.toBeInTheDocument()
    await user.click(createButton())

    await waitFor(() => expect(probe()).toMatch(/^\/workspace\/editor\?gameId=mock-game-11\|/), SLOW)
    expect(getMockGenerateCalls()).toBe(2)
  })

  it('lỗi ở thẻ đầu rồi chọn thẻ thứ hai: tạo thẻ thứ hai, không gửi lại kiểu đã lỗi', async () => {
    const user = userEvent.setup()

    setMockGenerateFailure(SUGGESTED[0], 'timeout')
    renderFlow()
    await toSuggestions(user)
    await user.click(createButton())
    await screen.findByRole('button', { name: 'Thử lại phần còn thiếu' }, SLOW)

    await user.click(cards()[1])

    await waitFor(() => expect(probe()).toMatch(/^\/workspace\/editor\?gameId=mock-game-11\|/), SLOW)
    expect(getMockGenerateCalls()).toBe(2)
    expect(getMockGame('mock-game-11').gameType).toBe(SUGGESTED[1])
  })

  it('bắt đầu tạo: tiêu điểm chuyển tới khối tiến trình (nút Tạo vừa bị khóa), có tên truy cập là tiêu đề', async () => {
    vi.stubEnv('VITE_MOCK_LATENCY_MS', '100')

    const user = userEvent.setup()

    renderFlow()
    await toSuggestions(user)
    await user.click(createButton())

    const group = await screen.findByRole('group', { name: /AI đang soạn trò chơi/ })

    await waitFor(() => expect(group).toHaveFocus())
    expect(within(group).getByRole('button', { name: 'Hủy tạo' })).toBeInTheDocument()
  })
})

describe('hủy giữa chừng', () => {
  it('"Hủy tạo": không có game nào được tạo, lựa chọn được giữ, báo đã hủy kèm nút "Tạo tiếp phần còn lại"; không phải lỗi', async () => {
    vi.stubEnv('VITE_MOCK_LATENCY_MS', '100')

    const user = userEvent.setup()

    renderFlow()
    await toSuggestions(user)
    await user.click(createButton())
    await user.click(await screen.findByRole('button', { name: 'Hủy tạo' }))

    const canceledTitle = await screen.findByRole('heading', { name: 'Đã hủy tạo trò chơi' })

    await waitFor(() => expect(canceledTitle.closest('[tabindex="-1"]')).toHaveFocus())
    expect(screen.getByRole('button', { name: 'Tạo tiếp phần còn lại' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    // Hủy không phải lỗi: mỗi loại chỉ ghi "Chưa tạo", không có câu lỗi nào.
    expect(screen.getAllByText('Chưa tạo')).toHaveLength(1)
    expect(listMockGames(NO_FILTERS)).toHaveLength(10)
    expect(screen.queryByTestId('location')).not.toBeInTheDocument()
    await waitFor(() => expect(createButton()).toBeEnabled())
  })

  it('rời trang khi đang tạo thì hủy yêu cầu: không game nào được tạo sau đó', async () => {
    vi.stubEnv('VITE_MOCK_LATENCY_MS', '100')

    const user = userEvent.setup()
    const view = renderFlow()

    await toSuggestions(user)
    await user.click(createButton())
    await screen.findByRole('button', { name: 'Hủy tạo' })

    view.unmount()
    await new Promise((resolve) => setTimeout(resolve, 1500))

    expect(listMockGames(NO_FILTERS)).toHaveLength(10)
    expect(isNewGame('mock-game-11')).toBe(false)
  })
})

describe('nhãn mô phỏng', () => {
  it('khi đang tạo và khi có lỗi một phần, khối kết quả có nhãn "Dữ liệu mô phỏng" và nhắc nội dung chỉ là bản mẫu', async () => {
    vi.stubEnv('VITE_MOCK_LATENCY_MS', '100')

    const user = userEvent.setup()

    setMockGenerateFailure(SUGGESTED[0], 'timeout')
    renderFlow()
    await toSuggestions(user)
    await user.click(createButton())

    const panel = await screen.findByRole('group', { name: /AI đang soạn trò chơi/ })

    expect(within(panel).getByText('Dữ liệu mô phỏng')).toBeInTheDocument()

    const results = (await screen.findByRole('heading', { name: 'Có trò chơi chưa tạo được' }, SLOW)).closest('div[tabindex="-1"]') as HTMLElement

    expect(within(results).getByText('Dữ liệu mô phỏng')).toBeInTheDocument()
    expect(within(results).getByText(/bản mẫu, có thể không khớp mô tả của bạn/)).toBeInTheDocument()
    expect(within(results).getByText(gameTypeLabel(SUGGESTED[0]))).toBeInTheDocument()
  })
})

describe('tạo game từ khung chat', () => {
  it('xác nhận thẻ: tạo đúng kiểu chơi đang chọn trên thẻ, ý tưởng ghép từ thẻ, rồi mở trình soạn thảo', async () => {
    const user = userEvent.setup()

    const idea = `${IDEA} trong phạm vi 5`
    // Bản mô phỏng xếp hạng kiểu chơi giống bước đề xuất, theo đúng mô tả, môn và khối của cuộc chat.
    const ranked = rankGameTypes({ idea, gradeLevel: 'KINDERGARTEN', subject: 'MATH' }).map((item) => item.type)

    renderFlow()
    await user.click(screen.getByRole('button', { name: 'Mầm non' }))
    await user.click(screen.getByRole('button', { name: 'Toán' }))
    fireEvent.change(screen.getByLabelText('Ý tưởng bài học'), { target: { value: idea } })
    await user.click(screen.getByRole('button', { name: 'Để AI soạn giúp' }))

    // Chọn kiểu thứ hai và sửa mục tiêu ngay trên thẻ: cả hai phải đi vào game được tạo.
    await user.click(await screen.findByRole('button', { name: gameTypeLabel(ranked[1]) }, SLOW))
    await user.clear(screen.getByLabelText('Mục tiêu học'))
    await user.type(screen.getByLabelText('Mục tiêu học'), 'Đếm vịt trong phạm vi 5')
    await user.click(screen.getByRole('button', { name: 'Đúng rồi, tạo game' }))

    await waitFor(() => expect(probe()).toMatch(/^\/workspace\/editor\?gameId=mock-game-11\|/), SLOW)
    const created = getMockGame('mock-game-11')
    expect(created.gameType).toBe(ranked[1])
    expect(created.metadata).toMatchObject({ gradeLevel: 'KINDERGARTEN', subject: 'MATH' })
    // Bản mô phỏng đặt chủ đề từ `idea` gửi lên: idea là thẻ đã ghép, có mục tiêu cô vừa sửa.
    expect(created.metadata.topic).toMatch(/^Mục tiêu: Đếm vịt trong phạm vi 5/)
    expect(getMockGenerateCalls()).toBe(1)
  })
})
