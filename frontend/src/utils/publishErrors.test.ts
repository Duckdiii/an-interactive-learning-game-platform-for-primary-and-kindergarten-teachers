import { AxiosError, CanceledError } from 'axios'
import { describe, expect, it } from 'vitest'
import { mockApiError } from '../services/mock/mockErrors'
import { describePublishError } from './publishErrors'

const FAILED = 'Hệ thống chưa hoàn tất lưu trò chơi. Bạn hãy thử lại một lần nữa.'

describe('describePublishError', () => {
  it('2a: lỗi 5xx, mất mạng và quá hạn đều là câu "chưa hoàn tất lưu" của SRS', () => {
    const failed = { kind: 'failed', message: FAILED }

    expect(describePublishError(mockApiError(500, 'INTERNAL_ERROR', 'x'))).toEqual(failed)
    expect(describePublishError(mockApiError(503, 'X', 'x'))).toEqual(failed)
    expect(describePublishError(new AxiosError('Network Error', 'ERR_NETWORK'))).toEqual(failed)
    expect(describePublishError(new AxiosError('timeout of 20000ms exceeded', 'ECONNABORTED'))).toEqual(failed)
    expect(describePublishError(new Error('boom'))).toEqual(failed)
  })

  it('2b: mã SHARE_CODE_UNAVAILABLE là "đã lưu nhưng chưa tạo được mã chia sẻ", khác 2a dù cùng 500', () => {
    expect(describePublishError(mockApiError(500, 'SHARE_CODE_UNAVAILABLE', 'x'))).toEqual({
      kind: 'shareFailed',
      message: 'Trò chơi đã lưu nhưng chưa thể tạo mã chia sẻ. Vui lòng thử xuất bản lại.',
    })
  })

  it('2c: 400 và 422 là "kiểm tra và điều chỉnh lại nội dung"', () => {
    for (const status of [400, 422]) {
      expect(describePublishError(mockApiError(status, 'VALIDATION_ERROR', 'chi tiết kỹ thuật'))).toEqual({
        kind: 'invalid',
        message: 'Bạn hãy kiểm tra và điều chỉnh lại nội dung.',
      })
    }
  })

  it('409: phòng chơi chưa kết thúc, nói nội dung đang soạn vẫn được giữ', () => {
    const result = describePublishError(mockApiError(409, 'CONFLICT', 'x'))

    expect(result.kind).toBe('conflict')
    expect(result.message).toContain('phòng chơi chưa kết thúc')
    expect(result.message).toContain('vẫn được giữ')
  })

  it('hủy do giáo viên không phải lỗi; 403/404 là loại khác', () => {
    expect(describePublishError(new CanceledError())).toEqual({ kind: 'canceled', message: '' })
    expect(describePublishError(mockApiError(404, 'NOT_FOUND', 'x')).kind).toBe('other')
    expect(describePublishError(mockApiError(403, 'FORBIDDEN', 'x')).kind).toBe('other')
  })
})
