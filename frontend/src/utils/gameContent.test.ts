import { describe, expect, it } from 'vitest'
import { buildMockGameContents } from '../services/mock/gameFixtures'
import { deepEqual, toContent, trimContent } from './gameContent'

describe('toContent', () => {
  it('bỏ gameId, status, updatedAt và giữ nguyên phần DSL', () => {
    const dsl = buildMockGameContents()[0]
    const response = { ...dsl, gameId: 'g1', status: 'DRAFT', updatedAt: '2026-10-14T00:00:00.000Z' }

    expect(toContent(response)).toEqual(dsl)
    expect(Object.keys(toContent(response))).not.toContain('gameId')
  })
})

describe('deepEqual', () => {
  it('không phụ thuộc thứ tự khóa, phân biệt mảng và đối tượng', () => {
    expect(deepEqual({ a: 1, b: { c: [1, 2] } }, { b: { c: [1, 2] }, a: 1 })).toBe(true)
    expect(deepEqual([1, 2], [2, 1])).toBe(false)
    expect(deepEqual([], {})).toBe(false)
    expect(deepEqual({ a: 1 }, { a: 1, b: undefined })).toBe(false)
    expect(deepEqual(null, {})).toBe(false)
    expect(deepEqual('a', 'a')).toBe(true)
  })
})

describe('trimContent', () => {
  it('cắt khoảng trắng hai đầu của mọi chuỗi (lồng nhau, trong mảng), giữ nguyên số và cấu trúc', () => {
    const input = { a: '  x ', n: 5, list: [' y', { deep: 'z  ' }], flag: true, none: null }

    expect(trimContent(input)).toEqual({ a: 'x', n: 5, list: ['y', { deep: 'z' }], flag: true, none: null })
  })

  it('không có gì để cắt thì trả lại ĐÚNG đối tượng cũ (không tạo bản sao thừa)', () => {
    const input = { a: 'x', list: ['y', { deep: 'z' }] }

    expect(trimContent(input)).toBe(input)
  })

  it('chỉ sao chép nhánh có thay đổi', () => {
    const untouched = { deep: 'z' }
    const input = { a: ' x', keep: untouched }
    const out = trimContent(input)

    expect(out.keep).toBe(untouched)
    expect(out.a).toBe('x')
  })
})
