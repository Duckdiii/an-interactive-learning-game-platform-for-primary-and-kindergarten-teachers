import { afterEach, describe, expect, it, vi } from 'vitest'
import { setMockScenario } from './mock/mockRuntime'
import { mockCheckSafety } from './mock/safetyCheck'
import { checkTextSafety } from './safetyService'

afterEach(() => {
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

  it('dùng API thật thì không có điểm kiểm tra riêng: coi là an toàn, Backend kiểm duyệt khi lưu', async () => {
    vi.stubEnv('VITE_USE_MOCK', 'none')

    await expect(checkTextSafety(['cảnh máu me'])).resolves.toEqual({ safe: true })
  })

  it('kịch bản lỗi mạng của mô phỏng thì ném lỗi để giao diện báo "chưa kiểm tra được"', async () => {
    vi.stubEnv('VITE_USE_MOCK', 'editor')
    setMockScenario('error')

    await expect(checkTextSafety(['con mèo'])).rejects.toThrow()
  })
})
