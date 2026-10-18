import { describe, expect, it } from 'vitest'
import {
  mockSyllableHoa,
  mockSyllableKe,
  mockSyllableMeo,
  mockSyllableNoOnset,
  mockSyllableSach,
  mockSyllableWithAudio,
  SYLLABLE_FIXTURES,
} from './syllableFixtures'
import {
  allCombinations,
  buildableParts,
  createSyllableState,
  currentSyllable,
  cycleIndex,
  initialSelection,
  isCorrectSyllable,
  MAX_OPTIONS_PER_SLOT,
  MAX_QUESTION_CHARS,
  selectedParts,
  selectionOf,
  syllableReducer,
  toStudentQuestion,
  validateSyllableBuilder,
  type SyllableIssueCode,
} from './syllableLogic'
import type { SyllableBuilderQuestion } from './syllableTypes'
import { composeSyllable, spellingProblem } from './vietnameseSyllable'

const q = (overrides: Partial<SyllableBuilderQuestion> = {}): SyllableBuilderQuestion => ({ ...mockSyllableMeo, ...overrides })
const codes = (question: SyllableBuilderQuestion): SyllableIssueCode[] => validateSyllableBuilder(question).map((i) => i.code)

describe('validateSyllableBuilder', () => {
  it('mọi mẫu đều hợp lệ', () => {
    for (const [name, fixture] of Object.entries(SYLLABLE_FIXTURES)) expect([name, codes(fixture)]).toEqual([name, []])
  })

  it('câu hỏi không chứa chính tiếng đáp án (không lộ đề)', () => {
    for (const [name, fixture] of Object.entries(SYLLABLE_FIXTURES)) {
      const text = fixture.questionText.normalize('NFC').toLowerCase()
      expect([name, text.split(/[\s,.:«»]+/).includes(fixture.target.normalize('NFC').toLowerCase())]).toEqual([name, false])
    }
  })

  it.each([
    ['câu hỏi rỗng', { questionText: ' ' }, ['TEXT_EMPTY']],
    ['câu hỏi chứa luôn tiếng đáp án', { questionText: 'Ghép tiếng «mèo» nhé' }, ['TEXT_REVEALS_TARGET']],
    ['câu hỏi dài quá', { questionText: 'a'.repeat(MAX_QUESTION_CHARS + 1) }, ['TEXT_TOO_LONG']],
    ['đáp án rỗng', { target: '' }, ['TARGET_EMPTY']],
    ['danh sách âm đầu rỗng', { onsets: [] }, ['OPTIONS_EMPTY']],
    ['danh sách vần rỗng', { rhymes: [] }, ['OPTIONS_EMPTY']],
    ['danh sách thanh rỗng', { tones: [] }, ['OPTIONS_EMPTY']],
    ['quá nhiều lựa chọn', { onsets: ['m', 'n', 'b', 'c', 'd', 'g', 'h', 'l', 'x'] }, ['TOO_MANY_OPTIONS']],
    ['lựa chọn trùng', { onsets: ['m', 'm', 'n'] }, ['DUPLICATE_OPTION']],
    ['thanh lạ', { tones: ['NGANG', 'HUYEN', 'LA'] as never }, ['BAD_TONE']],
    ['vần không bắt đầu bằng nguyên âm', { rhymes: ['eo', 'ng'] }, ['BAD_RHYME_OPTION']],
    ['không ghép được đáp án', { target: 'mẹo' }, ['TARGET_NOT_BUILDABLE']],
    ['đáp án khác dấu thanh với lựa chọn', { tones: ['NGANG', 'SAC'] }, ['TARGET_NOT_BUILDABLE']],
  ] as const)('%s', (_label, overrides, expected) => {
    expect(codes(q(overrides as Partial<SyllableBuilderQuestion>))).toEqual(expected)
  })

  it('đáp án sai chính tả: «cê» (c trước ê) bị báo kèm lời nhắc', () => {
    const issues = validateSyllableBuilder(q({ onsets: ['c', 'k'], rhymes: ['ê'], tones: ['NGANG'], target: 'cê' }))
    expect(issues.map((i) => i.code)).toEqual(['TARGET_BAD_SPELLING'])
    expect(issues[0].message).toContain('k')
  })

  it('tiếng hợp chính tả nhưng không có trong từ điển nhỏ thì báo để người kiểm', () => {
    expect(codes(q({ onsets: ['d'], rhymes: ['eo'], tones: ['NANG'], target: 'dẹo' }))).toEqual(['TARGET_NOT_IN_LEXICON'])
  })

  it('đáp án viết ở dạng NFD vẫn ghép được và hợp lệ', () => {
    expect(codes(q({ target: 'mèo'.normalize('NFD') }))).toEqual([])
  })

  it('kiểu đặt dấu cũ làm đáp án «hòa» không còn ghép được; đáp án «hoà» thì được', () => {
    expect(codes({ ...mockSyllableHoa, toneStyle: 'traditional' })).toEqual(['TARGET_NOT_BUILDABLE'])
    expect(codes({ ...mockSyllableHoa, target: 'hoà', toneStyle: 'traditional' })).toEqual([])
  })

  it('giới hạn đúng: 8 lựa chọn hợp lệ', () => {
    expect(MAX_OPTIONS_PER_SLOT).toBe(8)
    expect(codes(q({ onsets: ['m', 'n', 'b', 'c', 'd', 'g', 'h', 'l'] }))).toEqual([])
  })

  it('mỗi lỗi mang đường dẫn trường', () => {
    expect(validateSyllableBuilder(q({ onsets: [] }))[0]).toMatchObject({ path: 'onsets' })
    expect(validateSyllableBuilder(q({ target: 'mẹo' }))[0]).toMatchObject({ path: 'target' })
  })
})

