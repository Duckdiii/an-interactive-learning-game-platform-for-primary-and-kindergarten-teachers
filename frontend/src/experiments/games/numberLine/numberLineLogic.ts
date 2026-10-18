import type { NumberLineQuestion, NumberLineStudentQuestion } from './numberLineTypes'

/** Số vạch tối đa (0 đến 20 là 21 vạch): nhiều hơn thì vạch quá sát, khó chạm cho trẻ nhỏ. */
export const MAX_TICKS = 21
export const MIN_TICKS = 2
export const MAX_QUESTION_CHARS = 200

export interface NumberLineScale {
  min: number
  max: number
  step: number
}

export type NumberLineIssueCode =
  | 'NOT_INTEGER'
  | 'RANGE_INVALID'
  | 'STEP_INVALID'
  | 'RANGE_NOT_DIVISIBLE'
  | 'TOO_MANY_TICKS'
  | 'TARGET_OFF_SCALE'
  | 'START_OFF_SCALE'
  | 'TOLERANCE_INVALID'
  | 'TEXT_EMPTY'
  | 'TEXT_TOO_LONG'

export interface NumberLineIssue {
  code: NumberLineIssueCode
  path: string
  message: string
}

const isInt = (n: number) => Number.isInteger(n)

/** Số vạch của thang (rỗng/không hợp lệ thì 0). */
export function tickCount({ min, max, step }: NumberLineScale): number {
  if (![min, max, step].every(isInt) || step < 1 || max <= min) return 0
  return Math.floor((max - min) / step) + 1
}

/** Giá trị của từng vạch, từ nhỏ đến lớn. */
export function tickValues(scale: NumberLineScale): number[] {
  const count = tickCount(scale)
  return Array.from({ length: count }, (_, i) => scale.min + i * scale.step)
}

/** Kiểm một câu hỏi; trả danh sách lỗi (rỗng nếu hợp lệ). Hàm thuần. */
export function validateNumberLine(q: NumberLineQuestion): NumberLineIssue[] {
  const issues: NumberLineIssue[] = []
  const add = (code: NumberLineIssueCode, path: string, message: string) => issues.push({ code, path, message })

  const text = q.questionText.trim()
  if (text.length === 0) add('TEXT_EMPTY', 'questionText', 'Câu hỏi không được để trống.')
  if ([...q.questionText].length > MAX_QUESTION_CHARS) add('TEXT_TOO_LONG', 'questionText', `Câu hỏi dài quá ${MAX_QUESTION_CHARS} ký tự.`)

  for (const key of ['min', 'max', 'step', 'target', 'tolerance'] as const) {
    if (!isInt(q[key])) add('NOT_INTEGER', key, `"${key}" phải là số nguyên.`)
  }
  if (q.startValue !== undefined && !isInt(q.startValue)) add('NOT_INTEGER', 'startValue', '"startValue" phải là số nguyên.')
  if (issues.some((i) => i.code === 'NOT_INTEGER')) return issues

  if (q.max <= q.min) {
    add('RANGE_INVALID', 'max', '"max" phải lớn hơn "min".')
    return issues
  }
  if (q.step < 1) {
    add('STEP_INVALID', 'step', '"step" phải ≥ 1.')
    return issues
  }
  if ((q.max - q.min) % q.step !== 0) add('RANGE_NOT_DIVISIBLE', 'step', 'Khoảng từ "min" đến "max" phải chia hết cho "step".')
  const ticks = tickCount(q)
  if (ticks > MAX_TICKS) add('TOO_MANY_TICKS', 'step', `${ticks} vạch, tối đa ${MAX_TICKS}.`)
  if (ticks < MIN_TICKS) add('RANGE_INVALID', 'max', `Cần ít nhất ${MIN_TICKS} vạch.`)

  const onScale = (value: number) => value >= q.min && value <= q.max && (value - q.min) % q.step === 0
  if (!onScale(q.target)) add('TARGET_OFF_SCALE', 'target', 'Đáp án phải nằm đúng trên một vạch.')
  if (q.startValue !== undefined && !onScale(q.startValue)) add('START_OFF_SCALE', 'startValue', 'Vị trí ban đầu phải nằm đúng trên một vạch.')
  if (q.tolerance < 0 || q.tolerance > q.max - q.min) add('TOLERANCE_INVALID', 'tolerance', 'Độ lệch cho phép phải từ 0 đến độ dài thang.')
  return issues
}

