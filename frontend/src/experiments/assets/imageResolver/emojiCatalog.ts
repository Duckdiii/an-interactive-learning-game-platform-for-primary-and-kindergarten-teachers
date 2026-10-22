import keywordsJson from '../../../assets/emoji/keywords.json'
import { buildKeywordIndex, type EmojiKeyword, type KeywordIndex } from './keywordIndex'

/**
 * Bộ hình cục bộ Fluent Emoji Flat (MIT): danh sách từ khóa trong `src/assets/emoji/keywords.json` và mỗi hình là một tệp SVG riêng.
 * `?url&no-inline` + `eager` chỉ nạp đường dẫn (chuỗi nhỏ), không nạp nội dung SVG vào gói JS: trình duyệt tải từng hình khi thật sự vẽ.
 * `no-inline` bắt buộc: không có nó Vite nhúng mọi SVG dưới 4 KB thành data URI ngay trong gói JS (cả 299 hình ≈ 380 KB).
 */
const svgUrls = import.meta.glob<string>('../../../assets/emoji/fluent/*.svg', { query: '?url&no-inline', import: 'default', eager: true })

export const FLUENT_KEYWORDS: readonly EmojiKeyword[] = keywordsJson

/** slug → đường dẫn tệp SVG. */
export const FLUENT_URLS: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(svgUrls).map(([path, url]) => [path.slice(path.lastIndexOf('/') + 1).replace(/\.svg$/, ''), url]),
)

export const FLUENT_INDEX: KeywordIndex = buildKeywordIndex(FLUENT_KEYWORDS)
