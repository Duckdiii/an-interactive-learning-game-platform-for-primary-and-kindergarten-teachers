// Trạng thái một lần chơi thử (hàm thuần để test): đang ở câu nào, kết quả từng câu, đã trả lời câu hiện tại chưa. Kết quả CHỈ
// nằm trong bộ nhớ của màn hình này: không gửi đi đâu và không lưu (UC-03: không ghi nhận như kết quả học sinh).

export interface PlayTestState {
  index: number
  // Đúng/sai của từng câu; null là chưa trả lời.
  results: Array<boolean | null>
  // Đã trả lời câu hiện tại (hiện thanh phản hồi và nút sang câu tiếp).
  answered: boolean
  // Tăng mỗi lần "Thử lại câu này" để dựng lại renderer từ đầu.
  attempt: number
  finished: boolean
}

export type PlayTestAction =
  | { type: 'answered'; isCorrect: boolean }
  | { type: 'retryQuestion' }
  | { type: 'next' }
  | { type: 'restart' }

export function createPlayTestState(total: number): PlayTestState {
  return { index: 0, results: Array.from({ length: total }, () => null), answered: false, attempt: 0, finished: false }
}

export const correctCount = (state: PlayTestState) => state.results.filter((result) => result === true).length

export function playTestReducer(state: PlayTestState, action: PlayTestAction): PlayTestState {
  switch (action.type) {
    case 'answered': {
      // Đã trả lời rồi thì bỏ qua (renderer có thể báo lại khi dựng lại).
      if (state.answered || state.finished) return state

      const results = [...state.results]

      results[state.index] = action.isCorrect

      return { ...state, results, answered: true }
    }
    case 'retryQuestion': {
      const results = [...state.results]

      results[state.index] = null

      return { ...state, results, answered: false, attempt: state.attempt + 1 }
    }
    case 'next':
      if (!state.answered) return state

      return state.index + 1 >= state.results.length
        ? { ...state, finished: true }
        : { ...state, index: state.index + 1, answered: false, attempt: 0 }
    case 'restart':
      return createPlayTestState(state.results.length)
  }
}
