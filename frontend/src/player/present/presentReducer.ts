export type PresentOutcome = 'firstTry' | 'afterRetry' | 'notYet'

interface QuestionRecord {
  answered: boolean
  /** Dính: đã đúng một lần thì "Cho thử lại" lần nữa cũng không làm mất. */
  correct: boolean
  /** Câu từng sai rồi phải thử lại. */
  retried: boolean
  /** Kết quả lần trả lời gần nhất, để nhân vật nói đúng lần vừa chơi (`correct` thì dính). */
  lastCorrect: boolean
}

export interface PresentState {
  ids: readonly string[]
  index: number
  records: Readonly<Record<string, QuestionRecord>>
  /** Tăng mỗi lần "Cho thử lại", dùng làm `key` để renderer dựng lại. */
  attempt: number
  /** 0: chưa gợi ý; 1: nhân vật nhắc chung; 2: đọc lại đề. */
  hint: 0 | 1 | 2
  paused: boolean
  /** Câu hiện tại vừa được trả lời trong lượt xem này (renderer còn hiện đáp án). Quay lại câu đã trả lời thì false. */
  answeredHere: boolean
  phase: 'play' | 'result'
}

export type PresentAction =
  | { type: 'next' }
  | { type: 'prev' }
  | { type: 'answered'; isCorrect: boolean }
  | { type: 'retry' }
  | { type: 'hint' }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'end' }
  /** Chơi lại từ đầu, từ màn kết quả. */
  | { type: 'restart' }

const EMPTY: QuestionRecord = { answered: false, correct: false, retried: false, lastCorrect: false }

export const initialPresentState = (ids: readonly string[]): PresentState => ({ ids, index: 0, records: {}, attempt: 0, hint: 0, paused: false, answeredHere: false, phase: 'play' })

export const currentId = (state: PresentState) => state.ids[state.index]
export const recordOf = (state: PresentState, id: string | undefined): QuestionRecord => (id === undefined ? EMPTY : (state.records[id] ?? EMPTY))
export const isLastQuestion = (state: PresentState) => state.index >= state.ids.length - 1

export function outcomeOf(record: QuestionRecord): PresentOutcome {
  if (!record.correct) return 'notYet'

  return record.retried ? 'afterRetry' : 'firstTry'
}

const withRecord = (state: PresentState, patch: Partial<QuestionRecord>): PresentState => {
  const id = currentId(state)

  return id === undefined ? state : { ...state, records: { ...state.records, [id]: { ...recordOf(state, id), ...patch } } }
}

const moveTo = (state: PresentState, index: number): PresentState => ({ ...state, index, hint: 0, attempt: 0, answeredHere: false })

export function presentReducer(state: PresentState, action: PresentAction): PresentState {
  if (action.type === 'restart') return initialPresentState(state.ids)
  if (state.phase === 'result') return state
  // Đang tạm dừng chỉ nhận "tiếp tục" và "kết thúc".
  if (state.paused && action.type !== 'resume' && action.type !== 'end') return state

  switch (action.type) {
    case 'next':
      return isLastQuestion(state) ? { ...state, phase: 'result' } : moveTo(state, state.index + 1)
    case 'prev':
      return state.index === 0 ? state : moveTo(state, state.index - 1)
    case 'answered': {
      const record = recordOf(state, currentId(state))

      // Đã có kết quả (renderer còn nhận phím số) thì không chấm lần hai.
      return record.answered ? state : { ...withRecord(state, { answered: true, correct: record.correct || action.isCorrect, lastCorrect: action.isCorrect }), answeredHere: true }
    }
    case 'retry': {
      const record = recordOf(state, currentId(state))

      if (!record.answered) return state

      return { ...withRecord(state, { answered: false, retried: record.retried || !record.correct }), attempt: state.attempt + 1, hint: 0, answeredHere: false }
    }
    case 'hint':
      return recordOf(state, currentId(state)).answered ? state : { ...state, hint: state.hint === 0 ? 1 : 2 }
    case 'pause':
      return { ...state, paused: true }
    case 'resume':
      return { ...state, paused: false }
    case 'end':
      return { ...state, paused: false, phase: 'result' }
  }
}

/** Kết quả cả lớp (không từng bé). Câu không có trong `ids` (kiểu chưa trình chiếu được) không tính. */
export function classSummary(state: PresentState) {
  const outcomes = state.ids.map((id) => outcomeOf(recordOf(state, id)))

  return { total: outcomes.length, correct: outcomes.filter((outcome) => outcome !== 'notYet').length, retried: outcomes.filter((outcome) => outcome === 'afterRetry').length }
}
