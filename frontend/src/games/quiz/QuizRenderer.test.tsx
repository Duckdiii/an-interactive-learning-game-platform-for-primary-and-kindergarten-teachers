import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import QuizRenderer from './QuizRenderer'
import { mockQuizQuestion, mockQuizQuestionNoMedia } from './QuizRenderer.fixtures'

/**
 * react-konva vẽ lên <canvas> thật, còn jsdom không hỗ trợ đầy đủ Canvas 2D API (không có hit-test
 * pixel thật) — nên mock react-konva/use-image thành DOM thường để test được hành vi (gọi đúng
 * callback, khoá đúng lúc), không assert màu sắc/toạ độ vẽ (đã verify bằng mắt qua Browser pane).
 */
vi.mock('react-konva', () => ({
  Stage: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Layer: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Group: ({
    children,
    onClick,
  }: {
    children?: React.ReactNode
    onClick?: () => void
  }) => (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div onClick={onClick}>{children}</div>
  ),
  Rect: () => null,
  Text: ({ text }: { text?: string }) => <span>{text}</span>,
  Image: () => null,
}))

vi.mock('use-image', () => ({
  default: () => [undefined],
}))

const howlCtorMock = vi.fn()
const howlPlayMock = vi.fn()
const howlStopMock = vi.fn()
const howlUnloadMock = vi.fn()
vi.mock('howler', () => ({
  Howl: class {
    constructor(options: unknown) {
      howlCtorMock(options)
    }
    play = howlPlayMock
    stop = howlStopMock
    unload = howlUnloadMock
  },
}))

// jsdom không có Canvas nên Konva không đo được chữ; mock về null để layout dùng phép ước lượng.
const measureMock = vi.fn((): number | null => null)
vi.mock('../common/measureText', () => ({
  measureWrappedTextHeight: (...args: unknown[]) => measureMock(...(args as [])),
}))

const showFeedbackMock = vi.fn()
vi.mock('../common/useFeedback', () => ({
  useFeedback: () => ({ showFeedback: showFeedbackMock }),
}))

