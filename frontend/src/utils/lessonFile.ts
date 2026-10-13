// Quy tắc tệp giáo án theo UC-02 (docs/srs/UC-02.md, luồng ngoại lệ 3c và 3d): chỉ .docx hoặc .pdf, tối đa 10 MB.

export const LESSON_FILE_MAX_BYTES = 10 * 1024 * 1024
export const LESSON_FILE_ACCEPT = '.pdf,.docx'

export type LessonFileProblem = 'badType' | 'tooLarge'

// Kiểm tra theo đuôi tệp (đuôi do người dùng chọn, trình duyệt có thể không báo MIME cho .docx).
export function checkLessonFile(file: Pick<File, 'name' | 'size'>): LessonFileProblem | null {
  const name = file.name.toLowerCase()

  if (!name.endsWith('.pdf') && !name.endsWith('.docx')) return 'badType'
  if (file.size > LESSON_FILE_MAX_BYTES) return 'tooLarge'

  return null
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
