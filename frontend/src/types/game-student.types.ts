import type { PairSide, QuestionBase } from './game-dsl.types'

/**
 * Dạng câu hỏi Backend gửi cho HỌC SINH (REST API Contract mục 5.5, `GET /sessions/{id}/questions`): bỏ mọi
 * trường đáp án và các phần tử đã được xáo. Đây KHÔNG phải một phần của Game JSON DSL v1.0.0 (DSL chỉ mô
 * tả dạng đầy đủ cho giáo viên) nên đặt riêng để không đụng vào contract đã freeze.
 */

/**
 * Một ô ở dạng học sinh của MATCHING. `id` là mã mờ do Backend cấp (`l1, l2...` cho cột trái, `r1, r2...` cho
 * cột phải), KHÔNG phải `pairId` thật, để học sinh không suy ra đáp án từ id hay thứ tự.
 */
export interface MatchingStudentItem extends PairSide {
  id: string
}

/**
 * MATCHING dạng học sinh: tách hai cột, cả hai đã được Backend xáo (xác định theo HMAC nên tải lại vẫn ra cùng
 * thứ tự). Client giữ nguyên thứ tự này, không xáo lại.
 */
export interface MatchingStudentQuestion extends QuestionBase {
  leftItems: MatchingStudentItem[]
  rightItems: MatchingStudentItem[]
}