describe('QuizRenderer', () => {
  beforeEach(() => {
    showFeedbackMock.mockClear()
    howlCtorMock.mockClear()
    howlPlayMock.mockClear()
    howlStopMock.mockClear()
    howlUnloadMock.mockClear()
    measureMock.mockClear()
  })

  it('nút Nghe lại phát đúng audioUrl; bấm nhiều lần chỉ tạo Howl một lần và phát lại từ đầu', () => {
    render(<QuizRenderer question={mockQuizQuestion} mode="preview" />)

    fireEvent.click(screen.getByText('🔊 Nghe lại'))
    fireEvent.click(screen.getByText('🔊 Nghe lại'))
    fireEvent.click(screen.getByText('🔊 Nghe lại'))

    expect(howlCtorMock).toHaveBeenCalledTimes(1)
    expect(howlCtorMock).toHaveBeenCalledWith({ src: [mockQuizQuestion.audioUrl] })
    expect(howlStopMock).toHaveBeenCalledTimes(3)
    expect(howlPlayMock).toHaveBeenCalledTimes(3)
  })

  it('đóng component thì giải phóng audio (unload)', () => {
    const { unmount } = render(<QuizRenderer question={mockQuizQuestion} mode="preview" />)

    unmount()

    expect(howlUnloadMock).toHaveBeenCalledTimes(1)
  })

  it('đổi sang câu có audioUrl khác thì unload audio cũ và tạo audio mới', () => {
    const next = { ...mockQuizQuestion, id: 'q3', audioUrl: '/mock/q3.wav' }
    const { rerender } = render(<QuizRenderer question={mockQuizQuestion} mode="preview" />)

    rerender(<QuizRenderer question={next} mode="preview" />)

    expect(howlUnloadMock).toHaveBeenCalledTimes(1)
    expect(howlCtorMock).toHaveBeenCalledTimes(2)
    expect(howlCtorMock).toHaveBeenLastCalledWith({ src: ['/mock/q3.wav'] })
  })

  it('đổi mode nhưng giữ nguyên câu thì không tạo lại audio', () => {
    const { rerender } = render(<QuizRenderer question={mockQuizQuestion} mode="preview" />)

    rerender(<QuizRenderer question={mockQuizQuestion} mode="review" selectedOptionId="a" />)

    expect(howlCtorMock).toHaveBeenCalledTimes(1)
    expect(howlUnloadMock).not.toHaveBeenCalled()
  })

  it('câu không có audio thì không tạo Howl nào', () => {
    render(<QuizRenderer question={mockQuizQuestionNoMedia} mode="preview" />)

    expect(howlCtorMock).not.toHaveBeenCalled()
  })

  it('đo chiều cao câu hỏi theo đúng chữ, cỡ chữ và độ rộng đang vẽ', () => {
    render(<QuizRenderer question={mockQuizQuestion} mode="preview" />)

    expect(measureMock).toHaveBeenCalledWith({
      text: mockQuizQuestion.questionText,
      fontSize: 32,
      width: 720,
    })
  })

  it('preview mode: onAnswered trả Promise bị reject thì chỉ ghi log, không thành unhandled rejection', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const onAnswered = vi.fn().mockRejectedValue(new Error('cha lỗi'))
    render(<QuizRenderer question={mockQuizQuestion} mode="preview" onAnswered={onAnswered} />)

    fireEvent.click(screen.getByText('3'))

    await waitFor(() => expect(consoleErrorSpy).toHaveBeenCalled())
    expect(showFeedbackMock).toHaveBeenCalledWith(true) // feedback vẫn hiện bình thường
    consoleErrorSpy.mockRestore()
  })

  it('câu không có audioUrl thì không hiện nút Nghe lại', () => {
    render(<QuizRenderer question={mockQuizQuestionNoMedia} mode="preview" />)

    expect(screen.queryByText('🔊 Nghe lại')).not.toBeInTheDocument()
  })

  it('nút Nghe lại vẫn bấm được sau khi đã chọn đáp án (đã khoá)', () => {
    render(<QuizRenderer question={mockQuizQuestion} mode="preview" />)

    fireEvent.click(screen.getByText('2'))
    fireEvent.click(screen.getByText('🔊 Nghe lại'))

    expect(howlPlayMock).toHaveBeenCalledTimes(1)
  })

  it('renders the question and every option from the fixture', () => {
    render(<QuizRenderer question={mockQuizQuestion} mode="preview" />)

    expect(screen.getByText(mockQuizQuestion.questionText)).toBeInTheDocument()
    for (const option of mockQuizQuestion.options) {
      expect(screen.getByText(option.text)).toBeInTheDocument()
    }
  })

  it('preview mode: so đáp án cục bộ và gọi showFeedback đúng đúng/sai', () => {
    render(<QuizRenderer question={mockQuizQuestion} mode="preview" />)

    fireEvent.click(screen.getByText('3')) // id 'b' — đáp án đúng

    expect(showFeedbackMock).toHaveBeenCalledWith(true)
  })

  it('preview mode: chọn sai vẫn khoá và báo sai qua showFeedback', () => {
    render(<QuizRenderer question={mockQuizQuestion} mode="preview" />)

    fireEvent.click(screen.getByText('2')) // id 'a' — sai

    expect(showFeedbackMock).toHaveBeenCalledWith(false)
  })

  it('play mode: gọi đúng onAnswered với optionId, không tự so đáp án', () => {
    const onAnswered = vi.fn()
    render(<QuizRenderer question={mockQuizQuestion} mode="play" onAnswered={onAnswered} />)

    fireEvent.click(screen.getByText('3'))

    expect(onAnswered).toHaveBeenCalledWith('b')
    expect(onAnswered).toHaveBeenCalledTimes(1)
  })

  it('play mode: đã chọn 1 lần thì khoá, bấm đáp án khác không gọi lại onAnswered', () => {
    const onAnswered = vi.fn()
    render(<QuizRenderer question={mockQuizQuestion} mode="play" onAnswered={onAnswered} />)

    fireEvent.click(screen.getByText('3'))
    fireEvent.click(screen.getByText('2'))

    expect(onAnswered).toHaveBeenCalledTimes(1)
  })

  it('play mode: hiện feedback sau khi cha (onAnswered) trả về kết quả bất đồng bộ', async () => {
    const onAnswered = vi.fn().mockResolvedValue(true)
    render(<QuizRenderer question={mockQuizQuestion} mode="play" onAnswered={onAnswered} />)

    fireEvent.click(screen.getByText('3'))

    await waitFor(() => expect(showFeedbackMock).toHaveBeenCalledWith(true))
  })

  it('play mode: lỗi từ onAnswered (reject) thì mở khoá lại để trẻ thử lại', async () => {
    const onAnswered = vi.fn().mockRejectedValueOnce(new Error('network lỗi')).mockResolvedValueOnce(true)
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(<QuizRenderer question={mockQuizQuestion} mode="play" onAnswered={onAnswered} />)

    fireEvent.click(screen.getByText('3'))
    await waitFor(() => expect(onAnswered).toHaveBeenCalledTimes(1))

    await waitFor(() => {
      fireEvent.click(screen.getByText('2'))
      expect(onAnswered).toHaveBeenCalledTimes(2)
    })

    consoleErrorSpy.mockRestore()
  })

  it('play mode: đổi câu khi promise cũ còn treo thì không áp kết quả cũ vào câu mới', async () => {
    let resolveFirst: (isCorrect: boolean) => void = () => {}
    const firstAnswerPromise = new Promise<boolean>((resolve) => {
      resolveFirst = resolve
    })
    const onAnswered = vi.fn().mockReturnValueOnce(firstAnswerPromise)

    const { rerender } = render(
      <QuizRenderer question={mockQuizQuestion} mode="play" onAnswered={onAnswered} />,
    )

    fireEvent.click(screen.getByText('3')) // câu cũ — promise chưa resolve

    // cha chuyển sang câu khác trước khi promise cũ kịp resolve
    rerender(
      <QuizRenderer question={mockQuizQuestionNoMedia} mode="play" onAnswered={onAnswered} />,
    )

    resolveFirst(true)
    await waitFor(() => expect(onAnswered).toHaveBeenCalledTimes(1))

    expect(showFeedbackMock).not.toHaveBeenCalled()
  })

  it('review mode: khoá sẵn, bấm đáp án không tạo feedback mới', () => {
    render(<QuizRenderer question={mockQuizQuestion} mode="review" selectedOptionId="a" />)

    fireEvent.click(screen.getByText('3'))

    expect(showFeedbackMock).not.toHaveBeenCalled()
  })

  it('review mode: câu hết giờ/bỏ qua (không có selectedOptionId) vẫn hiển thị được', () => {
    render(<QuizRenderer question={mockQuizQuestion} mode="review" />)

    expect(screen.getByText(mockQuizQuestion.questionText)).toBeInTheDocument()
  })
})
