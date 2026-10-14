import { ISSUE_TEMPLATES, validationText } from '../constants/validationText'
import type { IssueCode } from '../constants/validationText'
import { GRADE_LEVELS, SUBJECTS } from '../types/game-dsl.types'
import type {
  AudioVisualMatchQuestion,
  DragDropQuestion,
  GameDsl,
  GameType,
  MatchingQuestion,
  MemoryCardQuestion,
  OddOneOutQuestion,
  OrderingQuestion,
  QuestionDsl,
  QuizQuestion,
  SpotTheTargetQuestion,
  VisualClozeQuestion,
  WordScrambleQuestion,
} from '../types/game-dsl.types'
import { CLOZE_BLANK, DSL_TIME_LIMIT, GAME_LIMITS, QUESTION_LIMITS, TYPE_LIMITS } from './questionSpecs'
import type { Range } from './questionSpecs'

// Kiểm tra nội dung game ở máy giáo viên, phản chiếu luật Lớp 1 và 2 của Backend (docs/game-json-dsl-v1.0.0.md mục 5 và 7)
// để báo lỗi ngay khi soạn. Backend vẫn là chốt chặn thật. Hàm thuần, không đụng DOM hay mạng.
//   - chế độ 'save' (lưu bản nháp): đủ dữ liệu để lưu;
//   - chế độ 'publish' (xuất bản): thêm điều kiện của UC-07 2c, ví dụ SPOT_THE_TARGET phải có vùng đúng trên ảnh.

export type ValidationMode = 'save' | 'publish'

export interface ValidationOptions {
  // Bản game như Backend trả về (trước khi giáo viên sửa). Giá trị còn y nguyên bản này chỉ phải đúng DSL; giá trị do giáo
  // viên nhập (khác bản gốc, hoặc không có bản gốc) còn phải đúng giới hạn chặt hơn của SRS. Câu được ghép theo `id`.
  baseline?: GameDsl
}

export interface ValidationIssue {
  // Vị trí câu (từ 0); null là lỗi ở cấp cả trò chơi.
  questionIndex: number | null
  // Đường dẫn trường để form tô đỏ đúng ô, ví dụ "options", "options[1].text", "correctOptionId".
  field: string
  code: IssueCode
  message: string
}

type Params = { label?: string; min?: number; max?: number }

class Collector {
  readonly issues: ValidationIssue[] = []

  private readonly questionIndex: number | null

  constructor(questionIndex: number | null) {
    this.questionIndex = questionIndex
  }

  add(field: string, code: IssueCode, params: Params = {}) {
    const prefix =
      this.questionIndex === null
        ? validationText.gamePrefix
        : validationText.questionPrefix.replace('{n}', String(this.questionIndex + 1))
    const body = ISSUE_TEMPLATES[code]
      .replace('{label}', params.label ?? '')
      .replace('{min}', String(params.min ?? ''))
      .replace('{max}', String(params.max ?? ''))

    this.issues.push({ questionIndex: this.questionIndex, field, code, message: `${prefix}${body.replace(/^\s+/, '')}` })
  }
}

const L = validationText.labels

const isBlank = (value: unknown) => typeof value !== 'string' || value.trim() === ''
// Backend chuẩn hóa Unicode NFC trước khi đếm và so sánh: chữ có dấu gõ kiểu tổ hợp (Mac, bộ gõ) thành MỘT ký tự.
const nfc = (value: string) => value.normalize('NFC')
// Đếm theo ký tự (không theo đơn vị mã hóa). Hàm này cắt khoảng trắng hai đầu khi đếm, nên form phải gửi chuỗi đã cắt.
const length = (value: string) => [...nfc(value.trim())].length
// So sánh nội dung không phân biệt hoa thường và khoảng trắng thừa, giữ nguyên dấu tiếng Việt (luật chung Lớp 2).
const normalize = (value: string) => nfc(value.trim()).replace(/\s+/g, ' ').toLowerCase()

