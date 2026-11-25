import { describe, expect, it } from 'vitest'
import { mockApiError } from '../services/mock/mockErrors'
import axios from 'axios'
import { uploadErrorMessage } from './mediaErrors'

// Nguyên văn theo SRS UC-05.
const INVALID_FILE =
  'Tệp tải lên không đúng định dạng hỗ trợ (Ảnh cần là dạng PNG/JPG/WebP dưới 5MB, âm thanh thuyết minh cần là dạng MP3 dưới 10MB). Vui lòng chọn tệp tin khác.'
const UNSAFE_FILE = 'Tệp tải lên không đáp ứng tiêu chuẩn an toàn nội dung dành cho môi trường giáo dục. Vui lòng chọn tệp khác.'

describe('uploadErrorMessage', () => {
  it('422 FILE_TOO_LARGE_OR_INVALID_FORMAT giữ lời hướng dẫn cụ thể từ API để cô biết sửa gì', () => {
    const message = 'Không nhận diện được lời đọc trong tệp MP3. Vui lòng chọn bản ghi có lời đọc rõ hơn.'
    expect(uploadErrorMessage(mockApiError(422, 'FILE_TOO_LARGE_OR_INVALID_FORMAT', message))).toBe(message)
    expect(uploadErrorMessage(mockApiError(422, 'FILE_TOO_LARGE_OR_INVALID_FORMAT', ''))).toBe(INVALID_FILE)
  })

  it('422 UNSAFE_CONTENT dùng câu 3b của SRS khi thiếu thông báo từ API', () => {
    expect(uploadErrorMessage(mockApiError(422, 'UNSAFE_CONTENT', ''))).toBe(UNSAFE_FILE)
  })

  it('lỗi khác đi qua parseApiError: mất mạng, quá hạn, 500; lỗi lạ thì dùng câu dự phòng', () => {
    expect(uploadErrorMessage(new axios.AxiosError('Network Error', 'ERR_NETWORK'))).toBe('Không kết nối được máy chủ. Hãy kiểm tra mạng rồi thử lại.')
    expect(uploadErrorMessage(new axios.AxiosError('timeout', 'ECONNABORTED'))).toBe('Máy chủ phản hồi quá chậm. Hãy thử lại sau ít phút.')
    expect(uploadErrorMessage(mockApiError(500, 'INTERNAL_ERROR', 'x'))).toBe('Hệ thống đang gặp sự cố. Hãy thử lại sau ít phút.')
    expect(uploadErrorMessage(new Error('lạ'))).toBe('Chưa tải được tệp lên. Hãy thử lại.')
  })
})
