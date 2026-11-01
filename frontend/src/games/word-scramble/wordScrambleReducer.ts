import type { LetterTile, WordScrambleAnswerResult } from './wordScrambleTypes'

export interface WordScrambleState {
  slots: (string | null)[]
  selectedTileId: string | null
  locked: boolean
  submitting: boolean
  result: WordScrambleAnswerResult | null
}

export type WordScrambleAction =
  | { type: 'SELECT_TILE'; tileId: string }
  | { type: 'PLACE_TILE'; tileId: string; slotIndex: number }
  | { type: 'RETURN_TILE'; tileId: string }
  | { type: 'START_SUBMIT' }
  | { type: 'SUBMIT_SUCCESS'; result: WordScrambleAnswerResult }
  | { type: 'SUBMIT_ERROR' }
  | { type: 'LOCK' }
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

      const existingSlotIndex = state.slots.indexOf(action.tileId)
      // Nếu chữ đã nằm trong ô -> bấm vào để trả về khay
      if (existingSlotIndex !== -1) {
        const nextSlots = [...state.slots]
        nextSlots[existingSlotIndex] = null
        return {
          ...state,
          slots: nextSlots,
          selectedTileId: null,
        }
      }

      // Chữ đang ở trong khay: tự động bay vào ô trống đầu tiên nếu có
      const firstEmptySlot = state.slots.indexOf(null)
      if (firstEmptySlot !== -1) {
        const nextSlots = [...state.slots]
        nextSlots[firstEmptySlot] = action.tileId
        return {
          ...state,
          slots: nextSlots,
          selectedTileId: null,
        }
      }

      // Nếu không còn ô trống: toggle chọn
      if (state.selectedTileId === action.tileId) {
        return { ...state, selectedTileId: null }
      }
      return { ...state, selectedTileId: action.tileId }
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
      }
    }

    case 'RETURN_TILE': {
      if (state.locked || state.submitting) return state
      const slotIndex = state.slots.indexOf(action.tileId)
      if (slotIndex === -1) return { ...state, selectedTileId: null }

      const nextSlots = [...state.slots]
      nextSlots[slotIndex] = null
      return {
        ...state,
        slots: nextSlots,
        selectedTileId: null,
      }
    }

    case 'START_SUBMIT':
      return { ...state, submitting: true }

    case 'SUBMIT_SUCCESS':
      return {
        ...state,
        submitting: false,
        locked: true,
        selectedTileId: null,
        result: action.result,
      }

    case 'SUBMIT_ERROR':
      return { ...state, submitting: false }

    case 'LOCK':
      return { ...state, locked: true, selectedTileId: null }

    case 'RESET':
      return createWordScrambleState(action.wordLength)

    default:
      return state
  }
}
