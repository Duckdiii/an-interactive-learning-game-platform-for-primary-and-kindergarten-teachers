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
