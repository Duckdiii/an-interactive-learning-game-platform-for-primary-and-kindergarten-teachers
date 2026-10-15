import { describe, expect, it } from 'vitest'
import { buildMockGameContents } from '../../services/mock/gameFixtures'
import type { QuestionDsl } from '../../types/game-dsl.types'
import { createEditorState, editorReducer, isDirty } from './editorReducer'

const quiz = () => buildMockGameContents()[0]

describe('editorReducer', () => {
  it('mới mở thì chưa có thay đổi', () => {
    expect(isDirty(createEditorState(quiz()))).toBe(false)
  })

  it('đổi tên hoặc chủ đề thì "chưa lưu", không đụng tới bản đã lưu', () => {
    const start = createEditorState(quiz())
    const renamed = editorReducer(start, { type: 'setTitle', title: 'Tên mới' })
    const retopic = editorReducer(renamed, { type: 'setTopic', topic: 'Chủ đề mới' })

    expect(renamed.draft.metadata.title).toBe('Tên mới')
    expect(retopic.draft.metadata.topic).toBe('Chủ đề mới')
    expect(isDirty(retopic)).toBe(true)
    expect(retopic.baseline).toBe(start.baseline)
    expect(start.draft.metadata.title).toBe(quiz().metadata.title)
  })

  it('sửa rồi gõ lại đúng như cũ thì hết "chưa lưu"', () => {
    const start = createEditorState(quiz())
    const edited = editorReducer(start, { type: 'setTitle', title: 'Khác' })
    const back = editorReducer(edited, { type: 'setTitle', title: quiz().metadata.title })

    expect(isDirty(edited)).toBe(true)
    expect(isDirty(back)).toBe(false)
  })

  it('lưu xong thì bản đã lưu bằng đúng nội dung đã gửi; gõ thêm trong lúc chờ vẫn còn "chưa lưu"', () => {
    const start = createEditorState(quiz())
    const sent = editorReducer(start, { type: 'setTitle', title: 'Đã gửi' }).draft
    const typedMore = editorReducer(
      editorReducer(start, { type: 'setTitle', title: 'Đã gửi thêm chữ' }),
      { type: 'saved', snapshot: sent },
    )
    const exact = editorReducer(editorReducer(start, { type: 'setTitle', title: 'Đã gửi' }), { type: 'saved', snapshot: sent })

    expect(isDirty(exact)).toBe(false)
    expect(isDirty(typedMore)).toBe(true)
    expect(typedMore.draft.metadata.title).toBe('Đã gửi thêm chữ')
  })

  it('khôi phục thay cả bản đang soạn bằng bản sao lưu', () => {
    const start = createEditorState(quiz())
    const backup = { ...quiz(), metadata: { ...quiz().metadata, title: 'Từ bản sao lưu' } }
    const restored = editorReducer(start, { type: 'restore', content: backup })

    expect(restored.draft.metadata.title).toBe('Từ bản sao lưu')
    expect(isDirty(restored)).toBe(true)
  })
})

describe('editorReducer: updateQuestion (bản vá áp lên câu hiện hành)', () => {
  const patchTime = (seconds: number) => (question: QuestionDsl) => ({ ...question, timeLimitSeconds: seconds })

  it('áp bản vá lên câu ở đúng vị trí, các câu khác nguyên vẹn', () => {
    const start = createEditorState(quiz())
    const next = editorReducer(start, { type: 'updateQuestion', index: 1, questionId: start.draft.questions[1].id, update: patchTime(77) })

    expect(next.draft.questions[1].timeLimitSeconds).toBe(77)
    expect(next.draft.questions[0]).toBe(start.draft.questions[0])
    expect(isDirty(next)).toBe(true)
  })

  it('bản vá chạy trên trạng thái MỚI NHẤT: hai bản vá liên tiếp cộng dồn, không bản nào ghi đè bản nào', () => {
    const start = createEditorState(quiz())
    const id = start.draft.questions[0].id
    const first = editorReducer(start, { type: 'updateQuestion', index: 0, questionId: id, update: patchTime(40) })
    // Bản vá thứ hai được dựng từ lúc "chụp" cũ nhưng chỉ đổi điểm: không được làm mất thời gian vừa đổi.
    const second = editorReducer(first, { type: 'updateQuestion', index: 0, questionId: id, update: (question) => ({ ...question, points: 55 }) })

    expect(second.draft.questions[0]).toMatchObject({ timeLimitSeconds: 40, points: 55 })
  })

  it('câu ở vị trí đó không còn là câu cũ (đổi câu, khôi phục) hoặc vị trí không có thì bỏ qua', () => {
    const start = createEditorState(quiz())

    expect(editorReducer(start, { type: 'updateQuestion', index: 0, questionId: 'q-khac', update: patchTime(77) })).toBe(start)
    expect(editorReducer(start, { type: 'updateQuestion', index: 99, questionId: 'q1', update: patchTime(77) })).toBe(start)
    expect(editorReducer(start, { type: 'updateQuestion', index: -1, questionId: 'q1', update: patchTime(77) })).toBe(start)
  })

  it('bản vá không đổi gì (trả lại đúng câu cũ) thì không tạo trạng thái mới', () => {
    const start = createEditorState(quiz())

    expect(editorReducer(start, { type: 'updateQuestion', index: 0, questionId: start.draft.questions[0].id, update: (question) => question })).toBe(start)
  })
})

