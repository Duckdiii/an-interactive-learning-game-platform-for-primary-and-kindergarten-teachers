import type { DragDropAnswerResult } from './dragDropTypes'

export interface DragDropState {
  placements: Record<string, string>
  selectedItemId: string | null
  locked: boolean
  submitting: boolean
  result: DragDropAnswerResult | null
}

export type DragDropAction =
  | { type: 'SELECT_ITEM'; itemId: string }
  | { type: 'PLACE_ITEM'; itemId: string; zoneId: string }
  | { type: 'UNPLACE_ITEM'; itemId: string }
  | { type: 'START_SUBMIT' }
  | { type: 'SUBMIT_SUCCESS'; result: DragDropAnswerResult }
  | { type: 'SUBMIT_ERROR' }
  | { type: 'LOCK' }
  | { type: 'RESET' }

export function createDragDropState(
  initialPlacements: Record<string, string> = {},
  locked = false,
  result: DragDropAnswerResult | null = null,
): DragDropState {
  return {
    placements: { ...initialPlacements },
    selectedItemId: null,
    locked,
    submitting: false,
    result,
  }
}

export function canSubmit(placements: Record<string, string>, totalItems: number): boolean {
  if (totalItems <= 0) return false
  return Object.keys(placements).length === totalItems
}

export function dragDropReducer(state: DragDropState, action: DragDropAction): DragDropState {
  switch (action.type) {
    case 'SELECT_ITEM': {
      if (state.locked || state.submitting) return state
      // Nếu chạm vào chính item đang chọn -> bỏ chọn
      if (state.selectedItemId === action.itemId) {
        return { ...state, selectedItemId: null }
      }
      return { ...state, selectedItemId: action.itemId }
    }

    case 'PLACE_ITEM': {
      if (state.locked || state.submitting) return state
      return {
        ...state,
        placements: {
          ...state.placements,
          [action.itemId]: action.zoneId,
        },
        selectedItemId: null,
      }
    }

    case 'UNPLACE_ITEM': {
      if (state.locked || state.submitting) return state
      if (!state.placements[action.itemId]) {
        return { ...state, selectedItemId: null }
      }
      const next = { ...state.placements }
      delete next[action.itemId]
      return {
        ...state,
        placements: next,
        selectedItemId: null,
      }
    }

    case 'START_SUBMIT':
      return { ...state, submitting: true }

    case 'SUBMIT_SUCCESS':
      return {
        ...state,
        submitting: false,
        locked: true,
        selectedItemId: null,
        result: action.result,
      }

    case 'SUBMIT_ERROR':
      return { ...state, submitting: false }

    case 'LOCK':
      return { ...state, locked: true, selectedItemId: null }

    case 'RESET':
      return createDragDropState()

    default:
      return state
  }
}
