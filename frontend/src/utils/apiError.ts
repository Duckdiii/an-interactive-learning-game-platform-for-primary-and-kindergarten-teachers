import axios from 'axios'
import {
  CONNECTION_ERROR_MESSAGES,
  ERROR_MESSAGES,
  errorCodeFromStatus,
} from '../constants/errorMessages'
import type { ApiErrorResponse } from '../types/api'

export interface ParsedApiError {
  message: string
  fieldErrors: Record<string, string>
  // Mã lỗi của API (ví dụ VALIDATION_ERROR) khi xác định được; không có với lỗi mạng hay lỗi ngoài API.
  code?: string
}

const isTimeout = (code: string | undefined) =>
  code === 'ECONNABORTED' || code === 'ETIMEDOUT'

/**
 * Đổi lỗi từ API thành câu tiếng Việt cho giáo viên.
 * - Lỗi theo từng ô (details/field) và VALIDATION_ERROR: giữ nguyên thông điệp cụ thể của backend (ví dụ "Email đã
 *   được đăng ký"), vì câu chung chung sẽ làm mất thông tin giáo viên cần để sửa.
 * - Mã lỗi khác: dùng câu trong ERROR_MESSAGES.
 * - Không có phản hồi (mất mạng, quá hạn): câu riêng cho từng trường hợp.
 * - Lỗi không phải của axios: dùng câu dự phòng do nơi gọi truyền vào.
 */
export function parseApiError(
  error: unknown,
  fallbackMessage: string,
): ParsedApiError {
  if (!axios.isAxiosError<ApiErrorResponse>(error)) {
    return { message: fallbackMessage, fieldErrors: {} }
  }

  if (!error.response) {
    return {
      message: isTimeout(error.code)
        ? CONNECTION_ERROR_MESSAGES.timeout
        : CONNECTION_ERROR_MESSAGES.network,
      fieldErrors: {},
    }
  }

  // Thân phản hồi không theo định dạng {success, error} (ví dụ {"error":"Not Found"} mặc định của Spring) thì
  // coi như không có thân, dùng câu theo mã HTTP.
  const rawError: unknown = error.response.data?.error
  const apiError =
    typeof rawError === 'object' && rawError !== null
      ? (rawError as NonNullable<ApiErrorResponse['error']>)
      : undefined

  if (!apiError) {
    const code = errorCodeFromStatus(error.response.status)
    return {
      message: (code && ERROR_MESSAGES.get(code)) || fallbackMessage,
      fieldErrors: {},
      code,
    }
  }

  const fieldErrors = { ...apiError.details }

  if (apiError.field) {
    fieldErrors[apiError.field] = apiError.message
  }

  const keepBackendMessage =
    apiError.code === 'VALIDATION_ERROR' || Object.keys(fieldErrors).length > 0

  return {
    message: keepBackendMessage
      ? apiError.message || ERROR_MESSAGES.get(apiError.code) || fallbackMessage
      : ERROR_MESSAGES.get(apiError.code) || apiError.message || fallbackMessage,
    fieldErrors,
    code: apiError.code,
  }
}
