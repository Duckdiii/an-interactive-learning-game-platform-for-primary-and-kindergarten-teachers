import { afterEach, describe, expect, it, vi } from 'vitest'
import { getRoomApi, isRoomAvailable } from './getRoomApi'

afterEach(() => vi.unstubAllEnvs())

describe('getRoomApi', () => {
  it('bản dev: phòng chạy được', () => {
    expect(isRoomAvailable()).toBe(true)
  })

  it('bản build thật: phòng khóa, không có phòng nào để tìm, không mở hay vào được', async () => {
    vi.stubEnv('PROD', true)

    const api = await getRoomApi()

    expect(isRoomAvailable()).toBe(false)
    await expect(api.findByPin('482913')).resolves.toBeNull()
    await expect(api.join('482913', 'A')).rejects.toThrow()
    await expect(api.open({} as never)).rejects.toThrow()
  })
})
