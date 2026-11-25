import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { GAME_TYPES } from '../../types/game-dsl.types'
import { getSelfPracticeRenderer } from './index'
import { PROFILES } from '../profile/profiles'
import type { AnswerResult } from '../../types/game-student.types'

vi.mock('../../games/ordering/OrderingRenderer', () => ({
  default: ({ onAnswered }: { onAnswered: (answer: { order: string[] }) => void }) => (
    <button type="button" onClick={() => onAnswered({ order: ['s2', 's1'] })}>Submit ordering</button>
  ),
}))

const result: AnswerResult = {
  status: 'CORRECT', isCorrect: true, pointsEarned: 10, totalScore: 10, correctAnswer: null,
}

describe('the remaining three self-practice game renderers', () => {
  it('registers a playable renderer for all ten game types', () => {
    expect(GAME_TYPES.every((gameType) => getSelfPracticeRenderer(gameType) !== undefined)).toBe(true)
  })

  it('submits normalized scene coordinates for SPOT_THE_TARGET to server grading', async () => {
    const Spot = getSelfPracticeRenderer('SPOT_THE_TARGET')!
    const onSubmit = vi.fn().mockResolvedValue(result)
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      x: 10, y: 20, left: 10, top: 20, right: 110, bottom: 120, width: 100, height: 100,
      toJSON: () => ({}),
    } as DOMRect)

    render(<Spot question={{
      id: 'q1', timeLimitSeconds: 30, points: 10, visualPrompt: 'a farm scene', targetDescription: 'rooster',
    }} profile={PROFILES.hocSinh} onSubmit={onSubmit} />)

    fireEvent.click(screen.getByRole('button', { name: /find the target/i }), { clientX: 40, clientY: 70 })

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ x: 0.3, y: 0.5 }))
  })

  it('submits each completed MEMORY_CARD pair once with the established pair IDs', async () => {
    const Memory = getSelfPracticeRenderer('MEMORY_CARD')!
    const onSubmit = vi.fn().mockResolvedValue(result)

    render(<Memory question={{
      id: 'q1', timeLimitSeconds: 30, points: 10, pairs: [
        { pairId: 'p1', content: { text: 'cat' } },
        { pairId: 'p2', content: { text: 'dog' } },
      ],
    }} profile={PROFILES.hocSinh} onSubmit={onSubmit} />)

    for (const label of ['Reveal cat card 1', 'Reveal cat card 2', 'Reveal dog card 1', 'Reveal dog card 2']) {
      fireEvent.click(screen.getByRole('button', { name: label }))
    }

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ matchedPairIds: ['p1', 'p2'], flips: 4 }))
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('submits ORDERING using the display IDs returned by the backend', async () => {
    const Ordering = getSelfPracticeRenderer('ORDERING')!
    const onSubmit = vi.fn().mockResolvedValue(result)

    render(<Ordering question={{
      id: 'q1', timeLimitSeconds: 30, points: 10, steps: [{ id: 's1', text: 'first' }, { id: 's2', text: 'second' }],
    }} profile={PROFILES.hocSinh} onSubmit={onSubmit} />)
    fireEvent.click(screen.getByRole('button', { name: 'Submit ordering' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ order: ['s2', 's1'] }))
  })
})
