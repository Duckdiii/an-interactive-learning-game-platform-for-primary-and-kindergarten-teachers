import { AxiosError } from 'axios'
import { describe, expect, it } from 'vitest'
import { shouldRetryGame } from './useGame'

const httpError = (status: number) =>
  new AxiosError('lỗi', 'ERR_BAD_RESPONSE', undefined, undefined, { status } as never)
const codeError = (code: string) => new AxiosError('lỗi', code)

describe('shouldRetryGame', () => {
  it('lỗi mạng (không có phản hồi) và lỗi 5xx thì thử lại một lần', () => {
    expect(shouldRetryGame(0, codeError('ERR_NETWORK'))).toBe(true)
    expect(shouldRetryGame(0, httpError(500))).toBe(true)
    expect(shouldRetryGame(0, httpError(503))).toBe(true)
  })

  it('đã thử lại một lần rồi thì thôi', () => {
    expect(shouldRetryGame(1, codeError('ERR_NETWORK'))).toBe(false)
    expect(shouldRetryGame(2, httpError(500))).toBe(false)
  })

  it('lỗi 4xx là kết quả chắc chắn (404, 403, 401, 409): không thử lại', () => {
    for (const status of [400, 401, 403, 404, 409, 422, 429]) expect(shouldRetryGame(0, httpError(status)), String(status)).toBe(false)
  })

  it('quá hạn hoặc bị hủy thì không thử lại', () => {
    for (const code of ['ECONNABORTED', 'ETIMEDOUT', 'ERR_CANCELED']) expect(shouldRetryGame(0, codeError(code)), code).toBe(false)
  })

  it('lỗi không phải của axios thì không thử lại', () => {
    expect(shouldRetryGame(0, new Error('bug'))).toBe(false)
  })
})
