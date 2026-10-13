import { beforeEach, describe, expect, it, vi } from 'vitest'
import axiosInstance from './axiosInstance'
import { GAMES_REQUEST_TIMEOUT_MS, getGames } from './gamesApi'

vi.mock('./axiosInstance', () => ({ default: { get: vi.fn() } }))

const mockedGet = vi.mocked(axiosInstance.get)

describe('getGames', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedGet.mockResolvedValue({ data: { success: true, data: [] } })
  })

  it('đặt timeout riêng cho lệnh đọc danh sách (không đặt timeout chung)', async () => {
    await getGames({ subject: '', gradeLevel: '', status: '' })

    expect(GAMES_REQUEST_TIMEOUT_MS).toBe(10_000)
    expect(mockedGet).toHaveBeenCalledWith(
      '/games',
      expect.objectContaining({ timeout: GAMES_REQUEST_TIMEOUT_MS }),
    )
  })

  it('chỉ gửi bộ lọc có giá trị, giữ nguyên giá trị enum', async () => {
    await getGames({ subject: 'MATH', gradeLevel: '', status: 'DRAFT' })

    expect(mockedGet).toHaveBeenCalledWith(
      '/games',
      expect.objectContaining({
        params: { subject: 'MATH', gradeLevel: undefined, status: 'DRAFT' },
      }),
    )
  })
})
