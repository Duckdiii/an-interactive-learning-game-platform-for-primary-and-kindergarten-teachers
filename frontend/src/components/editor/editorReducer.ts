import type { GameDsl, QuestionDsl } from '../../types/game-dsl.types'
import { deepEqual, trimContent } from '../../utils/gameContent'

// Trạng thái của một phiên soạn thảo: `baseline` là bản đã lưu gần nhất (hoặc bản vừa mở từ máy chủ), `draft` là bản đang
// sửa. "Chưa lưu" được SUY RA từ việc hai bản khác nhau, nên sửa rồi gõ lại như cũ thì hết "chưa lưu". Hàm thuần để test.

export interface EditorState {
  baseline: GameDsl
  draft: GameDsl
}

export type EditorAction =
  | { type: 'setTitle'; title: string }
  | { type: 'setTopic'; topic: string }
  // Áp một bản vá (hàm thuần trong `forms/*Editing`) lên câu HIỆN HÀNH ở vị trí `index`. Bản vá chạy trên trạng thái mới nhất nên
  // một lần kiểm tra từ ngữ về muộn không ghi đè các sửa đổi khác; `questionId` phải còn khớp (đã đổi câu/khôi phục thì bỏ qua).
  | { type: 'updateQuestion'; index: number; questionId: string; update: (question: QuestionDsl) => QuestionDsl }
  // Thay cả bản nháp bằng bản sao lưu trong trình duyệt (giáo viên chọn "Khôi phục").
  | { type: 'restore'; content: GameDsl }
  // Lưu thành công: `snapshot` là đúng nội dung đã gửi. Nếu giáo viên gõ thêm trong lúc chờ thì `draft` vẫn giữ phần mới đó.
  | { type: 'saved'; snapshot: GameDsl }
  // Cắt khoảng trắng hai đầu của mọi chuỗi nội dung (bản này cũng là bản được gửi lên, nên đã cắt từ trước khi gửi).
  | { type: 'normalize' }

export function createEditorState(content: GameDsl): EditorState {
  return { baseline: content, draft: content }
}

export const isDirty = (state: EditorState) => !deepEqual(state.draft, state.baseline)

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'setTitle':
      return { ...state, draft: { ...state.draft, metadata: { ...state.draft.metadata, title: action.title } } }
    case 'setTopic':
      return { ...state, draft: { ...state.draft, metadata: { ...state.draft.metadata, topic: action.topic } } }
    case 'updateQuestion': {
      const current = state.draft.questions[action.index]

      // Vị trí không có hoặc không còn là câu đó (đổi câu, khôi phục sao lưu) thì bỏ qua.
      if (!current || current.id !== action.questionId) return state

      const updated = action.update(current)

      if (updated === current) return state

      const questions = state.draft.questions.map((question, position) => (position === action.index ? updated : question))

      return { ...state, draft: { ...state.draft, questions } as GameDsl }
    }
    case 'restore':
      return { ...state, draft: action.content }
    case 'saved':
      return { ...state, baseline: action.snapshot }
    case 'normalize':
      return { ...state, draft: trimContent(state.draft) }
  }
}
