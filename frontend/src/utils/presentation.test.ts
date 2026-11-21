import { describe, expect, it } from 'vitest'
import { PRESENTATION_CARRIERS, PRESENTATION_LAYOUTS, cardStyleOf, resolvePresentation } from './presentation'

describe('resolvePresentation', () => {
  it('giá trị đã lưu luôn thắng phần tự chọn', () => {
    expect(resolvePresentation({ carrier: 'card', layout: 'arc' }, 'ocean', 'game-1')).toEqual({ world: 'ocean', carrier: 'card', layout: 'arc' })
  })

  it('chưa lưu thì chọn cố định theo game: mở lại vẫn như cũ, vật hợp với thế giới', () => {
    const first = resolvePresentation(undefined, 'ocean', 'game-42')

    expect(resolvePresentation(undefined, 'ocean', 'game-42')).toEqual(first)
    expect(['fish', 'bubble']).toContain(first.carrier)
    expect(['planet', 'balloon']).toContain(resolvePresentation(undefined, 'space', 'game-42').carrier)
    expect(PRESENTATION_CARRIERS).toContain(resolvePresentation(undefined, 'bee', 'game-42').carrier)
  })

  it('các game khác nhau ra nhiều kiểu khác nhau (không game nào giống hệt game nào)', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 30; i += 1) {
      const { carrier, layout } = resolvePresentation(undefined, 'farm', `game-${i}`)
      seen.add(`${carrier}/${layout}`)
    }

    expect(seen.size).toBeGreaterThanOrEqual(5)
    const layouts = new Set([...seen].map((key) => key.split('/')[1]))
    expect(layouts).toEqual(new Set(PRESENTATION_LAYOUTS))
  })
})

describe('cardStyleOf', () => {
  it('mỗi thế giới một kiểu thẻ riêng, thế giới khác dùng kiểu mặc định', () => {
    const emblems = new Set(['farm', 'ocean', 'jungle', 'space'].map((world) => cardStyleOf(world).emblem))

    expect(emblems.size).toBe(4)
    expect(cardStyleOf('bee')).toEqual(cardStyleOf(undefined))
    expect(cardStyleOf('constructor')).toEqual(cardStyleOf(undefined))
    expect(cardStyleOf(undefined).emblem).toBe('⭐')
  })
})
