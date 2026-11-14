import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { configure, act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../App'
import { MockPlayerApi } from '../api/mockPlayerApi'
import { setAudioLockSimulated } from '../audio/audioLock'
import { mockApiError } from '../../services/mock/mockErrors'
import { setMockScenario } from '../../services/mock/mockRuntime'

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
vi.mock('howler', () => ({ Howl: class { play = vi.fn(); stop = vi.fn(); unload = vi.fn() }, Howler: { ctx: undefined } }))
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
const typeNickname = (value: string) => fireEvent.change(screen.getByLabelText('Biệt danh'), { target: { value } })
const submitNickname = async (value: string) => {
  typeNickname(value)
  fireEvent.click(await screen.findByRole('button', { name: 'Tiếp tục' }))
}
// Khung Học sinh: biệt danh rồi mới tới màn vào.
const startStudent = async () => {
  await screen.findByLabelText('Biệt danh')
  await submitNickname('Sao Băng')
  await start()
}
const tap = (text: string) => fireEvent.click(screen.getByText(text))
const next = async (name = 'Câu tiếp theo') => fireEvent.click(await screen.findByRole('button', { name }))

// Không dùng vi.unstubAllEnvs(): nó gỡ cả độ trễ 0 của test-setup.
// Trang chơi tải lười (Canvas, renderer): lần đầu trong file test có thể chậm hơn 1 giây mặc định của findBy.
configure({ asyncUtilTimeout: 10_000 })

beforeEach(() => vi.stubEnv('VITE_PLAYER_API', 'mock'))
afterEach(() => {
  setMockScenario('normal')
  // Phiên đã lưu sống qua test (MockPlayerApi là một instance chung), nên phải xóa để test sau bắt đầu sạch.
  sessionStorage.clear()
  setAudioLockSimulated(false)
  vi.restoreAllMocks()
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

    expect(await screen.findByRole('heading', { name: 'Bé làm tốt lắm!' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /trên 5 sao$/ })).toBeInTheDocument()
    expect(screen.queryByText(/điểm/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Bé làm đúng/)).not.toBeInTheDocument()

    // Khóa phụ huynh: giữ nút 3 giây mới thấy lời nhắn.
    const gate = screen.getByRole('button', { name: 'Dành cho phụ huynh' })

    vi.useFakeTimers({ shouldAdvanceTime: true })
    fireEvent.pointerDown(gate)
    act(() => {
      vi.advanceTimersByTime(3000)
    })
    vi.useRealTimers()

    expect(screen.getByRole('region', { name: 'Dành cho phụ huynh' })).toHaveTextContent('Bé làm đúng 2/3 câu')
    expect(screen.queryByRole('button', { name: 'Xem lại đáp án' })).not.toBeInTheDocument()
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
  it('chơi hết 3 câu: biệt danh, số câu đúng, điểm; chơi lại về màn vào không hỏi lại biệt danh', async () => {
    openPlay('MOCK10')
    await startStudent()
    for (const answer of ['3', '4', '9']) {
      await screen.findByText(answer)
      tap(answer)
      await next(answer === '9' ? 'Xem kết quả' : 'Câu tiếp theo')
    }

    expect(await screen.findByRole('heading', { name: 'Hoàn thành!' })).toBeInTheDocument()
    expect(screen.getByText('Sao Băng')).toBeInTheDocument()
    expect(screen.getByText('2/3 câu đúng')).toBeInTheDocument()
    expect(screen.getByText(/^\d+ điểm$/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Chơi lại' }))

    expect(await screen.findByRole('button', { name: 'Bắt đầu' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Biệt danh')).not.toBeInTheDocument()
  })

  it('xem lại đáp án: lọc câu sai, thấy đáp án đúng, quay lại kết quả', async () => {
    openPlay('MOCK10')
    await startStudent()
    for (const answer of ['3', '4', '9']) {
      await screen.findByText(answer)
      tap(answer)
      await next(answer === '9' ? 'Xem kết quả' : 'Câu tiếp theo')
    }

    fireEvent.click(await screen.findByRole('button', { name: 'Xem lại đáp án' }))

    expect(await screen.findByRole('heading', { name: 'Xem lại đáp án' })).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
    expect(screen.getByRole('button', { name: 'Tất cả (3)' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Câu sai (1)' }))

    expect(screen.getAllByRole('listitem')).toHaveLength(1)
    expect(screen.getByText(/Đáp án đúng:/)).toBeInTheDocument()
    expect(screen.getByText('Chỉ hiện đáp án đúng.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Quay lại kết quả' }))

    expect(await screen.findByRole('heading', { name: 'Hoàn thành!' })).toBeInTheDocument()
  })

  it('có đồng hồ và điểm; trả lời đúng thì cộng điểm', async () => {
    openPlay('MOCK10')
    await startStudent()

    expect(await screen.findByRole('timer')).toHaveTextContent('30 giây')
    expect(screen.getByText('Câu 1/3')).toBeInTheDocument()

    tap('3')
    expect(await screen.findByText(/Chính xác! \+\d+ điểm/)).toBeInTheDocument()
    expect(screen.getByText(/^\d+ điểm$/)).toBeInTheDocument()
  })

  it('hết giờ thì tự nộp "hết giờ", báo "Hết giờ." và cho sang câu sau', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    openPlay('MOCK10')
    await startStudent()
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
    await startStudent()
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
    await startStudent()
    await screen.findByRole('timer')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(20_000)
    })

    expect(screen.queryByText(HINT)).not.toBeInTheDocument()
  })

  it('khung Học sinh: đúng hai câu liên tiếp thì nhắc chuỗi', async () => {
    openPlay('MOCK10')
    await startStudent()

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

  it('loại game chưa có renderer: báo chưa chơi được, không có nút Bắt đầu', async () => {
    const renderers = await import('../renderers')
    const spy = vi.spyOn(renderers, 'getPlayableRenderer').mockReturnValue(undefined)

    try {
      openPlay('MOCK04')

      expect(await screen.findByText(/chưa chơi được/)).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Bắt đầu' })).not.toBeInTheDocument()
    } finally {
      spy.mockRestore()
    }
  })
})

describe('màn trước khi chơi (P2.2)', () => {
  it('khung Học sinh: biệt danh, intro có công tắc và cách chơi, rồi vào câu; phiên tạo với biệt danh đã nhập', async () => {
    const spy = vi.spyOn(MockPlayerApi.prototype, 'createSession')
    openPlay('MOCK10')

    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument()
    await submitNickname('Sao Băng')

    expect(await screen.findByRole('switch', { name: 'Tự đọc đề bài' })).not.toBeChecked()
    expect(screen.getByText('Mỗi câu là một màn chơi.')).toBeInTheDocument()
    expect(screen.getByText('Trả lời đúng và nhanh được nhiều điểm hơn.')).toBeInTheDocument()
    expect(screen.getByText('Chơi xong được xem lại đáp án.')).toBeInTheDocument()
    await start()

    expect(await screen.findByRole('timer')).toBeInTheDocument()
    expect(spy).toHaveBeenCalledWith('MOCK10', 'Sao Băng')
  })

  it('biệt danh rỗng thì báo lỗi, không gọi API', async () => {
    const spy = vi.spyOn(MockPlayerApi.prototype, 'createSession')
    openPlay('MOCK10')
    await screen.findByLabelText('Biệt danh')
    await submitNickname('   ')

    expect(await screen.findByRole('alert')).toHaveTextContent('Bạn hãy gõ một biệt danh nhé.')
    expect(screen.getByLabelText('Biệt danh')).toHaveAttribute('aria-invalid', 'true')
    expect(spy).not.toHaveBeenCalled()
  })

  it('biệt danh có từ cấm: sau Bắt đầu quay lại màn biệt danh với thông báo của máy chủ, chữ còn nguyên', async () => {
    openPlay('MOCK10')
    await screen.findByLabelText('Biệt danh')
    await submitNickname('ngu ngốc')
    await start()

    expect(await screen.findByRole('alert')).toHaveTextContent('Biệt danh có từ không phù hợp. Bạn chọn biệt danh khác nhé.')
    expect(screen.getByLabelText('Biệt danh')).toHaveValue('ngu ngốc')
    expect(screen.getByLabelText('Biệt danh')).toHaveFocus()

    // Gõ lại biệt danh hợp lệ: qua màn vào lần nữa rồi chơi được.
    await submitNickname('Sao Băng')
    await start()
    expect(await screen.findByText('Câu 1/3')).toBeInTheDocument()
  })

  it('lỗi 400 khi TẢI CÂU HỎI (không phải khi tạo phiên): báo lỗi thường, không quay về màn biệt danh', async () => {
    vi.spyOn(MockPlayerApi.prototype, 'getGameForStudent').mockRejectedValueOnce(mockApiError(400, 'VALIDATION_ERROR', 'x'))
    openPlay('MOCK10')
    await screen.findByLabelText('Biệt danh')
    await submitNickname('Sao Băng')
    await start()

    expect(await screen.findByRole('button', { name: 'Thử lại' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Biệt danh')).toBeNull()
  })

  it('khung Bé: không có màn biệt danh, chào bé rồi vào câu', async () => {
    openPlay('MOCK00')

    expect(await screen.findByRole('heading', { name: /^Chào bé!/ })).toBeInTheDocument()
    expect(screen.queryByLabelText('Biệt danh')).not.toBeInTheDocument()
    expect(screen.queryByRole('switch')).not.toBeInTheDocument()
    await start()

    expect(await screen.findByRole('img', { name: 'Câu 1/3' })).toBeInTheDocument()
  })

  it('âm thanh bị chặn: khung Bé thấy "Chạm để bắt đầu", chạm xong thấy câu hỏi', async () => {
    setAudioLockSimulated(true)
    openPlay('MOCK00')
    await start()

    fireEvent.click(await screen.findByRole('button', { name: /Chạm để bắt đầu/ }))

    expect(await screen.findByRole('img', { name: 'Câu 1/3' })).toBeInTheDocument()
  })

  it('khung Học sinh tắt tự đọc thì không chặn dù âm thanh bị khóa', async () => {
    setAudioLockSimulated(true)
    openPlay('MOCK10')
    await startStudent()

    expect(await screen.findByRole('timer')).toBeInTheDocument()
    expect(screen.queryByText('Chạm để bắt đầu')).not.toBeInTheDocument()
  })
})

describe('lỗi và mất mạng (P2.5)', () => {
  it('mất mạng giữa lúc nộp: báo đang nối lại, mạng về thì có kết quả và điểm chỉ tính một lần', async () => {
    openPlay('MOCK10')
    await startStudent()
    await screen.findByText('Câu 1/3')

    setMockScenario('error')
    tap('3')

    expect((await screen.findByText(/Mất kết nối/)).closest('[role="status"]')).toHaveTextContent('Mất kết nối. Đang thử nối lại… Tiến độ của bạn vẫn được giữ.')

    setMockScenario('normal')
    act(() => {
      window.dispatchEvent(new Event('online'))
    })

    const message = await screen.findByText(/^Chính xác! \+\d+ điểm$/)
    const points = /\+(\d+)/.exec(message.textContent ?? '')![1]

    expect(screen.getByText(`${points} điểm`)).toBeInTheDocument()
    expect(screen.queryByText(/Mất kết nối/)).not.toBeInTheDocument()

    await next()
    expect(await screen.findByText('Câu 2/3')).toBeInTheDocument()
    expect(screen.getByText(`${points} điểm`)).toBeInTheDocument()
  })

  it('khung Bé nói ngắn hơn khi nối lại mạng', async () => {
    openPlay('MOCK00')
    await start()
    await screen.findByRole('img', { name: 'Câu 1/3' })

    setMockScenario('error')
    tap('3')

    expect((await screen.findByText(/Đang nối lại/)).closest('[role="status"]')).toHaveTextContent('Đang nối lại mạng, con chờ một chút nhé.')
  })

  it('tạo phiên lỗi mạng ở khung Học sinh: có Nhập lại mã và Thử lại; mạng về thì Thử lại vào được câu', async () => {
    openPlay('MOCK10')
    await screen.findByLabelText('Biệt danh')
    await submitNickname('Sao Băng')
    setMockScenario('error')
    await start()

    expect(await screen.findByRole('heading', { name: 'Chưa kết nối được' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Nhập lại mã' })).toHaveAttribute('href', '/join')
    expect(screen.getByText('Mã lỗi: NET-01')).toBeInTheDocument()

    setMockScenario('normal')
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))

    expect(await screen.findByText('Câu 1/3')).toBeInTheDocument()
  })

  it('đang ở màn lỗi vào chơi thì tự thử lại khi có mạng', async () => {
    openPlay('MOCK00')
    await screen.findByRole('button', { name: 'Bắt đầu' })
    setMockScenario('error')
    await start()
    await screen.findByText(/mã lỗi NET-01/)

    setMockScenario('normal')
    // Listener `online` gắn trong effect của pha lỗi; máy bận thì effect có thể chưa chạy khi findBy ở trên trả về (xem
    // pressUntil). Gửi lại tới khi thấy câu 1; start() có cờ chặn chạy trùng nên gửi thừa vô hại.
    await waitFor(() => {
      if (screen.queryByText(/mã lỗi NET-01/)) fireEvent(window, new Event('online'))
      expect(screen.getByRole('img', { name: 'Câu 1/3' })).toBeInTheDocument()
    })
  })

  it('tải lại trang giữa chừng: không hỏi lại biệt danh, vào thẳng câu chưa làm', async () => {
    const created = vi.spyOn(MockPlayerApi.prototype, 'createSession')
    const first = openPlay('MOCK10')
    await startStudent()
    await screen.findByText('Câu 1/3')
    tap('3')
    await screen.findByText(/^Chính xác!/)
    first.unmount()

    openPlay('MOCK10')

    expect(await screen.findByRole('button', { name: 'Bắt đầu' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Biệt danh')).not.toBeInTheDocument()
    await start()

    expect(await screen.findByText('Câu 2/3')).toBeInTheDocument()
    expect(created).toHaveBeenCalledTimes(1)
  })

  it('phiên đã lưu không còn trên máy chủ (404): bỏ phiên cũ, tạo phiên mới', async () => {
    sessionStorage.setItem('player:session:MOCK00', JSON.stringify({ sessionId: 'mock-session-gone', participantId: 'p', nickname: 'Bạn nhỏ 1111' }))
    const created = vi.spyOn(MockPlayerApi.prototype, 'createSession')
    openPlay('MOCK00')
    await start()

    expect(await screen.findByRole('img', { name: 'Câu 1/3' })).toBeInTheDocument()
    expect(created).toHaveBeenCalledTimes(1)
    expect(sessionStorage.getItem('player:session:MOCK00')).not.toContain('mock-session-gone')
  })

  it('Chơi lại xóa phiên đã lưu: lượt sau là phiên mới', async () => {
    const created = vi.spyOn(MockPlayerApi.prototype, 'createSession')
    openPlay('MOCK10')
    await startStudent()
    for (const answer of ['3', '4', '9']) {
      await screen.findByText(answer)
      tap(answer)
      await next(answer === '9' ? 'Xem kết quả' : 'Câu tiếp theo')
    }
    expect(sessionStorage.getItem('player:session:MOCK10')).not.toBeNull()

    fireEvent.click(await screen.findByRole('button', { name: 'Chơi lại' }))
    expect(sessionStorage.getItem('player:session:MOCK10')).toBeNull()

    await start()

    expect(await screen.findByText('Câu 1/3')).toBeInTheDocument()
    expect(created).toHaveBeenCalledTimes(2)
  })
})

// Giả lập `window.matchMedia`: chỉ truy vấn "điện thoại dọc" (có `portrait`) theo `portrait`; truy vấn khác luôn false.
function stubPortraitPhone(initial: boolean) {
  let portrait = initial
  const listeners = new Set<() => void>()

  vi.stubGlobal('matchMedia', (query: string) => ({
    get matches() {
      return query.includes('portrait') && portrait
    },
    media: query,
    addEventListener: (_: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
  }))

  return (value: boolean) =>
    act(() => {
      portrait = value
      listeners.forEach((listener) => listener())
    })
}

const ROTATE_TITLE = 'Xoay ngang điện thoại để chơi nhé!'

describe('thiết bị: điện thoại dọc (P2.6)', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('khung Bé, MATCHING, điện thoại dọc: nhắc xoay máy; xoay ngang thì tự vào câu', async () => {
    const rotate = stubPortraitPhone(true)
    openPlay('MOCK01')
    await start()

    expect(await screen.findByRole('heading', { name: ROTATE_TITLE })).toBeInTheDocument()
    // Câu nằm phía sau lớp phủ, bị khóa (inert) cho tới khi xoay ngang.
    expect((await screen.findByRole('img', { name: /^Câu 1\// })).closest('[inert]')).not.toBeNull()

    rotate(false)

    expect(screen.queryByRole('heading', { name: ROTATE_TITLE })).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: /^Câu 1\// }).closest('[inert]')).toBeNull()
  })

  it('lỡ xoay dọc giữa câu: câu không bị dựng lại (vẫn là cùng phần tử), xoay ngang lại thì chơi tiếp', async () => {
    const rotate = stubPortraitPhone(false)
    openPlay('MOCK01')
    await start()
    const progress = await screen.findByRole('img', { name: /^Câu 1\// })

    rotate(true)
    expect(screen.getByRole('heading', { name: ROTATE_TITLE })).toBeInTheDocument()
    rotate(false)

    expect(screen.getByRole('img', { name: /^Câu 1\// })).toBe(progress)
  })

  it('"Người lớn: vẫn chơi màn dọc" bỏ màn nhắc và vào câu', async () => {
    stubPortraitPhone(true)
    openPlay('MOCK01')
    await start()

    fireEvent.click(await screen.findByRole('button', { name: 'Người lớn: vẫn chơi màn dọc' }))

    expect(await screen.findByRole('img', { name: /^Câu 1\// })).toBeInTheDocument()
  })

  it('khung Học sinh (MATCHING) và QUIZ ở khung Bé không bị chặn', async () => {
    stubPortraitPhone(true)
    const student = openPlay('MOCK11')
    await startStudent()

    expect(await screen.findByText(/^Câu 1\//)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: ROTATE_TITLE })).not.toBeInTheDocument()
    student.unmount()
    sessionStorage.clear()

    openPlay('MOCK00')
    await start()

    expect(await screen.findByRole('img', { name: 'Câu 1/3' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: ROTATE_TITLE })).not.toBeInTheDocument()
  })
})

const press = (key: string, target: Element | Window = window) => fireEvent.keyDown(target, { key })
// findBy trả về ngay khi DOM có phần tử, nhưng listener phím (usePlayerHotkeys) và handler mới nhất được gắn trong effect:
// asyncWrapper của Testing Library tắt act lúc chờ, nên máy bận thì effect có thể chạy SAU khi findBy trả về và phím gửi
// ngay bị mất (đã gặp 3 lần ở CI/máy bận, luôn "không tìm thấy" sau đúng 10 giây). Gửi lại tới khi thấy kết quả; lần
// bị mất không có tác dụng gì, và chỉ gửi khi kết quả chưa có nên không bấm thừa.
const pressUntil = (key: string, done: () => boolean) =>
  waitFor(() => {
    if (!done()) press(key)
    expect(done()).toBe(true)
  })
const pauseShown = () => screen.queryByRole('dialog', { name: 'Tạm dừng' }) !== null

describe('phím tắt (P2.6)', () => {
  it('Enter sau khi có kết quả sang câu sau; chưa có kết quả thì không làm gì', async () => {
    openPlay('MOCK00')
    await start()
    await screen.findByRole('img', { name: 'Câu 1/3' })

    press('Enter')
    expect(screen.getByRole('img', { name: 'Câu 1/3' })).toBeInTheDocument()

    tap('3')
    await screen.findByText('Giỏi quá!')
    await pressUntil('Enter', () => screen.queryByRole('img', { name: 'Câu 2/3' }) !== null)
  })

  it('QUIZ: phím 1 chọn lựa chọn đầu và nộp như chạm', async () => {
    const submit = vi.spyOn(MockPlayerApi.prototype, 'submitInteraction')
    openPlay('MOCK00')
    await start()
    await screen.findByRole('img', { name: 'Câu 1/3' })

    await pressUntil('1', () => submit.mock.calls.length > 0)

    expect(await screen.findByRole('button', { name: 'Câu tiếp theo' })).toBeInTheDocument()
    expect(submit).toHaveBeenCalledTimes(1)

    press('2') // đã khóa: không nộp thêm
    expect(submit).toHaveBeenCalledTimes(1)
  })

  it('đang tạm dừng: phím 1 (kể cả khi focus rơi về body) không nộp câu phía sau', async () => {
    const submit = vi.spyOn(MockPlayerApi.prototype, 'submitInteraction')
    openPlay('MOCK00')
    await start()
    await screen.findByRole('img', { name: 'Câu 1/3' })

    await pressUntil('Escape', pauseShown)
    ;(document.activeElement as HTMLElement | null)?.blur()
    press('1', document.body)

    expect(submit).not.toHaveBeenCalled()
  })

  it('thời gian tạm dừng không tính vào thời gian làm bài gửi lên máy chủ', async () => {
    const submit = vi.spyOn(MockPlayerApi.prototype, 'submitInteraction')
    openPlay('MOCK10')
    await startStudent()
    await screen.findByText(/^Câu 1\//)

    // Giả lập 20 giây trôi qua trong lúc tạm dừng bằng cách đẩy Date.now (không dùng fake timers để mock vẫn chạy bình thường).
    const realNow = Date.now.bind(Date)
    let offset = 0
    vi.spyOn(Date, 'now').mockImplementation(() => realNow() + offset)

    await pressUntil('Escape', pauseShown)
    offset = 20_000
    press('Escape')
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Tạm dừng' })).toBeNull())
    press('1')

    await screen.findByRole('button', { name: 'Câu tiếp theo' })
    expect(submit.mock.calls[0][3]).toBeLessThan(10_000)
  })

  it('Esc tạm dừng: hộp thoại hiện, đồng hồ đứng; Esc lần nữa chơi tiếp', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    openPlay('MOCK10')
    await startStudent()
    await screen.findByRole('timer')
    await screen.findByRole('button', { name: 'Tạm dừng' })

    await pressUntil('Escape', pauseShown)
    const before = screen.getByRole('timer').textContent

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000)
    })
    expect(screen.getByRole('timer')).toHaveTextContent(before!)

    press('Escape')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_000)
    })
    expect(screen.getByRole('timer')).not.toHaveTextContent(before!)
  })

  it('khung Học sinh có nút Tạm dừng và Chơi tiếp; khung Bé không có nút', async () => {
    openPlay('MOCK10')
    await startStudent()
    fireEvent.click(await screen.findByRole('button', { name: 'Tạm dừng' }))
    fireEvent.click(screen.getByRole('button', { name: 'Chơi tiếp' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('khung Bé: không có nút Tạm dừng nhưng Esc vẫn chạy', async () => {
    openPlay('MOCK00')
    await start()
    await screen.findByRole('img', { name: 'Câu 1/3' })

    expect(screen.queryByRole('button', { name: 'Tạm dừng' })).not.toBeInTheDocument()
    await pressUntil('Escape', pauseShown)
  })

  it('đang gõ trong ô nhập thì phím tắt không kích hoạt', async () => {
    openPlay('MOCK00')
    await start()
    await screen.findByRole('img', { name: 'Câu 1/3' })

    const input = document.body.appendChild(document.createElement('input'))

    press('Escape', input)
    press('1', input)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Câu tiếp theo' })).not.toBeInTheDocument()
    input.remove()
  })
})
