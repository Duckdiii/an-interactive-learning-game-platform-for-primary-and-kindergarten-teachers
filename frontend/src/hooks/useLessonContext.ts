import { useMemo, useState } from 'react'
import { inferLessonContext } from '../utils/lessonContext'
import type { LessonContext } from '../utils/lessonContext'

// Khối lớp và môn của bài học: giáo viên chọn thì dùng lựa chọn đó, chưa chọn thì dùng giá trị AI đoán từ ý tưởng
// (hiện là mock theo từ khóa), đoán không ra thì để trống. Không có effect: giá trị đoán được tính thẳng từ ý tưởng,
// nên đổi ý tưởng thì chip "AI đoán" đổi theo, còn chip giáo viên đã sửa thì được giữ nguyên.
export function useLessonContext(idea: string, initial: Partial<LessonContext> = {}) {
  const guess = useMemo(() => inferLessonContext(idea), [idea])
  const [chosen, setChosen] = useState<Partial<LessonContext>>(initial)

  const gradeLevel = chosen.gradeLevel ?? guess.gradeLevel
  const subject = chosen.subject ?? guess.subject

  return {
    gradeLevel,
    subject,
    // Có giá trị và do AI đoán (giáo viên chưa tự chọn).
    gradeIsGuess: chosen.gradeLevel === undefined && guess.gradeLevel !== '',
    subjectIsGuess: chosen.subject === undefined && guess.subject !== '',
    // Chọn "Chưa xác định" (chuỗi rỗng) là chủ động để trống: AI không tự điền lại ô đó nữa.
    setGradeLevel: (value: string) => setChosen((current) => ({ ...current, gradeLevel: value })),
    setSubject: (value: string) => setChosen((current) => ({ ...current, subject: value })),
  }
}
