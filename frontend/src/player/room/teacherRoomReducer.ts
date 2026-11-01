import type { RoomBoard, RoomConnection, RoomFinished, RoomParticipant, RoomQuestion, RoomStatus, TeacherRoomEvent } from './RoomClient'

export interface TeacherRoomState {
  /** `null` là chưa nối lần nào, khác với `disconnected` là đã mất kết nối. */
  connection: RoomConnection | null
  status: RoomStatus
  participants: RoomParticipant[]
  remainingMs: number | null
  question: RoomQuestion | null
  answeredCount: number
  /** Số bạn của câu đang chạy, lấy từ `answered` vì có thể khác lúc phòng chờ khi có bạn bị xóa. */
  participantCount: number
  board: RoomBoard | null
  revealed: boolean
  finished: RoomFinished | null
}

export const initialTeacherRoomState: TeacherRoomState = {
  connection: null,
  status: 'WAITING',
  participants: [],
  remainingMs: null,
  question: null,
  answeredCount: 0,
  participantCount: 0,
  board: null,
  revealed: false,
  finished: null,
}

export type TeacherRoomAction = TeacherRoomEvent | { type: 'connection'; status: RoomConnection } | { type: 'reset' }

export type TeacherRoomView = 'lobby' | 'question' | 'board' | 'finished' | 'closed' | 'started'

/** Màn tivi suy từ trạng thái; `board` của câu trước không che câu mới vì so `afterIndex` với câu đang chạy. */
export function teacherRoomView({ status, question, board, finished }: TeacherRoomState): TeacherRoomView {
  if (status === 'WAITING') return 'lobby'
  if (status === 'CLOSED') return 'closed'
  if (finished) return 'finished'
  if (question && board?.afterIndex === question.index) return 'board'

  return question ? 'question' : 'started'
}

export function teacherRoomReducer(state: TeacherRoomState, action: TeacherRoomAction): TeacherRoomState {
  switch (action.type) {
    case 'reset':
      return initialTeacherRoomState
    case 'connection':
      return { ...state, connection: action.status }
    case 'lobby':
      return { ...state, participants: action.data.participants, participantCount: action.data.participantCount }
    case 'state':
      // SPEC 1.9: đóng phòng thì xóa biệt danh và bảng xếp hạng, tab của cô cũng không giữ lại.
      return action.data.status === 'CLOSED' ? { ...initialTeacherRoomState, connection: state.connection, status: 'CLOSED' } : { ...state, ...action.data }
    case 'question':
      // Tiếp tục sau tạm dừng cũng phát lại `question` (cùng câu, `endsAt` mới): chỉ câu mới mới xóa số đã trả lời.
      return {
        ...state,
        question: action.data,
        answeredCount: state.question?.questionId === action.data.questionId ? state.answeredCount : 0,
        revealed: state.question?.questionId === action.data.questionId && state.revealed,
      }
    case 'answered':
      return { ...state, answeredCount: action.data.answeredCount, participantCount: action.data.participantCount }
    case 'board':
      return { ...state, board: action.data }
    case 'reveal':
      return { ...state, revealed: true }
    case 'finished':
      return { ...state, finished: action.data }
    case 'sync':
      return {
        ...state,
        status: action.data.status,
        remainingMs: action.data.remainingMs,
        participants: action.data.lobby.participants,
        participantCount: action.data.lobby.participantCount,
        question: action.data.question,
        revealed: state.question?.questionId === action.data.question?.questionId && state.revealed,
        answeredCount: action.data.answeredCount,
        board: action.data.board,
        finished: action.data.finished,
      }
  }
}
