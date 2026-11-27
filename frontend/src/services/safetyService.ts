import axiosInstance from '../api/axiosInstance'
import { isMock } from '../config/mockMode'
import type { ApiSuccessResponse } from '../types/api'
import { parseApiError } from '../utils/apiError'
import { mockCheckSafety } from './mock/safetyCheck'
import type { SafetyVerdict } from './mock/safetyCheck'
import { runMock } from './mock/mockRuntime'

export type { SafetyVerdict }

/** Kiểm duyệt chữ trước khi đưa vào bản nháp (UC-05 2a). */
export async function checkTextSafety(texts: ReadonlyArray<string>): Promise<SafetyVerdict> {
  if (isMock('editor')) return runMock(() => mockCheckSafety(texts))
  if (texts.every((text) => text.trim() === '')) return { safe: true }

  try {
    const { data } = await axiosInstance.post<ApiSuccessResponse<SafetyVerdict>>('/games/validate-text', { texts })
    if (data.success === true && data.data?.safe === true) return { safe: true }

    throw new Error('Phản hồi kiểm duyệt không hợp lệ')
  } catch (error) {
    if (parseApiError(error, '').code === 'UNSAFE_CONTENT') return { safe: false }

    throw error
  }
}