function checkText(c: Collector, field: string, label: string, value: unknown, limits: Range, required = true) {
  if (isBlank(value)) {
    if (required) c.add(field, 'required', { label })
    // Trường tùy chọn đã có mặt thì không được rỗng (schema minLength 1): form phải bỏ hẳn trường khi để trống.
    else if (typeof value === 'string') c.add(field, 'tooShort', { label, min: limits.min })
    return
  }

  const size = length(value as string)

  if (size > limits.max) c.add(field, 'tooLong', { label, max: limits.max })
  else if (size < limits.min) c.add(field, 'tooShort', { label, min: limits.min })
}

function checkCount(c: Collector, field: string, label: string, list: unknown, limits: Range) {
  const size = Array.isArray(list) ? list.length : 0

  if (size < limits.min || size > limits.max) c.add(field, 'count', { label, min: limits.min, max: limits.max })

  return Array.isArray(list) ? list : []
}

function checkRange(c: Collector, field: string, label: string, value: unknown, limits: Range) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return c.add(field, 'required', { label })
  if (!Number.isInteger(value)) return c.add(field, 'notInteger', { label })
  if (value < limits.min || value > limits.max) c.add(field, 'range', { label, min: limits.min, max: limits.max })
}

function checkUnique(c: Collector, field: string, label: string, values: ReadonlyArray<string>, code: IssueCode = 'duplicate') {
  const normalized = values.filter((value) => !isBlank(value)).map(normalize)

  if (new Set(normalized).size !== normalized.length) c.add(field, code, { label })
}

/** Nội dung một phía (chữ hoặc mô tả hình): cần có ít nhất một trong hai. */
// Khóa so trùng có tiền tố như Backend: chữ "apple" và hình "apple" là hai nội dung khác nhau.
function sideContent(side: { text?: string; visualPrompt?: string } | undefined) {
  if (side?.text?.trim()) return `text:${side.text.trim()}`

  return side?.visualPrompt?.trim() ? `prompt:${side.visualPrompt.trim()}` : ''
}

// Mã phải đúng mẫu của schema (q1, s1, z1, i1, p1...). Mã trùng đã có luật riêng.
function checkIds(c: Collector, field: string, label: string, values: ReadonlyArray<unknown>, pattern: RegExp) {
  if (values.some((value) => typeof value !== 'string' || !pattern.test(value))) c.add(field, 'badId', { label })
}

function checkSide(c: Collector, field: string, label: string, side: { text?: string; visualPrompt?: string } | undefined, textLimits: Range) {
  if (isBlank(side?.text) && isBlank(side?.visualPrompt)) return c.add(field, 'needContent', { label })

  checkText(c, `${field}.text`, label, side?.text, textLimits, false)
  checkText(c, `${field}.visualPrompt`, L.visualPrompt, side?.visualPrompt, QUESTION_LIMITS.visualPrompt, false)
}

// ---- luật riêng từng loại game ----

const POSITION_IDS = ['a', 'b', 'c', 'd', 'e']

function quizRule(q: QuizQuestion, c: Collector) {
  const limits = TYPE_LIMITS.QUIZ

  checkText(c, 'questionText', L.questionText, q.questionText, limits.questionText)
  const options = checkCount(c, 'options', L.options, q.options, limits.options)
  options.forEach((option, index) => checkText(c, `options[${index}].text`, L.optionText, option?.text, limits.optionText))
  checkUnique(c, 'options', L.optionTexts, options.map((option) => option?.text ?? ''))

  if (options.some((option, index) => option?.id !== POSITION_IDS[index])) c.add('options', 'badPositionalId', { label: L.optionTexts })
  if (isBlank(q.correctOptionId)) c.add('correctOptionId', 'noCorrect')
  else if (!options.some((option) => option?.id === q.correctOptionId)) c.add('correctOptionId', 'badRef', { label: L.correctOption })
}

