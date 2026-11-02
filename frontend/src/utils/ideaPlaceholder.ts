import { GAME_TEMPLATES } from '../constants/gameTemplates'
import { gradeLevelLabel, subjectLabel } from '../constants/labels'

const DEFAULT_EXAMPLE = 'Ví dụ: Đếm số lượng con vật cho các bé'

/**
 * Câu ví dụ trong ô mô tả luôn khớp với khối lớp và môn đang chọn (tránh ghi "lớp 1" khi đang chọn Mầm non).
 * Có mẫu cho đúng lựa chọn thì dùng chủ đề của mẫu; chưa có thì ghép từ tên khối lớp và môn.
 */
export function ideaPlaceholderFor(gradeLevel: string, subject: string) {
  const template = GAME_TEMPLATES.find(
    (item) => item.level === gradeLevel && (!subject || item.subject === subject),
  )

  if (template) return `Ví dụ: ${template.topic}`
  if (gradeLevel && subject) return `Ví dụ: Một bài ${subjectLabel(subject)} cho học sinh ${gradeLevelLabel(gradeLevel)}`
  if (gradeLevel) return `Ví dụ: Một bài học cho học sinh ${gradeLevelLabel(gradeLevel)}`
  if (subject) return `Ví dụ: Một bài ${subjectLabel(subject)} cho các bé`

  return DEFAULT_EXAMPLE
}
