// Giữ phiên chơi qua tải lại trang (sessionStorage, mất khi đóng tab): định danh phiên, biệt danh và bộ đếm tiến độ để màn kết quả còn đúng sau khi tải lại.
// Không lưu đáp án; điểm chính thức vẫn do máy chủ trả ở lần nộp kế tiếp.
import { normalizeJoinCode } from '../join/joinCode'

export interface StoredProgress {
  score: number
  correctCount: number
  streak: number
  bestStreak: number
}

export interface StoredSession {
  sessionId: string
  participantId: string
  nickname: string
  progress?: StoredProgress
}

// Chuẩn hóa như ô nhập mã: /play/mock00 và /play/MOCK00 là cùng một phiên.
const keyOf = (shareCode: string) => `player:session:${normalizeJoinCode(shareCode)}`

const isString = (value: unknown): value is string => typeof value === 'string' && value !== ''
const isCount = (value: unknown): value is number => Number.isInteger(value) && (value as number) >= 0

function readProgress(value: unknown): StoredProgress | undefined {
  if (typeof value !== 'object' || value === null) return undefined

  const { score, correctCount, streak, bestStreak } = value as Record<string, unknown>

  return isCount(score) && isCount(correctCount) && isCount(streak) && isCount(bestStreak) ? { score, correctCount, streak, bestStreak } : undefined
}

// Trình duyệt chặn storage (chế độ riêng tư, chính sách) thì mọi thao tác coi như không có.
export function saveSession(shareCode: string, session: StoredSession) {
  try {
    sessionStorage.setItem(keyOf(shareCode), JSON.stringify(session))
  } catch {
    // bỏ qua
  }
}

export function loadSession(shareCode: string): StoredSession | null {
  try {
    const raw = sessionStorage.getItem(keyOf(shareCode))
    const data: unknown = raw === null ? null : JSON.parse(raw)

    if (typeof data !== 'object' || data === null) return null

    const { sessionId, participantId, nickname, progress } = data as Record<string, unknown>

    if (!(isString(sessionId) && isString(participantId) && isString(nickname))) return null

    // Bộ đếm hỏng thì bỏ riêng phần đó, phiên vẫn tiếp tục được.
    return { sessionId, participantId, nickname, progress: readProgress(progress) }
  } catch {
    return null
  }
}

/** Cập nhật bộ đếm của phiên đã lưu (không có phiên đã lưu thì thôi). */
export function saveProgress(shareCode: string, progress: StoredProgress) {
  const stored = loadSession(shareCode)

  if (stored) saveSession(shareCode, { ...stored, progress })
}

export function clearSession(shareCode: string) {
  try {
    sessionStorage.removeItem(keyOf(shareCode))
  } catch {
    // bỏ qua
  }
}
