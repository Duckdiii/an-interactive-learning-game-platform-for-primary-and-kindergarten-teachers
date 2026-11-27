import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { StudentMemoryCardQuestion } from '../../types/game-student.types'
import { PROFILES } from '../profile/profiles'
import { PresentationProvider } from '../theme/PresentationContext'
import MemoryCardPlayable from './MemoryCardPlayable'

vi.mock('../../games/common/sound', () => ({
  playSound: vi.fn(),
}))

const question: StudentMemoryCardQuestion = {
  id: 'q1',
  timeLimitSeconds: 30,
  points: 10,
  pairs: [
    { pairId: 'p1', content: { text: 'cat', imageUrl: '/assets/animals/cat.svg' } },
  ],
}

describe('MemoryCardPlayable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('dựng đủ 2 thẻ (1 cặp) ở trạng thái úp thẻ mặt sao ⭐', () => {
    const onSubmit = vi.fn()
    render(<MemoryCardPlayable question={question} profile={PROFILES.be} onSubmit={onSubmit} />)

    expect(screen.getByText(/Đã tìm được/)).toBeInTheDocument()
    const stars = screen.getAllByText('⭐')
    expect(stars).toHaveLength(2)
  })

  it('bấm vào thẻ thì lật thẻ và hiển thị nội dung/hình ảnh', () => {
    const onSubmit = vi.fn()
    render(<MemoryCardPlayable question={question} profile={PROFILES.be} onSubmit={onSubmit} />)

    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[0])

    expect(screen.getByText('cat')).toBeInTheDocument()
    expect(screen.getByText('Số lần lật:')).toHaveTextContent('1')
  })

  it('lật đúng cặp thẻ thì gọi onSubmit hoàn thành trò chơi', async () => {
    const onSubmit = vi.fn().mockResolvedValue({ status: 'CORRECT', isCorrect: true, pointsEarned: 10, totalScore: 10 })
    render(<MemoryCardPlayable question={question} profile={PROFILES.be} onSubmit={onSubmit} />)

    const buttons = screen.getAllByRole('button')
    // Cặp p1 có 2 thẻ, lật cả 2 thẻ
    fireEvent.click(buttons[0])
    fireEvent.click(buttons[1])

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        matchedPairIds: ['p1'],
        flips: 2,
        wrongPairs: [],
      })
    })
  })

  it('includes a distinct wrong pair when the student completes the question', async () => {
    const onSubmit = vi.fn().mockResolvedValue({ status: 'CORRECT', isCorrect: true, pointsEarned: 10, totalScore: 10 })
    const twoPairs = { ...question, pairs: [...question.pairs, { pairId: 'p2', content: { text: 'dog' } }] }
    render(<MemoryCardPlayable question={twoPairs} profile={PROFILES.be} onSubmit={onSubmit} />)

    const [first, second, third, fourth] = screen.getAllByRole('button')
    fireEvent.click(first)
    fireEvent.click(second)
    await waitFor(() => expect(first).toBeEnabled(), { timeout: 1500 })
    fireEvent.click(first)
    fireEvent.click(third)
    fireEvent.click(second)
    fireEvent.click(fourth)
    expect(onSubmit).toHaveBeenCalledWith({ matchedPairIds: ['p1', 'p2'], flips: 6, wrongPairs: [['p1', 'p2']] })
  })

  it('cho gửi lại cùng đáp án và giữ nguyên thẻ đã ghép khi lần nộp đầu bị lỗi', async () => {
    const onSubmit = vi.fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ status: 'CORRECT', isCorrect: true, pointsEarned: 10, totalScore: 10 })
    const twoPairs = { ...question, pairs: [...question.pairs, { pairId: 'p2', content: { text: 'dog' } }] }
    render(<MemoryCardPlayable question={twoPairs} profile={PROFILES.be} onSubmit={onSubmit} />)

    const [first, second, third, fourth] = screen.getAllByRole('button')
    fireEvent.click(first)
    fireEvent.click(second)
    await waitFor(() => expect(first).toBeEnabled(), { timeout: 1500 })
    fireEvent.click(first)
    fireEvent.click(third)
    fireEvent.click(second)
    fireEvent.click(fourth)
    const answer = { matchedPairIds: ['p1', 'p2'], flips: 6, wrongPairs: [['p1', 'p2']] }
    const retry = await screen.findByRole('button', { name: 'Gửi lại' })
    expect(first).toBeDisabled()
    expect(fourth).toBeDisabled()
    expect(screen.getByText('Số lần lật:')).toHaveTextContent('6')
    fireEvent.click(retry)

    await waitFor(() => expect(screen.queryByRole('button', { name: 'Gửi lại' })).not.toBeInTheDocument())
    expect(onSubmit.mock.calls).toEqual([[answer], [answer]])
  })

  it('thẻ úp không có hình hay chữ đáp án trong DOM', () => {
    const { container } = render(<MemoryCardPlayable question={question} profile={PROFILES.be} onSubmit={vi.fn()} />)

    expect(screen.queryByText('cat')).not.toBeInTheDocument()
    expect(container.querySelector('img')).toBeNull()
  })

  it('mặt úp mang biểu tượng của thế giới game', () => {
    render(
      <PresentationProvider presentation={{ world: 'ocean', carrier: 'fish', layout: 'row' }}>
        <MemoryCardPlayable question={question} profile={PROFILES.be} onSubmit={vi.fn()} />
      </PresentationProvider>,
    )

    expect(screen.getAllByText('🐚')).toHaveLength(2)
    expect(screen.queryByText('⭐')).not.toBeInTheDocument()
  })
})
