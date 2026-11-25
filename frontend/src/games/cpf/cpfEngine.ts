// Bộ máy trạng thái thuần của CPF Game v2.0.0 (docs/cpf-game-v2.0.0.md mục 3.6-3.7, 6): màn, chấm, gợi ý, kết thúc.
// Không đụng Konva, không đụng thời gian thật: renderer gọi các hàm này rồi vẽ, nên test được trong jsdom.
import type { CpfGame, CpfRound, CpfStudentGame } from '../../types/cpf-game.types'

/** Một lần trẻ chọn: lựa chọn nào, thả vào nhóm nào (SORT). */
export interface CpfPick {
  roundId: string
  choiceId: string
  zoneId?: string
}

/** Kết quả chấm một lần chọn (preview tự tính từ answerKey; play do Backend trả, mục 6 của tài liệu). */
export interface CpfCheckResult {
  isCorrect: boolean
  /** Đáp án đúng của màn: để chỉ cho trẻ khi sai (PICK_ONE) và gợi ý (PICK_ALL). */
  correctChoiceIds?: string[]
  /** Nhóm đúng của lựa chọn vừa thả (SORT). */
  correctZoneId?: string
}

export type CpfGrader = (pick: CpfPick) => CpfCheckResult | Promise<CpfCheckResult>

export interface CpfRoundResult {
  roundId: string
  outcome: 'CORRECT' | 'INCORRECT'
  attempts: number
}

export interface CpfState {
  roundIndex: number
  /** playing: đang chơi; reveal: PICK_ONE vừa sai, đang chỉ đáp án đúng; finished: hết game. */
  phase: 'playing' | 'reveal' | 'finished'
  /** Lựa chọn đã xong trong màn (PICK_ALL tìm đúng, SORT thả đúng nhóm, PICK_ONE chọn đúng). */
  done: string[]
  wrongInRound: number
  wrongByChoice: Record<string, number>
  attempts: number
  /** Lựa chọn đang được làm sáng (đáp án đúng khi sai, hoặc gợi ý). */
  glowChoiceIds: string[]
  glowZoneId: string | null
  results: CpfRoundResult[]
}

export const HINT_AFTER_WRONG = 3

export function initialState(): CpfState {
  return {
    roundIndex: 0,
    phase: 'playing',
    done: [],
    wrongInRound: 0,
    wrongByChoice: {},
    attempts: 0,
    glowChoiceIds: [],
    glowZoneId: null,
    results: [],
  }
}

export function currentRound(game: CpfStudentGame, state: CpfState): CpfRound | undefined {
  return game.content.rounds[state.roundIndex]
}

/** Chấm cục bộ bằng answerKey (chế độ preview của giáo viên). */
export function localGrader(game: CpfGame): (pick: CpfPick) => CpfCheckResult {
  return (pick) => {
    const answer = game.answerKey.rounds.find((a) => a.roundId === pick.roundId)
    if (!answer) return { isCorrect: false }
    if ('placements' in answer) {
      const zoneId = answer.placements.find((p) => p.choiceId === pick.choiceId)?.zoneId
      return { isCorrect: zoneId === pick.zoneId, correctZoneId: zoneId }
    }
    return { isCorrect: answer.correctChoiceIds.includes(pick.choiceId), correctChoiceIds: answer.correctChoiceIds }
  }
}

/**
 * Áp kết quả một lần chọn. `totalCorrect`: số đáp án đúng của màn PICK_ALL (preview biết từ answerKey; play lấy từ
 * correctChoiceIds Backend trả nếu có). Renderer chạy onCorrect/onWrong của luật; hàm này chỉ lo tiến trình.
 */
export function applyCheck(game: CpfStudentGame, state: CpfState, pick: CpfPick, result: CpfCheckResult): CpfState {
  const round = currentRound(game, state)
  if (state.phase !== 'playing' || !round || pick.roundId !== round.id) return state
  const attempts = state.attempts + 1

  if (result.isCorrect) {
    const done = state.done.includes(pick.choiceId) ? state.done : [...state.done, pick.choiceId]
    const next: CpfState = { ...state, attempts, done, glowChoiceIds: [], glowZoneId: null }
    return roundComplete(game, round, done, result) ? nextRound(game, next, round) : next
  }

  const wrongByChoice = { ...state.wrongByChoice, [pick.choiceId]: (state.wrongByChoice[pick.choiceId] ?? 0) + 1 }
  const wrongInRound = state.wrongInRound + 1
  const base: CpfState = { ...state, attempts, wrongInRound, wrongByChoice }

  if (round.task === 'PICK_ONE') {
    // Sai thì chỉ đáp án đúng; renderer gọi endReveal sau khoảng 1,5 giây để sang màn.
    return { ...base, phase: 'reveal', glowChoiceIds: result.correctChoiceIds ?? [] }
  }
  if (round.task === 'PICK_ALL') {
    const remaining = (result.correctChoiceIds ?? []).filter((id) => !state.done.includes(id))
    const glowChoiceIds = wrongInRound >= HINT_AFTER_WRONG && remaining.length > 0 ? [remaining[0]] : state.glowChoiceIds
    return { ...base, glowChoiceIds }
  }
  // SORT: renderer cho vật trượt về chỗ cũ; sai nhiều lần cùng vật thì làm sáng nhóm đúng.
  const glowZoneId = wrongByChoice[pick.choiceId] >= HINT_AFTER_WRONG ? (result.correctZoneId ?? null) : state.glowZoneId
  return { ...base, glowZoneId }
}

/** Hết thời gian chỉ đáp án đúng của PICK_ONE: sang màn sau. */
export function endReveal(game: CpfStudentGame, state: CpfState): CpfState {
  const round = currentRound(game, state)
  if (state.phase !== 'reveal' || !round) return state
  return nextRound(game, { ...state, phase: 'playing' }, round)
}

function roundComplete(game: CpfStudentGame, round: CpfRound, done: string[], result: CpfCheckResult): boolean {
  if (round.task === 'PICK_ONE') return true
  if (round.task === 'SORT') return done.length >= round.choices.length
  const known = (game as Partial<CpfGame>).answerKey?.rounds.find((a) => a.roundId === round.id)
  const total = known && 'correctChoiceIds' in known ? known.correctChoiceIds.length : result.correctChoiceIds?.length
  return total != null && done.length >= total
}

function nextRound(game: CpfStudentGame, state: CpfState, round: CpfRound): CpfState {
  const results = [
    ...state.results,
    { roundId: round.id, outcome: state.wrongInRound === 0 ? 'CORRECT' : 'INCORRECT', attempts: state.attempts } as CpfRoundResult,
  ]
  const roundIndex = state.roundIndex + 1
  return {
    ...initialState(),
    roundIndex,
    phase: roundIndex >= game.content.rounds.length ? 'finished' : 'playing',
    results,
  }
}

/** Số màn đúng ngay (không sai lần nào): vật PROGRESS tiến theo số này, điểm hiển thị cộng theo luật SCORE. */
export function correctRounds(state: CpfState): number {
  return state.results.filter((r) => r.outcome === 'CORRECT').length
}
