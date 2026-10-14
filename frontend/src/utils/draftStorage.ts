import type { GameDsl } from '../types/game-dsl.types'

// Sao lưu bản đang soạn vào localStorage để không mất công khi đóng tab, mất mạng hoặc máy hỏng (NFR-03). CHỈ lưu nội dung
// game của giáo viên đó (khóa theo giáo viên và game), không bao giờ lưu dữ liệu học sinh. Mọi thao tác bọc try/catch:
// trình duyệt chặn lưu trữ (chế độ riêng tư, hết dung lượng) thì bỏ qua, không làm hỏng trang. Xóa ngay sau khi lưu lên máy chủ.

const PREFIX = 'ai-game:editor-draft'

export interface StoredDraft {
  content: GameDsl
  // Thời điểm sao lưu (ISO).
  savedAt: string
  // `updatedAt` của game trên máy chủ lúc bắt đầu soạn: để biết sau đó game có được lưu ở nơi khác hay không.
  baseUpdatedAt: string
}

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

export function saveDraft(owner: string, gameId: string, content: GameDsl, baseUpdatedAt: string, now: Date = new Date()) {
  try {
    const draft: StoredDraft = { content, savedAt: now.toISOString(), baseUpdatedAt }

    localStorage.setItem(keyOf(owner, gameId), JSON.stringify(draft))

    return true
  } catch {
    return false
  }
}

/** Bản sao lưu hợp lệ, hoặc null khi không có, hỏng hay không đọc được. */
export function loadDraft(owner: string, gameId: string): StoredDraft | null {
  try {
    const raw = localStorage.getItem(keyOf(owner, gameId))
    const parsed: unknown = raw === null ? null : JSON.parse(raw)

    return isStoredDraft(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function clearDraft(owner: string, gameId: string) {
  try {
    localStorage.removeItem(keyOf(owner, gameId))
  } catch {
    // Không xóa được thì thôi: lần mở sau sẽ so với bản trên máy chủ và bỏ bản sao lưu thừa.
  }
}