function audioVisualRule(q: AudioVisualMatchQuestion, c: Collector) {
  checkText(c, 'audioText', L.audioText, q.audioText, QUESTION_LIMITS.audioText)
  checkText(c, 'correct.visualPrompt', L.correctImage, q.correct?.visualPrompt, QUESTION_LIMITS.visualPrompt)
  const distractors = checkCount(c, 'distractors', L.distractors, q.distractors, TYPE_LIMITS.AUDIO_VISUAL_MATCH.distractors)
  distractors.forEach((item, index) =>
    checkText(c, `distractors[${index}].visualPrompt`, L.distractorTexts, item?.visualPrompt, QUESTION_LIMITS.visualPrompt),
  )
  checkUnique(c, 'distractors', L.distractorTexts, [q.correct?.visualPrompt ?? '', ...distractors.map((item) => item?.visualPrompt ?? '')])
}

function oddOneOutRule(q: OddOneOutQuestion, c: Collector) {
  const limits = TYPE_LIMITS.ODD_ONE_OUT
  const items = checkCount(c, 'items', L.items, q.items, limits.items)

  items.forEach((item, index) => checkText(c, `items[${index}].text`, L.itemText, item?.text, limits.itemText))
  checkUnique(c, 'items', L.itemTexts, items.map((item) => item?.text ?? ''))
  if (items.some((item, index) => item?.id !== POSITION_IDS[index])) c.add('items', 'badPositionalId', { label: L.itemTexts })
  if (isBlank(q.oddOneOutId)) c.add('oddOneOutId', 'noCorrect')
  else if (!items.some((item) => item?.id === q.oddOneOutId)) c.add('oddOneOutId', 'badRef', { label: L.oddOne })
}

function spotRule(q: SpotTheTargetQuestion, c: Collector, mode: ValidationMode) {
  checkText(c, 'visualPrompt', L.visualPrompt, q.visualPrompt, QUESTION_LIMITS.visualPrompt)
  checkText(c, 'targetDescription', L.targetDescription, q.targetDescription, TYPE_LIMITS.SPOT_THE_TARGET.targetDescription)

  const region = q.hitRegion

  if (!region) {
    if (mode === 'publish') c.add('hitRegion', 'missingHit')
    return
  }

  const inUnit = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1
  const radiusOk = typeof region.radius === 'number' && Number.isFinite(region.radius) && region.radius > 0 && region.radius <= 1

  if (!inUnit(region.x) || !inUnit(region.y) || !radiusOk) {
    c.add('hitRegion', 'range', { label: L.hitRegion, min: 0, max: 1 })
  }
}

function wordScrambleRule(q: WordScrambleQuestion, c: Collector) {
  const limits = TYPE_LIMITS.WORD_SCRAMBLE

  checkText(c, 'correctWord', L.correctWord, q.correctWord, limits.correctWord)
  if (typeof q.correctWord === 'string' && /\s/.test(q.correctWord.trim())) c.add('correctWord', 'hasSpace', { label: L.correctWord })

  const letters = checkCount(c, 'scrambledLetters', L.letters, q.scrambledLetters, limits.letters)

  letters.forEach((letter, index) => {
    if (typeof letter !== 'string' || [...nfc(letter)].length !== 1 || /\s/.test(letter)) c.add(`scrambledLetters[${index}]`, 'badLetter')
  })

  if (isBlank(q.correctWord) || letters.length === 0) return

  // Như Backend: chuẩn hóa NFC rồi so không phân biệt hoa thường.
  const upper = (value: string) => nfc(value).toUpperCase()
  const expected = [...upper(q.correctWord.trim())]
  const given = (letters as unknown[]).map((letter) => (typeof letter === 'string' ? upper(letter) : ''))
  const sorted = (list: string[]) => [...list].sort().join('')

  if (sorted(expected) !== sorted(given)) c.add('scrambledLetters', 'scrambleMismatch')
  // Từ chỉ có một loại chữ ("OO") thì xáo kiểu nào cũng giống gốc, Backend cho qua.
  else if (new Set(expected).size > 1 && expected.join('') === given.join('')) c.add('scrambledLetters', 'scrambleSame')
}

