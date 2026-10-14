import type { QuestionDsl } from '../../../types/game-dsl.types'
import type { ValidationIssue } from '../../../utils/gameValidation'

/** Prop chung của mọi form sửa câu hỏi; mỗi loại game có một form nhận đúng hai thứ này. */
export interface QuestionFormProps {
  question: QuestionDsl
  // Lỗi hiện tại của CHÍNH câu này (tính trực tiếp trên bản đang soạn), để hiện ngay dưới từng ô.
  issues: ReadonlyArray<ValidationIssue>
  // Áp một bản vá (hàm thuần trong `quizEditing`...) lên câu HIỆN HÀNH. Luôn dùng dạng này, không dựng câu mới từ `question` của lần vẽ
  // trước: kết quả kiểm tra từ ngữ có thể về muộn và sẽ ghi đè các sửa đổi khác.
  onUpdate: (update: (question: QuestionDsl) => QuestionDsl) => void
}
