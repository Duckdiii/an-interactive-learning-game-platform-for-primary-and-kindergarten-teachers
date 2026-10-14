import type { GameDsl } from '../../types/game-dsl.types'
import { deepEqual } from '../../utils/gameContent'

// Trạng thái của một phiên soạn thảo: `baseline` là bản đã lưu gần nhất (hoặc bản vừa mở từ máy chủ), `draft` là bản đang
// sửa. "Chưa lưu" được SUY RA từ việc hai bản khác nhau, nên sửa rồi gõ lại như cũ thì hết "chưa lưu". Hàm thuần để test.

export interface EditorState {
  baseline: GameDsl
  draft: GameDsl
}

export type EditorAction =
  | { type: 'setTitle'; title: string }
  | { type: 'setTopic'; topic: string }
  // Thay cả bản nháp bằng bản sao lưu trong trình duyệt (giáo viên chọn "Khôi phục").
  | { type: 'restore'; content: GameDsl }
  // Lưu thành công: `snapshot` là đúng nội dung đã gửi. Nếu giáo viên gõ thêm trong lúc chờ thì `draft` vẫn giữ phần mới đó.
  | { type: 'saved'; snapshot: GameDsl }
  // Cắt khoảng trắng hai đầu của tên và chủ đề (bản này cũng là bản được gửi lên, nên đã cắt từ trước khi gửi).
  | { type: 'normalize' }

export function createEditorState(content: GameDsl): EditorState {
  return { baseline: content, draft: content }
}

/** Bản sao có tên và chủ đề đã cắt khoảng trắng hai đầu: Backend đếm ký tự trên chuỗi thô nên phải gửi bản đã cắt. */
export function trimMetadata(content: GameDsl): GameDsl {
  const { title, topic } = content.metadata

  if (title === title.trim() && topic === topic.trim()) return content

  return { ...content, metadata: { ...content.metadata, title: title.trim(), topic: topic.trim() } }
}

export const isDirty = (state: EditorState) => !deepEqual(state.draft, state.baseline)

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'setTitle':
      return { ...state, draft: { ...state.draft, metadata: { ...state.draft.metadata, title: action.title } } }
    case 'setTopic':
      return { ...state, draft: { ...state.draft, metadata: { ...state.draft.metadata, topic: action.topic } } }
    case 'restore':
      return { ...state, draft: action.content }
    case 'saved':
      return { ...state, baseline: action.snapshot }
    case 'normalize':
      return { ...state, draft: trimMetadata(state.draft) }
  }
}
