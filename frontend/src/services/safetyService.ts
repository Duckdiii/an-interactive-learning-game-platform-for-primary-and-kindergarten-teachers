import { isMock } from '../config/mockMode'
import { mockCheckSafety } from './mock/safetyCheck'
import type { SafetyVerdict } from './mock/safetyCheck'
import { runMock } from './mock/mockRuntime'

export type { SafetyVerdict }

/**
 * Kiểm tra sớm từ ngữ giáo viên vừa sửa (UC-05 2a). Nhóm `editor` đang mô phỏng thì dùng bộ lọc giả lập; khi dùng API thật
 * thì KHÔNG có điểm cuối kiểm tra riêng, kiểm duyệt do Backend làm khi lưu (lỗi `UNSAFE_CONTENT`), nên ở đây coi là an toàn.
 */
export async function checkTextSafety(texts: ReadonlyArray<string>): Promise<SafetyVerdict> {
  if (!isMock('editor')) return { safe: true }

  return runMock(() => mockCheckSafety(texts))
}
