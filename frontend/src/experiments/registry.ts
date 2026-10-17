import type { ReactNode } from 'react'

/** Môn học của một mục thử nghiệm (không dùng `Subject` của DSL: loại thử nghiệm không thuộc DSL). */
export type ExperimentArea = 'MATH' | 'VIETNAMESE' | 'ENGLISH' | 'INFRA'

/** Một mục xem thử: renderer/loại game/theme thử nghiệm, chạy bằng dữ liệu mẫu cục bộ, không gọi mạng. */
export interface ExperimentEntry {
  id: string
  title: string
  area: ExperimentArea
  render: () => ReactNode
}

/**
 * Bảng đăng ký riêng của khu thử nghiệm. Cố ý KHÔNG dùng `GAME_TYPES` (DSL đang đóng băng 1.0.0):
 * thêm loại thử nghiệm là thêm một mục ở đây, không sửa DSL, schema hay openapi.
 */
export const EXPERIMENT_ENTRIES: readonly ExperimentEntry[] = []

export function findExperiment(
  id: string,
  entries: readonly ExperimentEntry[] = EXPERIMENT_ENTRIES,
): ExperimentEntry | undefined {
  return entries.find((entry) => entry.id === id)
}

/** Trả về các mã bị trùng (rỗng nếu hợp lệ), để test bắt lỗi đăng ký hai mục cùng mã. */
export function duplicateExperimentIds(entries: readonly ExperimentEntry[]): string[] {
  const seen = new Set<string>()
  const duplicates = new Set<string>()
  for (const { id } of entries) {
    if (seen.has(id)) duplicates.add(id)
    seen.add(id)
  }
  return [...duplicates]
}
