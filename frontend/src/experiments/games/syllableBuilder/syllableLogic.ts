import type {
  SyllableBuilderQuestion,
  SyllableBuilderStudentQuestion,
  SyllableSelection,
  SyllableSlot,
} from './syllableTypes'
import {
  composeSyllable,
  isKnownSyllable,
  sameSyllable,
  spellingProblem,
  SPELLING_HINT,
  TONES,
  type SyllableParts,
  type Tone,
  type ToneStyle,
} from './vietnameseSyllable'

export const MAX_OPTIONS_PER_SLOT = 8
export const MAX_QUESTION_CHARS = 200

export type SyllableIssueCode =
  | 'TEXT_EMPTY'
  | 'TEXT_TOO_LONG'
  | 'TEXT_REVEALS_TARGET'
  | 'OPTIONS_EMPTY'
  | 'TOO_MANY_OPTIONS'
  | 'DUPLICATE_OPTION'
  | 'BAD_TONE'
  | 'BAD_RHYME_OPTION'
  | 'TARGET_EMPTY'
  | 'TARGET_NOT_BUILDABLE'
  | 'TARGET_BAD_SPELLING'
  | 'TARGET_NOT_IN_LEXICON'

export interface SyllableIssue {
  code: SyllableIssueCode
  path: string
  message: string
}

type ListSource = Pick<SyllableBuilderQuestion, 'onsets' | 'rhymes' | 'tones'>

const optionsOf = (q: ListSource, slot: SyllableSlot): readonly string[] =>
  slot === 'onset' ? q.onsets : slot === 'rhyme' ? q.rhymes : q.tones

const listPath = { onset: 'onsets', rhyme: 'rhymes', tone: 'tones' } as const

/** Mọi tổ hợp (âm đầu, vần, thanh) mà các lựa chọn cho phép. */
export function allCombinations(q: ListSource): SyllableParts[] {
  const out: SyllableParts[] = []
  for (const onset of q.onsets) for (const rhyme of q.rhymes) for (const tone of q.tones) out.push({ onset, rhyme, tone })
  return out
}

/**
 * Tổ hợp ghép ra đúng `target` (so sau NFC). Nếu một tiếng ghép được bằng nhiều cách (ví dụ «gia» = g + ia hoặc gi + a)
 * thì ưu tiên cách đúng chính tả; `null` nếu các lựa chọn không ghép được.
 */
export function buildableParts(q: SyllableBuilderQuestion): SyllableParts | null {
  const style = q.toneStyle
  const matches = allCombinations(q).filter((parts) => {
    const composed = composeSyllable(parts, style)
    return composed !== null && sameSyllable(composed, q.target)
  })
  return matches.find((parts) => spellingProblem(parts) === null) ?? matches[0] ?? null
}

/** Câu hỏi có chứa nguyên tiếng đáp án như một từ riêng không (lộ đề ở dạng học sinh). */
function revealsTarget(q: SyllableBuilderQuestion): boolean {
  const target = q.target.normalize('NFC').toLowerCase()
  return target.length > 0 && q.questionText.normalize('NFC').toLowerCase().split(/[^\p{L}]+/u).includes(target)
}

/** Kiểm một câu hỏi; trả danh sách lỗi (rỗng nếu hợp lệ). Hàm thuần. */
export function validateSyllableBuilder(q: SyllableBuilderQuestion): SyllableIssue[] {
  const issues: SyllableIssue[] = []
  const add = (code: SyllableIssueCode, path: string, message: string) => issues.push({ code, path, message })

  if (q.questionText.trim().length === 0) add('TEXT_EMPTY', 'questionText', 'Câu hỏi không được để trống.')
  if ([...q.questionText].length > MAX_QUESTION_CHARS) add('TEXT_TOO_LONG', 'questionText', `Câu hỏi dài quá ${MAX_QUESTION_CHARS} ký tự.`)

  if (revealsTarget(q)) add('TEXT_REVEALS_TARGET', 'questionText', 'Câu hỏi không được chứa chính tiếng đáp án.')

  for (const slot of ['onset', 'rhyme', 'tone'] as const) {
    const path = listPath[slot]
    const list = optionsOf(q, slot)
    if (list.length === 0) add('OPTIONS_EMPTY', path, `"${path}" cần ít nhất một lựa chọn.`)
    if (list.length > MAX_OPTIONS_PER_SLOT) add('TOO_MANY_OPTIONS', path, `"${path}" có quá ${MAX_OPTIONS_PER_SLOT} lựa chọn.`)
    if (new Set(list.map((item) => item.normalize('NFC'))).size !== list.length) add('DUPLICATE_OPTION', path, `"${path}" có lựa chọn trùng nhau.`)
  }
  for (const tone of q.tones) if (!TONES.includes(tone)) add('BAD_TONE', 'tones', `Dấu thanh "${tone}" không hợp lệ.`)
  for (const rhyme of q.rhymes) {
    if (composeSyllable({ onset: '', rhyme, tone: 'NGANG' }) === null) add('BAD_RHYME_OPTION', 'rhymes', `Vần "${rhyme}" phải bắt đầu bằng nguyên âm.`)
  }

  if (q.target.trim().length === 0) {
    add('TARGET_EMPTY', 'target', 'Đáp án không được để trống.')
    return issues
  }
  // Chỉ xét đáp án khi các danh sách đủ tốt để ghép.
  if (issues.some((i) => i.code === 'OPTIONS_EMPTY' || i.code === 'BAD_TONE' || i.code === 'BAD_RHYME_OPTION')) return issues

  const parts = buildableParts(q)
  if (parts === null) {
    add('TARGET_NOT_BUILDABLE', 'target', `Không ghép được tiếng "${q.target}" từ các lựa chọn đã cho.`)
    return issues
  }
  const problem = spellingProblem(parts)
  if (problem !== null) add('TARGET_BAD_SPELLING', 'target', `Đáp án "${q.target}" sai chính tả: ${SPELLING_HINT[problem]}`)
  else if (!isKnownSyllable(q.target, q.toneStyle)) {
    add('TARGET_NOT_IN_LEXICON', 'target', `Tiếng "${q.target}" không có trong từ điển nhỏ (chưa chắc là sai, cần người kiểm).`)
  }
  return issues
}

