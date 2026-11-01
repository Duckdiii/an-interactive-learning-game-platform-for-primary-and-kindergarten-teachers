import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import axiosInstance from '../../api/axiosInstance'
import { buildMockGameContents } from '../../services/mock/gameFixtures'
import type { GameDsl, GameType } from '../../types/game-dsl.types'
import PlayTestPanel from './PlayTestPanel'

// react-konva vẽ lên <canvas> thật mà jsdom không có: mock thành DOM thường để test hành vi (chọn, nối, chấm, sang câu), không
// kiểm màu hay tọa độ (đã xem bằng mắt trên trình duyệt thật). Cùng cách với test của renderer.
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
  Line: ({ dash }: { dash?: number[] }) => <i data-testid="line" data-dashed={dash ? 'yes' : 'no'} />,
}))
vi.mock('use-image', () => ({ default: () => [undefined, 'loading'] }))
vi.mock('howler', () => ({ Howl: class { play = vi.fn(); stop = vi.fn(); unload = vi.fn() } }))
vi.mock('../../games/common/measureText', () => ({ measureWrappedTextHeight: () => null }))
vi.mock('../../games/common/useFeedback', () => ({ useFeedback: () => ({ showFeedback: vi.fn() }) }))
vi.mock('../../games/common/sound', () => ({ playSound: vi.fn() }))

// Chơi thử không được gọi bất kỳ API nào: mọi phương thức của axios và fetch đều bị theo dõi.
vi.mock('../../api/axiosInstance', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn(), request: vi.fn() },
}))

const fixtures = buildMockGameContents()
const gameOf = (type: GameType): GameDsl => structuredClone(fixtures.find((game) => game.gameType === type)) as GameDsl
const click = (text: string) => fireEvent.click(screen.getByText(text))
const button = (name: string) => screen.getByRole('button', { name })

const fetchSpy = vi.fn()
const xhrOpenSpy = vi.spyOn(XMLHttpRequest.prototype, 'open')

