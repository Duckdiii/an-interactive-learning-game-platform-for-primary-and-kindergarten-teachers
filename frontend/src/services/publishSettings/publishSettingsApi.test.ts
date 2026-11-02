import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getPublishSettingsApi, PublishSettingsNotSupportedError } from './index'
import { MockPublishSettingsApi, resetMockPublishSettings } from './mockPublishSettingsApi'
import { RealPublishSettingsApi } from './realPublishSettingsApi'

beforeEach(() => {
  vi.stubEnv('VITE_MOCK_LATENCY_MS', '0')
  resetMockPublishSettings()
})
afterEach(() => vi.unstubAllEnvs())

describe('RealPublishSettingsApi', () => {
  it('endpoint còn đề xuất nên reject PublishSettingsNotSupportedError', async () => {
    const api = new RealPublishSettingsApi()

    await expect(api.get()).rejects.toBeInstanceOf(PublishSettingsNotSupportedError)
    await expect(api.update()).rejects.toBeInstanceOf(PublishSettingsNotSupportedError)
  })
})

describe('MockPublishSettingsApi', () => {
  it('mặc định rồi nhớ theo từng gameId', async () => {
    const api = new MockPublishSettingsApi()
    const next = { uiOverride: 'BE', themeId: 'bee', enabled: false, expiresAt: '2026-11-30T16:59:59Z' } as const

    expect(await api.get('g1')).toEqual({ uiOverride: 'AUTO', themeId: null, enabled: true, expiresAt: null })
    expect(await api.update('g1', next)).toEqual(next)
    expect(await api.get('g1')).toEqual(next)
    expect((await api.get('g2')).uiOverride).toBe('AUTO')
  })
})

describe('getPublishSettingsApi', () => {
  it('theo cờ nhóm editor', async () => {
    vi.stubEnv('VITE_USE_MOCK', 'editor')
    expect(await getPublishSettingsApi()).toBeInstanceOf(MockPublishSettingsApi)

    vi.stubEnv('VITE_USE_MOCK', 'none')
    expect(await getPublishSettingsApi()).toBeInstanceOf(RealPublishSettingsApi)
  })
})
