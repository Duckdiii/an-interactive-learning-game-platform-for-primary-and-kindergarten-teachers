import { describe, expect, it } from 'vitest'
import { findCatalogItemsInText } from './assetResolver'

const first = (text: string) => findCatalogItemsInText(text)[0]?.url

describe('findCatalogItemsInText: từ khóa dài nhất thắng', () => {
  it('"bóng bay" là bóng bay, không phải quả bóng', () => {
    expect(first('Pop the red balloon')).toBe('/assets/fluent/object-balloon.svg')
    expect(first('quả bóng bay')).toBe('/assets/fluent/object-balloon.svg')
    expect(first('quả bóng')).toBe('/assets/objects/ball.svg')
  })

  it('con vật mới trong kho Fluent', () => {
    expect(first('Con trâu')).toBe('/assets/fluent/animal-buffalo.svg')
    expect(first('Con rắn')).toBe('/assets/fluent/animal-snake.svg')
  })

  it('không gắn hình vật (ngoài chữ số) cho từ thường bị trùng âm khi bỏ dấu', () => {
    const objects = (text: string) => findCatalogItemsInText(text).filter((item) => item.category !== 'numbers')
    expect(objects('số nhỏ nhất')).toEqual([])
    expect(objects('năm học mới')).toEqual([])
    expect(objects('ông và bà của em')).toEqual([])
    expect(objects('miếng bánh')).toEqual([])
    expect(objects('con dế mèn')).toEqual([])
    expect(objects('ngứa tay')).toEqual([])
    expect(objects('ngõ nhỏ')).toEqual([])
  })
})