/** Dạng gửi học sinh: bỏ đáp án và `audioText` (lời đọc chính là đáp án). */
export function toStudentQuestion(q: SyllableBuilderQuestion): SyllableBuilderStudentQuestion {
  const { target: _target, audioText: _audioText, ...student } = q
  void _target
  void _audioText
  return student
}

// ---- lựa chọn ----

/** Dịch chỉ số vòng quanh (hết cuối quay về đầu và ngược lại). `count` ≤ 0 thì 0. */
export function cycleIndex(index: number, count: number, delta: number): number {
  if (count <= 0) return 0
  return (((index + delta) % count) + count) % count
}

export const initialSelection = (): SyllableSelection => ({ onset: 0, rhyme: 0, tone: 0 })

/** Chỉ số đã chọn hợp lệ trong danh sách (kẹp lại nếu danh sách đã đổi). */
export function selectedParts(q: ListSource, selection: SyllableSelection): SyllableParts {
  const at = <T>(list: readonly T[], index: number): T => list[Math.min(Math.max(0, index), list.length - 1)]
  return { onset: at(q.onsets, selection.onset), rhyme: at(q.rhymes, selection.rhyme), tone: at(q.tones, selection.tone) as Tone }
}

/** Chỉ số lựa chọn ứng với một bộ thành phần (để xem lại bài); thành phần lạ thì rơi về 0. */
export function selectionOf(q: ListSource, parts: SyllableParts): SyllableSelection {
  const find = (list: readonly string[], value: string) => Math.max(0, list.findIndex((item) => item.normalize('NFC') === value.normalize('NFC')))
  return { onset: find(q.onsets, parts.onset), rhyme: find(q.rhymes, parts.rhyme), tone: find(q.tones, parts.tone) }
}

/** Tiếng đang ghép ở các ô chọn (chuỗi rỗng nếu vần hỏng). */
export function currentSyllable(q: ListSource & { toneStyle?: ToneStyle }, selection: SyllableSelection): string {
  return composeSyllable(selectedParts(q, selection), q.toneStyle) ?? ''
}

export const isCorrectSyllable = (composed: string, target: string): boolean => composed !== '' && sameSyllable(composed, target)

// ---- trạng thái ----
export type SyllablePhase = 'idle' | 'submitting' | 'done'

export interface SyllableState {
  selection: SyllableSelection
  phase: SyllablePhase
}

export type SyllableAction =
  | { type: 'cycle'; slot: SyllableSlot; delta: number; count: number }
  | { type: 'submitStart' }
  | { type: 'submitDone' }
  | { type: 'submitFailed' }

export function createSyllableState(selection: SyllableSelection = initialSelection(), phase: SyllablePhase = 'idle'): SyllableState {
  return { selection, phase }
}

/** Đổi lựa chọn chỉ khi chưa nộp; nộp xong thì khóa. */
export function syllableReducer(state: SyllableState, action: SyllableAction): SyllableState {
  switch (action.type) {
    case 'cycle': {
      if (state.phase !== 'idle') return state
      const next = cycleIndex(state.selection[action.slot], action.count, action.delta)
      return next === state.selection[action.slot] ? state : { ...state, selection: { ...state.selection, [action.slot]: next } }
    }
    case 'submitStart':
      return state.phase === 'idle' ? { ...state, phase: 'submitting' } : state
    case 'submitDone':
      return state.phase === 'submitting' ? { ...state, phase: 'done' } : state
    case 'submitFailed':
      return state.phase === 'submitting' ? { ...state, phase: 'idle' } : state
  }
}

/** Nhãn hiển thị của một lựa chọn trong ô âm đầu (`''` = không có âm đầu). */
export const NO_ONSET_LABEL = '—'
