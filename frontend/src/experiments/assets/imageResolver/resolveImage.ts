import { FLUENT_INDEX, FLUENT_URLS } from './emojiCatalog'
import { looseKey, type KeywordIndex } from './keywordIndex'
import { missingKeywordLog, type MissingImageEvent, type MissingKeywordLog } from './missingLog'
import { PLACEHOLDER_ALT, PLACEHOLDER_SRC } from './placeholder'

/** Hình đã chọn đến từ tầng nào: bộ hình cục bộ, ảnh sticker do backend gắn, hay hình dự phòng. */
export type ImageTier = 'fluent' | 'sticker' | 'placeholder'

export interface ResolvedImage {
  tier: ImageTier
  /** Đường dẫn hình (SVG cục bộ, URL https của sticker, hoặc data URI của hình dự phòng). */
  src: string
  /** Văn bản thay thế cho trình đọc màn hình. */
  alt: string
  /** Từ khóa người gọi đưa vào (đã cắt độ dài). */
  keyword: string
  /** Slug trong bộ hình cục bộ; chỉ có khi `tier === 'fluent'`. */
  slug?: string
  /** Hình cần vẽ dạng sticker (khung bo tròn, viền dày): ảnh chụp/vẽ của bên thứ ba, không phải emoji phẳng. */
  sticker: boolean
  /** Ghi nguồn do nơi cấp ảnh sticker đưa vào (tên tác giả...), nếu có. */
  credit?: string
}

/** Một nguồn hình cục bộ trong chuỗi dự phòng. Hiện chỉ có Fluent; thêm bộ khác (ví dụ Twemoji) là thêm một phần tử, không sửa `resolveImage`. */
export interface LocalImageSource {
  id: string
  find(keyword: string): { src: string; alt: string; slug: string } | null
}

export interface ResolveOptions {
  /**
   * Ảnh sticker do backend đã gắn cho câu hỏi (`imageUrl`, thường từ Pexels), dùng khi bộ hình cục bộ không có hình.
   * Module này KHÔNG gọi API nào: tầng này chỉ nhận một URL đã có. Chỉ nhận `https://` hoặc đường dẫn gốc `/...`.
   */
  stickerUrl?: string
  /** Ghi nguồn đi kèm `stickerUrl`. */
  stickerCredit?: string
  /** Gọi mỗi khi bộ hình cục bộ không có hình cho từ khóa (kể cả khi đã dùng sticker). Lỗi ném ra từ hàm này bị nuốt. */
  onMissing?: (event: MissingImageEvent) => void
  /** Sổ ghi hình thiếu; mặc định là sổ dùng chung của ứng dụng, `null` để tắt. */
  log?: MissingKeywordLog | null
  /** Thay chuỗi nguồn cục bộ (test hoặc bộ hình khác). */
  sources?: readonly LocalImageSource[]
}

const MAX_KEYWORD_LENGTH = 200
const MAX_URL_LENGTH = 2048

/** `https://...` hoặc đường dẫn gốc `/...` (không phải `//host`); không dấu cách/điều khiển, không dài quá 2048. Chặn `javascript:`, `data:`, `http:`, `file:`... */
export function isSafeStickerUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_URL_LENGTH) return false
  // eslint-disable-next-line no-control-regex -- cố ý: từ chối ký tự điều khiển
  if (/[\s\u0000-\u001f\u007f]/.test(value)) return false
  if (value.startsWith('//')) return false
  if (value.startsWith('/')) return true
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && url.hostname.length > 0 && url.username === '' && url.password === ''
  } catch {
    return false
  }
}

/** Nguồn Fluent Emoji Flat cục bộ. */
export function createFluentSource(index: KeywordIndex = FLUENT_INDEX, urls: Readonly<Record<string, string>> = FLUENT_URLS): LocalImageSource {
  return {
    id: 'fluent',
    find(keyword) {
      const match = index.find(keyword)
      const src = match ? urls[match.entry.slug] : undefined
      return match && src ? { src, alt: match.entry.name, slug: match.entry.slug } : null
    },
  }
}

const DEFAULT_SOURCES: readonly LocalImageSource[] = [createFluentSource()]

/**
 * Tìm hình cho một từ khóa (tiếng Anh, tiếng Việt có dấu hoặc không dấu), theo chuỗi dự phòng:
 * (1) bộ hình cục bộ, (2) ảnh sticker do backend gắn (`stickerUrl`), (3) hình dự phòng thân thiện.
 * Từ khóa không có trong bộ cục bộ được ghi vào sổ hình thiếu để bổ sung thư viện sau; KHÔNG sinh ảnh, KHÔNG gọi mạng.
 * Không bao giờ ném lỗi: đầu vào lạ (không phải chuỗi, rỗng) cho hình dự phòng.
 */
export function resolveImage(keyword: unknown, options: ResolveOptions = {}): ResolvedImage {
  const text = typeof keyword === 'string' ? keyword.trim().slice(0, MAX_KEYWORD_LENGTH) : ''
  const sources = options.sources ?? DEFAULT_SOURCES

  if (text.length > 0) {
    for (const source of sources) {
      const hit = source.find(text)
      if (hit) return { tier: 'fluent', src: hit.src, alt: hit.alt, keyword: text, slug: hit.slug, sticker: false }
    }
  }

  const sticker = isSafeStickerUrl(options.stickerUrl)
  const tier: 'sticker' | 'placeholder' = sticker ? 'sticker' : 'placeholder'
  if (text.length > 0) report({ keyword: text, normalized: looseKey(text), tier }, options)

  if (sticker) {
    return { tier: 'sticker', src: options.stickerUrl as string, alt: text || PLACEHOLDER_ALT, keyword: text, sticker: true, credit: options.stickerCredit }
  }
  return { tier: 'placeholder', src: PLACEHOLDER_SRC, alt: PLACEHOLDER_ALT, keyword: text, sticker: false }
}

function report(event: MissingImageEvent, options: ResolveOptions): void {
  const log = options.log === undefined ? missingKeywordLog : options.log
  log?.record(event)
  try {
    options.onMissing?.(event)
  } catch {
    // Hàm gọi lại của người dùng hỏng không được làm hỏng việc vẽ hình.
  }
}
