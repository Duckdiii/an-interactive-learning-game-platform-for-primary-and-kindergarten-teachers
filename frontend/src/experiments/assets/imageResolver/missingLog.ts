/** Một lần tra từ khóa mà bộ hình cục bộ không có. `tier` cho biết cuối cùng đã dùng gì thay thế. */
export interface MissingImageEvent {
  /** Từ khóa người gọi đưa vào (đã cắt độ dài). */
  keyword: string
  /** Dạng không dấu, chữ thường: khóa gộp các cách viết khác nhau của cùng một từ. */
  normalized: string
  tier: 'sticker' | 'placeholder'
}

export interface MissingKeywordStat {
  normalized: string
  /** Cách viết gặp đầu tiên, để người bổ sung thư viện đọc. */
  keyword: string
  count: number
}

/** Tối đa số từ khóa khác nhau được nhớ (khỏi phình bộ nhớ nếu có đầu vào vô hạn). */
export const MAX_TRACKED_KEYWORDS = 500

/**
 * Sổ ghi hình đang thiếu, trong bộ nhớ: gom theo từ khóa chuẩn hóa và đếm số lần. Không gọi mạng, không sinh ảnh;
 * chỉ để người quản trị đọc rồi bổ sung vào thư viện (`getMissingKeywords`). Mỗi bản dùng riêng cho từng test.
 */
export class MissingKeywordLog {
  private readonly stats = new Map<string, MissingKeywordStat>()

  record(event: MissingImageEvent): void {
    const known = this.stats.get(event.normalized)
    if (known) {
      known.count += 1
      return
    }
    if (this.stats.size >= MAX_TRACKED_KEYWORDS) return
    this.stats.set(event.normalized, { normalized: event.normalized, keyword: event.keyword, count: 1 })
  }

  /** Nhiều lần nhất trước; bằng nhau thì theo thứ tự gặp. */
  list(): MissingKeywordStat[] {
    return [...this.stats.values()].sort((a, b) => b.count - a.count).map((stat) => ({ ...stat }))
  }

  clear(): void {
    this.stats.clear()
  }
}

/** Sổ dùng chung của ứng dụng (mặc định của `resolveImage`). */
export const missingKeywordLog = new MissingKeywordLog()

export function getMissingKeywords(): MissingKeywordStat[] {
  return missingKeywordLog.list()
}
