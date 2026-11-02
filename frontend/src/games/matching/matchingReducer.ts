import type { PairLink } from './matchingTypes'

/**
 * Máy trạng thái của màn MATCHING, tách khỏi component để test được đầy đủ trong jsdom.
 *
 * - `pairing`: trẻ đang nối, chạm được.
 * - `submitting`: đã bấm «Xong rồi!» và đang chờ cha chấm; khoá hết chạm.
 * - `done`: đã có kết quả (hoặc đang xem lại), khoá hẳn.
 */
export type MatchingPhase = 'pairing' | 'submitting' | 'done'

export interface MatchingState {
  /** Ô trái đang được chọn, chờ trẻ chạm ô phải. Luôn là ô CHƯA nối. */
  selectedLeftId: string | null
  links: PairLink[]
  phase: MatchingPhase
}

export type MatchingAction =
  | { type: 'tapLeft'; id: string }
  | { type: 'tapRight'; id: string }
  /** `total` là số cặp của câu hỏi; chỉ nộp được khi đã nối đủ. */
  | { type: 'submitStart'; total: number }
  | { type: 'submitDone' }
  | { type: 'submitFailed' }

export function createMatchingState(links: PairLink[] = [], phase: MatchingPhase = 'pairing'): MatchingState {
  return { selectedLeftId: null, links, phase }
}

export function isLeftLinked(state: MatchingState, leftId: string): boolean {
  return state.links.some((link) => link.leftPairId === leftId)
}

export function isRightLinked(state: MatchingState, rightId: string): boolean {
  return state.links.some((link) => link.rightPairId === rightId)
}

/** Nút «Xong rồi!» chỉ bật khi đang nối và đã nối đủ mọi cặp. */
export function canSubmit(state: MatchingState, total: number): boolean {
  return state.phase === 'pairing' && total > 0 && state.links.length === total
}

export function matchingReducer(state: MatchingState, action: MatchingAction): MatchingState {
  switch (action.type) {
    case 'tapLeft': {
      if (state.phase !== 'pairing') return state

      // Chạm ô trái đã nối thì gỡ cặp đó để trẻ nối lại.
      const existing = state.links.find((link) => link.leftPairId === action.id)
      if (existing) {
        return { ...state, links: state.links.filter((link) => link !== existing), selectedLeftId: null }
      }
      // Chạm lại đúng ô đang chọn thì bỏ chọn.
      return { ...state, selectedLeftId: state.selectedLeftId === action.id ? null : action.id }
    }

    case 'tapRight': {
      if (state.phase !== 'pairing') return state

      if (state.selectedLeftId !== null) {
        // Ô phải đã nối với ô trái khác thì chuyển sang ô trái đang chọn, không bắt trẻ gỡ trước.
        const kept = state.links.filter((link) => link.rightPairId !== action.id)
        return {
          ...state,
          links: [...kept, { leftPairId: state.selectedLeftId, rightPairId: action.id }],
          selectedLeftId: null,
        }
      }

      // Chưa chọn ô trái: chạm ô phải đã nối thì gỡ cặp; ô phải chưa nối thì bỏ qua.
      const existing = state.links.find((link) => link.rightPairId === action.id)
      return existing ? { ...state, links: state.links.filter((link) => link !== existing) } : state
    }

    case 'submitStart':
      return canSubmit(state, action.total) ? { ...state, selectedLeftId: null, phase: 'submitting' } : state

    case 'submitDone':
      return state.phase === 'submitting' ? { ...state, phase: 'done' } : state

    // Cha báo lỗi (mạng...): mở khoá để trẻ bấm gửi lại, giữ nguyên các cặp đã nối.
    case 'submitFailed':
      return state.phase === 'submitting' ? { ...state, phase: 'pairing' } : state
  }
}
