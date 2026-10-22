import { describe, expect, it } from 'vitest'
import { resolveImage } from '../../../assets/imageResolver/resolveImage'
import { flowerKeyword, PROGRESS_FLOWERS, PROGRESS_HONEY, PROGRESS_SEEDLING } from './gardenProgress'

describe('gardenProgress', () => {
  it('mọi từ khóa tiến trình (cây non, các loài hoa, hũ mật) có hình trong thư viện cục bộ', () => {
    for (const keyword of [PROGRESS_SEEDLING, PROGRESS_HONEY, ...PROGRESS_FLOWERS]) {
      const image = resolveImage(keyword, { log: null })
      expect(image.tier, keyword).toBe('fluent')
      expect(image.src, keyword).toMatch(/\.svg/)
    }
  })
  it('cây non và bông hoa là hai hình khác nhau (nở rồi thì nhìn thấy khác)', () => {
    expect(resolveImage(PROGRESS_SEEDLING, { log: null }).slug).not.toBe(resolveImage(PROGRESS_FLOWERS[0], { log: null }).slug)
  })
  it('loài hoa xoay vòng theo chỉ số ô và không ném lỗi với chỉ số lạ', () => {
    for (let i = 0; i < PROGRESS_FLOWERS.length * 2; i += 1) expect(flowerKeyword(i)).toBe(PROGRESS_FLOWERS[i % PROGRESS_FLOWERS.length])
    expect(flowerKeyword(-1)).toBe(PROGRESS_FLOWERS[PROGRESS_FLOWERS.length - 1])
    expect(flowerKeyword(Number.NaN)).toBe(PROGRESS_FLOWERS[0])
  })
  it('các loài hoa khác nhau từng đôi một (vườn nhiều màu)', () => {
    const slugs = PROGRESS_FLOWERS.map((keyword) => resolveImage(keyword, { log: null }).slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })
})