function pairRule(
  q: MatchingQuestion | MemoryCardQuestion,
  c: Collector,
  limits: { pairs: Range; sideText: Range },
  sides: (pair: MatchingQuestion['pairs'][number] | MemoryCardQuestion['pairs'][number]) => Array<{ key: string; label: string; side?: { text?: string; visualPrompt?: string } }>,
) {
  const pairs = checkCount(c, 'pairs', L.pairs, q.pairs, limits.pairs)

  checkUnique(c, 'pairs', L.pairIds, pairs.map((pair) => pair?.pairId ?? ''), 'duplicateId')
  checkIds(c, 'pairs', L.pairIds, pairs.map((pair) => pair?.pairId), /^p\d+$/)

  const contents = new Map<string, string[]>()

  pairs.forEach((pair, index) => {
    for (const { key, label, side } of sides(pair)) {
      checkSide(c, `pairs[${index}].${key}`, label, side, limits.sideText)
      contents.set(key, [...(contents.get(key) ?? []), sideContent(side)])
    }
  })

  for (const [key, values] of contents) checkUnique(c, 'pairs', key === 'left' ? L.leftSides : key === 'right' ? L.rightSides : L.contents, values)
}

function matchingRule(q: MatchingQuestion, c: Collector) {
  pairRule(q, c, TYPE_LIMITS.MATCHING, (pair) => {
    const matching = pair as MatchingQuestion['pairs'][number] | undefined

    return [
      { key: 'left', label: L.pairSide, side: matching?.left },
      { key: 'right', label: L.pairSide, side: matching?.right },
    ]
  })
}

function memoryRule(q: MemoryCardQuestion, c: Collector) {
  pairRule(q, c, TYPE_LIMITS.MEMORY_CARD, (pair) => [
    { key: 'content', label: L.contents, side: (pair as MemoryCardQuestion['pairs'][number] | undefined)?.content },
  ])
}

function dragDropRule(q: DragDropQuestion, c: Collector) {
  const limits = TYPE_LIMITS.DRAG_DROP
  const zones = checkCount(c, 'dropZones', L.dropZones, q.dropZones, limits.dropZones)
  const items = checkCount(c, 'items', L.dragItems, q.items, limits.items)

  zones.forEach((zone, index) => checkText(c, `dropZones[${index}].label`, L.zoneLabel, zone?.label, limits.zoneLabel))
  checkUnique(c, 'dropZones', L.zoneLabels, zones.map((zone) => zone?.label ?? ''))
  checkUnique(c, 'dropZones', L.zoneIds, zones.map((zone) => zone?.id ?? ''), 'duplicateId')
  checkIds(c, 'dropZones', L.zoneIds, zones.map((zone) => zone?.id), /^z\d+$/)

  items.forEach((item, index) => checkSide(c, `items[${index}]`, L.itemText, item, limits.itemText))
  checkUnique(c, 'items', L.itemIds, items.map((item) => item?.id ?? ''), 'duplicateId')
  checkIds(c, 'items', L.itemIds, items.map((item) => item?.id), /^i\d+$/)

  const zoneIds = new Set(zones.map((zone) => zone?.id))

  items.forEach((item, index) => {
    if (!zoneIds.has(item?.targetZoneId)) c.add(`items[${index}].targetZoneId`, 'badRef', { label: L.targetZone })
  })

  if (zones.length > 0 && items.length > 0 && zones.some((zone) => !items.some((item) => item?.targetZoneId === zone?.id))) {
    c.add('dropZones', 'emptyZone')
  }
}

function orderingRule(q: OrderingQuestion, c: Collector) {
  const limits = TYPE_LIMITS.ORDERING
  const steps = checkCount(c, 'steps', L.steps, q.steps, limits.steps)

  steps.forEach((step, index) => checkSide(c, `steps[${index}]`, L.stepText, step, limits.stepText))
  checkUnique(c, 'steps', L.stepIds, steps.map((step) => step?.id ?? ''), 'duplicateId')
  checkIds(c, 'steps', L.stepIds, steps.map((step) => step?.id), /^s\d+$/)
  checkUnique(c, 'steps', L.stepText, steps.map((step) => sideContent(step)))

  const positions = steps.map((step) => step?.correctPosition)
  const expected = steps.map((_, index) => index + 1).join(',')

  if ([...positions].sort((a, b) => Number(a) - Number(b)).join(',') !== expected) {
    c.add('steps', 'positions', { max: steps.length })
  }
}

