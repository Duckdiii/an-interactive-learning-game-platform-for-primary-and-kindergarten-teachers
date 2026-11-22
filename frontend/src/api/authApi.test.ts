import { describe, expect, it, vi } from 'vitest'
import axiosInstance from './axiosInstance'
import { LOGOUT_TIMEOUT_MS, logoutTeacher } from './authApi'

vi.mock('./axiosInstance', () => ({ default: { post: vi.fn() } }))

describe('logoutTeacher', () => {
  it('đặt timeout để mạng treo không giữ giáo viên ở trạng thái đăng nhập', async () => {
    vi.mocked(axiosInstance.post).mockResolvedValue({ status: 204 })

    await logoutTeacher()

    expect(axiosInstance.post).toHaveBeenCalledWith('/auth/logout', undefined, { timeout: LOGOUT_TIMEOUT_MS })
  })
})
