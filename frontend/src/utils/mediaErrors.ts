import axios from 'axios'
import { viText } from '../constants/viText'
import type { ApiErrorResponse } from '../types/api'
import { parseApiError } from './apiError'

const media = viText.editor.media

/**
 * Lỗi 3a và 3b của UC-05 lấy thông báo cụ thể từ API, với câu của SRS làm dự phòng.
 */
export function uploadErrorMessage(error: unknown): string {
  const parsed = parseApiError(error, media.uploadFailed)

  if (parsed.code === 'FILE_TOO_LARGE_OR_INVALID_FORMAT' || parsed.code === 'UNSAFE_CONTENT') {
    const serverMessage = axios.isAxiosError<ApiErrorResponse>(error) ? error.response?.data?.error?.message : undefined
    if (typeof serverMessage === 'string' && serverMessage.trim()) return serverMessage

    return parsed.code === 'UNSAFE_CONTENT' ? media.unsafeFile : media.invalidFile
  }

  return parsed.message
}
