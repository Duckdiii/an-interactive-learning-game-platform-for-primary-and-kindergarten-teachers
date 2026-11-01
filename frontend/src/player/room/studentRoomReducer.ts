import type { RoomConnection, RoomMe, RoomMyFinal, RoomQuestion, RoomStatus, StudentRoomEvent } from './RoomClient'

export interface StudentRoomState {
  connection: RoomConnection | null
  status: RoomStatus
  remainingMs: number | null
  participantCount: number
  question: RoomQuestion | null
  me: RoomMe | null
  myFinal: RoomMyFinal | null
  /** Đáp án của câu `me.questionId` sau khi cô bấm xem; `undefined` là chưa bấm. */
  correctAnswer: Record<string, unknown> | null | undefined
  kicked: boolean
}

export const initialStudentRoomState: StudentRoomState = {
  connection: null,
  status: 'WAITING',
  remainingMs: null,
  participantCount: 0,
  question: null,
  me: null,
  myFinal: null,
  correctAnswer: undefined,
  kicked: false,
}

export type StudentRoomAction = StudentRoomEvent | { type: 'connection'; status: RoomConnection }

export type StudentRoomView = 'kicked' | 'closed' | 'final' | 'feedback' | 'question' | 'wait'

export function studentRoomView({ kicked, status, myFinal, me, question }: StudentRoomState): StudentRoomView {
  if (kicked) return 'kicked'
  if (status === 'CLOSED') return 'closed'
  if (myFinal) return 'final'
  if (question && me?.questionId === question.questionId) return 'feedback'

  return question ? 'question' : 'wait'
}

export function studentRoomReducer(state: StudentRoomState, action: StudentRoomAction): StudentRoomState {
  switch (action.type) {
    case 'connection':
      return { ...state, connection: action.status }
    case 'lobby':
      return { ...state, participantCount: action.data.participantCount }
    case 'state':
      // SPEC 1.9: đóng phòng thì kết quả bị xóa, máy này cũng không giữ lại.
      return action.data.status === 'CLOSED' ? { ...initialStudentRoomState, connection: state.connection, status: 'CLOSED' } : { ...state, ...action.data }
    case 'question':
      return { ...state, question: action.data, correctAnswer: state.question?.questionId === action.data.questionId ? state.correctAnswer : undefined }
    case 'me':
      return { ...state, me: action.data }
    case 'reveal':
      return state.me?.questionId === action.data.questionId ? { ...state, correctAnswer: action.data.correctAnswer } : state
    case 'myFinal':
      return { ...state, myFinal: action.data }
    case 'kicked':
      return { ...state, kicked: true }
    case 'sync':
      return {
        ...state,
        status: action.data.status,
        remainingMs: action.data.remainingMs,
        participantCount: action.data.lobby.participantCount,
        question: action.data.question,
        me: action.data.me,
        myFinal: action.data.myFinal,
        correctAnswer: state.question?.questionId === action.data.question?.questionId ? state.correctAnswer : undefined,
      }
    default:
      return state
  }
}
