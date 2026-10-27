import { AxiosError } from 'axios'
import { describe, expect, it } from 'vitest'
import { mockApiError } from '../../services/mock/mockErrors'
import { PlayerApiNotSupportedError } from '../api'
import { isJoinCodeFormat, normalizeJoinCode, publishErrorKind } from './joinCode'

describe('normalizeJoinCode', () => {
  it.each([
    ['mock00', 'MOCK00'],
    ['  mock 00 ', 'MOCK00'],
    ['m o\tc k\n00', 'MOCK00'],
    ['', ''],
  ])('%j -> %j', (raw, expected) => expect(normalizeJoinCode(raw)).toBe(expected))
})

describe('isJoinCodeFormat', () => {
  it.each([
    ['MOCK00', true],
    ['ABC', false],
    ['ABCDE', false],
    ['ABCDEFG', false],
    ['ĐÂY123', false],
    ['AB-123', false],
    ['abcdef', false],
    ['', false],
  ])('%j -> %s', (code, expected) => expect(isJoinCodeFormat(code)).toBe(expected))
})

describe('publishErrorKind', () => {
  it.each([
    ['SHARE_CODE_NOT_FOUND', 'notFound'],
    ['GAME_NOT_PUBLISHED', 'notPublished'],
    ['GAME_EXPIRED', 'expired'],
    ['GAME_DISABLED', 'disabled'],
    ['SOMETHING_NEW', 'notFound'],
  ])('404 %s -> %s', (code, kind) => expect(publishErrorKind(mockApiError(404, code, 'x'))).toBe(kind))

  it('mã trùng tên thuộc tính prototype ("constructor", "toString") -> notFound', () => {
    expect(publishErrorKind(mockApiError(404, 'constructor', 'x'))).toBe('notFound')
    expect(publishErrorKind(mockApiError(404, 'toString', 'x'))).toBe('notFound')
  })

  it('403 và 410 với mã lạ -> notFound', () => {
    expect(publishErrorKind(mockApiError(403, 'FORBIDDEN', 'x'))).toBe('notFound')
    expect(publishErrorKind(mockApiError(410, 'GONE', 'x'))).toBe('notFound')
  })

  it('AxiosError không có phản hồi (mất mạng, timeout) -> network', () => {
    expect(publishErrorKind(new AxiosError('Network Error', 'ERR_NETWORK'))).toBe('network')
  })

  it('lỗi lạ hoặc chưa hỗ trợ -> network', () => {
    expect(publishErrorKind(new Error('boom'))).toBe('network')
    expect(publishErrorKind(new PlayerApiNotSupportedError('x'))).toBe('network')
    expect(publishErrorKind(undefined)).toBe('network')
  })
})
