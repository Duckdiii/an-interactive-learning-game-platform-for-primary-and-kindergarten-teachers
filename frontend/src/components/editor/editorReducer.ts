import type { GameDsl, GamePresentation, QuestionDsl } from '../../types/game-dsl.types'
import { deepEqual, trimContent } from '../../utils/gameContent'
import { applyGameDefault } from '../../utils/gameDefaults'
import type { DefaultField } from '../../utils/gameDefaults'

// Trạng thái của một phiên soạn thảo: `baseline` là bản đã lưu gần nhất (hoặc bản vừa mở từ máy chủ), `draft` là bản đang
// sửa. "Chưa lưu" được SUY RA từ việc hai bản khác nhau, nên sửa rồi gõ lại như cũ thì hết "chưa lưu". Hàm thuần để test.

// Câu cũ trước khi AI làm lại (`previous`) và câu AI vừa đưa vào (`applied`), để "Hoàn tác". CHỈ nằm trong bộ nhớ của phiên soạn: không thuộc `draft` nên
// không bao giờ vào bản sao lưu localStorage hay bản gửi lên máy chủ.
export interface RegenerateUndo {
  previous: QuestionDsl
  applied: QuestionDsl
}

export interface EditorState {
  baseline: GameDsl
  draft: GameDsl
  // Theo mã thẻ câu. Một mục biến mất khi giáo viên sửa tiếp CHÍNH câu đó, khi câu đó ĐÃ ĐƯỢC LƯU thành công, hoặc khi khôi phục bản sao lưu.
  // (Bấm Lưu mà lưu lỗi thì chưa mất: bản nháp vẫn chứa câu AI và chưa lưu.)
  undo: Readonly<Record<string, RegenerateUndo>>
}

export type EditorAction =
  | { type: 'setTitle'; title: string }
  | { type: 'setTopic'; topic: string }
  // Đổi một phần cách trình bày (thế giới, vật mang đáp án, bố cục); undefined thì bỏ phần đó để frontend tự chọn.
  | { type: 'setPresentation'; presentation: GamePresentation }
  // Áp một bản vá (hàm thuần trong `forms/*Editing`) lên câu HIỆN HÀNH ở vị trí `index`. Bản vá chạy trên trạng thái mới nhất nên
  // một lần kiểm tra từ ngữ về muộn không ghi đè các sửa đổi khác; `questionId` phải còn khớp (đã đổi câu/khôi phục thì bỏ qua).
  | { type: 'updateQuestion'; index: number; questionId: string; update: (question: QuestionDsl) => QuestionDsl }
  // Đưa câu do AI làm lại vào đúng thẻ (`questionId` phải còn khớp, nếu không thì bỏ qua) và nhớ câu cũ để hoàn tác.
  | { type: 'applyRegenerated'; index: number; questionId: string; question: QuestionDsl }
  // Trả câu cũ về, chỉ khi thẻ vẫn đang đúng là câu AI vừa đưa vào.
  | { type: 'undoRegenerated'; index: number; questionId: string }
  // Đổi thời gian/điểm mặc định của game: mọi câu đang theo mặc định cũ đổi theo (xem utils/gameDefaults).
  | { type: 'setGameDefault'; field: DefaultField; value: number }
  // Thay cả bản nháp bằng bản sao lưu trong trình duyệt (giáo viên chọn "Khôi phục").
  | { type: 'restore'; content: GameDsl }
  // Lưu thành công: `snapshot` là đúng nội dung đã gửi. Nếu giáo viên gõ thêm trong lúc chờ thì `draft` vẫn giữ phần mới đó.
  | { type: 'saved'; snapshot: GameDsl }
  // Cắt khoảng trắng hai đầu của mọi chuỗi nội dung (bản này cũng là bản được gửi lên, nên đã cắt từ trước khi gửi).
  | { type: 'normalize' }

export function createEditorState(content: GameDsl): EditorState {
  return { baseline: content, draft: content, undo: {} }
}

const without = (undo: EditorState['undo'], questionId: string): EditorState['undo'] => {
  if (!(questionId in undo)) return undo

  const { [questionId]: _removed, ...rest } = undo

  return rest
}

