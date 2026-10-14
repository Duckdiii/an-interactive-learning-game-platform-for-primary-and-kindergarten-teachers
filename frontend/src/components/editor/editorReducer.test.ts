import { describe, expect, it } from 'vitest'
import { buildMockGameContents } from '../../services/mock/gameFixtures'
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
