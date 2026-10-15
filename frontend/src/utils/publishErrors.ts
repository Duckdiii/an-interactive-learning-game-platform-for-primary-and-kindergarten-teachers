import axios from 'axios'
import { viText } from '../constants/viText'
import { parseApiError } from './apiError'

// Mã lỗi ĐỀ XUẤT cho 2b (đã lưu nhưng chưa tạo được mã chia sẻ); contract hiện chỉ có 500 chung cho 2a và 2b (docs/decisions.md).
export const SHARE_CODE_UNAVAILABLE_CODE = 'SHARE_CODE_UNAVAILABLE'

// Loại lỗi xuất bản: failed (2a), shareFailed (2b), invalid (2c, Backend từ chối dữ liệu), conflict (409, có phòng chưa kết thúc), canceled (do giáo viên hủy hoặc rời trang), other (đã đăng xuất, không có quyền...).
export type PublishFailureKind = 'failed' | 'shareFailed' | 'invalid' | 'conflict' | 'canceled' | 'other'

export interface PublishFailure {
  kind: PublishFailureKind
  message: string
}

const text = viText.editor.publish

/** Đổi lỗi xuất bản thành loại lỗi và câu hiển thị. Câu 2a, 2b, 2c theo đúng SRS UC-07; mất mạng, quá hạn và mọi lỗi 5xx đều là 2a. */
export function describePublishError(error: unknown): PublishFailure {
  if (axios.isCancel(error)) return { kind: 'canceled', message: '' }
  if (!axios.isAxiosError(error)) return { kind: 'failed', message: text.failed }
  if (!error.response) return { kind: 'failed', message: text.failed }

  const parsed = parseApiError(error, text.failed)
  const status = error.response.status

  if (parsed.code === SHARE_CODE_UNAVAILABLE_CODE) return { kind: 'shareFailed', message: text.shareFailed }
  if (status === 409) return { kind: 'conflict', message: text.conflict }
  if (status === 400 || status === 422) return { kind: 'invalid', message: text.invalid }
  if (status >= 500) return { kind: 'failed', message: text.failed }

  return { kind: 'other', message: parsed.message }
}
