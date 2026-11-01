import type { GameDsl } from '../types/game-dsl.types'
import { stripTransientMedia } from './gameContent'

// Sao lưu bản đang soạn vào localStorage để không mất công khi đóng tab, mất mạng hoặc máy hỏng (NFR-03). CHỈ lưu nội dung
// game của giáo viên đó (khóa theo giáo viên và game), không bao giờ lưu dữ liệu học sinh. Mọi thao tác bọc try/catch:
// trình duyệt chặn lưu trữ (chế độ riêng tư, hết dung lượng) thì bỏ qua, không làm hỏng trang. Xóa ngay sau khi lưu lên máy chủ.
// Máy ở trường dùng chung nên: bản sao lưu luôn gắn với MÃ GIÁO VIÊN cụ thể (chưa có mã thì không sao lưu, không khôi phục) và
// bị xóa sạch khi đăng xuất (`clearAllDrafts`).

const PREFIX = 'ai-game:editor-draft'

export interface StoredDraft {
  content: GameDsl
  // Thời điểm sao lưu (ISO).
  savedAt: string
  // `updatedAt` của game trên máy chủ lúc bắt đầu soạn: để biết sau đó game có được lưu ở nơi khác hay không.
  baseUpdatedAt: string
}

// `owner` là mã giáo viên; thiếu (null, rỗng) thì mọi thao tác bỏ qua.
type Owner = string | null | undefined

const hasOwner = (owner: Owner): owner is string => typeof owner === 'string' && owner.trim() !== ''

const keyOf = (owner: string, gameId: string) => `${PREFIX}:${owner}:${gameId}`

function isStoredDraft(value: unknown): value is StoredDraft {
  if (typeof value !== 'object' || value === null) return false

  const draft = value as Partial<StoredDraft>
  const content = draft.content as Partial<GameDsl> | undefined
  const metadata = content?.metadata as Partial<GameDsl['metadata']> | undefined
  const isDate = (text: unknown) => typeof text === 'string' && !Number.isNaN(Date.parse(text))

  // Trang soạn thảo đọc thẳng `metadata.title`, nên bản thiếu metadata phải bị loại ở đây chứ không để làm trắng trang.
  return (
    isDate(draft.savedAt) &&
    isDate(draft.baseUpdatedAt) &&
    typeof content === 'object' &&
    content !== null &&
    typeof content.gameType === 'string' &&
    Array.isArray(content.questions) &&
    typeof metadata === 'object' &&
    metadata !== null &&
    typeof metadata.title === 'string' &&
    typeof metadata.topic === 'string'
  )
}

export function saveDraft(owner: Owner, gameId: string, content: GameDsl, baseUpdatedAt: string, now: Date = new Date()) {
  if (!hasOwner(owner)) return false

  try {
    // Tệp ảnh/âm thanh vừa tải lên (đường dẫn `blob:`/`data:`) KHÔNG đi vào bản sao lưu: khôi phục sẽ không có ảnh đó thay vì ảnh hỏng.
    const draft: StoredDraft = { content: stripTransientMedia(content), savedAt: now.toISOString(), baseUpdatedAt }

    localStorage.setItem(keyOf(owner, gameId), JSON.stringify(draft))

    return true
  } catch {
    return false
  }
}

/** Bản sao lưu hợp lệ, hoặc null khi không có, hỏng hay không đọc được. */
export function loadDraft(owner: Owner, gameId: string): StoredDraft | null {
  if (!hasOwner(owner)) return null

  try {
    const raw = localStorage.getItem(keyOf(owner, gameId))
    const parsed: unknown = raw === null ? null : JSON.parse(raw)

    return isStoredDraft(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function clearDraft(owner: Owner, gameId: string) {
  if (!hasOwner(owner)) return

  try {
    localStorage.removeItem(keyOf(owner, gameId))
  } catch {
    // Không xóa được thì thôi: lần mở sau sẽ so với bản trên máy chủ và bỏ bản sao lưu thừa.
  }
}

/** Xóa bản sao lưu của mọi giáo viên TRỪ `keepOwner`. Gọi khi đăng nhập: máy dùng chung không giữ nội dung của người khác. */
export function clearDraftsExcept(keepOwner: Owner) {
  const keepPrefix = hasOwner(keepOwner) ? `${PREFIX}:${keepOwner}:` : null

  try {
    const keys: string[] = []

    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index)

      if (key?.startsWith(`${PREFIX}:`) && !(keepPrefix && key.startsWith(keepPrefix))) keys.push(key)
    }

    keys.forEach((key) => localStorage.removeItem(key))
  } catch {
    // Trình duyệt chặn lưu trữ thì không có gì để xóa.
  }
}

/** Xóa MỌI bản sao lưu trên máy này (của mọi giáo viên, mọi game). Gọi khi đăng xuất. Không đụng tới khóa khác (phiên đăng nhập...). */
export function clearAllDrafts() {
  try {
    const keys: string[] = []

    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index)

      if (key?.startsWith(`${PREFIX}:`)) keys.push(key)
    }

    keys.forEach((key) => localStorage.removeItem(key))
  } catch {
    // Trình duyệt chặn lưu trữ thì không có gì để xóa.
  }
}
