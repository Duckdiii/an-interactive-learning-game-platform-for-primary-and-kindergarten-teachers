import { beforeEach, describe, expect, it, vi } from 'vitest'

const calls = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))
vi.mock('../../api/axiosInstance', () => ({ default: { get: calls.get, post: calls.post } }))

import { RealPlayerApi } from './realPlayerApi'

describe('RealPlayerApi', () => {
  beforeEach(() => {
    calls.get.mockReset()
    calls.post.mockReset()
    sessionStorage.clear()
    sessionStorage.setItem('player:session:abc123', JSON.stringify({ sessionId: 'session-1', participantId: 'participant-1', nickname: 'Mia' }))
  })

  it('unwraps public game information and creates a SELF session', async () => {
    calls.get.mockResolvedValue({ data: { success: true, data: { gameTitle: 'Animals' } } })
    calls.post.mockResolvedValue({ data: { success: true, data: { sessionId: 'session-1' } } })
    const api = new RealPlayerApi()

    await expect(api.getPublishInfo('ab c')).resolves.toEqual({ gameTitle: 'Animals' })
    await expect(api.createSession('abc123', 'Mia')).resolves.toEqual({ sessionId: 'session-1' })
    expect(calls.get).toHaveBeenCalledWith('/games/shared/ab%20c')
    expect(calls.post).toHaveBeenCalledWith('/games/shared/abc123/play', { nickname: 'Mia' })
  })

  it('sends the stored participant id with question and placement requests', async () => {
    calls.get.mockResolvedValue({ data: { success: true, data: { gameType: 'VISUAL_CLOZE' } } })
    calls.post.mockResolvedValue({ data: { success: true, data: { status: 'CORRECT' } } })
    const api = new RealPlayerApi()

    await expect(api.getGameForStudent('session-1')).resolves.toEqual({ gameType: 'VISUAL_CLOZE' })
    await expect(api.submitInteraction('session-1', 'q1', {
      placements: [{ blankId: 'x1', optionId: 'x2' }],
    })).resolves.toEqual({ status: 'CORRECT' })
    expect(calls.get).toHaveBeenCalledWith('/sessions/session-1/questions', { headers: { 'X-Participant-Id': 'participant-1' } })
    expect(calls.post).toHaveBeenCalledWith('/sessions/session-1/interactions', {
      questionId: 'q1', timeSpentMs: 0, placements: [{ blankId: 'x1', optionId: 'x2' }],
    }, { headers: { 'X-Participant-Id': 'participant-1' } })
  })
})
