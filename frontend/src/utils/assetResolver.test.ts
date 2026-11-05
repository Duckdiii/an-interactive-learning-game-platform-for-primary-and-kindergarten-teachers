import { describe, expect, it } from 'vitest'
import { ASSET_CATALOG, normalizeKeyword, resolveAssetUrl } from './assetResolver'

describe('assetResolver', () => {
  it('kho asset có đủ 27 hình thuộc 4 danh mục', () => {
    expect(ASSET_CATALOG.length).toBeGreaterThanOrEqual(27)
    const categories = new Set(ASSET_CATALOG.map((item) => item.category))
    expect(categories).toEqual(new Set(['numbers', 'fruits', 'animals', 'objects', 'themes']))
  })

  it('chuẩn hóa từ khóa tiếng Việt có dấu thành không dấu', () => {
    expect(normalizeKeyword('Quả Táo Đỏ!')).toBe('qua tao do')
    expect(normalizeKeyword('3 Chú Mèo')).toBe('3 chu meo')
    expect(normalizeKeyword('Số 10')).toBe('so 10')
  })

  it('tra cứu đúng URL cho hoa quả và số lượng', () => {
    expect(resolveAssetUrl('1 quả táo')).toBe('/assets/fruits/apple.svg')
    expect(resolveAssetUrl('Quả chuối')).toBe('/assets/fruits/banana.svg')
    expect(resolveAssetUrl('Dưa hấu đỏ')).toBe('/assets/fruits/watermelon.svg')
    expect(resolveAssetUrl('Dâu tây')).toBe('/assets/fruits/strawberry.svg')
    expect(resolveAssetUrl('Quả cam')).toBe('/assets/fruits/orange.svg')
  })

  it('tra cứu đúng URL cho chữ số', () => {
    expect(resolveAssetUrl('Số 1')).toBe('/assets/numbers/number-1.svg')
    expect(resolveAssetUrl('Số 5')).toBe('/assets/numbers/number-5.svg')
    expect(resolveAssetUrl('Số 10')).toBe('/assets/numbers/number-10.svg')
  })

  it('tra cứu đúng URL cho con vật và đồ vật', () => {
    expect(resolveAssetUrl('Con mèo')).toBe('/assets/animals/cat.svg')
    expect(resolveAssetUrl('cat')).toBe('/assets/animals/cat.svg')
    expect(resolveAssetUrl('Con chó')).toBe('/assets/animals/dog.svg')
    expect(resolveAssetUrl('Con cá')).toBe('/assets/animals/fish.svg')
    expect(resolveAssetUrl('Ngôi sao')).toBe('/assets/objects/star.svg')
    expect(resolveAssetUrl('Bông hoa')).toBe('/assets/objects/flower.svg')
  })

  it('ưu tiên visualPrompt trước khi xét text', () => {
    expect(resolveAssetUrl('Số 1', 'một quả táo đỏ')).toBe('/assets/fruits/apple.svg')
    expect(resolveAssetUrl('p1', 'con mèo dễ thương')).toBe('/assets/animals/cat.svg')
  })

  it('trả về null khi không khớp từ khóa nào', () => {
    expect(resolveAssetUrl('từ ngữ không xác định 12345')).toBeNull()
    expect(resolveAssetUrl(undefined, undefined)).toBeNull()
  })
})
