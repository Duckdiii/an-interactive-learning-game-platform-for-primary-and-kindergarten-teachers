// Dữ liệu Trang chủ giáo viên mà Backend CHƯA có (đề xuất ở docs/ui/API-CONTRACT.md mục 2.10 và 2.8). Chỉ khai các trường
// màn hình dùng tới; khi endpoint thật có thì chỉ cần sửa realHomeApi.ts.

export interface LiveSession {
  sessionId: string
  gameId: string
  gameTitle: string
  status: 'WAITING' | 'ACTIVE' | 'PAUSED'
  participantCount: number
  // Chỉ số câu đang chơi tính từ 0 (null khi chưa bắt đầu); questionCount theo API-CONTRACT 2.10, vắng thì không hiện "/tổng".
  currentQuestionIndex: number | null
  questionCount?: number | null
}

export interface ReviewNeeded {
  gameId: string
  gameTitle: string
  questionId: string
  questionText: string
  // Tỉ lệ đúng 0..1.
  correctRate: number
  commonWrong?: { label: string; count: number } | null
}

// Kết quả theo câu của một game (API-CONTRACT 2.8, `GET /games/{gameId}/insights`). Chỉ khai các trường màn hình dùng.
export type InsightsSessionType = 'SOLO' | 'TEAM' | 'SELF'

export interface CommonWrong {
  // Chuỗi đã dựng sẵn ở Backend cho người đọc (đáp án sai khác hình dạng theo loại game).
  label: string
  count: number
}

export interface QuestionInsight {
  questionId: string
  // Thứ tự câu, tính từ 1.
  order: number
  text: string
  answeredCount: number
  // Tỉ lệ đúng 0..1.
  correctRate: number
  avgAttempts: number
  needsReview: boolean
  commonWrong: CommonWrong[]
}

export interface GameInsights {
  playCount: number
  correctRate: number
  avgAttemptsPerQuestion: number
  questions: QuestionInsight[]
}

export interface HomeApi {
  /** `GET /sessions?status=WAITING,ACTIVE,PAUSED` */
  listLiveSessions(): Promise<LiveSession[]>
  /** `GET /insights/review-needed?limit=` */
  listReviewNeeded(limit: number): Promise<ReviewNeeded[]>
  /** `GET /games/{gameId}/insights?sessionType=`; bỏ `sessionType` là tất cả loại lượt chơi. */
  getGameInsights(gameId: string, sessionType?: InsightsSessionType): Promise<GameInsights>
}

/** Endpoint còn ở mức đề xuất: giao diện coi như "chưa có dữ liệu", không báo lỗi. */
export class HomeApiNotSupportedError extends Error {
  constructor(operation: string) {
    super(`Chưa hỗ trợ: Backend chưa cài endpoint "${operation}".`)
    this.name = 'HomeApiNotSupportedError'
  }
}