function visualClozeRule(q: VisualClozeQuestion, c: Collector) {
  const limits = TYPE_LIMITS.VISUAL_CLOZE

  checkText(c, 'visualPrompt', L.visualPrompt, q.visualPrompt, QUESTION_LIMITS.visualPrompt)
  checkText(c, 'sentenceTemplate', L.sentenceTemplate, q.sentenceTemplate, limits.sentenceTemplate)
  // Như Backend: đúng một cụm gạch dưới liền nhau và cụm đó đúng 3 gạch ("____" không hợp lệ).
  if (typeof q.sentenceTemplate === 'string') {
    const blanks = q.sentenceTemplate.match(/_+/g) ?? []

    if (blanks.length !== 1 || blanks[0] !== CLOZE_BLANK) c.add('sentenceTemplate', 'blankCount')
  }

  checkText(c, 'correctAnswer', L.correctAnswer, q.correctAnswer, limits.correctAnswer)
  const distractors = checkCount(c, 'distractors', L.distractors, q.distractors, limits.distractors)

  distractors.forEach((word, index) => checkText(c, `distractors[${index}]`, L.distractorText, word, limits.distractorText))
  checkUnique(c, 'distractors', L.distractorTexts, [q.correctAnswer ?? '', ...(distractors as string[])])
}

// Mỗi loại game một luật (đăng ký theo loại, không rẽ nhánh bằng if/switch): thêm loại mới là thêm một dòng.
type Rule = (question: QuestionDsl, collector: Collector, mode: ValidationMode) => void

const RULES: Readonly<Record<GameType, Rule>> = {
  QUIZ: (q, c) => quizRule(q as QuizQuestion, c),
  AUDIO_VISUAL_MATCH: (q, c) => audioVisualRule(q as AudioVisualMatchQuestion, c),
  ODD_ONE_OUT: (q, c) => oddOneOutRule(q as OddOneOutQuestion, c),
  SPOT_THE_TARGET: (q, c, mode) => spotRule(q as SpotTheTargetQuestion, c, mode),
  WORD_SCRAMBLE: (q, c) => wordScrambleRule(q as WordScrambleQuestion, c),
  MATCHING: (q, c) => matchingRule(q as MatchingQuestion, c),
  MEMORY_CARD: (q, c) => memoryRule(q as MemoryCardQuestion, c),
  DRAG_DROP: (q, c) => dragDropRule(q as DragDropQuestion, c),
  ORDERING: (q, c) => orderingRule(q as OrderingQuestion, c),
  VISUAL_CLOZE: (q, c) => visualClozeRule(q as VisualClozeQuestion, c),
}

// Trường chung mà loại game coi là BẮT BUỘC và tự kiểm trong luật riêng.
const TYPE_OWNED_COMMON_FIELDS: Readonly<Record<GameType, ReadonlyArray<'audioText' | 'visualPrompt'>>> = {
  QUIZ: [],
  AUDIO_VISUAL_MATCH: ['audioText'],
  ODD_ONE_OUT: [],
  SPOT_THE_TARGET: ['visualPrompt'],
  WORD_SCRAMBLE: [],
  MATCHING: [],
  MEMORY_CARD: [],
  DRAG_DROP: [],
  ORDERING: [],
  VISUAL_CLOZE: ['visualPrompt'],
}

