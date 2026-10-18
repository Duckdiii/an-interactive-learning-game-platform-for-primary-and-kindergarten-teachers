import type { GradeLevel } from '../../types/game-dsl.types'
import type { AgeBand } from '../theme/themeTypes'

/**
 * Hồ sơ độ tuổi: dữ liệu giới hạn thiết kế theo nhóm tuổi.
 *
 * Nguồn số liệu:
 * - `minTouchTargetPx` (64 / 56 / 48): do người dùng chốt (2026-10-18, câu Q2 của kế hoạch). Là kích thước TRÊN MÀN
 *   HÌNH sau khi sân co giãn, không phải đơn vị thiết kế.
 * - Các số còn lại (hẹn giờ, bảng xếp hạng, số chữ, số lựa chọn): ĐỀ XUẤT của thử nghiệm, CHƯA được chuyên gia
 *   sư phạm xác nhận; chỉ dùng để thử nghiệm kiểm tự động, đừng coi là chuẩn.
 */
export interface AgeProfile {
  band: AgeBand
  label: string
  /** Cạnh ngắn nhất của mọi vùng chạm, tính bằng px màn hình sau co giãn. */
  minTouchTargetPx: number
  /** Có được hiện đồng hồ đếm ngược/áp lực thời gian không. */
  allowTimer: boolean
  /** Có được hiện bảng xếp hạng sống (so điểm với bạn khác theo thời gian thực) không. */
  allowLiveLeaderboard: boolean
  /** Số ký tự tối đa trên một thẻ/đáp án. */
  maxCharsPerCard: number
  /** Số ký tự tối đa của một câu hỏi/câu dẫn. */
  maxQuestionChars: number
  /** Số lựa chọn tối đa cùng lúc trên màn. */
  maxOptions: number
}

export const AGE_PROFILES: Readonly<Record<AgeBand, AgeProfile>> = {
  PRESCHOOL: {
    band: 'PRESCHOOL',
    label: 'Mầm non',
    minTouchTargetPx: 64,
    allowTimer: false,
    allowLiveLeaderboard: false,
    maxCharsPerCard: 12,
    maxQuestionChars: 60,
    maxOptions: 3,
  },
  GRADE_1_2: {
    band: 'GRADE_1_2',
    label: 'Lớp 1 đến 2',
    minTouchTargetPx: 56,
    allowTimer: true,
    allowLiveLeaderboard: true,
    maxCharsPerCard: 20,
    maxQuestionChars: 100,
    maxOptions: 4,
  },
  GRADE_3_5: {
    band: 'GRADE_3_5',
    label: 'Lớp 3 đến 5',
    minTouchTargetPx: 48,
    allowTimer: true,
    allowLiveLeaderboard: true,
    maxCharsPerCard: 30,
    maxQuestionChars: 200,
    maxOptions: 4,
  },
}

export const AGE_BAND_ORDER: readonly AgeBand[] = ['PRESCHOOL', 'GRADE_1_2', 'GRADE_3_5']

/** Nhóm tuổi của một khối lớp trong DSL (`KINDERGARTEN`, `GRADE_1`..`GRADE_5`). */
export function bandOfGrade(grade: GradeLevel): AgeBand {
  switch (grade) {
    case 'KINDERGARTEN':
      return 'PRESCHOOL'
    case 'GRADE_1':
    case 'GRADE_2':
      return 'GRADE_1_2'
    case 'GRADE_3':
    case 'GRADE_4':
    case 'GRADE_5':
      return 'GRADE_3_5'
  }
}

/** Hệ số co của sân thiết kế (rộng `stageWidth`) khi khung chứa rộng `containerWidth`; không phóng to quá 1 (như `ResponsiveStage`). */
export function stageScale(containerWidth: number, stageWidth: number): number {
  if (!(containerWidth > 0) || !(stageWidth > 0)) return 0
  return Math.min(1, containerWidth / stageWidth)
}

/** Chiều rộng khung chứa nhỏ nhất để một vùng chạm có cạnh ngắn `shortSideDesign` đạt `targetPx` trên màn hình. */
export function minContainerWidthFor(shortSideDesign: number, targetPx: number, stageWidth: number): number {
  if (!(shortSideDesign > 0)) return Number.POSITIVE_INFINITY
  // Trừ một sai số rất nhỏ trước khi làm tròn lên để dấu phẩy động không đẩy ranh giới đúng (ví dụ 400,0000000001) lên 401.
  return Math.ceil((targetPx / shortSideDesign) * stageWidth - 1e-9)
}
