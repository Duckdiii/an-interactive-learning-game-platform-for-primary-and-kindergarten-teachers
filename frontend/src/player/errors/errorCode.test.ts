import { AxiosError } from 'axios'
import { describe, expect, it } from 'vitest'
import { mockApiError } from '../../services/mock/mockErrors'
import { errorCodeOf } from './errorCode'

describe('errorCodeOf', () => {
  it('lấy error.code của Backend', () => {
    expect(errorCodeOf(mockApiError(404, 'GAME_EXPIRED', 'x'))).toBe('GAME_EXPIRED')
  })

  it.each([
    ['mất mạng (không có response)', new AxiosError('Network Error', 'ERR_NETWORK')],
    ['lỗi lạ', new Error('boom')],
    ['không phải Error', 'oops'],
    ['null', null],
  ])('%s -> NET-01', (_name, error) => expect(errorCodeOf(error)).toBe('NET-01'))

  it('response không có error.code dạng chuỗi -> NET-01', () => {
    const error = new AxiosError('x', 'ERR_BAD_RESPONSE', undefined, undefined, { status: 500, data: { error: { code: 5 } } } as never)

    expect(errorCodeOf(error)).toBe('NET-01')
  })
})
