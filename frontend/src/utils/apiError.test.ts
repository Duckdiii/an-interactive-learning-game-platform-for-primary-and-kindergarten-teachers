/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { AxiosError } from 'axios'
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { describe, expect, it } from 'vitest'
import {
  CONNECTION_ERROR_MESSAGES,
  ERROR_MESSAGES,
  errorCodeFromStatus,
} from '../constants/errorMessages'
import { parseApiError } from './apiError'

function responseError(
  status: number,
  data: unknown,
): AxiosError {
  const config = { headers: {} } as InternalAxiosRequestConfig
  const response = { status, data, statusText: '', headers: {}, config } as AxiosResponse

  return new AxiosError('lỗi', 'ERR_BAD_RESPONSE', config, null, response)
}

const apiBody = (code: string, message: string, extra: object = {}) => ({
  success: false,
  error: { code, message, ...extra },
})

describe('ERROR_MESSAGES', () => {
  it('có câu tiếng Việt cho mọi mã lỗi trong docs/openapi/openapi.yaml', () => {
    // Chạy từ thư mục frontend/ (npm test), nên spec nằm ở ../docs.
    const yaml = readFileSync(resolve(process.cwd(), '../docs/openapi/openapi.yaml'), 'utf8')
    const schema = yaml.slice(yaml.indexOf('    ErrorCode:'))
    const enumBlock = /enum:\r?\n((?:\s+- [A-Z_]+\r?\n)+)/.exec(schema)?.[1] ?? ''
    const codes = [...enumBlock.matchAll(/- ([A-Z_]+)/g)].map((match) => match[1])

    expect(codes.length).toBeGreaterThanOrEqual(13)
    for (const code of codes) {
      expect(ERROR_MESSAGES.has(code), `thiếu câu cho ${code}`).toBe(true)
    }
  })

  it('mỗi câu nói rõ nên làm gì tiếp và không chứa thuật ngữ kỹ thuật', () => {
    for (const [code, message] of ERROR_MESSAGES) {
      expect(message.length, code).toBeGreaterThan(20)
      expect(message, code).not.toMatch(/exception|stack|null|undefined|HTTP|\b[45]\d\d\b/i)
      expect(message.endsWith('.'), code).toBe(true)
    }
  })
})

describe('parseApiError', () => {
  it('mã lỗi đã biết dùng câu tiếng Việt chuẩn, bỏ thông điệp tiếng Anh của backend', () => {
    const parsed = parseApiError(
      responseError(504, apiBody('AI_GENERATION_TIMEOUT', 'Gemini timed out')),
      'dự phòng',
    )

    expect(parsed.message).toBe(ERROR_MESSAGES.get('AI_GENERATION_TIMEOUT'))
    expect(parsed.code).toBe('AI_GENERATION_TIMEOUT')
  })

  it('lỗi theo từng ô giữ nguyên thông điệp cụ thể của backend và trả fieldErrors', () => {
    const parsed = parseApiError(
      responseError(
        400,
        apiBody('VALIDATION_ERROR', 'Email đã được đăng ký', { field: 'email' }),
      ),
      'dự phòng',
    )

    expect(parsed.message).toBe('Email đã được đăng ký')
    expect(parsed.fieldErrors).toEqual({ email: 'Email đã được đăng ký' })
    expect(parsed.code).toBe('VALIDATION_ERROR')
  })

  it('VALIDATION_ERROR không kèm tên ô (đăng ký trùng email) vẫn giữ thông điệp cụ thể của backend', () => {
    const parsed = parseApiError(
      responseError(400, apiBody('VALIDATION_ERROR', 'Email đã được đăng ký')),
      'dự phòng',
    )

    expect(parsed.message).toBe('Email đã được đăng ký')
    expect(parsed.fieldErrors).toEqual({})
    expect(parsed.code).toBe('VALIDATION_ERROR')
  })

  it('thân phản hồi dạng {"error": "chuỗi"} của Spring thì dùng câu theo mã HTTP', () => {
    const parsed = parseApiError(responseError(404, { error: 'Not Found' }), 'dự phòng')

    expect(parsed.message).toBe(ERROR_MESSAGES.get('NOT_FOUND'))
    expect(parsed.code).toBe('NOT_FOUND')
  })

  it('VALIDATION_ERROR có details nhiều ô vẫn trả đủ các ô', () => {
    const parsed = parseApiError(
      responseError(
        400,
        apiBody('VALIDATION_ERROR', 'Dữ liệu không hợp lệ', {
          details: { password: 'Mật khẩu quá ngắn', fullName: 'Thiếu họ tên' },
        }),
      ),
      'dự phòng',
    )

    expect(parsed.fieldErrors).toEqual({
      password: 'Mật khẩu quá ngắn',
      fullName: 'Thiếu họ tên',
    })
    expect(parsed.message).toBe('Dữ liệu không hợp lệ')
  })

  it('mã lỗi chưa biết dùng thông điệp backend, rồi tới câu dự phòng', () => {
    expect(
      parseApiError(responseError(418, apiBody('NEW_CODE', 'Câu mới của backend')), 'dự phòng')
        .message,
    ).toBe('Câu mới của backend')
    expect(
      parseApiError(responseError(418, apiBody('NEW_CODE', '')), 'dự phòng').message,
    ).toBe('dự phòng')
  })

  it('mất kết nối (không có phản hồi) và quá hạn có câu riêng', () => {
    const network = new AxiosError('Network Error', 'ERR_NETWORK')
    const timeout = new AxiosError('timeout of 10000ms exceeded', 'ECONNABORTED')

    expect(parseApiError(network, 'dự phòng').message).toBe(
      CONNECTION_ERROR_MESSAGES.network,
    )
    expect(parseApiError(timeout, 'dự phòng').message).toBe(
      CONNECTION_ERROR_MESSAGES.timeout,
    )
    expect(parseApiError(network, 'dự phòng').code).toBeUndefined()
  })

  it('phản hồi chỉ có mã HTTP, không có thân, vẫn ra câu đúng theo mã', () => {
    expect(parseApiError(responseError(429, ''), 'dự phòng').message).toBe(
      ERROR_MESSAGES.get('RATE_LIMITED'),
    )
    expect(parseApiError(responseError(503, null), 'dự phòng').message).toBe(
      ERROR_MESSAGES.get('INTERNAL_ERROR'),
    )
    expect(parseApiError(responseError(400, ''), 'dự phòng').message).toBe('dự phòng')
  })

  it('lỗi không phải của axios dùng câu dự phòng', () => {
    expect(parseApiError(new Error('boom'), 'dự phòng')).toEqual({
      message: 'dự phòng',
      fieldErrors: {},
    })
  })
})

describe('errorCodeFromStatus', () => {
  it.each([
    [401, 'UNAUTHORIZED'],
    [403, 'FORBIDDEN'],
    [404, 'NOT_FOUND'],
    [409, 'CONFLICT'],
    [429, 'RATE_LIMITED'],
    [500, 'INTERNAL_ERROR'],
    [504, 'INTERNAL_ERROR'],
  ])('HTTP %i là %s', (status, code) => {
    expect(errorCodeFromStatus(status)).toBe(code)
  })

  it('mã HTTP khác không đoán', () => {
    expect(errorCodeFromStatus(400)).toBeUndefined()
    expect(errorCodeFromStatus(422)).toBeUndefined()
  })
})
