import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { PROFILES } from '../profile/profiles'
import type { StudentOddOneOutQuestion } from '../../types/game-student.types'
import OddOneOutPlayable from './OddOneOutPlayable'

vi.mock('canvas-confetti', () => ({ default: vi.fn() }))
vi.mock('../../games/common/useQuestionAudio', () => ({ useQuestionAudio: () => vi.fn() }))
vi.mock('use-image', () => ({ default: () => [undefined, 'failed'] }))
vi.mock('../../games/common/ResponsiveStage', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }))
vi.mock('../../games/quiz/QuizRenderer', () => ({ default: () => <div data-testid="legacy-text" /> }))
vi.mock('react-konva', () => ({
  Layer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Group: ({ children, onClick, name }: { children: ReactNode; onClick?: () => void; name?: string }) => <div data-testid={name} onClick={onClick}>{children}</div>,
  Rect: () => null, Image: () => null, Text: ({ text }: { text: string }) => <span>{text}</span>,
}))
const q: StudentOddOneOutQuestion = {
  id: 'q', renderMode: 'IMAGE', timeLimitSeconds: 30, points: 10,
  items: ['mèo', 'chó', 'mèo', 'mèo'].map((text, i) => ({ id: String(i), text })),
}
describe('OddOneOutPlayable routing', () => {
  it('uses the image renderer with the marker even when all image URLs are missing', async () => {
    const submit = vi.fn().mockResolvedValue({ isCorrect: false, correctAnswer: { selectedItemId: '1' } })
    render(<OddOneOutPlayable question={q} profile={PROFILES.be} onSubmit={submit} />)
    expect(screen.queryByTestId('legacy-text')).toBeNull()
    expect(screen.getAllByText(/🖼️/)).toHaveLength(4)
    fireEvent.click(screen.getByTestId('avm-option-0'))
    await waitFor(() => expect(submit).toHaveBeenCalledWith({ selectedItemId: '0' }))
  })
  it('keeps the existing text renderer without the marker', () => {
    render(<OddOneOutPlayable question={{ ...q, renderMode: undefined, items: q.items.slice(0, 3) }} profile={PROFILES.be} onSubmit={vi.fn()} />)
    expect(screen.getByTestId('legacy-text')).toBeInTheDocument()
    expect(screen.queryByTestId('avm-option-0')).toBeNull()
  })
})
