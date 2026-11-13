/**
 * Danh mục hình dành cho backend (resources/assets/game-asset-catalog.json), SINH từ ASSET_CATALOG của frontend: ASSET_CATALOG là
 * nguồn duy nhất, JSON không sửa tay. Sinh lại bằng `node scripts/assets/build-game-asset-catalog.mjs`; test
 * gameAssetCatalog.test.ts báo đỏ nếu quên.
 *
 * Module này không import gì lúc chạy (chỉ `import type`) để script Node nạp thẳng được tệp .ts.
 */
import type { AssetItem } from './assetResolver'

export type AssetFamily = 'openmoji' | 'fluent' | 'kenney' | 'custom'
export type AssetGroup =
  | 'number' | 'food' | 'animal' | 'body' | 'plant' | 'weather' | 'people' | 'clothes' | 'flag' | 'space' | 'scene'
  | 'vehicle' | 'school' | 'music' | 'furniture' | 'object'

export interface GameAssetEntry {
  id: string
  /** Nhãn đưa vào prompt cho AI (`promptLabel` nếu có, không thì `name`). */
  label: string
  url: string
  /** Nhóm nghĩa, để lọc và đối chiếu nghĩa. */
  group: AssetGroup
  /** Họ phong cách của hình: mỗi game nên dùng một họ. */
  family: AssetFamily
  /** Từ khóa không dấu để khớp chữ với hình: `keywords` cộng `matchKeywords` của ASSET_CATALOG. */
  keywords: readonly string[]
  /** Từ khóa có dấu, khớp nguyên từ và phân biệt dấu, cho từ ngắn trùng âm khi bỏ dấu ("bàn" khác "bạn"). */
  exactKeywords: readonly string[]
}

export const ASSET_GROUPS: readonly AssetGroup[] = [
  'number', 'food', 'animal', 'body', 'plant', 'weather', 'people', 'clothes', 'flag', 'space', 'scene',
  'vehicle', 'school', 'music', 'furniture', 'object',
]
export const ASSET_FAMILIES: readonly AssetFamily[] = ['openmoji', 'fluent', 'kenney', 'custom']

export const GAME_ASSET_CATALOG_DESCRIPTION =
  'Danh mục hình cho game DSL v1.0.0: AI chọn id (trường asset của đầu ra AI), backend gán imageUrl = url. SINH TỰ ĐỘNG từ ' +
  'ASSET_CATALOG trong frontend/src/utils/assetResolver.ts (bỏ nhóm themes) bằng `node scripts/assets/build-game-asset-catalog.mjs`; ' +
  'không sửa tay (test gameAssetCatalog.test.ts kiểm khớp). group: nhóm nghĩa; family: họ phong cách; keywords: từ khóa không dấu; ' +
  'exactKeywords: từ khóa có dấu, khớp nguyên từ.'

/** Họ phong cách theo thư mục chứa hình; các thư mục còn lại (animals, fruits, objects, numbers, mascots) là OpenMoji. */
export function familyOf(url: string): AssetFamily {
  const folder = url.split('/')[2]
  return folder === 'fluent' || folder === 'kenney' || folder === 'custom' ? folder : 'openmoji'
}

