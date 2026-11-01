import type { GameDsl } from '../types/game-dsl.types'
import type { GameManagement } from '../types/game-response.types'

/** Bỏ các trường do máy chủ quản (`gameId`, `status`, `updatedAt`), chỉ giữ phần nội dung DSL để soạn và gửi lại khi lưu. */
export function toContent(game: GameDsl | (GameDsl & GameManagement)): GameDsl {
  const { gameId: _gameId, status: _status, updatedAt: _updatedAt, ...content } = game as GameDsl & Partial<GameManagement>

  return content as GameDsl
}

/**
 * Bản sao mà MỌI chuỗi đã cắt khoảng trắng hai đầu (tên, chủ đề, chữ câu hỏi, đáp án, cặp ghép...). Backend đếm ký tự trên chuỗi thô và
 * schema không cho chuỗi dư khoảng trắng; ô nhập vẫn giữ nguyên chữ đang gõ cho tới lúc lưu. Không có gì đổi thì trả lại đúng đối tượng cũ.
 */
export function trimContent<T>(value: T): T {
  if (typeof value === 'string') return value.trim() as T
  if (Array.isArray(value)) {
    const items = value.map((item) => trimContent(item))

    return items.every((item, index) => item === value[index]) ? value : (items as T)
  }
  if (typeof value === 'object' && value !== null) {
    const entries = Object.entries(value).map(([key, item]) => [key, trimContent(item)] as const)

    return entries.every(([key, item]) => item === (value as Record<string, unknown>)[key]) ? value : (Object.fromEntries(entries) as T)
  }

  return value
}

// Đường dẫn chỉ sống trong tab hiện tại (`blob:` do trình duyệt cấp cho tệp vừa chọn) hoặc chứa thẳng dữ liệu nhị phân (`data:`).
const TRANSIENT_URL = /^(blob|data):/i
const MEDIA_URL_KEYS = new Set(['imageUrl', 'audioUrl'])

/** Đường dẫn `imageUrl`/`audioUrl` chỉ dùng được trong tab này hoặc là dữ liệu nhị phân nhúng sẵn: không được lưu ra ngoài tab. */
export const isTransientMediaUrl = (url: unknown) => typeof url === 'string' && TRANSIENT_URL.test(url.trim())

// Khóa dùng để ghép phần tử của hai mảng (câu theo `id`, cặp theo `pairId`); phần tử không có mã thì ghép theo vị trí.
const itemKey = (item: unknown, index: number): string | number => {
  const record = (typeof item === 'object' && item !== null ? item : {}) as Record<string, unknown>

  if (typeof record.id === 'string') return record.id
  if (typeof record.pairId === 'string') return record.pairId

  return index
}

/**
 * Bản sao đã BỎ mọi `imageUrl`/`audioUrl` dạng `blob:`/`data:`, dùng khi sao lưu nháp vào localStorage: đường dẫn `blob:` hết hiệu lực khi
 * đóng tab (khôi phục sẽ ra ảnh hỏng) và `data:` là tệp nhị phân (không được đưa vào bản sao lưu). Không có gì cần bỏ thì trả lại đúng đối tượng cũ.
 *
 * Truyền `fallback` (bản đã lưu của cùng game) để chỗ bị bỏ được TRẢ VỀ giá trị cũ ở cùng vị trí (ghép theo `id`/`pairId`): giáo viên thay ảnh
 * cũ bằng ảnh mới chưa lưu thì bản sao lưu giữ ảnh cũ, khôi phục xong rồi Lưu không làm mất ảnh đang dùng. Không có giá trị cũ thì bỏ hẳn trường.
 */
export function stripTransientMedia<T>(value: T, fallback?: unknown): T {
  if (Array.isArray(value)) {
    const counterparts = Array.isArray(fallback) ? fallback : []
    const items = value.map((item, index) => {
      const key = itemKey(item, index)

      return stripTransientMedia(
        item,
        typeof key === 'string' ? counterparts.find((other, position) => itemKey(other, position) === key) : counterparts[index],
      )
    })

    return items.every((item, index) => item === value[index]) ? value : (items as T)
  }
  if (typeof value === 'object' && value !== null) {
    const source = value as Record<string, unknown>
    const counterpart = (typeof fallback === 'object' && fallback !== null && !Array.isArray(fallback) ? fallback : {}) as Record<string, unknown>
    const entries: Array<readonly [string, unknown]> = []

    for (const [key, item] of Object.entries(source)) {
      if (MEDIA_URL_KEYS.has(key) && isTransientMediaUrl(item)) {
        const previous = counterpart[key]

        if (typeof previous === 'string' && !isTransientMediaUrl(previous)) entries.push([key, previous])

        continue
      }

      entries.push([key, stripTransientMedia(item, counterpart[key])])
    }

    return entries.length === Object.keys(source).length && entries.every(([key, item]) => item === source[key])
      ? value
      : (Object.fromEntries(entries) as T)
  }

  return value
}

/** So sánh sâu hai giá trị JSON (không phụ thuộc thứ tự khóa), dùng để biết nội dung đã đổi so với bản đã lưu hay chưa. */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false
  if (Array.isArray(a) !== Array.isArray(b)) return false

  const left = a as Record<string, unknown>
  const right = b as Record<string, unknown>
  const keys = Object.keys(left)

  return keys.length === Object.keys(right).length && keys.every((key) => key in right && deepEqual(left[key], right[key]))
}
