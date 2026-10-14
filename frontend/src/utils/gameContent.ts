import type { GameDsl } from '../types/game-dsl.types'
import type { GameManagement } from '../types/game-response.types'

/** Bỏ các trường do máy chủ quản (`gameId`, `status`, `updatedAt`), chỉ giữ phần nội dung DSL để soạn và gửi lại khi lưu. */
export function toContent(game: GameDsl | (GameDsl & GameManagement)): GameDsl {
  const { gameId: _gameId, status: _status, updatedAt: _updatedAt, ...content } = game as GameDsl & Partial<GameManagement>

  return content as GameDsl
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