describe('editorReducer: AI làm lại một câu và hoàn tác', () => {
  const regenerated = (state: ReturnType<typeof createEditorState>, text = 'Câu do AI làm lại'): QuestionDsl => ({
    ...state.draft.questions[0],
    questionText: text,
  }) as QuestionDsl

  it('áp câu mới vào đúng thẻ, giữ nguyên thẻ khác, "chưa lưu", và nhớ câu cũ ở bộ nhớ hoàn tác (không nằm trong bản nháp)', () => {
    const start = createEditorState(quiz())
    const next = editorReducer(start, { type: 'applyRegenerated', index: 0, questionId: 'q1', question: regenerated(start) })

    expect((next.draft.questions[0] as { questionText: string }).questionText).toBe('Câu do AI làm lại')
    expect(next.draft.questions[1]).toBe(start.draft.questions[1])
    expect(isDirty(next)).toBe(true)
    expect(next.undo.q1.previous).toBe(start.draft.questions[0])
    expect(next.undo.q1.applied).toBe(next.draft.questions[0])
    // Bộ nhớ hoàn tác không lọt vào nội dung game (nơi duy nhất được sao lưu và gửi đi).
    expect(JSON.stringify(next.draft)).not.toContain('previous')
    expect(next.baseline).toBe(start.baseline)
  })

  it('thẻ không còn khớp mã hoặc vị trí, hoặc câu mới mang mã khác thì bỏ qua', () => {
    const start = createEditorState(quiz())

    expect(editorReducer(start, { type: 'applyRegenerated', index: 0, questionId: 'q2', question: regenerated(start) })).toBe(start)
    expect(editorReducer(start, { type: 'applyRegenerated', index: 99, questionId: 'q1', question: regenerated(start) })).toBe(start)
    expect(editorReducer(start, { type: 'applyRegenerated', index: 0, questionId: 'q1', question: { ...regenerated(start), id: 'q9' } })).toBe(start)
  })

  it('hoàn tác trả đúng câu cũ (cùng đối tượng), hết "chưa lưu", và chỉ hoàn tác được một lần', () => {
    const start = createEditorState(quiz())
    const applied = editorReducer(start, { type: 'applyRegenerated', index: 0, questionId: 'q1', question: regenerated(start) })
    const undone = editorReducer(applied, { type: 'undoRegenerated', index: 0, questionId: 'q1' })

    expect(undone.draft.questions[0]).toBe(start.draft.questions[0])
    expect(isDirty(undone)).toBe(false)
    expect(undone.undo).toEqual({})
    expect(editorReducer(undone, { type: 'undoRegenerated', index: 0, questionId: 'q1' })).toBe(undone)
  })

  it('sửa tiếp CHÍNH câu đó thì mất khả năng hoàn tác; sửa câu khác thì còn', () => {
    const start = createEditorState(quiz())
    const applied = editorReducer(start, { type: 'applyRegenerated', index: 0, questionId: 'q1', question: regenerated(start) })
    const otherEdited = editorReducer(applied, { type: 'updateQuestion', index: 1, questionId: 'q2', update: (question) => ({ ...question, points: 55 }) })
    const sameEdited = editorReducer(applied, { type: 'updateQuestion', index: 0, questionId: 'q1', update: (question) => ({ ...question, points: 55 }) })
    const noChange = editorReducer(applied, { type: 'updateQuestion', index: 0, questionId: 'q1', update: (question) => question })

    expect(Object.keys(otherEdited.undo)).toEqual(['q1'])
    expect(sameEdited.undo).toEqual({})
    expect(noChange).toBe(applied)
    // Đã sửa tiếp thì hoàn tác không còn làm gì (không mất phần vừa sửa).
    expect(editorReducer(sameEdited, { type: 'undoRegenerated', index: 0, questionId: 'q1' })).toBe(sameEdited)
  })

  it('lưu (chuẩn hóa trước khi gửi, hoặc đã lưu xong) và khôi phục bản sao lưu đều xóa mọi hoàn tác', () => {
    const start = createEditorState(quiz())
    const applied = editorReducer(start, { type: 'applyRegenerated', index: 0, questionId: 'q1', question: regenerated(start) })

    expect(editorReducer(applied, { type: 'normalize' }).undo).toEqual({})
    expect(editorReducer(applied, { type: 'saved', snapshot: applied.draft }).undo).toEqual({})
    expect(editorReducer(applied, { type: 'restore', content: quiz() }).undo).toEqual({})
  })

  it('làm lại nhiều thẻ thì mỗi thẻ hoàn tác riêng', () => {
    const start = createEditorState(quiz())
    const first = editorReducer(start, { type: 'applyRegenerated', index: 0, questionId: 'q1', question: regenerated(start) })
    const second = editorReducer(first, {
      type: 'applyRegenerated',
      index: 1,
      questionId: 'q2',
      question: { ...first.draft.questions[1], questionText: 'Câu 2 do AI' } as QuestionDsl,
    })
    const undoFirst = editorReducer(second, { type: 'undoRegenerated', index: 0, questionId: 'q1' })

    expect(Object.keys(second.undo).sort()).toEqual(['q1', 'q2'])
    expect(undoFirst.draft.questions[0]).toBe(start.draft.questions[0])
    expect((undoFirst.draft.questions[1] as { questionText: string }).questionText).toBe('Câu 2 do AI')
    expect(Object.keys(undoFirst.undo)).toEqual(['q2'])
  })
})