describe('đáp án ghép được bằng nhiều cách', () => {
  it('«gia» = g + ia hoặc gi + a: hợp lệ nếu có cách đúng chính tả, và buildableParts chọn cách đó', () => {
    const question: SyllableBuilderQuestion = { ...mockSyllableMeo, onsets: ['g', 'gi'], rhymes: ['ia', 'a'], tones: ['NGANG'], target: 'gia' }
    const parts = buildableParts(question)!
    expect(parts.onset).toBe('gi') // g + ia vi phạm luật g/gh nên không được chọn
    expect(spellingProblem(parts)).toBeNull()
    expect(composeSyllable(parts)).toBe('gia')
    expect(codes(question)).toContain('TARGET_NOT_IN_LEXICON')
    expect(codes(question)).not.toContain('TARGET_BAD_SPELLING')
  })

  it('«gì» ghép bằng gi + i và hợp chính tả (chỉ thiếu trong từ điển nhỏ)', () => {
    const question: SyllableBuilderQuestion = { ...mockSyllableMeo, onsets: ['gi', 'gh'], rhymes: ['i', 'a'], tones: ['NGANG', 'HUYEN'], target: 'gì' }
    expect(codes(question)).toEqual(['TARGET_NOT_IN_LEXICON'])
  })
})

describe('allCombinations / buildableParts', () => {
  it('số tổ hợp bằng tích ba danh sách', () => {
    expect(allCombinations(mockSyllableMeo)).toHaveLength(27)
    expect(allCombinations(mockSyllableSach)).toHaveLength(3 * 3 * 4)
  })

  it('tìm đúng thành phần của đáp án', () => {
    expect(buildableParts(mockSyllableMeo)).toEqual({ onset: 'm', rhyme: 'eo', tone: 'HUYEN' })
    expect(buildableParts(mockSyllableNoOnset)).toEqual({ onset: '', rhyme: 'ao', tone: 'NGANG' })
    expect(buildableParts(mockSyllableKe)).toEqual({ onset: 'k', rhyme: 'ê', tone: 'NGANG' })
  })

  it('không tìm thấy thì null', () => {
    expect(buildableParts(q({ target: 'xyz' }))).toBeNull()
  })
})

describe('toStudentQuestion', () => {
  it('bỏ đáp án, giữ phần còn lại và không đổi câu gốc', () => {
    const student = toStudentQuestion(mockSyllableWithAudio)
    expect(student).not.toHaveProperty('target')
    expect(student).not.toHaveProperty('audioText') // lời đọc chính là đáp án
    expect(student).toMatchObject({ id: 'syl-audio', onsets: ['m', 'n', 'b'], audioUrl: '/mock/q1.wav' })
    expect(JSON.stringify(student)).not.toContain('mèo')
    expect(mockSyllableWithAudio.target).toBe('mèo')
  })
})

describe('cycleIndex', () => {
  it.each([
    [0, 3, 1, 1],
    [2, 3, 1, 0], // hết cuối quay về đầu
    [0, 3, -1, 2], // lùi từ đầu quay về cuối
    [1, 3, -4, 0],
    [1, 3, 7, 2],
    [0, 1, 1, 0],
    [0, 0, 1, 0],
    [0, -2, 1, 0],
  ])('chỉ số %s, %s lựa chọn, dịch %s → %s', (index, count, delta, expected) => {
    expect(cycleIndex(index, count, delta)).toBe(expected)
  })
})

