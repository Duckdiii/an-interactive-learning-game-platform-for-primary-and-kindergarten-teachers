import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import QuizRenderer from './QuizRenderer'
import { mockQuizQuestion } from './QuizRenderer.fixtures'

// Mode play chỉ tin đáp án đúng do máy chủ trả sau khi chấm (correctAnswer), không đọc correctOptionId trong câu hỏi.
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
}))
vi.mock('use-image', () => ({ default: () => [undefined] }))
vi.mock('howler', () => ({ Howl: class { play = vi.fn(); stop = vi.fn(); unload = vi.fn() } }))
vi.mock('../common/measureText', () => ({ measureWrappedTextHeight: () => null }))
vi.mock('../common/useFeedback', () => ({ useFeedback: () => ({ showFeedback: vi.fn() }) }))
vi.mock('../common/OptionButton', () => ({
  default: ({ option, isCorrect, onClick }: { option: { id: string; text: string }; isCorrect: boolean; onClick: () => void }) => (
    <button data-correct={isCorrect ? 'yes' : 'no'} onClick={onClick}>
      {option.text}
    </button>
  ),
}))

const correctFlags = () => screen.getAllByRole('button').map((b) => b.getAttribute('data-correct'))

describe('QuizRenderer, mode play: đáp án đúng đến từ máy chủ', () => {
  it('tô ô theo correctAnswer của máy chủ, bỏ qua correctOptionId lỡ nằm trong câu hỏi', async () => {
    // Fixture đầy đủ có correctOptionId = 'b'; máy chủ nói đáp án đúng là 'c'.
    const { options } = mockQuizQuestion
    const onAnswered = vi.fn().mockResolvedValue({ isCorrect: false, correctAnswer: { selectedOptionId: 'c' } })
    render(<QuizRenderer mode="play" question={mockQuizQuestion} onAnswered={onAnswered} />)

    fireEvent.click(screen.getByText(options[0].text))

    await waitFor(() => expect(correctFlags()).toContain('yes'))
    expect(screen.getByText(options[2].text)).toHaveAttribute('data-correct', 'yes')
    expect(screen.getByText(options[1].text)).toHaveAttribute('data-correct', 'no')
  })

  it('máy chủ không trả correctAnswer (hoặc cha chỉ trả boolean) thì không tô ô nào', async () => {
    const onAnswered = vi.fn().mockResolvedValue({ isCorrect: false })
    render(<QuizRenderer mode="play" question={mockQuizQuestion} onAnswered={onAnswered} />)

    fireEvent.click(screen.getByText(mockQuizQuestion.options[0].text))

    await waitFor(() => expect(onAnswered).toHaveBeenCalled())
    expect(correctFlags().every((flag) => flag === 'no')).toBe(true)
  })

  it('mode preview vẫn tô theo correctOptionId của giáo viên', async () => {
    render(<QuizRenderer mode="preview" question={mockQuizQuestion} />)

    fireEvent.click(screen.getByText(mockQuizQuestion.options[0].text))

    await waitFor(() =>
      expect(screen.getByText(mockQuizQuestion.options.find((o) => o.id === mockQuizQuestion.correctOptionId)!.text)).toHaveAttribute('data-correct', 'yes'),
    )
  })
})
