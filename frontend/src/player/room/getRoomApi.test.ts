import { afterEach, expect, it, vi } from 'vitest'
import { getRoomApi, usesMockRoom } from './getRoomApi'

afterEach(() => vi.unstubAllEnvs())

it('the sessions mock flag enables the two-tab room only outside production', async () => {
  vi.stubEnv('VITE_USE_MOCK', 'sessions')
  expect(usesMockRoom()).toBe(true)
  expect(await getRoomApi()).toHaveProperty('open')

  vi.stubEnv('PROD', true)
  expect(usesMockRoom()).toBe(false)
  await expect(getRoomApi()).rejects.toThrow()
})

it('the dev server can reach real rooms with mocks disabled', () => {
  vi.stubEnv('VITE_USE_MOCK', 'none')
  expect(usesMockRoom()).toBe(false)
})
