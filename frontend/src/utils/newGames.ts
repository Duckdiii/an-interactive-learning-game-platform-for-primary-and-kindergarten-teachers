import { useSyncExternalStore } from 'react'

// Các game VỪA TẠO bằng AI trong phiên này (để thẻ game có đánh dấu "Mới"). Chỉ nằm trong bộ nhớ của tab: KHÔNG lưu localStorage, nên tải lại
// trang là hết. Hết đánh dấu khi giáo viên mở game đó, và xóa sạch khi đăng xuất hoặc có người khác đăng nhập (máy dùng chung ở trường).

let ids: ReadonlySet<string> = new Set()
const listeners = new Set<() => void>()

function publish(next: ReadonlySet<string>) {
  ids = next
  listeners.forEach((listener) => listener())
}

export const isNewGame = (gameId: string) => ids.has(gameId)

export function markNewGames(gameIds: ReadonlyArray<string>) {
  if (gameIds.length === 0) return

  publish(new Set([...ids, ...gameIds]))
}

/** Giáo viên đã mở game: hết "Mới". Không có trong tập thì không làm gì (không báo cho ai). */
export function unmarkNewGame(gameId: string) {
  if (!ids.has(gameId)) return

  publish(new Set([...ids].filter((id) => id !== gameId)))
}

export function clearNewGames() {
  if (ids.size === 0) return

  publish(new Set())
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)

  return () => listeners.delete(listener)
}

/** Tập mã game "Mới" hiện tại; vẽ lại khi tập đổi. */
export const useNewGameIds = () => useSyncExternalStore(subscribe, () => ids)
