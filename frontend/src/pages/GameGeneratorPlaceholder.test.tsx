import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import GameGeneratorPlaceholder from './GameGeneratorPlaceholder'
import { generateGame } from '../api/gamesApi'

vi.mock('../api/gamesApi', () => ({ generateGame: vi.fn() }))
vi.mock('../games/quiz/QuizRenderer', () => ({ default: ({ question }: { question: { questionText: string } }) => <p>{question.questionText}</p> }))

describe('GameGeneratorPlaceholder', () => {
  beforeEach(() => vi.clearAllMocks())

  it('sends the teacher request, shows saved quiz, review status and source evidence', async () => {
    vi.mocked(generateGame).mockResolvedValue({
      gameId: 'saved-game-1',
      game: {
        schemaVersion: '1.0.0', gameType: 'QUIZ',
        metadata: { title: 'Cộng trong phạm vi 10', subject: 'MATH', gradeLevel: 'GRADE_1', topic: 'cộng trong phạm vi 10' },
        gameplaySettings: { hitboxScale: 1.5 },
        questions: [{ id: 'q1', timeLimitSeconds: 30, points: 10, questionText: '2 + 3 = ?', options: [{ id: 'a', text: '5' }], correctOptionId: 'a' }],
      },
      curriculum: {
        evidence: { chunks: [{ chunkId: 'math-g1-007', topic: 'Phép cộng', text: 'Thực hiện được phép cộng trong phạm vi 10.', sourceDocument: 'TT32.pdf', pdfPages: [120], printedPages: [8] }] },
        review: { status: 'REVIEWED', claims: [], warnings: [] },
      },
    })

    render(<GameGeneratorPlaceholder />)
    fireEvent.change(screen.getByLabelText('Cô muốn tạo game cho nội dung nào?'), { target: { value: 'cộng trong phạm vi 10' } })
    fireEvent.click(screen.getByRole('button', { name: 'Tạo game' }))

    await waitFor(() => expect(generateGame).toHaveBeenCalledWith({
      gameType: 'QUIZ', topic: 'cộng trong phạm vi 10', subject: 'MATH', gradeLevel: 'GRADE_1',
    }))
    expect(await screen.findByText('2 + 3 = ?')).toBeInTheDocument()
    expect(screen.getByText(/Bản nháp đã lưu · mã saved-game-1/)).toBeInTheDocument()
    expect(screen.getByText('math-g1-007 · Phép cộng')).toBeInTheDocument()
    expect(screen.getByText(/PDF 120 · trang in 8/)).toBeInTheDocument()
  })

  it('shows API refusal without rendering an unpersisted result', async () => {
    vi.mocked(generateGame).mockRejectedValue({ response: { data: { error: { code: 'INSUFFICIENT_EVIDENCE', message: 'Thiếu căn cứ chương trình.' } } }, isAxiosError: true })
    render(<GameGeneratorPlaceholder />)
    fireEvent.change(screen.getByLabelText('Cô muốn tạo game cho nội dung nào?'), { target: { value: 'vượt phạm vi' } })
    fireEvent.click(screen.getByRole('button', { name: 'Tạo game' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Thiếu căn cứ chương trình.')
    expect(screen.queryByLabelText('Kết quả game')).not.toBeInTheDocument()
  })
})
