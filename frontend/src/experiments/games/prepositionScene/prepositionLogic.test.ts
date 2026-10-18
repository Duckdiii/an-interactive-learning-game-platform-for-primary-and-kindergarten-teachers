import { describe, expect, it } from 'vitest'
import { SCENE_HEIGHT, SCENE_WIDTH } from './prepositionGeometry'
import {
  mockPrepositionIn,
  mockPrepositionNextTo,
  mockPrepositionOn,
  mockPrepositionUnder,
  mockPrepositionWithAudio,
  PREPOSITION_FIXTURES,
} from './prepositionFixtures'
import {
  createPrepositionState,
  itemSize,
  MAX_INSTRUCTION_CHARS,
  prepositionReducer,
  startCenter,
  toStudentQuestion,
  validatePrepositionScene,
  type PrepositionIssueCode,
} from './prepositionLogic'
import type { PrepositionSceneQuestion } from './prepositionTypes'

const q = (overrides: Partial<PrepositionSceneQuestion> = {}): PrepositionSceneQuestion => ({ ...mockPrepositionUnder, ...overrides })
const codes = (question: PrepositionSceneQuestion): PrepositionIssueCode[] => validatePrepositionScene(question).map((i) => i.code)

describe('validatePrepositionScene', () => {
  it('mọi mẫu đều hợp lệ', () => {
    for (const [name, fixture] of Object.entries(PREPOSITION_FIXTURES)) expect([name, codes(fixture)]).toEqual([name, []])
  })

  it.each([
    ['lệnh rỗng', { instruction: ' ' }, ['INSTRUCTION_EMPTY', 'INSTRUCTION_PREPOSITION_MISMATCH', 'LABEL_NOT_IN_INSTRUCTION', 'LABEL_NOT_IN_INSTRUCTION']],
    ['lệnh dài quá', { instruction: 'Put the cat under the table' + ' now'.repeat(MAX_INSTRUCTION_CHARS) }, ['INSTRUCTION_TOO_LONG']],
    ['lệnh không có từ chỉ vị trí đúng', { instruction: 'Put the cat on the table.' }, ['INSTRUCTION_PREPOSITION_MISMATCH']],
    ['lệnh chỉ chứa «under» như một phần của từ khác', { instruction: 'Put the cat thunderstorm table.' }, ['INSTRUCTION_PREPOSITION_MISMATCH']],
    ['tên vật mốc rỗng', { landmark: { ...mockPrepositionUnder.landmark, label: '' } }, ['LABEL_EMPTY']],
    ['tên vật rỗng', { item: { ...mockPrepositionUnder.item, label: ' ' } }, ['LABEL_EMPTY']],
    ['vật mốc ra ngoài cảnh', { landmark: { ...mockPrepositionUnder.landmark, x: 600 } }, ['LANDMARK_OFF_SCENE', 'IDEAL_UNREACHABLE']],
    ['vị trí đầu ngoài cảnh', { item: { ...mockPrepositionUnder.item, startX: -20 } }, ['ITEM_OFF_SCENE']],
    ['vật bắt đầu đã đúng chỗ', { item: { ...mockPrepositionUnder.item, startX: 360, startY: 290 } }, ['START_ALREADY_CORRECT']],
    ['vật quá to không chui vừa gầm bàn', { item: { ...mockPrepositionUnder.item, width: 100, height: 200 } }, ['IDEAL_UNREACHABLE']],
  ] as const)('%s', (_label, overrides, expected) => {
    expect(codes(q(overrides as Partial<PrepositionSceneQuestion>))).toEqual(expected)
  })

  it('hộp không hỗ trợ «under», bàn không hỗ trợ «in»: báo và dừng', () => {
    expect(codes({ ...mockPrepositionIn, preposition: 'UNDER', instruction: 'Put the ball under the box.' })).toEqual(['PREPOSITION_UNSUPPORTED'])
    expect(codes({ ...mockPrepositionOn, preposition: 'IN', instruction: 'Put the cat in the table.' })).toEqual(['PREPOSITION_UNSUPPORTED'])
  })

  it('toạ độ hoặc kích thước hỏng (NaN, 0, âm) → SIZE_INVALID', () => {
    expect(codes(q({ item: { ...mockPrepositionUnder.item, width: 0 } }))).toEqual(['SIZE_INVALID'])
    expect(codes(q({ item: { ...mockPrepositionUnder.item, startX: Number.NaN } }))).toEqual(['SIZE_INVALID'])
    expect(codes(q({ landmark: { ...mockPrepositionUnder.landmark, height: -5 } }))).toEqual(['SIZE_INVALID'])
  })

  it('từ chỉ vị trí của từng quy tắc được nhận đúng (kể cả inside và beside)', () => {
    expect(codes({ ...mockPrepositionIn, instruction: 'Put the ball inside the box.' })).toEqual([])
    expect(codes({ ...mockPrepositionNextTo, instruction: 'Put the dog beside the box.' })).toEqual([])
    expect(codes({ ...mockPrepositionNextTo, instruction: 'Put the dog NEXT TO the box.' })).toEqual([])
    expect(codes({ ...mockPrepositionNextTo, instruction: 'Put the dog next the box.' })).toEqual(['INSTRUCTION_PREPOSITION_MISMATCH'])
  })

  it('«into» và «inside» cũng là «in»; «in front of» thì không', () => {
    expect(codes({ ...mockPrepositionIn, instruction: 'Put the ball into the box.' })).toEqual([])
    expect(codes({ ...mockPrepositionIn, instruction: 'Put the ball in front of the box.' })).toEqual(['INSTRUCTION_PREPOSITION_MISMATCH'])
  })

  it('lệnh chứa nhiều từ chỉ vị trí thì báo không rõ chấm quy tắc nào', () => {
    expect(codes({ ...mockPrepositionIn, instruction: 'Put the ball in the box next to the table.' })).toEqual(['INSTRUCTION_MULTIPLE_PREPOSITIONS'])
  })

  it('lệnh phải nhắc tên vật và tên vật mốc đang hiện trên màn hình', () => {
    expect(codes(q({ item: { ...mockPrepositionUnder.item, label: 'dog' } }))).toEqual(['LABEL_NOT_IN_INSTRUCTION'])
    expect(codes(q({ landmark: { ...mockPrepositionUnder.landmark, label: 'chair' } }))).toEqual(['LABEL_NOT_IN_INSTRUCTION'])
    expect(codes(q({ item: { ...mockPrepositionUnder.item, label: 'CAT' } }))).toEqual([]) // không phân biệt hoa thường
    expect(codes(q({ item: { ...mockPrepositionUnder.item, label: 'ca' } }))).toEqual(['LABEL_NOT_IN_INSTRUCTION']) // «ca» không phải từ «cat»
  })

  it('đáy vật mốc phải ở mặt đất: bàn lơ lửng bị báo', () => {
    expect(codes(q({ landmark: { ...mockPrepositionUnder.landmark, y: 100, height: 140 } }))).toContain('LANDMARK_NOT_ON_GROUND')
  })

  it('bàn thấp hơn mặt bàn thì không có gầm', () => {
    expect(codes(q({ landmark: { ...mockPrepositionUnder.landmark, y: 310, height: 30 } }))).toContain('LANDMARK_TOO_SHORT')
  })

  it('vật bắt đầu chồng lên vật mốc (mà chưa đúng) bị báo', () => {
    expect(codes(q({ item: { ...mockPrepositionUnder.item, startX: 360, startY: 190 } }))).toEqual(['START_OVERLAPS_LANDMARK'])
  })

  it('mỗi lỗi mang đường dẫn trường', () => {
    expect(validatePrepositionScene(q({ instruction: '' }))[0]).toMatchObject({ path: 'instruction' })
    expect(validatePrepositionScene(q({ item: { ...mockPrepositionUnder.item, startX: -20 } }))[0]).toMatchObject({ path: 'item' })
  })
})

