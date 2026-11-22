#!/usr/bin/env node
// Sinh backend/src/main/resources/assets/game-asset-catalog.json từ ASSET_CATALOG của frontend (nguồn duy nhất).
//   node scripts/assets/build-game-asset-catalog.mjs          ghi đè JSON
//   node scripts/assets/build-game-asset-catalog.mjs --check  chỉ kiểm, thoát mã 1 nếu JSON không khớp
// Nạp thẳng các tệp .ts (Node 22.18+ tự bỏ kiểu), nên không cần cài thêm gì.
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { ASSET_CATALOG } from '../../frontend/src/utils/assetResolver.ts'
import { formatGameAssetCatalog, toGameAssetCatalog } from '../../frontend/src/utils/gameAssetCatalog.ts'

const OUT = fileURLToPath(new URL('../../backend/src/main/resources/assets/game-asset-catalog.json', import.meta.url))
const expected = formatGameAssetCatalog(toGameAssetCatalog(ASSET_CATALOG))

if (process.argv.includes('--check')) {
  const actual = readFileSync(OUT, 'utf8').replaceAll('\r\n', '\n')
  if (actual !== expected) {
    console.error('game-asset-catalog.json không khớp ASSET_CATALOG. Chạy: node scripts/assets/build-game-asset-catalog.mjs')
    process.exit(1)
  }
  console.log('game-asset-catalog.json khớp ASSET_CATALOG.')
} else {
  writeFileSync(OUT, expected)
  console.log(`Đã ghi ${OUT} (${JSON.parse(expected).assets.length} hình).`)
}
