import { describe, expect, it } from 'vitest'
import { buildMockGameContents } from '../services/mock/gameFixtures'
import { deepEqual, toContent } from './gameContent'

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