describe('selectedParts / currentSyllable / selectionOf', () => {
  it('ghép đúng từ chỉ số', () => {
    expect(selectedParts(mockSyllableMeo, { onset: 1, rhyme: 2, tone: 0 })).toEqual({ onset: 'n', rhyme: 'ao', tone: 'NGANG' })
    expect(currentSyllable(mockSyllableMeo, { onset: 0, rhyme: 0, tone: 1 })).toBe('mèo')
    expect(currentSyllable(mockSyllableMeo, initialSelection())).toBe('meo')
  })

  it('chỉ số ngoài danh sách bị kẹp, không ném lỗi', () => {
    expect(selectedParts(mockSyllableMeo, { onset: 99, rhyme: -5, tone: 1 })).toEqual({ onset: 'b', rhyme: 'eo', tone: 'HUYEN' })
  })

  it('selectionOf là nghịch đảo của selectedParts; thành phần lạ rơi về 0', () => {
    const sel = { onset: 2, rhyme: 1, tone: 2 }
    expect(selectionOf(mockSyllableMeo, selectedParts(mockSyllableMeo, sel))).toEqual(sel)
    expect(selectionOf(mockSyllableMeo, { onset: 'zz', rhyme: 'zz', tone: 'NGA' })).toEqual({ onset: 0, rhyme: 0, tone: 0 })
  })

  it('theo kiểu đặt dấu của câu hỏi', () => {
    const sel = { onset: 0, rhyme: 0, tone: 1 }
    expect(currentSyllable(mockSyllableHoa, sel)).toBe('hòa')
    expect(currentSyllable({ ...mockSyllableHoa, toneStyle: 'traditional' }, sel)).toBe('hoà')
  })
})

describe('isCorrectSyllable', () => {
  it('so sau NFC; chuỗi rỗng không bao giờ đúng', () => {
    expect(isCorrectSyllable('mèo', 'mèo'.normalize('NFD'))).toBe(true)
    expect(isCorrectSyllable('meo', 'mèo')).toBe(false)
    expect(isCorrectSyllable('', '')).toBe(false)
  })
})

describe('syllableReducer', () => {
  const idle = createSyllableState()

  it('cycle đổi đúng ô, vòng quanh', () => {
    const next = syllableReducer(idle, { type: 'cycle', slot: 'rhyme', delta: -1, count: 3 })
    expect(next.selection).toEqual({ onset: 0, rhyme: 2, tone: 0 })
    expect(syllableReducer(next, { type: 'cycle', slot: 'rhyme', delta: 1, count: 3 }).selection.rhyme).toBe(0)
  })

  it('cycle không đổi giá trị thì giữ nguyên danh tính (không render thừa)', () => {
    expect(syllableReducer(idle, { type: 'cycle', slot: 'onset', delta: 1, count: 1 })).toBe(idle)
    expect(syllableReducer(idle, { type: 'cycle', slot: 'onset', delta: 3, count: 3 })).toBe(idle)
  })

  it('đang chấm hoặc đã xong thì khóa', () => {
    const submitting = syllableReducer(idle, { type: 'submitStart' })
    expect(syllableReducer(submitting, { type: 'cycle', slot: 'tone', delta: 1, count: 3 })).toBe(submitting)
    const done = syllableReducer(submitting, { type: 'submitDone' })
    expect(done.phase).toBe('done')
    expect(syllableReducer(done, { type: 'cycle', slot: 'tone', delta: 1, count: 3 })).toBe(done)
  })

  it('luồng nộp: idle → submitting → done; lỗi thì mở khóa; chuyển sai thứ tự bị bỏ qua', () => {
    const submitting = syllableReducer(idle, { type: 'submitStart' })
    expect(submitting.phase).toBe('submitting')
    expect(syllableReducer(submitting, { type: 'submitFailed' }).phase).toBe('idle')
    expect(syllableReducer(idle, { type: 'submitDone' })).toBe(idle)
    expect(syllableReducer(idle, { type: 'submitFailed' })).toBe(idle)
    const done = createSyllableState(initialSelection(), 'done')
    expect(syllableReducer(done, { type: 'submitStart' })).toBe(done)
  })
})
