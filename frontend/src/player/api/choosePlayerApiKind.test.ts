import { afterEach, describe, expect, it, vi } from 'vitest'
import { choosePlayerApiKind } from './choosePlayerApiKind'

afterEach(() => vi.restoreAllMocks())

describe('choosePlayerApiKind', () => {
  it('ngoài PROD: setting rõ ràng thắng, trống thì theo sessionsMocked', () => {
    expect(choosePlayerApiKind({ isProd: false, setting: 'mock', sessionsMocked: false })).toBe('mock')
    expect(choosePlayerApiKind({ isProd: false, setting: 'real', sessionsMocked: true })).toBe('real')
    expect(choosePlayerApiKind({ isProd: false, setting: '', sessionsMocked: true })).toBe('mock')
    expect(choosePlayerApiKind({ isProd: false, setting: undefined, sessionsMocked: false })).toBe('real')
  })

  it('PROD: luôn real dù setting hay sessionsMocked nói gì', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    for (const setting of ['mock', 'real', '', undefined]) {
      for (const sessionsMocked of [true, false]) {
        expect(choosePlayerApiKind({ isProd: true, setting, sessionsMocked })).toBe('real')
      }
    }
  })

  it('PROD bỏ qua mock thì console.error đúng một lần; cấu hình hợp lệ thì không ghi', async () => {
    vi.resetModules()
    const { choosePlayerApiKind: fresh } = await import('./choosePlayerApiKind')
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    fresh({ isProd: true, setting: 'real', sessionsMocked: true })
    fresh({ isProd: true, setting: '', sessionsMocked: false })
    expect(error).not.toHaveBeenCalled()

    fresh({ isProd: true, setting: 'mock', sessionsMocked: false })
    fresh({ isProd: true, setting: '', sessionsMocked: true })
    expect(error).toHaveBeenCalledTimes(1)
  })
})
