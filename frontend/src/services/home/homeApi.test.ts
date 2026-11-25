import { afterEach, describe, expect, it, vi } from 'vitest'
import * as gamesApi from '../../api/gamesApi'
import { setMockScenario } from '../mock/mockRuntime'
import { HomeApiNotSupportedError } from './HomeApi'
import { getHomeApi } from './index'
import { MockHomeApi } from './mockHomeApi'
import { RealHomeApi } from './realHomeApi'

afterEach(() => vi.unstubAllEnvs())

describe('RealHomeApi', () => {
  it('danh sách phiên đang diễn ra còn đề xuất nên reject HomeApiNotSupportedError', async () => {
    await expect(new RealHomeApi().listLiveSessions()).rejects.toBeInstanceOf(HomeApiNotSupportedError)
  })

  it('listReviewNeeded và getQuestionInsights chuyển tham số sang lời gọi API thật', async () => {
    const reviewSpy = vi.spyOn(gamesApi, 'fetchReviewNeeded').mockResolvedValue([])
    const detailSpy = vi.spyOn(gamesApi, 'fetchQuestionInsights').mockResolvedValue({
      questionId: 'q1',
      order: 1,
      text: 'MẸ',
      answeredCount: 0,
      correctRate: 0,
      needsReview: false,
      distribution: [],
      otherCount: 0,
      noAnswerCount: 0,
    })
    const api = new RealHomeApi()

    await api.listReviewNeeded(3)
    await api.getQuestionInsights('g1', 'q1', 'TEAM', { from: '2026-11-01' })

    expect(reviewSpy).toHaveBeenCalledWith(3)
    expect(detailSpy).toHaveBeenCalledWith('g1', 'q1', 'TEAM', { from: '2026-11-01' })
    reviewSpy.mockRestore()
    detailSpy.mockRestore()
  })

  it('getGameInsights chuyển gameId và sessionType sang lời gọi API thật', async () => {
    const fetchSpy = vi.spyOn(gamesApi, 'fetchGameInsights').mockResolvedValue({
      playCount: 0,
      correctRate: 0,
      avgAttemptsPerQuestion: 0,
      completionRate: 0,
      lowSample: false,
      avgScore: 0,
      questions: [],
    })
    const api = new RealHomeApi()

    await api.getGameInsights('g1', 'TEAM')
    expect(fetchSpy).toHaveBeenCalledWith('g1', 'TEAM', undefined)
    fetchSpy.mockRestore()
  })
})

describe('MockHomeApi', () => {
  it('trả dữ liệu mẫu đúng hình dạng và tôn trọng limit', async () => {
    vi.stubEnv('VITE_MOCK_LATENCY_MS', '0')
    const api = new MockHomeApi()

    const live = await api.listLiveSessions()
    expect(live[0]).toMatchObject({ participantCount: 24, currentQuestionIndex: 2, questionCount: 10 })
    expect(await api.listReviewNeeded(0)).toEqual([])
    expect((await api.listReviewNeeded(3))[0]).toMatchObject({ questionText: 'CHỊ', commonWrong: { label: 'CHI' } })
  })
})

describe('MockHomeApi.getGameInsights', () => {
  it('trả số liệu mẫu theo game; kịch bản empty cho playCount 0', async () => {
    vi.stubEnv('VITE_MOCK_LATENCY_MS', '0')
    const api = new MockHomeApi()

    expect((await api.getGameInsights('mock-game-1')).playCount).toBe(26)
    expect((await api.getGameInsights('mock-game-1', 'TEAM')).playCount).toBe(18)

    setMockScenario('empty')
    try {
      expect((await api.getGameInsights('mock-game-1')).playCount).toBe(0)
    } finally {
      setMockScenario('normal')
    }
  })
})

describe('getHomeApi', () => {
  it('ngoài PROD: theo cờ nhóm (sessions/results) và đánh dấu dữ liệu mẫu', async () => {
    vi.stubEnv('VITE_USE_MOCK', 'sessions')

    const sessions = await getHomeApi('sessions')
    expect(sessions.isSample).toBe(true)
    expect(sessions.api).toBeInstanceOf(MockHomeApi)

    const results = await getHomeApi('results')
    expect(results.isSample).toBe(false)
    expect(results.api).toBeInstanceOf(RealHomeApi)
  })
})
