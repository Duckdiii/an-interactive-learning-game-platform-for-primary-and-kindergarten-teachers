import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import QuizRenderer from './QuizRenderer'
import { mockQuizQuestion } from './QuizRenderer.fixtures'

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

const showFeedbackMock = vi.fn()
vi.mock('../common/useFeedback', () => ({
  useFeedback: () => ({ showFeedback: showFeedbackMock }),
}))

describe('QuizRenderer', () => {
  beforeEach(() => {
    showFeedbackMock.mockClear()
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

  it('review mode: khoá sẵn, không cho bấm, không gọi onAnswered', () => {
    const onAnswered = vi.fn()
    render(
      <QuizRenderer
        question={mockQuizQuestion}
        mode="review"
        selectedOptionId="a"
        onAnswered={onAnswered}
      />,
    )

    fireEvent.click(screen.getByText('3'))

    expect(onAnswered).not.toHaveBeenCalled()
  })
})
