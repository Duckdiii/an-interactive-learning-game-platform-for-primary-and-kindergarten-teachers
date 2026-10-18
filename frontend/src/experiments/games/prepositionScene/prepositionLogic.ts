import {
  clampCenter,
  GROUND_Y,
  idealCenter,
  itemRect,
  landmarkRect,
  PREPOSITIONS,
  TABLE_SLAB,
  SCENE_HEIGHT,
  SCENE_WIDTH,
  satisfies,
  supportedPrepositions,
  type Point,
  type Preposition,
  type Size,
} from './prepositionGeometry'
import type { PrepositionSceneQuestion, PrepositionSceneStudentQuestion } from './prepositionTypes'

export const MAX_INSTRUCTION_CHARS = 120

export type PrepositionIssueCode =
  | 'INSTRUCTION_EMPTY'
  | 'INSTRUCTION_TOO_LONG'
  | 'LABEL_EMPTY'
  | 'SIZE_INVALID'
  | 'LANDMARK_OFF_SCENE'
  | 'ITEM_OFF_SCENE'
  | 'PREPOSITION_UNSUPPORTED'
  | 'INSTRUCTION_PREPOSITION_MISMATCH'
  | 'INSTRUCTION_MULTIPLE_PREPOSITIONS'
  | 'LABEL_NOT_IN_INSTRUCTION'
  | 'LANDMARK_NOT_ON_GROUND'
  | 'LANDMARK_TOO_SHORT'
  | 'START_OVERLAPS_LANDMARK'
  | 'START_ALREADY_CORRECT'
  | 'IDEAL_UNREACHABLE'

export interface PrepositionIssue {
  code: PrepositionIssueCode
  path: string
  message: string
}

/** Từ chỉ vị trí mà lệnh phải chứa tương ứng với quy tắc (không phân biệt hoa thường, theo ranh giới từ). */
const INSTRUCTION_PATTERN: Record<Preposition, RegExp> = {
  ON: /\bon\b/i,
  UNDER: /\bunder\b/i,
  IN: /\b(in(?!\s+front)|into|inside)\b/i,
  NEXT_TO: /\b(next to|beside)\b/i,
}

const isPositive = (n: number) => Number.isFinite(n) && n > 0

/** Từ `word` có xuất hiện như một từ riêng trong `text` không (không phân biệt hoa thường). */
const hasWord = (text: string, word: string) => {
  const escaped = word.trim().replace(/[.*+?^${}()|[\]\\]/g, (ch) => `\\${ch}`)
  return new RegExp(`\\b${escaped}\\b`, 'i').test(text)
}

export const itemSize = (q: Pick<PrepositionSceneQuestion, 'item'>): Size => ({ width: q.item.width, height: q.item.height })