// Hình mà tiền tố id (fluent-object-..., obj-...) nói không đúng nghĩa: nhóm theo nghĩa, ưu tiên hơn GROUP_BY_ID.
export const GROUP_BY_MEANING: Readonly<Record<string, AssetGroup>> = {
  'fluent-object-earth': 'space',
  'fluent-object-sun': 'weather',
  'fluent-object-cloud': 'weather',
  'fluent-object-tree': 'plant',
  'obj-flower': 'plant',
  'obj-car': 'vehicle',
  'fluent-object-boat': 'vehicle',
  'fluent-object-bicycle': 'vehicle',
  'fluent-object-bus': 'vehicle',
  'fluent-object-airplane': 'vehicle',
  'fluent-object-motorcycle': 'vehicle',
  'fluent-object-train': 'vehicle',
  'fluent-object-race-car': 'vehicle',
  'fluent-object-tricycle': 'vehicle',
  'fluent-object-truck': 'vehicle',
  'fluent-object-ambulance': 'vehicle',
  'fluent-object-helicopter': 'vehicle',
  'fluent-object-fire-engine': 'vehicle',
  'fluent-object-ship': 'vehicle',
  'fluent-object-tractor': 'vehicle',
  'fluent-object-chair': 'furniture',
  'fluent-object-microphone': 'music',
  'fluent-object-school': 'scene',
  'fluent-object-supermarket': 'scene',
  'fluent-object-park': 'scene',
  'fluent-object-pencil': 'school',
  'fluent-object-book': 'school',
  'fluent-object-backpack': 'school',
  'fluent-object-ruler': 'school',
  'fluent-object-scissors': 'school',
  'fluent-object-drum': 'music',
  'fluent-object-guitar': 'music',
  'fluent-object-music-note': 'music',
  'fluent-object-speaker': 'music',
  'custom-object-table': 'furniture',
  'fluent-object-bed': 'furniture',
}

// Theo tiền tố id; thứ tự không quan trọng vì các tiền tố không chồng nhau. Hình mới có tiền tố lạ thì báo lỗi để phải phân nhóm.
const GROUP_BY_ID: ReadonlyArray<readonly [RegExp, AssetGroup]> = [
  [/^num-/, 'number'],
  [/^(fruit-|(fluent|custom)-food-)/, 'food'],
  [/^(anim-|fluent-animal-|kenney-animal-)/, 'animal'],
  [/^(fluent|custom)-body-/, 'body'],
  [/^(fluent|custom)-plant-/, 'plant'],
  [/^fluent-weather-/, 'weather'],
  [/^fluent-people-/, 'people'],
  [/^(fluent|custom)-clothes-/, 'clothes'],
  [/^kenney-flag-/, 'flag'],
  [/^kenney-planet-/, 'space'],
  [/^(fluent-bg-|custom-scene-)/, 'scene'],
  [/^(obj-|(fluent|custom)-object-)/, 'object'],
]

export function groupOf(id: string): AssetGroup {
  const byMeaning = GROUP_BY_MEANING[id]
  if (byMeaning) return byMeaning
  const rule = GROUP_BY_ID.find(([pattern]) => pattern.test(id))
  if (!rule) throw new Error(`Chưa phân nhóm nghĩa cho hình "${id}": thêm quy tắc vào GROUP_BY_ID trong gameAssetCatalog.ts`)
  return rule[1]
}

/** Danh mục backend từ ASSET_CATALOG: bỏ nhóm chủ đề (themes, nền và nhân vật của thế giới game, không phải hình đáp án). */
export function toGameAssetCatalog(items: readonly AssetItem[]): GameAssetEntry[] {
  return items
    .filter((item) => item.category !== 'themes')
    .map((item) => ({
      id: item.id,
      label: item.promptLabel ?? item.name,
      url: item.url,
      group: groupOf(item.id),
      family: familyOf(item.url),
      keywords: [...new Set([...item.keywords, ...(item.matchKeywords ?? [])])],
      exactKeywords: item.exactKeywords ?? [],
    }))
}

/** Dạng chữ của file JSON: mỗi hình một dòng cho dễ đọc diff. */
export function formatGameAssetCatalog(entries: readonly GameAssetEntry[]): string {
  const j = (value: string) => JSON.stringify(value)
  const lines = entries.map(
    (e) =>
      `    { "id": ${j(e.id)}, "label": ${j(e.label)}, "url": ${j(e.url)}, "group": ${j(e.group)}, "family": ${j(e.family)}, ` +
      `"keywords": [${e.keywords.map(j).join(', ')}], "exactKeywords": [${e.exactKeywords.map(j).join(', ')}] }`,
  )
  return `{\n  "description": ${JSON.stringify(GAME_ASSET_CATALOG_DESCRIPTION)},\n  "assets": [\n${lines.join(',\n')}\n  ]\n}\n`
}