/** Làm tròn một giá trị thô về vạch gần nhất rồi kẹp vào [min, max]. Hòa (đúng giữa hai vạch) thì lấy vạch lớn hơn. */
export function snapValue(raw: number, { min, max, step }: NumberLineScale): number {
  if (!Number.isFinite(raw)) return min
  const index = Math.round((Math.min(max, Math.max(min, raw)) - min) / step)
  return Math.min(max, Math.max(min, min + index * step))
}

/** Dịch `delta` vạch (âm = về phía nhỏ); kẹp ở hai đầu, không bao giờ ra ngoài thang. */
export function moveBy(value: number, deltaTicks: number, scale: NumberLineScale): number {
  return snapValue(value + deltaTicks * scale.step, scale)
}

export interface LineGeometry {
  left: number
  right: number
}

/** Toạ độ x (đơn vị thiết kế) của một giá trị trên thang. */
export function valueToX(value: number, scale: NumberLineScale, { left, right }: LineGeometry): number {
  const span = scale.max - scale.min
  if (span <= 0) return left
  const ratio = Math.min(1, Math.max(0, (value - scale.min) / span))
  return left + ratio * (right - left)
}

/** Vạch gần nhất với một toạ độ x (kẹp ở hai đầu thang). */
export function xToValue(x: number, scale: NumberLineScale, { left, right }: LineGeometry): number {
  if (!(right > left) || !Number.isFinite(x)) return scale.min
  const ratio = Math.min(1, Math.max(0, (x - left) / (right - left)))
  return snapValue(scale.min + ratio * (scale.max - scale.min), scale)
}

/** Đáp án đúng khi lệch không quá `tolerance`. Đáp án đúng luôn tính lại bằng hàm này, không lưu cờ đúng/sai. */
export function isCorrectValue(value: number, target: number, tolerance: number): boolean {
  return Number.isFinite(value) && Math.abs(value - target) <= tolerance
}

/** Nhãn nào được hiện: thang dài thì thưa bớt để không chồng chữ (tối đa khoảng 11 nhãn). */
/** Vạch thứ `index` (từ 0) có nhãn không: mỗi `every` vạch, luôn có vạch cuối, bỏ vạch sát cuối để hai nhãn không chồng nhau. */
export function isLabeled(index: number, ticks: number, every: number): boolean {
  const last = ticks - 1
  if (index === last) return true
  return index % every === 0 && last - index >= every
}

export function labelEvery(ticks: number): number {
  if (ticks <= 11) return 1
  let every = 2
  while (Math.ceil(ticks / every) > 11) every += 1
  return every
}

/** Dạng gửi học sinh: bỏ đáp án và độ lệch. */
export function toStudentQuestion(q: NumberLineQuestion): NumberLineStudentQuestion {
  const { target: _target, tolerance: _tolerance, ...student } = q
  void _target
  void _tolerance
  return student
}

// ---- trạng thái ----
export type NumberLinePhase = 'idle' | 'submitting' | 'done'

export interface NumberLineState {
  value: number
  phase: NumberLinePhase
}

export type NumberLineAction =
  | { type: 'set'; value: number }
  | { type: 'submitStart' }
  | { type: 'submitDone' }
  | { type: 'submitFailed' }

export function createNumberLineState(value: number, phase: NumberLinePhase = 'idle'): NumberLineState {
  return { value, phase }
}

/** Đổi giá trị chỉ khi chưa nộp; nộp xong thì khóa. `value` đã được người gọi làm tròn về vạch. */
export function numberLineReducer(state: NumberLineState, action: NumberLineAction): NumberLineState {
  switch (action.type) {
    case 'set':
      return state.phase === 'idle' && state.value !== action.value ? { ...state, value: action.value } : state
    case 'submitStart':
      return state.phase === 'idle' ? { ...state, phase: 'submitting' } : state
    case 'submitDone':
      return state.phase === 'submitting' ? { ...state, phase: 'done' } : state
    case 'submitFailed':
      return state.phase === 'submitting' ? { ...state, phase: 'idle' } : state
  }
}
