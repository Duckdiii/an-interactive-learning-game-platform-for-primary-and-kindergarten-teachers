import { AxiosError } from 'axios'
import axiosInstance from '../api/axiosInstance'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { setMockScenario } from './mock/mockRuntime'
import { mockCheckSafety } from './mock/safetyCheck'
import { checkTextSafety } from './safetyService'

afterEach(() => {
  vi.restoreAllMocks()
  vi.stubEnv('VITE_USE_MOCK', 'none')
  setMockScenario('normal')
})

describe('mockCheckSafety', () => {
  it('chặn cụm từ không phù hợp với trẻ nhỏ, kể cả viết hoa và có dấu câu', () => {
    expect(mockCheckSafety(['Con vật nào hay GIẾT NGƯỜI?']).safe).toBe(false)
    expect(mockCheckSafety(['Cảnh máu me!']).safe).toBe(false)
  })

  it('khớp theo ranh giới từ nên từ vô hại không bị chặn nhầm', () => {
    for (const text of ['Con ếch ăn gì?', 'Người ta giết thời gian', 'Số nào lớn hơn?', 'Tên bạn là Bảo Lực']) {
      expect(mockCheckSafety([text]).safe, text).toBe(true)
    }
  })

  it('chỉ cần một chuỗi trong danh sách không phù hợp là cả danh sách bị chặn', () => {
    expect(mockCheckSafety(['Quả táo', 'trẻ dùng ma túy']).safe).toBe(false)
  })
})

describe('checkTextSafety', () => {
  it('nhóm editor đang mô phỏng thì dùng bộ lọc giả lập', async () => {
    vi.stubEnv('VITE_USE_MOCK', 'editor')

    await expect(checkTextSafety(['cảnh máu me'])).resolves.toEqual({ safe: false })
    await expect(checkTextSafety(['con mèo'])).resolves.toEqual({ safe: true })
  })

  it('gửi chữ tới backend và chỉ chấp nhận phản hồi xác nhận đã kiểm tra', async () => {
    vi.stubEnv('VITE_USE_MOCK', 'none')
    const post = vi.spyOn(axiosInstance, 'post').mockResolvedValueOnce({ data: { success: true, data: { safe: true } } })
      .mockResolvedValueOnce({ data: { success: true } })

    await expect(checkTextSafety(['con mèo'])).resolves.toEqual({ safe: true })
    expect(post).toHaveBeenCalledWith('/games/validate-text', { texts: ['con mèo'] })
    await expect(checkTextSafety(['con cá'])).rejects.toThrow()
  })

  it('phân biệt chữ bị từ chối với lỗi dịch vụ kiểm duyệt', async () => {
    vi.stubEnv('VITE_USE_MOCK', 'none')
    const unsafe = Object.assign(new AxiosError('unsafe'), {
      response: { status: 422, data: { error: { code: 'UNSAFE_CONTENT' } } },
    })
    const unavailable = new Error('Không khả dụng')
    vi.spyOn(axiosInstance, 'post').mockRejectedValueOnce(unsafe).mockRejectedValueOnce(unavailable)

    await expect(checkTextSafety(['cảnh máu me'])).resolves.toEqual({ safe: false })
    await expect(checkTextSafety(['con mèo'])).rejects.toBe(unavailable)
  })

  it('kịch bản lỗi mạng của mô phỏng thì ném lỗi để giao diện báo "chưa kiểm tra được"', async () => {
    vi.stubEnv('VITE_USE_MOCK', 'editor')
    setMockScenario('error')

    await expect(checkTextSafety(['con mèo'])).rejects.toThrow()
  })
})
