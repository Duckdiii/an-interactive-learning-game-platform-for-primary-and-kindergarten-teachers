import axios from 'axios'
import { viText } from '../constants/viText'
import { parseApiError } from './apiError'

const media = viText.editor.media

/** Lỗi do chính giáo viên bấm Hủy (không phải sự cố): không được hiện như lỗi. */
export const isCanceled = (error: unknown) => axios.isCancel(error)

/**
 * Câu lỗi khi tải tệp lên thất bại. Hai mã lỗi riêng của upload dùng đúng câu của SRS (UC-05 3a, 3b) thay vì câu chung của bảng mã lỗi;
 * mọi lỗi khác (mất mạng, quá hạn, 500...) đi qua `parseApiError`.
 */
export function uploadErrorMessage(error: unknown): string {
  const parsed = parseApiError(error, media.uploadFailed)

  if (parsed.code === 'FILE_TOO_LARGE_OR_INVALID_FORMAT') return media.invalidFile
  if (parsed.code === 'UNSAFE_CONTENT') return media.unsafeFile

  return parsed.message
}
