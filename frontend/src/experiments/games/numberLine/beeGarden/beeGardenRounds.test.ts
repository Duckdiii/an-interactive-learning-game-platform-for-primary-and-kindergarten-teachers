import { describe, expect, it } from 'vitest'
import { BEE_GARDEN_ROUNDS, DEFAULT_ROUND_COUNT, makeRounds, MAX_ROUND_COUNT, ROUND_TARGETS, roundTargets } from './beeGardenRounds'

describe('số câu theo dữ liệu', () => {
  it('mặc định 5 câu, đúng năm số đã chốt; BEE_GARDEN_ROUNDS khớp mặc định', () => {
    expect(DEFAULT_ROUND_COUNT).toBe(5)
    expect(roundTargets()).toEqual([...ROUND_TARGETS])
    expect(BEE_GARDEN_ROUNDS).toHaveLength(5)
    expect(BEE_GARDEN_ROUNDS.map((round) => round.target)).toEqual([...ROUND_TARGETS])
  })
  it('ít hơn 5 thì lấy phần đầu; nhiều hơn 5 thì thêm số trong 0 đến 10, không trùng câu liền trước, cố định theo count', () => {
    expect(roundTargets(3)).toEqual([3, 7, 5])
    const eight = roundTargets(8)
    expect(eight).toHaveLength(8)
    expect(eight.slice(0, 5)).toEqual([...ROUND_TARGETS])
    for (const target of eight) {
      expect(target).toBeGreaterThanOrEqual(0)
      expect(target).toBeLessThanOrEqual(10)
      expect(Number.isInteger(target)).toBe(true)
    }
    for (let i = 1; i < eight.length; i += 1) expect(eight[i]).not.toBe(eight[i - 1])
    expect(roundTargets(8)).toEqual(eight)
    expect(roundTargets(MAX_ROUND_COUNT)).toHaveLength(MAX_ROUND_COUNT)
    for (let count = 1; count <= MAX_ROUND_COUNT; count += 1) {
      const list = roundTargets(count)
      for (let i = 1; i < list.length; i += 1) expect(list[i]).not.toBe(list[i - 1])
    }
  })
  it('số không hợp lệ: làm tròn, kẹp trong [1, 20]; NaN thì dùng mặc định', () => {
    expect(roundTargets(0)).toHaveLength(1)
    expect(roundTargets(-4)).toHaveLength(1)
    expect(roundTargets(2.6)).toHaveLength(3)
    expect(roundTargets(500)).toHaveLength(MAX_ROUND_COUNT)
    expect(roundTargets(Number.NaN)).toHaveLength(DEFAULT_ROUND_COUNT)
  })
  it('mỗi câu có id riêng (kể cả khi số đích lặp lại ở câu xa nhau, id phải khác để không dùng chung trạng thái)', () => {
    const rounds = makeRounds(20)
    expect(rounds).toHaveLength(20)
    expect(new Set(rounds.map((round) => round.id)).size).toBe(rounds.length)
  })
})
