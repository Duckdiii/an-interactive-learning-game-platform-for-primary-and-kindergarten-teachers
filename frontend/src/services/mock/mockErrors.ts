import { AxiosError, AxiosHeaders } from 'axios'
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'

// Lỗi API giả có đúng hình dạng thật ({success: false, error: {code, message}} kèm mã HTTP), để mọi chỗ đang dùng
// `parseApiError` xử lý lỗi mô phỏng giống hệt lỗi từ backend.
export function mockApiError(status: number, code: string, message: string) {
  const config = { headers: new AxiosHeaders() } as InternalAxiosRequestConfig
  const response = {
    status,
    statusText: '',
    headers: {},
    config,
    data: { success: false, error: { code, message } },
  } as AxiosResponse

  return new AxiosError(message, status >= 500 ? 'ERR_BAD_RESPONSE' : 'ERR_BAD_REQUEST', config, null, response)
}

export const notFoundError = () => mockApiError(404, 'NOT_FOUND', 'Không tìm thấy trò chơi.')

export const conflictError = () =>
  mockApiError(409, 'CONFLICT', 'Trò chơi đang có phòng chơi chưa kết thúc nên chưa thể thay đổi.')
