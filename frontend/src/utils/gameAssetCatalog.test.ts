import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { ASSET_CATALOG } from './assetResolver'
import {
  ASSET_FAMILIES,
  ASSET_GROUPS,
  familyOf,
  formatGameAssetCatalog,
  GROUP_BY_MEANING,
  groupOf,
  toGameAssetCatalog,
} from './gameAssetCatalog'

const entries = toGameAssetCatalog(ASSET_CATALOG)

describe('gameAssetCatalog: danh mục backend sinh từ ASSET_CATALOG', () => {
  it('file JSON của backend khớp từng chữ với bản sinh ra từ ASSET_CATALOG', () => {
    // Đỏ nghĩa là đã sửa ASSET_CATALOG mà chưa chạy: node scripts/assets/build-game-asset-catalog.mjs
    // Đường dẫn đặt trong biến: Vite biến `new URL('chuỗi tĩnh', import.meta.url)` thành URL web và fileURLToPath sẽ từ chối.
    const relative = '../../../backend/src/main/resources/assets/game-asset-catalog.json'
    const jsonPath = fileURLToPath(new URL(relative, import.meta.url))
    const onDisk = fs.readFileSync(jsonPath, 'utf8').replaceAll('\r\n', '\n')

    expect(onDisk).toBe(formatGameAssetCatalog(entries))
  })

  it('bỏ nhóm themes, giữ mọi hình còn lại và id không trùng', () => {
    expect(entries).toHaveLength(ASSET_CATALOG.filter((item) => item.category !== 'themes').length)
    expect(new Set(entries.map((entry) => entry.id)).size).toBe(entries.length)
  })

  it('mọi hình có nhóm nghĩa và họ phong cách hợp lệ', () => {
    for (const entry of entries) {
      expect(ASSET_GROUPS, entry.id).toContain(entry.group)
      expect(ASSET_FAMILIES, entry.id).toContain(entry.family)
    }
  })

  it('họ phong cách theo thư mục của hình', () => {
    expect(familyOf('/assets/fluent/object-bus.svg')).toBe('fluent')
    expect(familyOf('/assets/kenney/animals/pig.png')).toBe('kenney')
    expect(familyOf('/assets/custom/body-head.svg')).toBe('custom')
    expect(familyOf('/assets/animals/duck.svg')).toBe('openmoji')
    expect(familyOf('/assets/numbers/number-1.svg')).toBe('openmoji')
  })

  it('nhóm nghĩa theo tiền tố id, hình mới tiền tố lạ thì báo lỗi', () => {
    expect(groupOf('fluent-food-carrot')).toBe('food')
    expect(groupOf('custom-food-banh-chung')).toBe('food')
    expect(groupOf('custom-body-head')).toBe('body')
    expect(groupOf('kenney-animal-pig')).toBe('animal')
    expect(groupOf('kenney-planet-mars')).toBe('space')
    expect(groupOf('num-3')).toBe('number')
    expect(() => groupOf('khong-ro-nhom')).toThrow(/phân nhóm/)
  })

  it('hình có tiền tố id nói sai nghĩa được nhóm theo nghĩa', () => {
    expect(groupOf('fluent-object-earth')).toBe('space')
    expect(groupOf('fluent-object-sun')).toBe('weather')
    expect(groupOf('fluent-object-cloud')).toBe('weather')
    expect(groupOf('fluent-object-tree')).toBe('plant')
    expect(groupOf('fluent-object-bus')).toBe('vehicle')
    expect(groupOf('obj-car')).toBe('vehicle')
    expect(groupOf('custom-object-table')).toBe('furniture')
    expect(groupOf('fluent-object-book')).toBe('school')
    expect(groupOf('fluent-object-guitar')).toBe('music')
    // Hình bình thường theo tiền tố vẫn là đồ vật.
    expect(groupOf('fluent-object-balloon')).toBe('object')
  })

  it('mọi khóa của bảng nhóm theo nghĩa là id có thật trong danh mục (không để sót khóa gõ sai)', () => {
    const ids = new Set(ASSET_CATALOG.map((item) => item.id))

    expect(Object.keys(GROUP_BY_MEANING).filter((id) => !ids.has(id))).toEqual([])
  })

  it('JSON ghi ra đọc lại đúng bằng dữ liệu gốc (kể cả nhãn có dấu nháy hay dấu hai chấm)', () => {
    const tricky = [{ ...entries[0], label: 'Foo": "bar", baz', keywords: ['a"b', 'c, d'] }]

    expect(JSON.parse(formatGameAssetCatalog(tricky)).assets).toEqual(tricky)
    expect(JSON.parse(formatGameAssetCatalog(entries)).assets).toEqual(entries)
  })

  it('nhãn riêng cho AI (promptLabel) thắng tên hiển thị, giữ nhãn phân biệt bóng với bóng bay', () => {
    expect(entries.find((entry) => entry.id === 'obj-ball')?.label).toContain('không phải bóng bay')
    expect(entries.find((entry) => entry.id === 'fluent-object-balloon')?.label).toBe('Bóng bay')
  })
})
