import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { mockQuizQuestion } from '../../../games/quiz/QuizRenderer.fixtures'
import { mockMatchingQuestion } from '../../../games/matching/MatchingRenderer.fixtures'
import { mockOrderingButterflyQuestion } from '../../../games/ordering/OrderingRenderer.fixtures'
import LivePreviewPanel from './LivePreviewPanel'

vi.mock('react-konva', () => ({
  Stage: ({ children }: { children?: React.ReactNode }) => <div data-testid="konva-stage">{children}</div>,
  Layer: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Group: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Rect: () => null,
  Text: ({ text }: { text?: string }) => <span>{text}</span>,
  Image: () => null,
}))

vi.mock('use-image', () => ({
  default: () => [undefined],
}))

describe('LivePreviewPanel', () => {
  it('renders QuizRenderer when gameType is QUIZ', () => {
    render(<LivePreviewPanel gameType="QUIZ" currentQuestion={mockQuizQuestion} />)
    expect(screen.getByTestId('live-preview-panel')).toBeInTheDocument()
    expect(screen.getByText(/Xem trước – học sinh sẽ thấy như thế này/i)).toBeInTheDocument()
    expect(screen.getByTestId('konva-stage')).toBeInTheDocument()
  })

  it('renders MatchingRenderer when gameType is MATCHING', () => {
    render(<LivePreviewPanel gameType="MATCHING" currentQuestion={mockMatchingQuestion} />)
    expect(screen.getByTestId('live-preview-panel')).toBeInTheDocument()
    expect(screen.getByTestId('konva-stage')).toBeInTheDocument()
  })

  it('renders OrderingRenderer when gameType is ORDERING', () => {
    render(<LivePreviewPanel gameType="ORDERING" currentQuestion={mockOrderingButterflyQuestion} />)
    expect(screen.getByTestId('live-preview-panel')).toBeInTheDocument()
    expect(screen.getByTestId('konva-stage')).toBeInTheDocument()
  })

  it('renders unsupported message when gameType has no renderer registered', () => {
    render(<LivePreviewPanel gameType="SPOT_THE_TARGET" currentQuestion={{ id: 'q1' }} />)
    expect(screen.getByTestId('preview-unsupported')).toBeInTheDocument()
    expect(screen.getByText(/Chưa hỗ trợ preview cho loại game này/i)).toBeInTheDocument()
  })

  it('renders empty message when currentQuestion is null or undefined', () => {
    render(<LivePreviewPanel gameType="QUIZ" currentQuestion={null} />)
    expect(screen.getByTestId('preview-empty')).toBeInTheDocument()
    expect(screen.getByText(/Chưa có dữ liệu câu hỏi để xem trước/i)).toBeInTheDocument()
  })
})
