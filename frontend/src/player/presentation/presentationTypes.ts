/**
 * Định nghĩa kiểu dữ liệu cho phiên Live Arena trên màn hình Presentation
 */

export type SessionPhase = 'WAITING_ROOM' | 'QUESTION' | 'LEADERBOARD' | 'ENDED'

export interface LiveArenaParticipant {
  id: string
  name: string
  connected?: boolean
}

export interface LiveArenaLeaderboardEntry {
  rank: number
  name: string
  score: number
}

export interface LiveArenaQuestion {
  id?: string
  instructionText?: string
  questionText?: string
  sceneImageUrl?: string
  imageUrl?: string
  timeLimitSeconds?: number
  [key: string]: unknown
}

export interface LiveArenaHandlers {
  onParticipantsUpdate?: (payload: { participants: LiveArenaParticipant[] }) => void
  onStateChange?: (payload: { phase: SessionPhase }) => void
  onQuestion?: (payload: { question: LiveArenaQuestion }) => void
  onLeaderboard?: (payload: { entries: LiveArenaLeaderboardEntry[] }) => void
  onAnswerStatus?: (payload: { participantId: string; answered?: boolean }) => void
  onReconnect?: () => void
}
