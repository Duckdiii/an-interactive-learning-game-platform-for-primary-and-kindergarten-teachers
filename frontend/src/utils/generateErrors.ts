import axios from 'axios'
import { viText } from '../constants/viText'
import { parseApiError } from './apiError'

// Loại lỗi để giao diện chọn cách phản ứng khi tạo game bằng AI: unsafe (422) phải đổi ý tưởng, thử lại y nguyên là vô ích; needLesson là thiếu khối lớp hoặc môn
// khi dùng API thật; rateLimited (429) và busy (mất mạng, quá hạn, 5xx) cho thử lại, giáo viên tự bấm sau một lúc; canceled là do chính giáo viên hủy.
export type GenerateFailureKind = 'unsafe' | 'needLesson' | 'rateLimited' | 'busy' | 'canceled' | 'other'

export interface GenerateFailure {
  kind: GenerateFailureKind
  message: string
}

/** Lỗi do giao diện tự chặn trước khi gọi API thật (xem createGames): openapi.yaml bắt buộc khối lớp và môn học. */
export class GenerateBlockedError extends Error {
  constructor() {
    super('Thiếu khối lớp hoặc môn học')
    this.name = 'GenerateBlockedError'
  }
}

/** Đổi lỗi của một lần sinh game thành loại lỗi và câu hiển thị (câu theo bảng mã lỗi chung, không thêm câu mới trừ needLesson). */
export function describeGenerateError(error: unknown): GenerateFailure {
  if (axios.isCancel(error)) return { kind: 'canceled', message: '' }
  if (error instanceof GenerateBlockedError) return { kind: 'needLesson', message: viText.generator.needLessonForServer }
  if (!axios.isAxiosError(error)) return { kind: 'other', message: viText.generator.createFailed }

  const parsed = parseApiError(error, viText.generator.createFailed)
  const status = error.response?.status

  if (parsed.code === 'UNSAFE_CONTENT') return { kind: 'unsafe', message: parsed.message }
  if (status === 429) return { kind: 'rateLimited', message: parsed.message }
  if (!error.response || parsed.code === 'AI_GENERATION_TIMEOUT' || (status !== undefined && status >= 500)) return { kind: 'busy', message: parsed.message }

  return { kind: 'other', message: parsed.message }
}
