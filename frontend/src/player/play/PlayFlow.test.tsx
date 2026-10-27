import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { configure, act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../App'
import { MockPlayerApi } from '../api/mockPlayerApi'

// Đường chạy trọn vẹn của trang chơi với MockPlayerApi: vào chơi -> từng câu -> phản hồi -> màn xong. Konva thay bằng DOM thường.
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
vi.mock('../../games/common/measureText', () => ({ measureWrappedTextHeight: () => null }))
vi.mock('../../games/common/sound', () => ({ playSound: vi.fn() }))
vi.mock('../../games/common/useFeedback', () => ({ useFeedback: () => ({ showFeedback: vi.fn() }) }))
vi.mock('../../games/common/OptionButton', () => ({
  default: ({ option, onClick }: { option: { text: string }; onClick: () => void }) => <button onClick={onClick}>{option.text}</button>,
}))

function openPlay(code: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/play/${code}`]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const start = async () => fireEvent.click(await screen.findByRole('button', { name: 'Bắt đầu' }))
const tap = (text: string) => fireEvent.click(screen.getByText(text))
const next = async (name = 'Câu tiếp theo') => fireEvent.click(await screen.findByRole('button', { name }))

// Không dùng vi.unstubAllEnvs(): nó gỡ cả độ trễ 0 của test-setup.
// Trang chơi tải lười (Canvas, renderer): lần đầu trong file test có thể chậm hơn 1 giây mặc định của findBy.
configure({ asyncUtilTimeout: 10_000 })

beforeEach(() => vi.stubEnv('VITE_PLAYER_API', 'mock'))
afterEach(() => {
  vi.useRealTimers()
  vi.stubEnv('VITE_PLAYER_API', '')
})

// Đáp án đúng của 3 câu QUIZ mẫu: "3", "5", "9". Chọn đúng câu 1, sai câu 2 ("4"), đúng câu 3.
describe('trang chơi, khung Bé (QUIZ, Mầm non)', () => {
  it('chơi hết 3 câu: sao tiến độ, phản hồi nhẹ nhàng, không đồng hồ, không điểm, màn xong', async () => {
    openPlay('MOCK00')
    await start()

    expect(await screen.findByRole('img', { name: 'Câu 1/3' })).toBeInTheDocument()
    expect(screen.queryByRole('timer')).not.toBeInTheDocument()

    tap('3')
    expect(await screen.findByText('Giỏi quá!')).toBeInTheDocument()
    await next()

    expect(await screen.findByRole('img', { name: 'Câu 2/3' })).toBeInTheDocument()
    tap('4')
    expect(await screen.findByText('Gần đúng rồi! Mình cùng xem đáp án nhé.')).toBeInTheDocument()
    await next()

    tap('9')
    await next('Xem kết quả')

    expect(await screen.findByRole('heading', { name: 'Hoàn thành!' })).toBeInTheDocument()
    expect(screen.getByText('2/3 câu đúng')).toBeInTheDocument()
    expect(screen.queryByText(/điểm/)).not.toBeInTheDocument()
  })

  it('khung Bé không bị tính hết giờ dù trẻ nghĩ lâu', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    openPlay('MOCK00')
    await start()
    await screen.findByRole('img', { name: 'Câu 1/3' })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(120_000)
    })
    // Cho lời gọi nộp (nếu lỗi nào đó có phát sinh) kịp hoàn tất trước khi kiểm.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000)
    })

    // Có thể đã hiện gợi ý nhẹ, nhưng không có phản hồi "hết giờ" và không có nút sang câu sau.
    expect(screen.queryByText('Mình cùng thử câu khác nhé.')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Câu tiếp theo' })).not.toBeInTheDocument()
  })

  it('chơi lại từ màn xong quay về màn vào', async () => {
    openPlay('MOCK00')
    await start()
    for (const answer of ['3', '5', '9']) {
      await screen.findByText(answer)
      tap(answer)
      await next(answer === '9' ? 'Xem kết quả' : 'Câu tiếp theo')
    }

    fireEvent.click(await screen.findByRole('button', { name: 'Chơi lại' }))

    expect(await screen.findByRole('button', { name: 'Bắt đầu' })).toBeInTheDocument()
  })
})

describe('trang chơi, khung Học sinh (MOCK10: QUIZ giáo viên ghi đè)', () => {
  it('có đồng hồ và điểm; trả lời đúng thì cộng điểm', async () => {
    openPlay('MOCK10')
    await start()

    expect(await screen.findByRole('timer')).toHaveTextContent('30 giây')
    expect(screen.getByText('Câu 1/3')).toBeInTheDocument()

    tap('3')
    expect(await screen.findByText(/Chính xác! \+\d+ điểm/)).toBeInTheDocument()
    expect(screen.getByText(/^\d+ điểm$/)).toBeInTheDocument()
  })

  it('hết giờ thì tự nộp "hết giờ", báo "Hết giờ." và cho sang câu sau', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    openPlay('MOCK10')
    await start()
    await screen.findByRole('timer')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(31_000)
    })

    await waitFor(() => expect(screen.getByText('Hết giờ.')).toBeInTheDocument())
    expect(screen.getByRole('timer')).toHaveTextContent('0 giây')
    expect(screen.getByRole('button', { name: 'Câu tiếp theo' })).toBeInTheDocument()
  })
})

describe('nhân vật theo theme', () => {
  const mascotState = () => screen.getByRole('img', { name: /^Nhân vật/ }).getAttribute('data-mascot-state')

  it('khung Bé: nhân vật chào ở màn vào, hỏi khi đang chơi, vui khi đúng, an ủi khi sai, ăn mừng ở màn xong; theme ong cho môn Toán', async () => {
    openPlay('MOCK00')
    expect(await screen.findByRole('img', { name: 'Nhân vật chào bạn' })).toHaveTextContent('🐝')
    await start()

    await screen.findByRole('img', { name: 'Câu 1/3' })
    expect(mascotState()).toBe('ask')
    expect(screen.getByRole('img', { name: 'Câu 1/3' })).toHaveTextContent('🍯')

    tap('3')
    await screen.findByText('Giỏi quá!')
    expect(mascotState()).toBe('happy')
    await next()

    await screen.findByText('5')
    tap('4')
    await screen.findByText(/Gần đúng rồi/)
    expect(mascotState()).toBe('comfort')
    await next()

    await screen.findByText('9')
    tap('9')
    await next('Xem kết quả')
    expect(await screen.findByRole('img', { name: 'Nhân vật ăn mừng' })).toBeInTheDocument()
  })

  it('khung Học sinh: không có nhân vật', async () => {
    openPlay('MOCK10')
    await start()
    await screen.findByRole('timer')

    expect(screen.queryByRole('img', { name: /^Nhân vật/ })).not.toBeInTheDocument()
  })
})

describe('gợi ý và chuỗi đúng', () => {
  const HINT = 'Con cứ thử một lần nhé, không sao đâu!'

  it('khung Bé: chưa trả lời sau hintAfterMs thì gợi ý nhẹ, trả lời xong thì hết gợi ý', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    openPlay('MOCK00')
    await start()
    await screen.findByRole('img', { name: 'Câu 1/3' })
    expect(screen.queryByText(HINT)).not.toBeInTheDocument()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(9_000)
    })
    expect(screen.getByText(HINT)).toBeInTheDocument()

    tap('3')
    await screen.findByText('Giỏi quá!')
    expect(screen.queryByText(HINT)).not.toBeInTheDocument()
  })

  it('khung Học sinh: không gợi ý', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    openPlay('MOCK10')
    await start()
    await screen.findByRole('timer')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(20_000)
    })

    expect(screen.queryByText(HINT)).not.toBeInTheDocument()
  })

  it('khung Học sinh: đúng hai câu liên tiếp thì nhắc chuỗi', async () => {
    openPlay('MOCK10')
    await start()

    await screen.findByText('3')
    tap('3')
    expect(await screen.findByText(/^Chính xác! \+\d+ điểm$/)).toBeInTheDocument()
    await next()

    await screen.findByText('5')
    tap('5')
    expect(await screen.findByText(/chuỗi đúng 2 câu/)).toBeInTheDocument()
  })
})

describe('trang chơi, các tình huống khác', () => {
  it('khung Bé chặn thời gian nộp ở giới hạn của câu (không bị tính hết giờ vì nghĩ lâu)', async () => {
    const submit = vi.spyOn(MockPlayerApi.prototype, 'submitInteraction')
    vi.useFakeTimers({ shouldAdvanceTime: true })
    openPlay('MOCK00')
    await start()
    await screen.findByRole('img', { name: 'Câu 1/3' })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(120_000)
    })

    tap('3')
    await screen.findByText('Giỏi quá!')

    expect(submit.mock.calls[0][3]).toBeLessThanOrEqual(30_000)
    submit.mockRestore()
  })

  it('nộp lỗi: báo nhẹ nhàng và mở khóa để trẻ chọn lại, lần sau nộp được', async () => {
    const submit = vi.spyOn(MockPlayerApi.prototype, 'submitInteraction').mockRejectedValueOnce(new Error('mất mạng'))
    openPlay('MOCK00')
    await start()
    await screen.findByRole('img', { name: 'Câu 1/3' })

    tap('3')
    expect(await screen.findByText('Chưa gửi được câu trả lời. Con thử lại nhé.')).toBeInTheDocument()

    tap('3')
    expect(await screen.findByText('Giỏi quá!')).toBeInTheDocument()
    expect(screen.queryByText('Chưa gửi được câu trả lời. Con thử lại nhé.')).not.toBeInTheDocument()
    submit.mockRestore()
  })

  it('loại game chưa có renderer (DRAG_DROP): báo chưa chơi được, không có nút Bắt đầu', async () => {
    openPlay('MOCK02')

    expect(await screen.findByText(/chưa chơi được/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Bắt đầu' })).not.toBeInTheDocument()
  })
})