/** Kiểm tra một câu hỏi (các trường chung và luật của loại game). `index` là vị trí trong game, tính từ 0. */
export function validateQuestion(
  gameType: GameType,
  question: QuestionDsl,
  index: number,
  mode: ValidationMode,
  baseline?: QuestionDsl,
): ValidationIssue[] {
  const c = new Collector(index)

  // Dữ liệu từ API cũ hoặc hỏng không được làm trang soạn thảo văng lỗi: thiếu câu hoặc loại lạ thì báo thành lỗi.
  if (typeof question !== 'object' || question === null) {
    c.add('question', 'required', { label: L.question })
    return c.issues
  }

  const rule = RULES[gameType] as Rule | undefined

  if (!rule) {
    c.add('gameType', 'unknownType')
    return c.issues
  }

  // Thời gian còn nguyên như Backend sinh ra thì chỉ kiểm theo DSL (5 đến 600), còn lại theo SRS (10 đến 120).
  const untouchedTime = baseline !== undefined && baseline.timeLimitSeconds === question.timeLimitSeconds

  checkRange(c, 'timeLimitSeconds', L.timeLimitSeconds, question.timeLimitSeconds, untouchedTime ? DSL_TIME_LIMIT : QUESTION_LIMITS.timeLimitSeconds)
  checkRange(c, 'points', L.points, question.points, QUESTION_LIMITS.points)
  // Trường mà luật của loại game đã kiểm (bắt buộc) thì không kiểm lần hai, tránh báo một lỗi hai lần.
  const owned = TYPE_OWNED_COMMON_FIELDS[gameType]

  if (!owned.includes('audioText')) checkText(c, 'audioText', L.audioText, question.audioText, QUESTION_LIMITS.audioText, false)
  if (!owned.includes('visualPrompt')) checkText(c, 'visualPrompt', L.visualPrompt, question.visualPrompt, QUESTION_LIMITS.visualPrompt, false)
  rule(question, c, mode)

  return c.issues
}

/** Kiểm tra cả game: thông tin chung, số câu, id các câu và từng câu. Trả mảng rỗng khi hợp lệ. */
export function validateGame(game: GameDsl, mode: ValidationMode, options: ValidationOptions = {}): ValidationIssue[] {
  const c = new Collector(null)
  const baselineById = new Map((options.baseline?.questions ?? []).map((question) => [question?.id, question as QuestionDsl]))
  const meta = game.metadata

  checkText(c, 'metadata.title', L.title, meta?.title, GAME_LIMITS.title)
  checkText(c, 'metadata.topic', L.topic, meta?.topic, GAME_LIMITS.topic)
  if (!(SUBJECTS as ReadonlyArray<string>).includes(meta?.subject)) c.add('metadata.subject', 'required', { label: L.subject })
  if (!(GRADE_LEVELS as ReadonlyArray<string>).includes(meta?.gradeLevel)) c.add('metadata.gradeLevel', 'required', { label: L.gradeLevel })

  const questions = checkCount(c, 'questions', L.questions, game.questions, GAME_LIMITS.questions) as QuestionDsl[]

  checkUnique(c, 'questions', L.questionIds, questions.map((question) => question?.id ?? ''), 'duplicateId')
  checkIds(c, 'questions', L.questionIds, questions.map((question) => question?.id), /^q\d+$/)

  return [
    ...c.issues,
    ...questions.flatMap((question, index) => validateQuestion(game.gameType, question, index, mode, baselineById.get(question?.id))),
  ]
}

/** Gom lỗi theo vị trí câu (null là lỗi cấp trò chơi), để danh sách câu hiện dấu cảnh báo đúng thẻ. */
export function groupByQuestion(issues: ReadonlyArray<ValidationIssue>) {
  const groups = new Map<number | null, ValidationIssue[]>()

  for (const issue of issues) groups.set(issue.questionIndex, [...(groups.get(issue.questionIndex) ?? []), issue])

  return groups
}

/** Câu tổng quát theo SRS để đặt trên đầu danh sách lỗi; null khi hợp lệ. */
export function summarizeIssues(issues: ReadonlyArray<ValidationIssue>, mode: ValidationMode): string | null {
  if (issues.length === 0) return null
  if (issues.some((issue) => issue.code === 'noCorrect')) return validationText.summaryNoCorrect

  return mode === 'publish' ? validationText.summaryPublish : validationText.summarySave
}