beforeEach(() => {
  vi.stubGlobal('fetch', fetchSpy)
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

const expectNoRequests = () => {
  for (const method of Object.values(axiosInstance)) expect(method).not.toHaveBeenCalled()
  expect(fetchSpy).not.toHaveBeenCalled()
  expect(xhrOpenSpy).not.toHaveBeenCalled()
}

describe('PlayTestPanel: QUIZ', () => {
  it('chơi hết 3 câu: phản hồi đúng/sai rõ ràng, thử lại câu, sang câu tiếp, tổng kết mô phỏng', async () => {
    const onExit = vi.fn()

    render(<PlayTestPanel game={gameOf('QUIZ')} onExit={onExit} />)

    expect(screen.getByText('Câu 1 trên 3')).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()

    // Câu 1: chọn đúng ("3").
    click('3')
    expect(screen.getByRole('status')).toHaveTextContent('Đúng rồi!')
    fireEvent.click(button('Câu tiếp theo'))

    // Câu 2: chọn sai ("4"), thấy phản hồi nhẹ nhàng, thử lại câu này rồi chọn đúng ("5").
    expect(screen.getByText('Câu 2 trên 3')).toBeInTheDocument()
    click('4')
    expect(screen.getByRole('status')).toHaveTextContent('Chưa đúng. Đáp án đúng đã được đánh dấu trên màn hình.')
    fireEvent.click(button('Thử lại câu này'))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.getByText('Câu 2 trên 3')).toBeInTheDocument()
    click('5')
    expect(screen.getByRole('status')).toHaveTextContent('Đúng rồi!')
    fireEvent.click(button('Câu tiếp theo'))

    // Câu 3 (cuối): chọn sai ("7") rồi xem kết quả.
    click('7')
    fireEvent.click(button('Xem kết quả'))

    expect(screen.getByRole('heading', { name: 'Kết quả chơi thử' })).toBeInTheDocument()
    expect(screen.getByText('Đúng 2/3 câu')).toBeInTheDocument()
    expect(screen.getByText('Đây là kết quả mô phỏng của lần chơi thử, không được lưu vào báo cáo học sinh.')).toBeInTheDocument()
    expect(screen.getAllByText(/Chưa đúng/)).toHaveLength(1)

    // Chơi lại từ đầu, kết quả cũ không còn.
    fireEvent.click(button('Chơi lại'))
    expect(screen.getByText('Câu 1 trên 3')).toBeInTheDocument()
    expect(screen.queryByText('Kết quả chơi thử')).not.toBeInTheDocument()

    expectNoRequests()
  })

  it('Thoát giữa chừng: báo ra ngoài, không có kết quả hay yêu cầu nào được gửi đi', async () => {
    const onExit = vi.fn()

    render(<PlayTestPanel game={gameOf('QUIZ')} onExit={onExit} />)
    click('2')
    await userEvent.setup().click(button('Thoát'))

    expect(onExit).toHaveBeenCalledTimes(1)
    expectNoRequests()
  })

  it('"Quay lại chỉnh sửa" ở màn tổng kết báo ra ngoài', () => {
    const onExit = vi.fn()

    render(<PlayTestPanel game={gameOf('QUIZ')} onExit={onExit} />)
    for (const answer of ['3', '5', '9']) {
      click(answer)
      fireEvent.click(screen.getByRole('button', { name: /Câu tiếp theo|Xem kết quả/ }))
    }

    expect(screen.getByText('Đúng 3/3 câu')).toBeInTheDocument()
    fireEvent.click(button('Quay lại chỉnh sửa'))
    expect(onExit).toHaveBeenCalledTimes(1)
  })
})

describe('PlayTestPanel: tiêu điểm bàn phím', () => {
  it('mở màn chơi thử thì tiêu điểm vào màn; trả lời xong vào thanh phản hồi; sang câu tiếp lại về đầu màn', () => {
    render(<PlayTestPanel game={gameOf('QUIZ')} onExit={() => {}} />)

    const panel = screen.getByRole('region', { name: 'Màn chơi thử' })

    expect(panel).toHaveFocus()

    click('3')
    expect(screen.getByRole('status')).toHaveFocus()

    fireEvent.click(button('Câu tiếp theo'))
    expect(panel).toHaveFocus()

    click('4')
    fireEvent.click(button('Thử lại câu này'))
    expect(panel).toHaveFocus()
  })
})

describe('PlayTestPanel: MATCHING', () => {
  const link = (left: string, right: string) => {
    click(left)
    click(right)
  }

  it('nối đúng cả ba cặp, bấm "Xong rồi!" thì chấm cục bộ và hiện phản hồi đúng', () => {
    render(<PlayTestPanel game={gameOf('MATCHING')} onExit={() => {}} />)

    link('a', 'ao')
    link('ă', 'ăn')
    link('â', 'ấm')
    click('Xong rồi!')

    expect(screen.getByRole('status')).toHaveTextContent('Đúng rồi!')
    expectNoRequests()
  })

  it('nối sai thì phản hồi nhẹ nhàng và có thể thử lại câu này để nối lại', () => {
    render(<PlayTestPanel game={gameOf('MATCHING')} onExit={() => {}} />)

    link('a', 'ăn')
    link('ă', 'ao')
    link('â', 'ấm')
    click('Xong rồi!')

    expect(screen.getByRole('status')).toHaveTextContent('Chưa đúng.')
    // Hiện đáp án đúng cho người học: có đường nét đứt nối những cặp còn thiếu.
    expect(screen.getAllByTestId('line').some((line) => line.getAttribute('data-dashed') === 'yes')).toBe(true)

    fireEvent.click(button('Thử lại câu này'))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()

    link('a', 'ao')
    link('ă', 'ăn')
    link('â', 'ấm')
    click('Xong rồi!')

    expect(screen.getByRole('status')).toHaveTextContent('Đúng rồi!')
  })

  it('chơi hết 3 câu rồi xem tổng kết; không có yêu cầu nào tới máy chủ', () => {
    render(<PlayTestPanel game={gameOf('MATCHING')} onExit={() => {}} />)

    link('a', 'ao')
    link('ă', 'ăn')
    link('â', 'ấm')
    click('Xong rồi!')
    fireEvent.click(button('Câu tiếp theo'))

    link('A', 'a')
    link('Ă', 'ă')
    link('Â', 'â')
    click('Xong rồi!')
    fireEvent.click(button('Câu tiếp theo'))

    link('a', 'anh')
    link('ă', 'ăn')
    link('â', 'âm')
    link('b', 'ba')
    click('Xong rồi!')
    fireEvent.click(button('Xem kết quả'))

    expect(screen.getByText('Đúng 3/3 câu')).toBeInTheDocument()
    expectNoRequests()
  })
})

describe('PlayTestPanel: loại game chưa có renderer', () => {
  const unsupported: GameType[] = ['AUDIO_VISUAL_MATCH', 'ODD_ONE_OUT', 'SPOT_THE_TARGET', 'WORD_SCRAMBLE', 'MEMORY_CARD', 'DRAG_DROP', 'ORDERING', 'VISUAL_CLOZE']

  it.each(unsupported)('%s: hiện ảnh minh họa tĩnh, thông báo "chưa hỗ trợ chơi thử" và nội dung chữ, không giả lập', (type) => {
    const onExit = vi.fn()
    const { container } = render(<PlayTestPanel game={gameOf(type)} onExit={onExit} />)

    expect(screen.getByRole('heading', { name: 'Loại game này chưa hỗ trợ chơi thử' })).toBeInTheDocument()
    // Ảnh minh họa tĩnh của loại game (SVG), không để trống.
    expect(container.querySelector('svg')).not.toBeNull()
    expect(within(screen.getByRole('list', { name: 'Nội dung các câu hỏi' })).getAllByRole('listitem')).toHaveLength(3)
    // Không có nút chơi, nút nộp hay thanh phản hồi.
    expect(screen.queryByRole('button', { name: /Câu tiếp theo|Xem kết quả|Thử lại câu này/ })).not.toBeInTheDocument()

    fireEvent.click(button('Quay lại chỉnh sửa'))
    expect(onExit).toHaveBeenCalledTimes(1)
    expectNoRequests()
  })

  it('đủ 10 loại game: 2 loại chơi thử được và 8 loại còn lại hiện khung chưa hỗ trợ', () => {
    expect(unsupported).toHaveLength(8)
    expect(new Set([...unsupported, 'QUIZ', 'MATCHING']).size).toBe(10)
  })
})
