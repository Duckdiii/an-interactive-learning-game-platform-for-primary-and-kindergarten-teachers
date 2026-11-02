// Theo GameSummary trong docs/openapi/openapi.yaml (GET /games, đã sắp theo updatedAt giảm dần, chưa phân trang).
export interface GameSummary {
  gameId: string
  title: string
  gameType: string
  subject: string
  gradeLevel: string
  status: string
  // Spec không bắt buộc ba trường dưới đây: có thể là null (game còn DRAFT, chưa có ảnh) hoặc vắng hẳn.
  shareCode?: string | null
  shareUrl?: string | null
  thumbnailUrl?: string | null
  // Thời điểm ISO 8601.
  updatedAt: string
}

export interface GameFilters {
  subject: string
  gradeLevel: string
  status: string
}
