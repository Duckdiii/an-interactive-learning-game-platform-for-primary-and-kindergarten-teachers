import { GRADE_LEVELS } from '../../types/game-dsl.types'
import type { UiOverride } from '../../types/game-student.types'
import { PROFILES } from './profiles'
import type { AgeBand, UiProfile } from './types'

/** Khối lớp thuộc khung Bé (SPEC mục 3); mọi khối khác thuộc khung Học sinh. */
const BE_GRADES: ReadonlySet<string> = new Set(['KINDERGARTEN', 'GRADE_1'])

/** Khi không biết khối lớp (dữ liệu thiếu hoặc giá trị lạ): chọn khung Bé vì không đồng hồ, không điểm nên không gây áp lực cho trẻ nhỏ. */
const DEFAULT_BAND: AgeBand = 'be'

const OVERRIDE_BANDS: Readonly<Record<Exclude<UiOverride, 'AUTO'>, AgeBand>> = { BE: 'be', HOC_SINH: 'hocSinh' }

export interface ProfileInput {
  /** Giáo viên ghi đè khi xuất bản (lưu ở thông tin xuất bản, không nằm trong JSON game). */
  uiOverride?: UiOverride | string | null
  gradeLevel?: string | null
}

/** Giáo viên ghi đè, rồi đến `gradeLevel`, rồi mặc định. Hàm thuần; trẻ không có cách nào đổi khung. */
export function resolveAgeBand({ uiOverride, gradeLevel }: ProfileInput): AgeBand {
  // hasOwn: chuỗi trùng tên thuộc tính của Object (ví dụ "constructor") không được coi là ghi đè hợp lệ.
  const overridden = uiOverride && Object.hasOwn(OVERRIDE_BANDS, uiOverride) ? OVERRIDE_BANDS[uiOverride as keyof typeof OVERRIDE_BANDS] : undefined

  if (overridden) return overridden
  if (!gradeLevel || !(GRADE_LEVELS as readonly string[]).includes(gradeLevel)) return DEFAULT_BAND

  return BE_GRADES.has(gradeLevel) ? 'be' : 'hocSinh'
}

export const resolveUiProfile = (input: ProfileInput): UiProfile => PROFILES[resolveAgeBand(input)]
