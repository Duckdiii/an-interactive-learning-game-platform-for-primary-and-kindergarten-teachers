import { describe, expect, it } from 'vitest'
import { seededDerangement } from './seededDerangement'

const range = (n: number) => Array.from({ length: n }, (_, i) => i)

describe('seededDerangement', () => {
  it('không phần tử nào ở lại vị trí cũ, với mọi kích thước 2..8 và nhiều hạt giống', () => {
    for (let size = 2; size <= 8; size++) {
      const items = range(size)
      for (let s = 0; s < 200; s++) {
        const shuffled = seededDerangement(items, `q${s}`)
        const fixedPoints = shuffled.filter((value, index) => value === items[index])
        expect(fixedPoints, `size=${size} seed=q${s}`).toHaveLength(0)
      }
    }
  })

  it('giữ nguyên tập phần tử (chỉ đổi thứ tự) và không sửa mảng gốc', () => {
    const items = ['a', 'b', 'c', 'd', 'e']
    const copy = [...items]

    const shuffled = seededDerangement(items, 'q1')

    expect([...shuffled].sort()).toEqual([...items].sort())
    expect(items).toEqual(copy)
    expect(shuffled).not.toBe(items)
  })

  it('cùng hạt giống thì cùng kết quả (render lại, tải lại trang không đổi thứ tự)', () => {
    const items = range(6)

    expect(seededDerangement(items, 'q7')).toEqual(seededDerangement(items, 'q7'))
  })

  it('hạt giống khác nhau cho ra nhiều thứ tự khác nhau (không luôn cùng một hoán vị)', () => {
    const items = range(6)
    const distinct = new Set<string>()
    for (let s = 0; s < 50; s++) distinct.add(seededDerangement(items, `q${s}`).join(','))

    expect(distinct.size).toBeGreaterThan(5)
  })

  it('2 phần tử: bắt buộc đổi chỗ', () => {
    expect(seededDerangement(['x', 'y'], 'bất kỳ')).toEqual(['y', 'x'])
  })

  it('0 hoặc 1 phần tử: không xáo được nên trả bản sao nguyên vẹn', () => {
    expect(seededDerangement([], 'q1')).toEqual([])
    expect(seededDerangement(['x'], 'q1')).toEqual(['x'])
  })
})
