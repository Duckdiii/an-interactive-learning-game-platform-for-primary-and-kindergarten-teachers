// Một loại game mà AI đề xuất cho ý tưởng của giáo viên. `type` là giá trị enum GameType của API.
export interface GameTypeSuggestion {
  type: string
  // Vì sao loại này hợp với MỤC TIÊU HỌC của ý tưởng (một câu, có ví dụ cụ thể).
  reason: string
  // Cách chơi, một dòng.
  description: string
  // Độ phù hợp từ 0 đến 1; danh sách đã sắp giảm dần theo điểm này.
  fitScore: number
}

export interface SuggestGameTypesInput {
  idea: string
  gradeLevel: string
  subject: string
}

// Gợi ý chủ đề ở Trang chủ: bấm vào thì sang trang Tạo game mới với ô mô tả điền sẵn.
export interface TopicSuggestion {
  id: string
  title: string
  topic: string
  gradeLevel: string
  subject: string
}