/** Kiểm một câu hỏi; trả danh sách lỗi (rỗng nếu hợp lệ). Hàm thuần. */
export function validatePrepositionScene(q: PrepositionSceneQuestion): PrepositionIssue[] {
  const issues: PrepositionIssue[] = []
  const add = (code: PrepositionIssueCode, path: string, message: string) => issues.push({ code, path, message })

  if (q.instruction.trim().length === 0) add('INSTRUCTION_EMPTY', 'instruction', 'Lệnh không được để trống.')
  if ([...q.instruction].length > MAX_INSTRUCTION_CHARS) add('INSTRUCTION_TOO_LONG', 'instruction', `Lệnh dài quá ${MAX_INSTRUCTION_CHARS} ký tự.`)
  if (q.landmark.label.trim() === '') add('LABEL_EMPTY', 'landmark.label', 'Vật mốc cần có tên.')
  if (q.item.label.trim() === '') add('LABEL_EMPTY', 'item.label', 'Vật cần có tên.')

  const { landmark, item } = q
  if (![landmark.x, landmark.y, item.startX, item.startY].every(Number.isFinite) || ![landmark.width, landmark.height, item.width, item.height].every(isPositive)) {
    add('SIZE_INVALID', 'landmark', 'Toạ độ và kích thước phải là số hữu hạn, rộng và cao lớn hơn 0.')
    return issues
  }

  const mark = landmarkRect(landmark)
  if (mark.left < 0 || mark.top < 0 || mark.right > SCENE_WIDTH || mark.bottom > SCENE_HEIGHT) {
    add('LANDMARK_OFF_SCENE', 'landmark', 'Vật mốc nằm ngoài cảnh.')
  }
  // Vật mốc đứng trên mặt đất đã vẽ (GROUND_Y); bàn phải cao hơn mặt bàn thì mới có chân và gầm.
  if (mark.bottom !== GROUND_Y) add('LANDMARK_NOT_ON_GROUND', 'landmark', `Đáy vật mốc phải ở mặt đất (y = ${GROUND_Y}).`)
  if (landmark.kind === 'TABLE' && landmark.height <= TABLE_SLAB) add('LANDMARK_TOO_SHORT', 'landmark', `Bàn phải cao hơn mặt bàn (${TABLE_SLAB}).`)
  const size = itemSize(q)
  const start = { x: item.startX, y: item.startY }
  const clamped = clampCenter(start, size)
  if (clamped.x !== start.x || clamped.y !== start.y) add('ITEM_OFF_SCENE', 'item', 'Vị trí đầu của vật nằm ngoài cảnh.')

  if (!supportedPrepositions(landmark.kind).includes(q.preposition)) {
    add('PREPOSITION_UNSUPPORTED', 'preposition', `Vật mốc ${landmark.kind} không hỗ trợ "${q.preposition}".`)
    return issues
  }
  if (!INSTRUCTION_PATTERN[q.preposition].test(q.instruction)) {
    add('INSTRUCTION_PREPOSITION_MISMATCH', 'instruction', `Lệnh không chứa từ chỉ vị trí của quy tắc ${q.preposition}.`)
  } else if (PREPOSITIONS.some((other) => other !== q.preposition && INSTRUCTION_PATTERN[other].test(q.instruction))) {
    add('INSTRUCTION_MULTIPLE_PREPOSITIONS', 'instruction', 'Lệnh chứa từ chỉ vị trí của nhiều quy tắc, không rõ quy tắc nào được chấm.')
  }
  for (const [path, label] of [['item.label', item.label], ['landmark.label', landmark.label]] as const) {
    if (label.trim() !== '' && !hasWord(q.instruction, label)) add('LABEL_NOT_IN_INSTRUCTION', path, `Lệnh không nhắc tên "${label}" đang hiện trên màn hình.`)
  }
  const itemBox = itemRect(start, size)
  const overlapsLandmark = itemBox.left < mark.right && mark.left < itemBox.right && itemBox.top < mark.bottom && mark.top < itemBox.bottom
  if (overlapsLandmark && !satisfies(q.preposition, landmark, size, start)) add('START_OVERLAPS_LANDMARK', 'item', 'Vật bắt đầu chồng lên vật mốc (che tên và gây nhầm).')
  if (satisfies(q.preposition, landmark, size, start)) add('START_ALREADY_CORRECT', 'item', 'Vật đã ở đúng chỗ ngay từ đầu.')

  const ideal = idealCenter(q.preposition, landmark, size)
  if (ideal === null || !satisfies(q.preposition, landmark, size, ideal) || clampCenter(ideal, size).x !== ideal.x || clampCenter(ideal, size).y !== ideal.y) {
    add('IDEAL_UNREACHABLE', 'item', 'Không có chỗ đúng nào trong cảnh cho vật này (vật quá to hoặc vật mốc sát mép).')
  }
  return issues
}

/** Dạng gửi học sinh: bỏ quy tắc chấm và `audioText`. */
export function toStudentQuestion(q: PrepositionSceneQuestion): PrepositionSceneStudentQuestion {
  const { preposition: _preposition, audioText: _audioText, ...student } = q
  void _preposition
  void _audioText
  return student
}

export const startCenter = (q: Pick<PrepositionSceneQuestion, 'item'>): Point =>
  clampCenter({ x: q.item.startX, y: q.item.startY }, itemSize(q))

// ---- trạng thái ----
export type PrepositionPhase = 'idle' | 'submitting' | 'done'

export interface PrepositionState {
  center: Point
  phase: PrepositionPhase
}

export type PrepositionAction =
  | { type: 'place'; center: Point; size: Size }
  | { type: 'submitStart' }
  | { type: 'submitDone' }
  | { type: 'submitFailed' }

export function createPrepositionState(center: Point, phase: PrepositionPhase = 'idle'): PrepositionState {
  return { center, phase }
}

/** Đổi vị trí chỉ khi chưa nộp (vật luôn nằm trọn trong cảnh); nộp xong thì khóa. */
export function prepositionReducer(state: PrepositionState, action: PrepositionAction): PrepositionState {
  switch (action.type) {
    case 'place': {
      if (state.phase !== 'idle') return state
      const next = clampCenter(action.center, action.size)
      return next.x === state.center.x && next.y === state.center.y ? state : { ...state, center: next }
    }
    case 'submitStart':
      return state.phase === 'idle' ? { ...state, phase: 'submitting' } : state
    case 'submitDone':
      return state.phase === 'submitting' ? { ...state, phase: 'done' } : state
    case 'submitFailed':
      return state.phase === 'submitting' ? { ...state, phase: 'idle' } : state
  }
}
