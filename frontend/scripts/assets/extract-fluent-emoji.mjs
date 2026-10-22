// Trích SVG Fluent Emoji Flat cho các từ khóa trong src/assets/emoji/keywords.json vào src/assets/emoji/fluent/.
// Chạy: node scripts/assets/extract-fluent-emoji.mjs   (cần devDependency @iconify-json/fluent-emoji-flat)
// Chỉ ghi `<slug>.svg` trong thư mục đích; không gọi mạng. Thiếu một slug là lỗi (thoát mã 1, không ghi gì).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { extractAll } from './fluent-extract-core.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const require = createRequire(join(root, 'package.json'))
const iconSet = require('@iconify-json/fluent-emoji-flat/icons.json')
const keywords = JSON.parse(readFileSync(join(root, 'src/assets/emoji/keywords.json'), 'utf8'))
const outDir = join(root, 'src/assets/emoji/fluent')

const { files, missing } = extractAll(iconSet, keywords)
if (missing.length > 0) {
  console.error(`Thiếu hoặc không an toàn (${missing.length}): ${missing.join(', ')}`)
  process.exit(1)
}
mkdirSync(outDir, { recursive: true })
let bytes = 0
for (const [slug, svg] of files) {
  writeFileSync(join(outDir, `${slug}.svg`), svg)
  bytes += Buffer.byteLength(svg)
}
console.log(`Đã ghi ${files.size} tệp SVG (${Math.round(bytes / 1024)} KB) vào src/assets/emoji/fluent/`)
