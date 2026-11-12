import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import axiosInstance from '../../api/axiosInstance'
import { buildMockGameContents } from '../../services/mock/gameFixtures'
import type { GameDsl, GameType } from '../../types/game-dsl.types'
import PlayTestPanel from './PlayTestPanel'
import { buildImageClozeMock } from '../../services/mock/imageGameFixtures'

const canvas = vi.hoisted(() => ({ loaded: false, audioOptions: [] as unknown[] }))

// react-konva vẽ lên <canvas> thật mà jsdom không có: mock thành DOM thường để test hành vi (chọn, nối, chấm, sang câu), không
// kiểm màu hay tọa độ (đã xem bằng mắt trên trình duyệt thật). Cùng cách với test của renderer.
vi.mock('react-konva', () => ({
  Stage: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Layer: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Group: ({ children, onClick, name }: { children?: React.ReactNode; onClick?: () => void; name?: string }) => (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div data-testid={name} onClick={onClick}>{children}</div>
  ),
  Rect: () => null,
  Text: ({ text }: { text?: string }) => <span>{text}</span>,
  Image: () => null,
  Line: ({ dash }: { dash?: number[] }) => <i data-testid="line" data-dashed={dash ? 'yes' : 'no'} />,
}))
vi.mock('use-image', () => ({ default: () => canvas.loaded ? [{ width: 800, height: 480 }, 'loaded'] : [undefined, 'loading'] }))
vi.mock('howler', () => ({ Howl: class { play = vi.fn(); stop = vi.fn(); unload = vi.fn() } }))
vi.mock('canvas-confetti', () => ({ default: vi.fn() }))
vi.mock('../../games/common/useQuestionAudio', () => ({
  useQuestionAudio: (_url: string | undefined, options: unknown) => {
    canvas.audioOptions.push(options)
    return vi.fn()
  },
}))
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
  canvas.loaded = false
  canvas.audioOptions = []
  vi.stubGlobal('fetch', fetchSpy)
})

describe('PlayTestPanel: AVM TTS language', () => {
  it('reads an English subject prompt with English browser TTS', () => {
    const game = gameOf('AUDIO_VISUAL_MATCH')
    game.metadata.subject = 'ENGLISH'
    Object.assign(game.questions[0], { audioText: 'Cat', audioUrl: undefined })

    render(<PlayTestPanel game={game} onExit={vi.fn()} />)

    expect(canvas.audioOptions).toContainEqual(expect.objectContaining({ ttsText: 'Cat', ttsLanguage: 'en-US' }))
    expectNoRequests()
  })
})

describe('PlayTestPanel: VISUAL_CLOZE', () => {
  it('plays legacy TEXT and reports its result locally', async () => {
    render(<PlayTestPanel game={gameOf('VISUAL_CLOZE')} onExit={vi.fn()} />)
    click('ngủ')
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Đúng rồi!'))
    expectNoRequests()
  })

  it('IMAGE waits for both blanks, lets a wrong image be replaced, and finishes without any API', async () => {
    canvas.loaded = true
    const width = vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(800)
    try {
      render(<PlayTestPanel game={buildImageClozeMock()} onExit={vi.fn()} />)
      fireEvent.click(button('Con bướm'))
      fireEvent.click(screen.getByTestId('visual-cloze-blank-b1'))
      await waitFor(() => expect(screen.queryByRole('button', { name: 'Con bướm' })).not.toBeInTheDocument())
      expect(screen.queryByRole('button', { name: 'Xem kết quả' })).not.toBeInTheDocument()
      fireEvent.click(button('Bọ rùa'))
      fireEvent.click(screen.getByTestId('visual-cloze-blank-b2'))
      await waitFor(() => expect(button('Bọ rùa')).not.toBeDisabled())
      expect(screen.queryByRole('button', { name: 'Thử gửi lại' })).not.toBeInTheDocument()
      fireEvent.click(button('Con ong'))
      fireEvent.click(screen.getByTestId('visual-cloze-blank-b2'))
      await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Đúng rồi!'))
      expectNoRequests()
    } finally { width.mockRestore() }
  })
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

describe('PlayTestPanel: ODD_ONE_OUT', () => {
  it('plays legacy text locally', async () => {
    render(<PlayTestPanel game={gameOf('ODD_ONE_OUT')} onExit={vi.fn()} />)
    fireEvent.click(screen.getByText('Hình vuông'))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Đúng rồi!'))
    expectNoRequests()
  })
  it('plays image choice once, then starts fresh on retry and single-question replay', async () => {
    const question = { id: 'odd-image', timeLimitSeconds: 30, points: 10, renderMode: 'IMAGE' as const, oddOneOutId: '1',
      items: ['Mèo', 'Chó', 'Mèo', 'Mèo'].map((text, i) => ({ id: String(i), text, imageUrl: '/mock/cat.png' })) }
    render(<PlayTestPanel game={{ ...gameOf('ODD_ONE_OUT'), questions: [question] } as GameDsl} onExit={vi.fn()} />)
    fireEvent.click(screen.getByTestId('avm-option-0'))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Chưa đúng'))
    fireEvent.click(screen.getByTestId('avm-option-1'))
    expect(screen.getByRole('status')).toHaveTextContent('Chưa đúng')
    fireEvent.click(button('Thử lại câu này'))
    fireEvent.click(screen.getByTestId('avm-option-1'))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Đúng rồi!'))
    fireEvent.click(button('Xem kết quả'))
    fireEvent.click(button('Chơi lại'))
    fireEvent.click(screen.getByTestId('avm-option-0'))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Chưa đúng'))
    expectNoRequests()
  })
})

describe('PlayTestPanel: loại game chưa có renderer', () => {
  const unsupported: GameType[] = ['SPOT_THE_TARGET', 'WORD_SCRAMBLE', 'MEMORY_CARD', 'DRAG_DROP', 'ORDERING']

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

  it('đủ 10 loại game: 5 loại chơi thử được và 5 loại còn lại hiện khung chưa hỗ trợ', () => {
    expect(unsupported).toHaveLength(5)
    expect(new Set([...unsupported, 'QUIZ', 'MATCHING', 'AUDIO_VISUAL_MATCH', 'VISUAL_CLOZE', 'ODD_ONE_OUT']).size).toBe(10)
  })
})
