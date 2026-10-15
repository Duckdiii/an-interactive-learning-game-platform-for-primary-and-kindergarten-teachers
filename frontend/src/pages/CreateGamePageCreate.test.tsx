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

const cards = () => screen.getAllByRole('checkbox')
const createButton = () => screen.getByRole('button', { name: /^Tạo \d trò chơi$/ })
const probe = () => screen.getByTestId('location').textContent ?? ''

// Điền ý tưởng, sang bước đề xuất và chọn đủ `count` loại (loại đầu được chọn sẵn).
async function toSuggestions(user: ReturnType<typeof userEvent.setup>, count: number) {
  fireEvent.change(screen.getByLabelText('Ý tưởng bài học'), { target: { value: IDEA } })
  await user.click(screen.getByRole('button', { name: 'Tạo trò chơi' }))
  await screen.findByRole('heading', { name: 'AI đề xuất các loại trò chơi cho bạn' })
  await screen.findAllByRole('checkbox')

  for (let index = 1; index < count; index += 1) await user.click(cards()[index])
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
    await user.selectOptions(screen.getByLabelText(/Khối lớp/), 'GRADE_2')
    await user.selectOptions(screen.getByLabelText(/Môn học/), 'MATH')
    await toSuggestions(user, 1)
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

  it('nút Tạo và các lựa chọn khóa trong lúc đang tạo, nút ghi "Đang tạo trò chơi..."; bấm đúp chỉ tạo một lần', async () => {
    vi.stubEnv('VITE_MOCK_LATENCY_MS', '400')

    const user = userEvent.setup()

    renderFlow()
    await toSuggestions(user, 2)
    await user.dblClick(createButton())

    const busy = await screen.findByRole('button', { name: 'Đang tạo trò chơi...' })

    expect(busy).toBeDisabled()
    expect(cards()[0]).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Quay lại sửa mô tả' })).toBeDisabled()
    await waitFor(() => expect(probe()).toContain('/workspace'), { timeout: 8000 })
    expect(getMockGenerateCalls()).toBe(2)
    expect(listMockGames(NO_FILTERS)).toHaveLength(12)
  })
})

describe('tạo nhiều game', () => {
  it('chọn 3 loại: về "Trò chơi của tôi" kèm thông báo, 3 thẻ có dấu "Mới"; trạng thái điều hướng được xóa nên tải lại không hiện lại thông báo', async () => {
    const user = userEvent.setup()

    renderFlow()
    await toSuggestions(user, 3)
    await user.click(createButton())

    const message = await screen.findByText(/^Đã tạo 3 trò chơi nháp. Các trò chơi mới có dấu "Mới"./, {}, SLOW)

    // Nhắc đây là bản mẫu do AI mô phỏng (trang tạo đã chuyển đi nên khối kết quả có nhãn không còn hiện).
    expect(message).toHaveTextContent("do AI mô phỏng tạo: nội dung câu hỏi là bản mẫu")
    expect(probe().startsWith('/workspace|')).toBe(true)
    // Thẻ game mới (3 game vừa tạo) có chip "Mới"; 10 game mẫu thì không.
    expect(await screen.findAllByText('Mới', { selector: 'span' })).toHaveLength(3)
    // Trạng thái điều hướng đã bị thay bằng null.
    await waitFor(() => expect(probe()).toBe('/workspace|null'))
  })
})

