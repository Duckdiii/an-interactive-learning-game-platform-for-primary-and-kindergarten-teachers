import type { AnswerPayload, AnswerResult, PlayerSession, StudentGame } from '../../types/game-student.types'
import type { StoredProgress } from './sessionStore'

/**
 * Luồng một lượt chơi. Hàm thuần để duyệt mọi chuyển trạng thái trong test (không cần Canvas).
 * `result` là kết quả chấm của câu hiện tại (null = chưa trả lời).
 */
/** Một câu đã chấm, giữ trong bộ nhớ trang để màn xem lại (chưa có API my-interactions). */
export interface ReviewEntry {
  questionId: string
  answer: AnswerPayload
  result: AnswerResult
}

interface FinishedSummary {
  score: number
  correctCount: number
  total: number
  bestStreak: number
  game: StudentGame
  history: ReviewEntry[]
}

export type PlayState =
  | { phase: 'intro' }
  | { phase: 'starting' }
  | { phase: 'start-failed' }
  | { phase: 'playing'; session: PlayerSession; game: StudentGame; index: number; score: number; correctCount: number; streak: number; bestStreak: number; result: AnswerResult | null; history: ReviewEntry[] }
  | ({ phase: 'finished' } & FinishedSummary)
  | ({ phase: 'review' } & FinishedSummary)

export type PlayAction =
  | { type: 'START' }
  // progress: bộ đếm đã lưu khi tiếp tục phiên sau tải lại trang (không có = phiên mới).
  | { type: 'STARTED'; session: PlayerSession; game: StudentGame; progress?: StoredProgress }
  | { type: 'START_FAILED' }
  // Máy chủ từ chối biệt danh: về màn vào để nhập lại.
  | { type: 'START_REJECTED' }
  // questionId: kết quả đến trễ của câu trước không được áp vào câu đang hiện.
  | { type: 'ANSWERED'; questionId: string; answer: AnswerPayload; result: AnswerResult }
  | { type: 'NEXT' }
  | { type: 'OPEN_REVIEW' }
  | { type: 'CLOSE_REVIEW' }
  | { type: 'RESTART' }

export const initialPlayState: PlayState = { phase: 'intro' }

/** Câu đầu tiên chưa nộp (tiếp tục đúng chỗ khi tải lại); bằng số câu nghĩa là đã xong hết. */
const firstUnanswered = (game: StudentGame) => {
  const index = game.questions.findIndex((question) => !game.answeredQuestionIds.includes(question.id))

  return index === -1 ? game.questions.length : index
}

export function playReducer(state: PlayState, action: PlayAction): PlayState {
  switch (action.type) {
    case 'START':
      return state.phase === 'intro' || state.phase === 'start-failed' ? { phase: 'starting' } : state
    case 'START_FAILED':
      return state.phase === 'starting' ? { phase: 'start-failed' } : state
    case 'START_REJECTED':
      return state.phase === 'starting' ? initialPlayState : state
    case 'STARTED': {
      if (state.phase !== 'starting') return state

      const index = firstUnanswered(action.game)
      const total = action.game.questions.length
      const { score, correctCount, streak, bestStreak } = action.progress ?? { score: 0, correctCount: 0, streak: 0, bestStreak: 0 }

      return index >= total
        ? { phase: 'finished', score, correctCount, total, bestStreak, game: action.game, history: [] }
        : { phase: 'playing', session: action.session, game: action.game, index, score, correctCount, streak, bestStreak, result: null, history: [] }
    }
    case 'ANSWERED': {
      // Chỉ nhận kết quả đầu tiên của mỗi câu: nộp lại cùng câu không cộng điểm hai lần.
      if (state.phase !== 'playing' || state.result || action.questionId !== state.game.questions[state.index].id) return state

      const streak = action.result.isCorrect ? state.streak + 1 : 0

      return {
        ...state,
        result: action.result,
        score: action.result.totalScore,
        correctCount: state.correctCount + (action.result.isCorrect ? 1 : 0),
        streak,
        bestStreak: Math.max(state.bestStreak, streak),
        history: [...state.history, { questionId: action.questionId, answer: action.answer, result: action.result }],
      }
    }
    case 'NEXT': {
      if (state.phase !== 'playing' || !state.result) return state

      const total = state.game.questions.length

      return state.index + 1 >= total
        ? { phase: 'finished', score: state.score, correctCount: state.correctCount, total, bestStreak: state.bestStreak, game: state.game, history: state.history }
        : { ...state, index: state.index + 1, result: null }
    }
    case 'OPEN_REVIEW':
      return state.phase === 'finished' ? { ...state, phase: 'review' } : state
    case 'CLOSE_REVIEW':
      return state.phase === 'review' ? { ...state, phase: 'finished' } : state
    case 'RESTART':
      return state.phase === 'finished' || state.phase === 'review' ? initialPlayState : state
  }
}
