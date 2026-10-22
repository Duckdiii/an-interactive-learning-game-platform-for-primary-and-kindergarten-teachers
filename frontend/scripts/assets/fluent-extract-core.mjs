/**
 * Lõi trích SVG Fluent Emoji Flat từ gói `@iconify-json/fluent-emoji-flat` (MIT) thành từng tệp `<slug>.svg`.
 * Thuần (nhận dữ liệu, trả chuỗi) để test được; phần đọc/ghi tệp ở `extract-fluent-emoji.mjs`.
 */

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
// Gói là nguồn đáng tin, nhưng SVG sẽ được nhúng vào trang nên vẫn từ chối mọi thứ có thể chạy mã hoặc tải ngoài.
const UNSAFE_PATTERN = /<script|<foreignObject|\son[a-z]+\s*=|javascript:|(?:xlink:)?href\s*=\s*["'](?!#)/i

/** Tìm icon theo slug, đi theo bí danh (`aliases[slug].parent`) tối đa một bước. */
export function findIcon(iconSet, slug) {
  const direct = iconSet.icons?.[slug]
  if (direct) return direct
  const parent = iconSet.aliases?.[slug]?.parent
  return parent ? iconSet.icons?.[parent] : undefined
}

/** Dựng nội dung tệp SVG; trả `null` nếu slug sai dạng, không có trong gói hoặc nội dung không an toàn. */
export function buildSvg(iconSet, slug) {
  if (typeof slug !== 'string' || !SLUG_PATTERN.test(slug)) return null
  const icon = findIcon(iconSet, slug)
  if (!icon || typeof icon.body !== 'string' || icon.body.length === 0) return null
  const width = icon.width ?? iconSet.width ?? 32
  const height = icon.height ?? iconSet.height ?? 32
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null
  if (UNSAFE_PATTERN.test(icon.body)) return null
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">${icon.body}</svg>\n`
}

/** Trích mọi slug trong danh sách từ khóa: trả `{ files: Map(slug → nội dung), missing: slug[] }`. */
export function extractAll(iconSet, keywords) {
  const files = new Map()
  const missing = []
  for (const { slug } of keywords) {
    if (files.has(slug)) continue
    const svg = buildSvg(iconSet, slug)
    if (svg === null) missing.push(slug)
    else files.set(slug, svg)
  }
  return { files, missing }
}
