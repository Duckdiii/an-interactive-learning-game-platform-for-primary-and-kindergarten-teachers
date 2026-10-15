import { AxiosError } from 'axios'
import { describe, expect, it } from 'vitest'
import { mockApiError } from '../services/mock/mockErrors'
import { describeRegenerateError } from './regenerateErrors'

const withStatus = (status: number) => {
  const error = mockApiError(status, 'X', 'x')

  // Phản hồi không theo định dạng {success, error} (ví dụ trang lỗi của máy chủ trung gian).
  error.response!.data = { error: 'Bad Gateway' }

  return error
}

describe('describeRegenerateError', () => {
  it('422 UNSAFE_CONTENT là 5a: đúng câu SRS, cho sửa gợi ý rồi thử lại', () => {
    expect(describeRegenerateError(mockApiError(422, 'UNSAFE_CONTENT', 'x'))).toEqual({
      kind: 'unsafe',
      message: 'Nội dung tạo lại chưa đạt chuẩn an toàn học đường. Hệ thống đã khôi phục câu hỏi cũ, vui lòng thử lại với gợi ý mô tả khác.',
    })
  })

  it('5b: 504 AI_GENERATION_TIMEOUT, lỗi 5xx kể cả phản hồi không theo định dạng, mất mạng và quá hạn đều ra đúng câu SRS', () => {
    const busy = {
      kind: 'busy',
      message: 'Máy chủ trí tuệ nhân tạo đang bận xử lý dữ liệu. Yêu cầu tạo lại của giáo viên chưa thực hiện được, vui lòng thử lại sau ít phút.',
    }

    expect(describeRegenerateError(mockApiError(504, 'AI_GENERATION_TIMEOUT', 'x'))).toEqual(busy)
    expect(describeRegenerateError(mockApiError(500, 'INTERNAL_ERROR', 'x'))).toEqual(busy)
    expect(describeRegenerateError(withStatus(502))).toEqual(busy)
    expect(describeRegenerateError(new AxiosError('Network Error', 'ERR_NETWORK'))).toEqual(busy)
    expect(describeRegenerateError(new AxiosError('timeout of 20000ms exceeded', 'ECONNABORTED'))).toEqual(busy)
  })

  it('404 là câu chưa lưu, 409 là phòng chơi chưa kết thúc: cả hai nói câu hiện tại được giữ nguyên', () => {
    const notSaved = describeRegenerateError(mockApiError(404, 'NOT_FOUND', 'x'))
    const locked = describeRegenerateError(mockApiError(409, 'CONFLICT', 'x'))

    expect(notSaved.kind).toBe('notSaved')
    expect(notSaved.message).toContain('lưu bản nháp')
    expect(notSaved.message).toContain('Câu hiện tại vẫn được giữ nguyên')
    expect(locked.kind).toBe('locked')
    expect(locked.message).toContain('phòng chơi chưa kết thúc')
    expect(locked.message).toContain('Câu hiện tại vẫn được giữ nguyên')
  })

  it('429 dùng câu chung của bảng mã lỗi; lỗi lạ dùng câu dự phòng, không lộ chi tiết kỹ thuật', () => {
    expect(describeRegenerateError(mockApiError(429, 'RATE_LIMITED', 'x'))).toEqual({
      kind: 'rateLimited',
      message: 'Bạn thao tác quá nhanh. Hãy chờ một lúc rồi thử lại.',
    })
    expect(describeRegenerateError(new Error('TypeError: x is undefined'))).toEqual({
      kind: 'other',
      message: 'Chưa tạo lại được câu này. Câu hiện tại vẫn được giữ nguyên, vui lòng thử lại.',
    })
    expect(describeRegenerateError(mockApiError(403, 'FORBIDDEN', 'x')).kind).toBe('other')
  })
})
