import type { LetterTile, WordScrambleAnswerResult } from './wordScrambleTypes'

export interface WordScrambleState {
  slots: (string | null)[]
  selectedTileId: string | null
  locked: boolean
  submitting: boolean
  submitFailed?: boolean
  result: WordScrambleAnswerResult | null
}

export type WordScrambleAction =
  | { type: 'SELECT_TILE'; tileId: string }
  | { type: 'PLACE_TILE'; tileId: string; slotIndex: number }
  | { type: 'RETURN_TILE'; tileId: string }
  | { type: 'START_SUBMIT' }
  | { type: 'SUBMIT_SUCCESS'; result: WordScrambleAnswerResult }
  | { type: 'SUBMIT_ERROR' }
  | { type: 'SYNC_REVIEW'; slots: (string | null)[] }
  | { type: 'RESET'; wordLength: number }

export function createWordScrambleState(
  wordLength: number,
  initialSlots?: (string | null)[],
  locked = false,
  result: WordScrambleAnswerResult | null = null,
): WordScrambleState {
  return {
    slots: initialSlots ? [...initialSlots] : new Array(wordLength).fill(null),
    selectedTileId: null,
    locked,
    submitting: false,
    submitFailed: false,
    result,
  }
}

export function canSubmit(slots: (string | null)[]): boolean {
  return slots.length > 0 && slots.every((s) => s !== null)
}

export function constructWord(slots: (string | null)[], tiles: LetterTile[]): string {
  const tileMap = new Map(tiles.map((t) => [t.tileId, t.character]))
  return slots.map((id) => (id ? (tileMap.get(id) ?? '') : '')).join('')
}

export function wordScrambleReducer(state: WordScrambleState, action: WordScrambleAction): WordScrambleState {
  switch (action.type) {
    case 'SELECT_TILE': {
      if (state.locked || state.submitting) return state

      // Chữ trong khay: chỉ chọn, chạm tiếp vào ô đích mới đặt (chạm lần nữa thì bỏ chọn).
      if (state.selectedTileId === action.tileId) {
        return { ...state, selectedTileId: null, submitFailed: false }
      }
      return { ...state, selectedTileId: action.tileId, submitFailed: false }
    }

    case 'PLACE_TILE': {
      if (state.locked || state.submitting) return state
      if (action.slotIndex < 0 || action.slotIndex >= state.slots.length) return state

      const nextSlots = [...state.slots]
      // Nếu chữ này đã ở vị trí khác -> gỡ khỏi vị trí đó
      const oldIndex = nextSlots.indexOf(action.tileId)
      if (oldIndex !== -1) {
        nextSlots[oldIndex] = null
      }

      // Đặt chữ vào ô đích (chữ cũ trong ô đích nếu có sẽ tự quay về khay)
      nextSlots[action.slotIndex] = action.tileId

      return {
        ...state,
        slots: nextSlots,
        selectedTileId: null,
        submitFailed: false,
      }
    }

    case 'RETURN_TILE': {
      if (state.locked || state.submitting) return state
      const slotIndex = state.slots.indexOf(action.tileId)
      if (slotIndex === -1) return { ...state, selectedTileId: null, submitFailed: false }

      const nextSlots = [...state.slots]
      nextSlots[slotIndex] = null
      return {
        ...state,
        slots: nextSlots,
        selectedTileId: null,
        submitFailed: false,
      }
    }

    case 'START_SUBMIT':
      return { ...state, submitting: true, submitFailed: false }

    case 'SUBMIT_SUCCESS':
      return {
        ...state,
        submitting: false,
        submitFailed: false,
        locked: true,
        selectedTileId: null,
        result: action.result,
      }

    case 'SUBMIT_ERROR':
      return { ...state, submitting: false, submitFailed: true }

    case 'SYNC_REVIEW':
      return {
        ...state,
        slots: [...action.slots],
        locked: true,
        selectedTileId: null,
      }

    case 'RESET':
      return createWordScrambleState(action.wordLength)

    default:
      return state
  }
}