describe('toStudentQuestion', () => {
  it('bỏ quy tắc chấm và audioText, giữ phần cần để vẽ và đọc lệnh', () => {
    const student = toStudentQuestion(mockPrepositionWithAudio)
    expect(student).not.toHaveProperty('preposition')
    expect(student).not.toHaveProperty('audioText')
    expect(student).toMatchObject({ id: 'prep-audio', instruction: 'Put the cat under the table.', audioUrl: '/mock/q1.wav' })
    expect(student.landmark).toEqual(mockPrepositionWithAudio.landmark)
    expect(JSON.stringify(student)).not.toContain('UNDER')
    expect(mockPrepositionWithAudio.preposition).toBe('UNDER')
  })
})

describe('startCenter / itemSize', () => {
  it('lấy vị trí đầu và kẹp vào cảnh', () => {
    expect(startCenter(mockPrepositionOn)).toEqual({ x: 110, y: 110 })
    expect(startCenter({ item: { ...mockPrepositionOn.item, startX: -50, startY: 5000 } })).toEqual({ x: 50, y: SCENE_HEIGHT - 50 })
    expect(itemSize(mockPrepositionOn)).toEqual({ width: 100, height: 100 })
  })
})

describe('prepositionReducer', () => {
  const size = { width: 100, height: 100 }
  const idle = createPrepositionState({ x: 110, y: 110 })

  it('place đổi vị trí và kẹp vào cảnh; cùng vị trí thì giữ nguyên danh tính', () => {
    expect(prepositionReducer(idle, { type: 'place', center: { x: 300, y: 200 }, size }).center).toEqual({ x: 300, y: 200 })
    expect(prepositionReducer(idle, { type: 'place', center: { x: 9999, y: -5 }, size }).center).toEqual({ x: SCENE_WIDTH - 50, y: 50 })
    expect(prepositionReducer(idle, { type: 'place', center: { x: 110, y: 110 }, size })).toBe(idle)
    expect(prepositionReducer(idle, { type: 'place', center: { x: -50, y: 110 }, size }).center).toEqual({ x: 50, y: 110 })
  })

  it('đang chấm hoặc đã xong thì khóa', () => {
    const submitting = prepositionReducer(idle, { type: 'submitStart' })
    expect(prepositionReducer(submitting, { type: 'place', center: { x: 300, y: 200 }, size })).toBe(submitting)
    const done = prepositionReducer(submitting, { type: 'submitDone' })
    expect(done.phase).toBe('done')
    expect(prepositionReducer(done, { type: 'place', center: { x: 300, y: 200 }, size })).toBe(done)
  })

  it('luồng nộp: idle → submitting → done; lỗi thì mở khóa; chuyển sai thứ tự bị bỏ qua', () => {
    const submitting = prepositionReducer(idle, { type: 'submitStart' })
    expect(submitting.phase).toBe('submitting')
    expect(prepositionReducer(submitting, { type: 'submitFailed' }).phase).toBe('idle')
    expect(prepositionReducer(idle, { type: 'submitDone' })).toBe(idle)
    expect(prepositionReducer(idle, { type: 'submitFailed' })).toBe(idle)
    const done = createPrepositionState({ x: 1, y: 1 }, 'done')
    expect(prepositionReducer(done, { type: 'submitStart' })).toBe(done)
  })
})
