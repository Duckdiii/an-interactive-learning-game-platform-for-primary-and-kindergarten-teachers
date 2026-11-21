import type { OrderingAnswerResult } from './orderingTypes'

export interface OrderingState {
  /** Map slotNumber (1..N) -> stepId */
  slotAssignments: Record<number, string>
  /** Map stepId -> slotNumber (1..N) */
  stepSlots: Record<string, number>
  /** stepId đang rung lắc do thả sai */
  shakingStepId: string | null
  /** Thời điểm bắt đầu rung (ms) */
  shakeTimestamp: number
  /** Khoá toàn bộ tương tác */
  locked: boolean
  /** Đang gửi kết quả */
  submitting: boolean
  /** Báo lỗi khi nộp bài */
  submitFailed: boolean
  /** Kết quả chấm */
  result: OrderingAnswerResult | null
}

export type OrderingAction =
  | { type: 'LOCK_STEP_INTO_SLOT'; stepId: string; slotNumber: number }
  | { type: 'RESET_TO_TRAY'; stepId: string }
  | { type: 'TRIGGER_SHAKE'; stepId: string; timestamp?: number }
  | { type: 'CLEAR_SHAKE' }
  | { type: 'START_SUBMIT' }
  | { type: 'SUBMIT_SUCCESS'; result: OrderingAnswerResult }
  | { type: 'SUBMIT_ERROR' }
  | { type: 'SYNC_REVIEW'; slotAssignments: Record<number, string> }
  | { type: 'RESET' }

export function createOrderingState(
  initialAssignments: Record<number, string> = {},
  locked = false,
  result: OrderingAnswerResult | null = null,
): OrderingState {
  const stepSlots: Record<string, number> = {}
  for (const [slotStr, stepId] of Object.entries(initialAssignments)) {
    const slotNum = Number(slotStr)
    if (!Number.isNaN(slotNum)) {
      stepSlots[stepId] = slotNum
    }
  }

  return {
    slotAssignments: { ...initialAssignments },
    stepSlots,
    shakingStepId: null,
    shakeTimestamp: 0,
    locked,
    submitting: false,
    submitFailed: false,
    result,
  }
}

export function canSubmitOrdering(
  slotAssignments: Record<number, string>,
  totalSteps: number,
): boolean {
  if (totalSteps <= 0) return false
  return Object.keys(slotAssignments).length === totalSteps
}

export function getOrderedStepIds(
  slotAssignments: Record<number, string>,
  totalSteps: number,
): string[] {
  const list: string[] = []
  for (let i = 1; i <= totalSteps; i++) {
    const stepId = slotAssignments[i]
    if (stepId) {
      list.push(stepId)
    }
  }
  return list
}

export function orderingReducer(state: OrderingState, action: OrderingAction): OrderingState {
  switch (action.type) {
    case 'LOCK_STEP_INTO_SLOT': {
      if (state.locked || state.submitting) return state

      // Nếu slot này đã bị bước khác chiếm giữ -> không cho phép đè
      const existingStepInSlot = state.slotAssignments[action.slotNumber]
      if (existingStepInSlot && existingStepInSlot !== action.stepId) {
        return state
      }

      // Nếu bước này trước đó đã ở một slot khác -> dọn slot cũ
      const prevSlot = state.stepSlots[action.stepId]
      const nextAssignments = { ...state.slotAssignments }
      if (prevSlot && prevSlot !== action.slotNumber) {
        delete nextAssignments[prevSlot]
      }

      nextAssignments[action.slotNumber] = action.stepId

      const nextStepSlots = { ...state.stepSlots }
      nextStepSlots[action.stepId] = action.slotNumber

      return {
        ...state,
        slotAssignments: nextAssignments,
        stepSlots: nextStepSlots,
        shakingStepId: state.shakingStepId === action.stepId ? null : state.shakingStepId,
        submitFailed: false,
      }
    }

    case 'RESET_TO_TRAY': {
      if (state.locked || state.submitting) return state

      const currentSlot = state.stepSlots[action.stepId]
      if (!currentSlot) {
        return state
      }

      const nextAssignments = { ...state.slotAssignments }
      delete nextAssignments[currentSlot]

      const nextStepSlots = { ...state.stepSlots }
      delete nextStepSlots[action.stepId]

      return {
        ...state,
        slotAssignments: nextAssignments,
        stepSlots: nextStepSlots,
        submitFailed: false,
      }
    }

    case 'TRIGGER_SHAKE': {
      return {
        ...state,
        shakingStepId: action.stepId,
        shakeTimestamp: action.timestamp ?? Date.now(),
      }
    }

    case 'CLEAR_SHAKE': {
      return {
        ...state,
        shakingStepId: null,
        shakeTimestamp: 0,
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
        result: action.result,
      }

    case 'SUBMIT_ERROR':
      return { ...state, submitting: false, submitFailed: true }

    case 'SYNC_REVIEW': {
      const nextStepSlots: Record<string, number> = {}
      for (const [slotStr, stepId] of Object.entries(action.slotAssignments)) {
        const slotNum = Number(slotStr)
        if (!Number.isNaN(slotNum)) {
          nextStepSlots[stepId] = slotNum
        }
      }
      return {
        ...state,
        slotAssignments: { ...action.slotAssignments },
        stepSlots: nextStepSlots,
        locked: true,
      }
    }

    case 'RESET':
      return createOrderingState()

    default:
      return state
  }
}
