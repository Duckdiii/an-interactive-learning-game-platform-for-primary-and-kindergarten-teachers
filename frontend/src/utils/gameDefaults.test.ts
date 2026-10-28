import { describe, expect, it } from 'vitest'
import type { QuestionDsl } from '../types/game-dsl.types'
import { applyGameDefault, gameDefault } from './gameDefaults'

const q = (id: string, timeLimitSeconds: number, points: number) => ({ id, timeLimitSeconds, points }) as QuestionDsl

describe('gameDefault', () => {
  it('lấy giá trị phổ biến nhất; hòa thì lấy giá trị gặp trước; chưa có câu thì undefined', () => {
    expect(gameDefault([q('a', 30, 10), q('b', 45, 10), q('c', 30, 20)], 'timeLimitSeconds')).toBe(30)
    expect(gameDefault([q('a', 45, 10), q('b', 60, 20)], 'timeLimitSeconds')).toBe(45)
    expect(gameDefault([q('a', 30, 10), q('b', 30, 20), q('c', 30, 20)], 'points')).toBe(20)
    expect(gameDefault([], 'points')).toBeUndefined()
  })

  it('hòa thì ưu tiên mức chuẩn 30 giây / 10 điểm: đặt riêng một câu trong game 2 câu không lật mặc định', () => {
    expect(gameDefault([q('a', 45, 20), q('b', 30, 10)], 'timeLimitSeconds')).toBe(30)
    expect(gameDefault([q('a', 45, 20), q('b', 30, 10)], 'points')).toBe(10)
  })
})

describe('applyGameDefault', () => {
  it('chỉ đổi các câu đang theo mặc định; câu đặt riêng giữ nguyên; không đổi mảng gốc', () => {
    const questions = [q('a', 30, 10), q('b', 60, 10), q('c', 30, 10)]
    const next = applyGameDefault(questions, 'timeLimitSeconds', 20)

    expect(next.map((item) => item.timeLimitSeconds)).toEqual([20, 60, 20])
    expect(next[1]).toBe(questions[1])
    expect(questions[0].timeLimitSeconds).toBe(30)
  })
})
