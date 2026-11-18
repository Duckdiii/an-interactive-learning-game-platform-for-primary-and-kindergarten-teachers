import { describe, expect, it } from 'vitest'
import {
  canSubmitOrdering,
  createOrderingState,
  getOrderedStepIds,
  orderingReducer,
} from './orderingReducer'

describe('orderingReducer', () => {
  it('khởi tạo state mặc định rỗng và chưa khoá', () => {
    const state = createOrderingState()
    expect(state.slotAssignments).toEqual({})
    expect(state.stepSlots).toEqual({})
    expect(state.locked).toBe(false)
    expect(state.submitting).toBe(false)
    expect(state.shakingStepId).toBeNull()
  })

  it('LOCK_STEP_INTO_SLOT gán bước vào slot', () => {
    const state = createOrderingState()
    const next = orderingReducer(state, {
      type: 'LOCK_STEP_INTO_SLOT',
      stepId: 's1',
      slotNumber: 1,
    })

    expect(next.slotAssignments[1]).toBe('s1')
    expect(next.stepSlots['s1']).toBe(1)
  })

  it('chặn thả đè vào ô đã có bước khác chiếm giữ', () => {
    const state = createOrderingState({ 1: 's1' })
    const next = orderingReducer(state, {
      type: 'LOCK_STEP_INTO_SLOT',
      stepId: 's2',
      slotNumber: 1,
    })

    // Vẫn giữ s1, không bị s2 đè lên
    expect(next.slotAssignments[1]).toBe('s1')
    expect(next.stepSlots['s2']).toBeUndefined()
  })

  it('RESET_TO_TRAY giải phóng ô và xoá khỏi stepSlots', () => {
    const state = createOrderingState({ 1: 's1' })
    const next = orderingReducer(state, {
      type: 'RESET_TO_TRAY',
      stepId: 's1',
    })

    expect(next.slotAssignments[1]).toBeUndefined()
    expect(next.stepSlots['s1']).toBeUndefined()
  })

  it('TRIGGER_SHAKE và CLEAR_SHAKE cập nhật trạng thái rung lắc', () => {
    const state = createOrderingState()
    const shaking = orderingReducer(state, {
      type: 'TRIGGER_SHAKE',
      stepId: 's2',
      timestamp: 1000,
    })

    expect(shaking.shakingStepId).toBe('s2')
    expect(shaking.shakeTimestamp).toBe(1000)

    const cleared = orderingReducer(shaking, { type: 'CLEAR_SHAKE' })
    expect(cleared.shakingStepId).toBeNull()
  })

  it('canSubmitOrdering và getOrderedStepIds hoạt động chính xác', () => {
    expect(canSubmitOrdering({}, 3)).toBe(false)
    expect(canSubmitOrdering({ 1: 's1', 2: 's2' }, 3)).toBe(false)
    expect(canSubmitOrdering({ 1: 's1', 2: 's2', 3: 's3' }, 3)).toBe(true)

    const ordered = getOrderedStepIds({ 1: 's2', 2: 's1', 3: 's3' }, 3)
    expect(ordered).toEqual(['s2', 's1', 's3'])
  })

  it('SUBMIT_SUCCESS khoá trạng thái và lưu kết quả', () => {
    const state = createOrderingState({ 1: 's1', 2: 's2', 3: 's3' })
    const next = orderingReducer(state, {
      type: 'SUBMIT_SUCCESS',
      result: { isCorrect: true, correctOrder: ['s1', 's2', 's3'] },
    })

    expect(next.locked).toBe(true)
    expect(next.result?.isCorrect).toBe(true)
  })
})
