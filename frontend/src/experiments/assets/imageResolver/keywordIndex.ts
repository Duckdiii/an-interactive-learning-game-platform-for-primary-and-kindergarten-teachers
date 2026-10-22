/**
 * Chỉ mục từ khóa → hình. Khớp theo thứ tự ưu tiên: (1) chính xác (đúng dấu, không phân biệt hoa thường), (2) bỏ từ loại đứng đầu
 * («con», «quả», «cây», «củ»...) rồi khớp chính xác, (3) không dấu, (4) bỏ từ loại rồi không dấu. Khớp chính xác (kể cả sau khi bỏ từ loại)
 * luôn thắng khớp không dấu, vì tiếng Việt không dấu rất nhập nhằng: «ông» (người) và «ong» (côn trùng) cùng thành «ong» khi bỏ dấu,
 * và «nấm» không được trôi sang «năm» (số 5).
 */
export interface EmojiKeyword {
  /** Tên tệp (không đuôi) trong bộ hình, ví dụ `cat-face`. */
  slug: string
  /** Tên tiếng Việt chính, dùng làm văn bản thay thế (alt) cho trình đọc màn hình. */
  name: string
  category: string
  /** Bí danh: tiếng Anh, tiếng Việt có dấu và không dấu. */
  aliases: readonly string[]
}

export type MatchKind = 'exact' | 'loose' | 'classifier'

export interface KeywordMatch {
  entry: EmojiKeyword
  kind: MatchKind
}

/** Từ loại tiếng Việt thường đứng trước danh từ; chỉ bỏ khi phần còn lại không rỗng. */
const CLASSIFIERS: ReadonlySet<string> = new Set(['con', 'qua', 'quả', 'trai', 'trái', 'cai', 'cái', 'chiec', 'chiếc', 'cay', 'cây', 'cu', 'củ', 'chum', 'chùm'])

/** Chuẩn hóa «chính xác»: NFC, chữ thường, mọi ký tự không phải chữ/số thành một dấu cách. Giữ dấu tiếng Việt. */
export function exactKey(text: string): string {
  return text
    .normalize('NFC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

/** Chuẩn hóa «không dấu»: bỏ dấu thanh/mũ (cả `đ` thành `d`) rồi như `exactKey`. */
export function looseKey(text: string): string {
  return exactKey(text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd'))
}

function withoutClassifier(key: string): string | null {
  const space = key.indexOf(' ')
  if (space <= 0) return null
  return CLASSIFIERS.has(key.slice(0, space)) ? key.slice(space + 1) : null
}

export interface KeywordIndex {
  find(query: unknown): KeywordMatch | null
  /** Các khóa không dấu mà hai mục khác nhau cùng có: mục đứng trước thắng. Chỉ để tác giả dữ liệu soát. */
  ambiguousLooseKeys(): readonly string[]
  /** Các khóa chính xác mà hai mục khác nhau cùng có: phải rỗng (dữ liệu lỗi). */
  conflictingExactKeys(): readonly string[]
  readonly size: number
}

export function buildKeywordIndex(entries: readonly EmojiKeyword[]): KeywordIndex {
  const exact = new Map<string, EmojiKeyword>()
  const loose = new Map<string, EmojiKeyword>()
  const conflicts: string[] = []
  const ambiguous: string[] = []
  for (const entry of entries) {
    const keys = new Set([entry.name, ...entry.aliases, entry.slug.replace(/-/g, ' ')].map(exactKey).filter((key) => key.length > 0))
    for (const key of keys) {
      const known = exact.get(key)
      if (known && known.slug !== entry.slug) conflicts.push(key)
      else exact.set(key, entry)
      const looseKeyOf = looseKey(key)
      const looseKnown = loose.get(looseKeyOf)
      if (looseKnown && looseKnown.slug !== entry.slug) ambiguous.push(looseKeyOf)
      else loose.set(looseKeyOf, entry)
    }
  }

  // Khóa suy ra: tên có từ loại («con heo», «cây nấm») cũng khớp phần danh từ trơn («heo», «nấm»). Đặt SAU các khóa khai tường minh nên
  // không bao giờ đè lên khóa của mục khác (ví dụ «nấm» không bị «năm» ở dạng không dấu lấn át khi mục nấm đã có khóa riêng).
  for (const entry of entries) {
    const bare = withoutClassifier(exactKey(entry.name))
    if (!bare) continue
    if (!exact.has(bare)) exact.set(bare, entry)
    const bareLoose = looseKey(bare)
    if (!loose.has(bareLoose)) loose.set(bareLoose, entry)
  }

  const exactOf = (key: string): EmojiKeyword | undefined => exact.get(key)
  const looseOf = (key: string): EmojiKeyword | undefined => loose.get(looseKey(key))

  return {
    size: entries.length,
    ambiguousLooseKeys: () => [...new Set(ambiguous)],
    conflictingExactKeys: () => [...new Set(conflicts)],
    find(query: unknown): KeywordMatch | null {
      if (typeof query !== 'string') return null
      const key = exactKey(query)
      if (key.length === 0) return null
      const rest = withoutClassifier(key)
      const attempts: [EmojiKeyword | undefined, MatchKind][] = [
        [exactOf(key), 'exact'],
        [rest ? exactOf(rest) : undefined, 'classifier'],
        [looseOf(key), 'loose'],
        [rest ? looseOf(rest) : undefined, 'classifier'],
      ]
      for (const [entry, kind] of attempts) if (entry) return { entry, kind }
      return null
    },
  }
}
