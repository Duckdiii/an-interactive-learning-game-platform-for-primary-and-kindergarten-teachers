import { AxiosError, CanceledError } from 'axios'
import { describe, expect, it } from 'vitest'
import { mockApiError } from '../services/mock/mockErrors'
import { describeGenerateError, GenerateBlockedError } from './generateErrors'

describe('describeGenerateError', () => {
  it('422 UNSAFE_CONTENT: loại unsafe, dùng câu chung của bảng mã lỗi', () => {
    expect(describeGenerateError(mockApiError(422, 'UNSAFE_CONTENT', 'x'))).toEqual({
      kind: 'unsafe',
      message: 'Nội dung chưa phù hợp với học sinh nhỏ tuổi. Hãy đổi chủ đề hoặc cách diễn đạt rồi thử lại.',
    })
  })

  it('429: loại rateLimited với câu chung, không phải "máy chủ bận"', () => {
    expect(describeGenerateError(mockApiError(429, 'RATE_LIMITED', 'x'))).toEqual({
      kind: 'rateLimited',
      message: 'Bạn thao tác quá nhanh. Hãy chờ một lúc rồi thử lại.',
    })
  })

  it('504, 5xx, mất mạng và quá hạn: loại busy', () => {
    expect(describeGenerateError(mockApiError(504, 'AI_GENERATION_TIMEOUT', 'x')).kind).toBe('busy')
    expect(describeGenerateError(mockApiError(500, 'INTERNAL_ERROR', 'x')).kind).toBe('busy')
    expect(describeGenerateError(new AxiosError('Network Error', 'ERR_NETWORK')).kind).toBe('busy')
    expect(describeGenerateError(new AxiosError('timeout', 'ECONNABORTED')).kind).toBe('busy')
  })

  it('hủy: loại canceled không có câu (không phải lỗi); thiếu khối lớp/môn: needLesson; lỗi lạ: câu dự phòng', () => {
    expect(describeGenerateError(new CanceledError('canceled'))).toEqual({ kind: 'canceled', message: '' })
    expect(describeGenerateError(new GenerateBlockedError())).toEqual({
      kind: 'needLesson',
      message: 'Hãy chọn khối lớp và môn học trước khi tạo: hệ thống thật cần hai thông tin này.',
    })
    expect(describeGenerateError(new Error('lạ')).kind).toBe('other')
    expect(describeGenerateError(mockApiError(403, 'FORBIDDEN', 'x')).kind).toBe('other')
  })
})
