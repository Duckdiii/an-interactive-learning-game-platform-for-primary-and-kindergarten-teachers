import axios from 'axios'
import { viText } from '../constants/viText'
import { parseApiError } from './apiError'

const text = viText.editor.regenerate

// Loại lỗi để giao diện chọn cách phản ứng: `unsafe` (5a) cho sửa gợi ý rồi thử lại, `busy` (5b) và `rateLimited` cho bấm "Thử lại",
// `notSaved` (404) và `locked` (409) phải xử lý chỗ khác trước (lưu bản nháp, kết thúc phòng chơi) nên không có nút thử lại.
export type RegenerateFailureKind = 'unsafe' | 'busy' | 'notSaved' | 'locked' | 'rateLimited' | 'other'

export interface RegenerateFailure {
  kind: RegenerateFailureKind
  message: string
}

/**
 * Đổi lỗi của lời gọi "AI làm lại một câu" thành loại lỗi và câu hiển thị. Câu 5a, 5b theo đúng SRS UC-06. Mất mạng, quá hạn và mọi lỗi
 * máy chủ (5xx) đều là 5b ("máy chủ AI bận"): với giáo viên đó là cùng một việc, yêu cầu chưa thực hiện được và câu cũ vẫn còn nguyên.
 */
export function describeRegenerateError(error: unknown): RegenerateFailure {
  if (!axios.isAxiosError(error)) return { kind: 'other', message: text.fallback }

  if (!error.response) return { kind: 'busy', message: text.busy }

  const parsed = parseApiError(error, text.fallback)
  const status = error.response.status

  if (parsed.code === 'UNSAFE_CONTENT') return { kind: 'unsafe', message: text.unsafe }
  if (parsed.code === 'AI_GENERATION_TIMEOUT' || status >= 500) return { kind: 'busy', message: text.busy }
  if (status === 404) return { kind: 'notSaved', message: text.notSaved }
  if (status === 409) return { kind: 'locked', message: text.locked }
  if (status === 429) return { kind: 'rateLimited', message: parsed.message }

  return { kind: 'other', message: parsed.message }
}
