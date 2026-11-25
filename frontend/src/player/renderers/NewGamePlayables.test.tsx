import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { GAME_TYPES } from '../../types/game-dsl.types'
import { getSelfPracticeRenderer } from './index'
import { PROFILES } from '../profile/profiles'
import type { AnswerResult } from '../../types/game-student.types'

vi.mock('../../games/common/sound', () => ({ playSound: vi.fn() }))

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

    fireEvent.click(screen.getByRole('button', { name: 'Bức tranh tìm kiếm rooster' }), { clientX: 40, clientY: 70 })

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

    for (const position of [1, 3, 2, 4]) {
      fireEvent.click(screen.getByRole('button', { name: `Thẻ chưa lật số ${position}` }))
    }

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ matchedPairIds: ['p1', 'p2'], flips: 4, wrongPairs: [] }))
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('submits ORDERING using the display IDs returned by the backend', async () => {
    const Ordering = getSelfPracticeRenderer('ORDERING')!
    const onSubmit = vi.fn().mockResolvedValue(result)

    render(<Ordering question={{
      id: 'q1', timeLimitSeconds: 30, points: 10, steps: [{ id: 's1', text: 'first' }, { id: 's2', text: 'second' }],
    }} profile={PROFILES.hocSinh} onSubmit={onSubmit} />)
    fireEvent.click(screen.getByRole('button', { name: 'Vị trí 1: first' }))
    fireEvent.click(screen.getByRole('button', { name: 'Vị trí 2: second' }))
    fireEvent.click(screen.getByRole('button', { name: /Xong rồi/ }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ order: ['s2', 's1'] }))
  })
})
