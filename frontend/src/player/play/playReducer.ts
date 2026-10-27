import type { AnswerResult, PlayerSession, StudentGame } from '../../types/game-student.types'

/**
 * Luồng một lượt chơi. Hàm thuần để duyệt mọi chuyển trạng thái trong test (không cần Canvas).
 * `result` là kết quả chấm của câu hiện tại (null = chưa trả lời).
 */
export type PlayState =
  | { phase: 'intro' }
  | { phase: 'starting' }
  | { phase: 'start-failed' }
  | { phase: 'playing'; session: PlayerSession; game: StudentGame; index: number; score: number; correctCount: number; streak: number; result: AnswerResult | null }
  | { phase: 'finished'; score: number; correctCount: number; total: number }

export type PlayAction =
  | { type: 'START' }
  | { type: 'STARTED'; session: PlayerSession; game: StudentGame }
  | { type: 'START_FAILED' }
  // questionId: kết quả đến trễ của câu trước không được áp vào câu đang hiện.
  | { type: 'ANSWERED'; questionId: string; result: AnswerResult }
  | { type: 'NEXT' }
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
    case 'STARTED': {
      if (state.phase !== 'starting') return state

      const index = firstUnanswered(action.game)
      const total = action.game.questions.length

      return index >= total
        ? { phase: 'finished', score: 0, correctCount: 0, total }
        : { phase: 'playing', session: action.session, game: action.game, index, score: 0, correctCount: 0, streak: 0, result: null }
    }
    case 'ANSWERED':
      // Chỉ nhận kết quả đầu tiên của mỗi câu: nộp lại cùng câu không cộng điểm hai lần.
      if (state.phase !== 'playing' || state.result || action.questionId !== state.game.questions[state.index].id) return state

      return {
        ...state,
        result: action.result,
        score: action.result.totalScore,
        correctCount: state.correctCount + (action.result.isCorrect ? 1 : 0),
        streak: action.result.isCorrect ? state.streak + 1 : 0,
      }
    case 'NEXT': {
      if (state.phase !== 'playing' || !state.result) return state

      const total = state.game.questions.length

      return state.index + 1 >= total
        ? { phase: 'finished', score: state.score, correctCount: state.correctCount, total }
        : { ...state, index: state.index + 1, result: null }
    }
    case 'RESTART':
      return state.phase === 'finished' ? initialPlayState : state
  }
}
