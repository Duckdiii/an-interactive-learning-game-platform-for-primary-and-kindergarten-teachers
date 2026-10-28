import { afterEach, describe, expect, it, vi } from 'vitest'
import { setMockScenario } from '../mock/mockRuntime'
import { HomeApiNotSupportedError } from './HomeApi'
import { getHomeApi } from './index'
import { MockHomeApi } from './mockHomeApi'
import { RealHomeApi } from './realHomeApi'

afterEach(() => vi.unstubAllEnvs())

describe('RealHomeApi', () => {
  it('cả ba endpoint còn đề xuất nên reject HomeApiNotSupportedError', async () => {
    const api = new RealHomeApi()

    await expect(api.listLiveSessions()).rejects.toBeInstanceOf(HomeApiNotSupportedError)
    await expect(api.listReviewNeeded()).rejects.toBeInstanceOf(HomeApiNotSupportedError)
    await expect(api.getGameInsights()).rejects.toBeInstanceOf(HomeApiNotSupportedError)
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
