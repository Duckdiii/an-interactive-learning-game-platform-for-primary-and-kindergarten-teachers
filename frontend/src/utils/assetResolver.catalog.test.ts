import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { ASSET_CATALOG, findCatalogItemsInText, normalizeKeyword } from './assetResolver'

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

describe('kho asset bổ sung (giai đoạn 3)', () => {
  it('hành tinh gọi bằng tên, không bị nhầm với ngôi sao', () => {
    expect(first('sao Thủy')).toBe('/assets/kenney/planets/mercury.png')
    expect(first('sao Kim')).toBe('/assets/kenney/planets/venus.png')
    expect(first('sao Hỏa')).toBe('/assets/kenney/planets/mars.png')
    expect(first('ngôi sao')).toBe('/assets/objects/star.svg')
  })

  it('bộ phận cơ thể và đồ ăn mới', () => {
    expect(first('head')).toBe('/assets/custom/body-head.svg')
    expect(first('knees')).toBe('/assets/custom/body-knee.svg')
    expect(first('đầu gối')).toBe('/assets/custom/body-knee.svg')
    expect(first('ngón chân')).toBe('/assets/custom/body-toe.svg')
    expect(first('bánh chưng')).toBe('/assets/custom/food-banh-chung.svg')
  })

  it('găng tay là găng tay, không phải bàn tay', () => {
    expect(first('găng tay')).toBe('/assets/fluent/clothes-gloves.svg')
  })

  it('từ thường bị trùng âm khi bỏ dấu không gắn hình mới', () => {
    const objects = (text: string) => findCatalogItemsInText(text).filter((item) => item.category !== 'numbers')
    // 'đầu', 'dâu', 'đau' cùng thành 'dau': từ trơ trọi không được gắn hình đầu người.
    expect(objects('đau bụng')).toEqual([])
    expect(objects('trong lớp học')).toEqual([])
    expect(objects('vài bạn nhỏ')).toEqual([])
    expect(objects('các bạn học bài')).toEqual([])
    expect(first('dâu tây')).toBe('/assets/fruits/strawberry.svg')
  })

  it('hẹn gặp bạn: từ trùng âm không gắn hình mới', () => {
    // "hẹn" bỏ dấu thành "hen"; không được gắn hình con gà. "với", "héo", "khi" còn nhầm ở mục có sẵn (jungle-elephant, farm-pig, jungle-monkey), không thuộc giai đoạn 3.
    const objects = (text: string) => findCatalogItemsInText(text).filter((item) => item.category !== 'numbers')
    expect(objects('hẹn gặp bạn')).toEqual([])
    expect(objects('hẹn giờ')).toEqual([])
  })

  it('mục mới không có từ khóa đơn ngắn dễ trùng âm (trừ danh sách cho phép)', () => {
    // Chỉ xét hình mới của giai đoạn 3 (tự vẽ, Kenney). Từ tiếng Anh đủ rõ nghĩa thì cho phép.
    const allowed = new Set(['head', 'knee', 'knees', 'toe', 'toes', 'mars', 'desk'])
    const risky = ASSET_CATALOG.filter((item) => item.url.startsWith('/assets/custom/') || item.url.startsWith('/assets/kenney/'))
      .flatMap((item) => item.keywords.map((kw) => ({ id: item.id, kw })))
      .filter(({ kw }) => !kw.includes(' ') && kw.length <= 4 && !allowed.has(kw))
    expect(risky).toEqual([])
  })

  it('một từ khóa không thuộc hai hình khác tên (lessons-inbox 2026-11-13: "den ong sao", "sao vang")', () => {
    // Hai bộ hình của cùng một vật (fruits/apple và fluent/food-apple) có cùng tên nên được trùng từ khóa.
    // exactKeywords giữ dấu ("đầu" khác "dâu") nên so nguyên dạng, không bỏ dấu.
    // shortcut: không so exactKeywords với từ khóa đã bỏ dấu của vật khác ("chó" với "cho"); cách khớp hai loại do backend quyết.
    // Cho phép theo đúng từ khóa và đúng tập tên (đã sắp xếp), để thêm hình thứ ba vào cùng từ khóa vẫn bị báo.
    const sameThing = new Set([
      'ca: ca he / con ca', 'turtle: con rua / rua bien', 'con rua: con rua / rua bien', 'tree: cai cay / cay xanh',
      'trai dat: hanh tinh / trai dat',
    ])
    const owners = new Map<string, Set<string>>()
    for (const item of ASSET_CATALOG) {
      const keys = [
        ...[...item.keywords, ...(item.matchKeywords ?? [])].map(normalizeKeyword),
        ...(item.exactKeywords ?? []).map((kw) => `=${kw.toLowerCase()}`),
      ]
      for (const kw of new Set(keys)) {
        if (!owners.has(kw)) owners.set(kw, new Set())
        owners.get(kw)!.add(normalizeKeyword(item.name))
      }
    }
    const clashes = [...owners].filter(([, names]) => names.size > 1).map(([kw, names]) => `${kw}: ${[...names].sort().join(' / ')}`)
    expect(clashes.filter((c) => !sameThing.has(c))).toEqual([])
  })

  it('mọi tệp trong danh mục có thật trong public', () => {
    const missing = ASSET_CATALOG.filter((item) => !fs.existsSync(fileURLToPath(new URL('../../public' + item.url, import.meta.url)))).map((item) => item.id)
    expect(missing).toEqual([])
  })
})
