import type { AnswerPayload } from '../../types/game-student.types'

/**
 * Cổng thời gian thực của phòng thi đấu, bám `docs/ui/API-CONTRACT.md` mục 2.11. Sự kiện của học sinh không có
 * `participantId` của ai và không có thứ hạng của bạn khác ngoài top; `me`, `myFinal`, `kicked` chỉ tới đúng máy đó.
 */
export type RoomConnection = 'connected' | 'reconnecting' | 'disconnected'
export type RoomStatus = 'WAITING' | 'ACTIVE' | 'PAUSED' | 'CLOSED'

export interface RoomParticipant {
  participantId: string
  nickname: string
}

export interface RoomQuestion {
  questionId: string
  /** Tính từ 0. */
  index: number
  total: number
  endsAt: string
  /** Tổng thời gian của câu, không đổi khi tạm dừng. */
  durationMs: number
  /** Để bù lệch đồng hồ giữa máy và máy chủ; `sync` trả giờ lúc gửi. */
  serverNow: string
}

export interface RoomState {
  status: RoomStatus
  /** Thời gian còn lại của câu lúc tạm dừng, ngoài lúc đó là `null`. */
  remainingMs: number | null
}

export interface BoardRow {
  rank: number
  nickname: string
  score: number
  delta: number
}

export interface RoomBoard {
  afterIndex: number
  top: BoardRow[]
  classCorrectRate: number
}

export interface RoomFinished {
  top: Omit<BoardRow, 'delta'>[]
  averageCorrect: number
  total: number
}

export interface RoomMe {
  questionId: string
  isCorrect: boolean
  delta: number
  streak: number
  streakBonus: number
  score: number
  rank: number
  participantCount: number
}

export interface RoomMyFinal {
  score: number
  correctCount: number
  total: number
  rank: number
  participantCount: number
  bestStreak: number
}

export interface TeacherLobby {
  participantCount: number
  participants: RoomParticipant[]
}

export interface StudentLobby {
  participantCount: number
}

interface RoomReveal {
  questionId: string
  correctAnswer: Record<string, unknown> | null
}

interface RoomSyncBase<L> extends RoomState {
  lobby: L
  question: RoomQuestion | null
  board: RoomBoard | null
  finished: RoomFinished | null
}

export interface TeacherRoomSync extends RoomSyncBase<TeacherLobby> {
  answeredCount: number
}

export interface StudentRoomSync extends RoomSyncBase<StudentLobby> {
  me: RoomMe | null
  myFinal: RoomMyFinal | null
}

type SharedRoomEvent =
  | { type: 'state'; data: RoomState }
  | { type: 'question'; data: RoomQuestion }
  | { type: 'board'; data: RoomBoard }
  | { type: 'reveal'; data: RoomReveal }
  | { type: 'finished'; data: RoomFinished }

export type TeacherRoomEvent =
  | SharedRoomEvent
  | { type: 'lobby'; data: TeacherLobby }
  | { type: 'answered'; data: { questionId: string; answeredCount: number; participantCount: number } }
  | { type: 'sync'; data: TeacherRoomSync }

export type StudentRoomEvent =
  | SharedRoomEvent
  | { type: 'lobby'; data: StudentLobby }
  | { type: 'me'; data: RoomMe }
  | { type: 'myFinal'; data: RoomMyFinal }
  | { type: 'kicked'; data: Record<string, never> }
  | { type: 'sync'; data: StudentRoomSync }

export interface RoomClient<E> {
  connect(): Promise<void>
  disconnect(): void
  subscribe(listener: (event: E) => void): () => void
  subscribeConnection(listener: (status: RoomConnection) => void): () => void
}

export interface TeacherRoomClient extends RoomClient<TeacherRoomEvent> {
  start(): Promise<void>
  next(): Promise<void>
  endQuestion(): Promise<void>
  reveal(): Promise<void>
  pause(): Promise<void>
  resume(): Promise<void>
  finish(): Promise<void>
  close(): Promise<void>
  kick(participantId: string): Promise<void>
}

export interface StudentRoomClient extends RoomClient<StudentRoomEvent> {
  answer(questionId: string, payload: AnswerPayload): Promise<void>
}

export type RoomJoinErrorCode = 'SESSION_CLOSED' | 'SESSION_ALREADY_STARTED' | 'SESSION_FULL'

export class RoomJoinError extends Error {
  readonly code: RoomJoinErrorCode

  constructor(code: RoomJoinErrorCode) {
    super(code)
    this.name = 'RoomJoinError'
    this.code = code
  }
}

interface Standing {
  nickname: string
  score: number
}

/** Bằng điểm thì cùng hạng (1, 2, 2, 4), trong nhóm hòa sắp theo biệt danh. Máy chủ thật tự xếp; hàm này dùng cho mock. */
export function rankStandings<T extends Standing>(players: readonly T[]): (T & { rank: number })[] {
  const sorted = [...players].sort((a, b) => b.score - a.score || a.nickname.localeCompare(b.nickname, 'vi'))
  let rank = 0

  return sorted.map((player, position) => {
    if (position === 0 || sorted[position - 1].score !== player.score) rank = position + 1

    return { ...player, rank }
  })
}