describe('lỗi một phần và thử lại', () => {
  it('một loại lỗi: các loại khác vẫn tạo xong (có dấu "Mới"), loại lỗi hiện câu riêng và nút "Thử lại phần còn thiếu"; ở lại trang, tiêu điểm vào khối kết quả; KHÔNG tự thử lại', async () => {
    const user = userEvent.setup()

    setMockGenerateFailure(SUGGESTED[1], 'timeout')

    const { queryClient } = renderFlow()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

    await toSuggestions(user, 3)
    await user.click(createButton())

    const results = (await screen.findByRole('heading', { name: 'Có trò chơi chưa tạo được' }, SLOW)).closest('div[tabindex="-1"]') as HTMLElement

    expect(within(results).getAllByText('Đã tạo xong, lưu thành bản nháp')).toHaveLength(2)
    expect(within(results).getByText('Trợ lý AI trả lời quá lâu. Hãy thử lại sau ít phút.')).toBeInTheDocument()
    expect(within(results).getByRole('button', { name: 'Thử lại phần còn thiếu' })).toBeInTheDocument()
    await waitFor(() => expect(results).toHaveFocus())
    // Vẫn ở trang tạo game (không chuyển trang khi còn loại chưa tạo được).
    expect(screen.queryByTestId('location')).not.toBeInTheDocument()
    expect(listMockGames(NO_FILTERS)).toHaveLength(12)
    expect(['mock-game-12', 'mock-game-11'].every(isNewGame)).toBe(true)
    // Danh sách game được làm mới ngay (game đã tạo có thật trên máy chủ dù còn loại lỗi).
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['games', 't1'] })

    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(getMockGenerateCalls()).toBe(3)
  })

  it('"Thử lại phần còn thiếu" chỉ tạo loại còn thiếu (không tạo trùng); xong thì về danh sách với đủ 3 game', async () => {
    const user = userEvent.setup()

    setMockGenerateFailure(SUGGESTED[1], 'timeout')
    renderFlow()
    await toSuggestions(user, 3)
    await user.click(createButton())
    await screen.findByRole('button', { name: 'Thử lại phần còn thiếu' }, SLOW)

    setMockGenerateFailure(SUGGESTED[1], null)
    await user.click(screen.getByRole('button', { name: 'Thử lại phần còn thiếu' }))

    expect(await screen.findByText(/^Đã tạo 3 trò chơi nháp\. Các trò chơi mới có dấu "Mới"\./, {}, SLOW)).toBeInTheDocument()
    expect(getMockGenerateCalls()).toBe(4)
    expect(listMockGames(NO_FILTERS)).toHaveLength(13)
  })

  it('429: dùng câu chung của bảng mã lỗi, không tự thử lại (đúng một lần gọi), có nút thử lại', async () => {
    const user = userEvent.setup()

    setMockGenerateFailure(SUGGESTED[0], 'rateLimited')
    renderFlow()
    await toSuggestions(user, 1)
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
    await toSuggestions(user, 2)
    await user.click(createButton())

    expect(await screen.findByText('Nội dung chưa phù hợp với học sinh nhỏ tuổi. Hãy đổi chủ đề hoặc cách diễn đạt rồi thử lại.', {}, SLOW)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Thử lại phần còn thiếu' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Quay lại sửa mô tả' })).toBeEnabled()
    expect(cards().filter((card) => (card as HTMLInputElement).checked)).toHaveLength(2)
  })

  it('bỏ chọn loại đang lỗi: loại đã tạo xong vẫn được nhớ; bấm Tạo lại chỉ còn loại đã xong nên KHÔNG gọi AI lần nào (không tạo trùng) và vào thẳng game đã tạo', async () => {
    const user = userEvent.setup()

    setMockGenerateFailure(SUGGESTED[1], 'timeout')
    renderFlow()
    await toSuggestions(user, 2)
    await user.click(createButton())
    await screen.findByRole('button', { name: 'Thử lại phần còn thiếu' }, SLOW)
    expect(getMockGenerateCalls()).toBe(2)

    // Bỏ chọn loại lỗi: loại đã tạo xong còn đó, không còn câu lỗi.
    await user.click(cards()[1])
    expect(screen.queryByRole('button', { name: 'Thử lại phần còn thiếu' })).not.toBeInTheDocument()
    expect(screen.getByText('Đã tạo xong, lưu thành bản nháp')).toBeInTheDocument()

    await user.click(createButton())

    await waitFor(() => expect(probe()).toMatch(/^\/workspace\/editor\?gameId=mock-game-\d+\|/), SLOW)
    expect(getMockGenerateCalls()).toBe(2)
    expect(listMockGames(NO_FILTERS)).toHaveLength(11)
  })

  it('đổi ý tưởng (quay lại sửa mô tả rồi đề xuất lại) thì quên kết quả cũ: lần tạo mới gửi lại mọi loại', async () => {
    const user = userEvent.setup()

    renderFlow()
    await toSuggestions(user, 1)
    setMockGenerateFailure(SUGGESTED[0], 'timeout')
    await user.click(createButton())
    await screen.findByRole('button', { name: 'Thử lại phần còn thiếu' }, SLOW)

    await user.click(screen.getByRole('button', { name: 'Quay lại sửa mô tả' }))
    setMockGenerateFailure(SUGGESTED[0], null)
    await user.click(screen.getByRole('button', { name: 'Tạo trò chơi' }))
    await screen.findAllByRole('checkbox')

    // Đề xuất lại: kết quả lỗi của lần trước đã bị quên, không còn nút thử lại cũ.
    expect(screen.queryByRole('button', { name: 'Thử lại phần còn thiếu' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Có trò chơi chưa tạo được' })).not.toBeInTheDocument()
  })

  it('lỗi không an toàn và lỗi tạm thời cùng lúc: "Thử lại" chỉ gửi loại tạm thời, không gửi lại loại không an toàn (đỡ tốn hạn mức)', async () => {
    const user = userEvent.setup()

    setMockGenerateFailure(SUGGESTED[0], 'unsafe')
    setMockGenerateFailure(SUGGESTED[1], 'timeout')
    renderFlow()
    await toSuggestions(user, 2)
    await user.click(createButton())
    await screen.findByRole('button', { name: 'Thử lại phần còn thiếu' }, SLOW)
    expect(getMockGenerateCalls()).toBe(2)

    setMockGenerateFailure(SUGGESTED[1], null)
    await user.click(screen.getByRole('button', { name: 'Thử lại phần còn thiếu' }))
    await waitFor(() => expect(getMockGenerateCalls()).toBe(3), SLOW)
    // Loại tạm thời đã xong; loại không an toàn vẫn lỗi nên ở lại trang.
    await screen.findByText('Nội dung chưa phù hợp với học sinh nhỏ tuổi. Hãy đổi chủ đề hoặc cách diễn đạt rồi thử lại.')
    expect(screen.queryByRole('button', { name: 'Thử lại phần còn thiếu' })).not.toBeInTheDocument()
  })

  it('bắt đầu tạo: tiêu điểm chuyển tới khối tiến trình (nút Tạo vừa bị khóa), có tên truy cập là tiêu đề', async () => {
    vi.stubEnv('VITE_MOCK_LATENCY_MS', '100')

    const user = userEvent.setup()

    renderFlow()
    await toSuggestions(user, 1)
    await user.click(createButton())

    const group = await screen.findByRole('group', { name: 'Đang tạo trò chơi' })

    await waitFor(() => expect(group).toHaveFocus())
    expect(within(group).getByRole('button', { name: 'Hủy tạo' })).toBeInTheDocument()
  })
})

describe('hủy giữa chừng', () => {
  it('"Hủy tạo": không có game nào được tạo, lựa chọn được giữ, báo đã hủy kèm nút "Tạo tiếp phần còn lại"; không phải lỗi', async () => {
    vi.stubEnv('VITE_MOCK_LATENCY_MS', '100')

    const user = userEvent.setup()

    renderFlow()
    await toSuggestions(user, 3)
    await user.click(createButton())
    await user.click(await screen.findByRole('button', { name: 'Hủy tạo' }))

    expect(await screen.findByRole('heading', { name: 'Đã hủy tạo trò chơi' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tạo tiếp phần còn lại' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    // Hủy không phải lỗi: mỗi loại chỉ ghi "Chưa tạo", không có câu lỗi nào.
    expect(screen.getAllByText('Chưa tạo')).toHaveLength(3)
    expect(listMockGames(NO_FILTERS)).toHaveLength(10)
    expect(cards().filter((card) => (card as HTMLInputElement).checked)).toHaveLength(3)
    expect(screen.queryByTestId('location')).not.toBeInTheDocument()
    await waitFor(() => expect(createButton()).toBeEnabled())
  })

  it('rời trang khi đang tạo thì hủy yêu cầu: không game nào được tạo sau đó', async () => {
    vi.stubEnv('VITE_MOCK_LATENCY_MS', '100')

    const user = userEvent.setup()
    const view = renderFlow()

    await toSuggestions(user, 2)
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
    const user = userEvent.setup()

    setMockGenerateFailure(SUGGESTED[0], 'timeout')
    renderFlow()
    await toSuggestions(user, 1)
    await user.click(createButton())

    const results = (await screen.findByRole('heading', { name: 'Có trò chơi chưa tạo được' }, SLOW)).closest('div[tabindex="-1"]') as HTMLElement

    expect(within(results).getByText('Dữ liệu mô phỏng')).toBeInTheDocument()
    expect(within(results).getByText(/bản mẫu, có thể không khớp mô tả của bạn/)).toBeInTheDocument()
    expect(within(results).getByText(gameTypeLabel(SUGGESTED[0]))).toBeInTheDocument()
  })
})