export const isDirty = (state: EditorState) => !deepEqual(state.draft, state.baseline)

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'setTitle':
      return { ...state, draft: { ...state.draft, metadata: { ...state.draft.metadata, title: action.title } } }
    case 'setTopic':
      return { ...state, draft: { ...state.draft, metadata: { ...state.draft.metadata, topic: action.topic } } }
    case 'setPresentation': {
      const merged = { ...state.draft.metadata.presentation, ...action.presentation }
      const presentation = Object.fromEntries(Object.entries(merged).filter(([, value]) => value !== undefined)) as GamePresentation
      const { presentation: _previous, ...base } = state.draft.metadata
      const metadata = Object.keys(presentation).length === 0 ? base : { ...base, presentation }
      return { ...state, draft: { ...state.draft, metadata } }
    }
    case 'setGameDefault': {
      const questions = applyGameDefault(state.draft.questions as QuestionDsl[], action.field, action.value)
      // Câu nào bị đổi theo thì hết hoàn tác, như khi sửa tay câu đó.
      const undo = questions.reduce((left, question, position) => (question === state.draft.questions[position] ? left : without(left, question.id)), state.undo)

      return { ...state, draft: { ...state.draft, questions } as GameDsl, undo }
    }
    case 'updateQuestion': {
      const current = state.draft.questions[action.index]

      // Vị trí không có hoặc không còn là câu đó (đổi câu, khôi phục sao lưu) thì bỏ qua.
      if (!current || current.id !== action.questionId) return state

      const updated = action.update(current)

      if (updated === current) return state

      const questions = state.draft.questions.map((question, position) => (position === action.index ? updated : question))

      // Sửa tiếp chính câu này thì câu cũ không còn hoàn tác được (hoàn tác sẽ làm mất phần vừa sửa).
      return { ...state, draft: { ...state.draft, questions } as GameDsl, undo: without(state.undo, action.questionId) }
    }
    case 'applyRegenerated': {
      const current = state.draft.questions[action.index]

      if (!current || current.id !== action.questionId || action.question.id !== action.questionId) return state

      const questions = state.draft.questions.map((question, position) => (position === action.index ? action.question : question))

      return {
        ...state,
        draft: { ...state.draft, questions } as GameDsl,
        undo: { ...state.undo, [action.questionId]: { previous: current, applied: action.question } },
      }
    }
    case 'undoRegenerated': {
      const entry = state.undo[action.questionId]
      const current = state.draft.questions[action.index]

      if (!entry || !current || current.id !== action.questionId) return state

      // Thẻ không còn là câu AI vừa đưa vào (không nên xảy ra vì sửa tiếp đã xóa mục này): chỉ bỏ mục, không ghi đè.
      if (!deepEqual(current, entry.applied)) return { ...state, undo: without(state.undo, action.questionId) }

      const questions = state.draft.questions.map((question, position) => (position === action.index ? entry.previous : question))

      return { ...state, draft: { ...state.draft, questions } as GameDsl, undo: without(state.undo, action.questionId) }
    }
    case 'restore':
      return { ...state, draft: action.content, undo: {} }
    case 'saved':
      // Tự lưu chạy vài giây sau mỗi lần sửa, nên lưu xong vẫn giữ "Hoàn tác" của câu AI làm lại: hoàn tác chỉ đưa câu cũ về bản nháp rồi lại được tự lưu.
      return { ...state, baseline: action.snapshot }
    case 'normalize': {
      // Chuẩn bị lưu: cắt khoảng trắng bản nháp. Hoàn tác giữ nguyên (lưu lỗi thì câu AI vẫn chưa lưu), chỉ cập nhật "câu đang hiện" theo bản đã cắt để hoàn tác vẫn nhận ra thẻ chưa bị sửa.
      const draft = trimContent(state.draft)
      const undo = Object.fromEntries(
        Object.entries(state.undo).map(([id, entry]) => [id, { ...entry, applied: draft.questions.find((question) => question.id === id) ?? entry.applied }]),
      )

      return { ...state, draft, undo }
    }
  }
}
