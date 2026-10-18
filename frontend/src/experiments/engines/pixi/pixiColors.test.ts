import { describe, expect, it } from 'vitest'
import { dashedArcs, hexToNumber, INVALID_COLOR } from './pixiColors'

describe('hexToNumber', () => {
  it.each([
    ['#000000', 0x000000],
    ['#FFFFFF', 0xffffff],
    ['#2563EB', 0x2563eb],
    ['#2563eb', 0x2563eb],
    ['#fff', 0xffffff],
    ['#0af', 0x00aaff],
    ['#ABC', 0xaabbcc],
    ['  #334155 ', 0x334155],
  ])('%s → %s', (input, expected) => {
    expect(hexToNumber(input)).toBe(expected)
  })

  it.each(['', '#', '#12', '#1234', '#12345', '#1234567', '123456', '#GGGGGG', 'red', 'rgb(0,0,0)', '#12 456'])('chuỗi hỏng %j → màu báo lỗi', (input) => {
    expect(hexToNumber(input)).toBe(INVALID_COLOR)
  })

  it('màu báo lỗi chói (tím sáng), không trùng màu đen/trắng của theme', () => {
    expect(INVALID_COLOR).toBe(0xff00ff)
  })
})

describe('dashedArcs', () => {
  it('bán kính 46 (vòng gợi ý): số nét nguyên, đều nhau, phủ trọn vòng và không chồng nhau', () => {
    const arcs = dashedArcs(46)
    expect(arcs.length).toBe(Math.floor((2 * Math.PI * 46) / 18)) // chu vi / (nét + hở)
    const step = (2 * Math.PI) / arcs.length
    arcs.forEach(([start, end], i) => {
      expect(start).toBeCloseTo(i * step, 10)
      expect(end).toBeGreaterThan(start)
      expect(end - start).toBeLessThan(step) // còn khoảng hở
      expect(end).toBeLessThanOrEqual((i + 1) * step + 1e-9)
    })
    expect(arcs[arcs.length - 1][1]).toBeLessThanOrEqual(2 * Math.PI)
  })

  it('mỗi nét dài xấp xỉ `dash` px dọc chu vi (sai số nhỏ vì chia vừa khít)', () => {
    const radius = 46
    for (const [start, end] of dashedArcs(radius, 10, 8)) expect((end - start) * radius).toBeGreaterThan(9)
    for (const [start, end] of dashedArcs(radius, 10, 8)) expect((end - start) * radius).toBeLessThan(12)
  })

  it('không có khoảng hở (gap = 0) thì các nét nối liền nhau', () => {
    const arcs = dashedArcs(20, 10, 0)
    const step = (2 * Math.PI) / arcs.length
    arcs.forEach(([start, end]) => expect(end - start).toBeCloseTo(step, 10))
  })

  it('vòng rất nhỏ vẫn có ít nhất một nét; đầu vào hỏng thì rỗng', () => {
    expect(dashedArcs(1).length).toBe(1)
    expect(dashedArcs(0)).toEqual([])
    expect(dashedArcs(-5)).toEqual([])
    expect(dashedArcs(Number.NaN)).toEqual([])
    expect(dashedArcs(46, 0)).toEqual([])
    expect(dashedArcs(46, 10, -1)).toEqual([])
  })

  it('vòng lớn hơn thì nhiều nét hơn', () => {
    expect(dashedArcs(100).length).toBeGreaterThan(dashedArcs(46).length)
  })
})
